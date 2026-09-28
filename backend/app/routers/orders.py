import os
import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.slot import Slot
from app.models.order import Order
from app.models.order_file import OrderFile
from app.schemas import OrderResponse, OrderFileResponse
from app.services.auth import get_current_user
from app.services.pdf_service import get_page_count
from app.services.pricing_service import calculate_file_price
from app.services.token_service import generate_daily_token
from app.routers.settings import get_or_create_settings

router = APIRouter(prefix="/orders", tags=["Orders"])

def format_order_response(order: Order) -> dict:
    slot_time = order.slot.time_range if order.slot else "Walk-in"
    file_responses = []
    for f in order.files:
        file_responses.append(OrderFileResponse(
            id=f.id,
            filename=f.filename,
            original_name=f.original_name,
            page_count=f.page_count,
            copies=f.copies,
            is_color=f.is_color,
            is_double_sided=f.is_double_sided,
            paper_size=f.paper_size,
            page_range=f.page_range,
            orientation=f.orientation,
            file_price=f.file_price
        ))
    
    return {
        "id": order.id,
        "token_number": order.token_number,
        "user_id": order.user_id,
        "user_name": order.user_name,
        "user_reg": order.user_reg,
        "slot_id": order.slot_id,
        "slot_time": slot_time,
        "status": order.status,
        "total_price": order.total_price,
        "is_manual": order.is_manual,
        "notes": order.notes,
        "created_at": order.created_at,
        "completed_at": order.completed_at,
        "files": file_responses
    }

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    slot_id: int = Form(...),
    notes: Optional[str] = Form(None),
    options: str = Form(...),  # JSON string array of options per file: [{copies, is_color, is_double_sided, paper_size, page_range, orientation}]
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Check Slot Capacity
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot or not slot.is_active:
        raise HTTPException(status_code=400, detail="Selected slot is invalid or inactive")
    
    if slot.current_orders >= slot.max_orders:
        raise HTTPException(status_code=400, detail="This time slot is full. Please choose another slot.")

    # Parse options JSON
    try:
        parsed_options = json.loads(options)
        if not isinstance(parsed_options, list):
            parsed_options = [parsed_options]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid options JSON payload format")

    if len(files) == 0:
        raise HTTPException(status_code=400, detail="At least one file must be uploaded")

    # Load shop settings
    shop_settings = get_or_create_settings(db)
    
    # Token number creation
    token_num = generate_daily_token(db)

    # Create Order object
    new_order = Order(
        token_number=token_num,
        user_id=current_user.id,
        user_name=current_user.name,
        user_reg=current_user.register_number,
        slot_id=slot.id,
        status="Received",
        is_manual=False,
        notes=notes,
        total_price=0.0
    )
    db.add(new_order)
    db.flush()  # get order.id

    order_total = 0.0

    for idx, uploaded_file in enumerate(files):
        # Validate File size & type
        ext = os.path.splitext(uploaded_file.filename)[1].lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"File format '{ext}' is not supported. Allowed formats: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )
        
        # Save file to upload directory
        unique_filename = f"{uuid.uuid4().hex}_{uploaded_file.filename}"
        save_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

        content = await uploaded_file.read()
        if len(content) > settings.MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail=f"File {uploaded_file.filename} exceeds maximum 20MB size limit")

        with open(save_path, "wb") as f:
            f.write(content)

        # Detect Page Count
        total_pages = get_page_count(save_path)

        # File options
        opt = parsed_options[idx] if idx < len(parsed_options) else {}
        copies = opt.get("copies", 1)
        is_color = opt.get("is_color", False)
        is_double_sided = opt.get("is_double_sided", False)
        paper_size = opt.get("paper_size", "A4")
        page_range = opt.get("page_range", "all")
        orientation = opt.get("orientation", "portrait")

        # Price calculation
        f_price = calculate_file_price(
            total_pages=total_pages,
            page_range=page_range,
            copies=copies,
            is_color=is_color,
            is_double_sided=is_double_sided,
            paper_size=paper_size,
            settings=shop_settings
        )

        order_total += f_price

        order_file = OrderFile(
            order_id=new_order.id,
            filename=unique_filename,
            original_name=uploaded_file.filename,
            page_count=total_pages,
            copies=copies,
            is_color=is_color,
            is_double_sided=is_double_sided,
            paper_size=paper_size,
            page_range=page_range,
            orientation=orientation,
            file_price=f_price
        )
        db.add(order_file)

    new_order.total_price = round(order_total, 2)
    slot.current_orders += 1

    db.commit()
    db.refresh(new_order)
    return format_order_response(new_order)

@router.get("/my", response_model=List[OrderResponse])
def get_my_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()
    return [format_order_response(o) for o in orders]

@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Ownership or owner check
    if order.user_id != current_user.id and current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Not authorized to cancel this order")
    
    if order.status != "Received":
        raise HTTPException(status_code=400, detail="Orders can only be cancelled while in 'Received' status")

    order.status = "Cancelled"
    if order.slot and order.slot.current_orders > 0:
        order.slot.current_orders -= 1

    db.commit()
    db.refresh(order)
    return format_order_response(order)
