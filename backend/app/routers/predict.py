from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order
from app.schemas import WaitTimeResponse
from app.ml.predictor import predict_wait_time
from app.routers.settings import get_or_create_settings

router = APIRouter(prefix="/predict-wait", tags=["Predict Wait"])

@router.get("", response_model=WaitTimeResponse)
def get_predicted_wait_time(
    slot_id: Optional[int] = None,
    pages_count: int = 5,
    num_files: int = 1,
    db: Session = Depends(get_db)
):
    # Calculate current active queue length and pages ahead
    active_orders = db.query(Order).filter(
        Order.status.in_(["Received", "Printing"])
    )
    if slot_id:
        active_orders = active_orders.filter(Order.slot_id == slot_id)
        
    orders_list = active_orders.all()
    queue_length = len(orders_list)
    
    pages_ahead = 0
    for order in orders_list:
        for f in order.files:
            pages_ahead += (f.page_count * f.copies)

    shop_settings = get_or_create_settings(db)
    hour_of_day = datetime.now(timezone.utc).hour

    est_sec, model_name = predict_wait_time(
        pages_ahead=pages_ahead + pages_count,
        queue_length=queue_length,
        num_files=num_files,
        hour_of_day=hour_of_day,
        seconds_per_page=shop_settings.seconds_per_page
    )

    if queue_length <= 3:
        status_label = "Free"
    elif queue_length <= 8:
        status_label = "Moderate"
    else:
        status_label = "Busy"

    est_min = max(1, round(est_sec / 60))

    return WaitTimeResponse(
        estimated_seconds=est_sec,
        estimated_minutes=est_min,
        queue_length=queue_length,
        pages_ahead=pages_ahead,
        queue_status=status_label,
        model_used=model_name
    )
