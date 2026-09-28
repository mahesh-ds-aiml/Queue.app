import os
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.config import settings
from app.database import get_db
from app.models.order import Order
from app.models.order_file import OrderFile
from app.schemas import OrderResponse, OrderStatusUpdate, ManualOrderCreate
from app.services.auth import require_owner
from app.services.token_service import generate_daily_token
from app.services.pricing_service import calculate_file_price
from app.routers.settings import get_or_create_settings
from app.routers.orders import format_order_response

router = APIRouter(prefix="/owner", tags=["Owner"])

@router.get("/queue", response_model=List[OrderResponse])
def get_owner_queue(db: Session = Depends(get_db), owner=Depends(require_owner)):
    # Query queue active orders (not Collected or Cancelled first, or all recent orders)
    from sqlalchemy import asc, nullslast
    orders = db.query(Order).order_by(
        Order.status.desc(),
        nullslast(asc(Order.slot_id)),
        Order.created_at.asc()
    ).all()
    
    return [format_order_response(o) for o in orders]

@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int, 
    status_update: OrderStatusUpdate, 
    db: Session = Depends(get_db), 
    owner=Depends(require_owner)
):
    valid_statuses = ["Received", "Printing", "Ready", "Collected", "Cancelled"]
    new_status = status_update.status
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {valid_statuses}")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    order.status = new_status
    
    if new_status in ["Collected", "Ready"] and not order.completed_at:
        order.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)

    if old_status != "Cancelled" and new_status == "Cancelled":
        if order.slot and order.slot.current_orders > 0:
            order.slot.current_orders -= 1

    db.commit()
    db.refresh(order)
    return format_order_response(order)

@router.post("/manual-order", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_manual_order(
    manual_in: ManualOrderCreate, 
    db: Session = Depends(get_db), 
    owner=Depends(require_owner)
):
    shop_settings = get_or_create_settings(db)
    token_num = generate_daily_token(db)

    new_order = Order(
        token_number=token_num,
        user_id=None,
        user_name=manual_in.customer_name,
        user_reg=manual_in.customer_reg or "Walk-in",
        slot_id=manual_in.slot_id,
        status="Printing", # Walk-in orders start in Printing/Ready
        is_manual=True,
        notes=manual_in.notes or "Walk-in manual order",
        total_price=0.0
    )
    db.add(new_order)
    db.flush()

    file_price = calculate_file_price(
        total_pages=manual_in.page_count,
        page_range="all",
        copies=manual_in.copies,
        is_color=manual_in.is_color,
        is_double_sided=manual_in.is_double_sided,
        paper_size=manual_in.paper_size,
        settings=shop_settings
    )

    order_file = OrderFile(
        order_id=new_order.id,
        filename="manual_walkin.pdf",
        original_name=f"Walk-in document ({manual_in.page_count}p)",
        page_count=manual_in.page_count,
        copies=manual_in.copies,
        is_color=manual_in.is_color,
        is_double_sided=manual_in.is_double_sided,
        paper_size=manual_in.paper_size,
        page_range="all",
        orientation="portrait",
        file_price=file_price
    )
    db.add(order_file)
    new_order.total_price = file_price

    db.commit()
    db.refresh(new_order)
    return format_order_response(new_order)

@router.get("/summary")
def get_today_summary(db: Session = Depends(get_db), owner=Depends(require_owner)):
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now_utc.replace(hour=23, minute=59, second=59, microsecond=999999)

    today_orders = db.query(Order).filter(
        Order.created_at >= today_start,
        Order.created_at <= today_end,
        Order.status != "Cancelled"
    ).all()

    total_orders_count = len(today_orders)
    total_revenue = sum(o.total_price for o in today_orders)
    total_pages_printed = 0

    # Hourly distribution [0..23]
    hourly_counts = {h: 0 for h in range(24)}

    for o in today_orders:
        hour = o.created_at.hour
        hourly_counts[hour] += 1
        for f in o.files:
            total_pages_printed += (f.page_count * f.copies)

    chart_data = [{"hour": f"{h:02d}:00", "orders": count} for h, count in hourly_counts.items() if 8 <= h <= 19 or count > 0]

    return {
        "today_orders": total_orders_count,
        "today_revenue": round(total_revenue, 2),
        "today_pages": total_pages_printed,
        "hourly_distribution": chart_data
    }

@router.get("/files/{filename}")
def download_order_file(filename: str, owner=Depends(require_owner)):
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Requested file not found on server")
    return FileResponse(file_path, filename=filename)
