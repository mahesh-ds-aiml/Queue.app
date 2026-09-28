import os
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.order import Order
from app.models.order_file import OrderFile
from app.config import settings

def cleanup_old_collected_files(db: Session):
    cutoff_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)

    collected_orders = db.query(Order).filter(
        Order.status == "Collected",
        (Order.completed_at <= cutoff_time) | (Order.created_at <= cutoff_time)
    ).all()

    files_removed = 0
    for order in collected_orders:
        for file in order.files:
            file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    files_removed += 1
                except Exception as e:
                    print(f"Error removing file {file_path}: {e}")
            # Clear stored filename so we don't attempt deletion again
            file.filename = ""
    db.commit()
    return files_removed
