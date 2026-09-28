import os
import sys
from datetime import datetime, timezone, timedelta

# Ensure parent directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models.user import User
from app.models.slot import Slot
from app.models.settings import ShopSettings
from app.models.order import Order
from app.models.order_file import OrderFile
from app.services.auth import hash_password
from app.ml.train import train_model

def seed_db():
    print("Recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Shop Settings
        settings_obj = ShopSettings(
            bw_single_rate=2.0,
            bw_double_rate=1.5,
            color_single_rate=10.0,
            color_double_rate=8.0,
            a3_multiplier=2.0,
            seconds_per_page=4.0
        )
        db.add(settings_obj)

        # 2. Time Slots
        slots_data = [
            ("09:00 - 10:00 AM", 10),
            ("10:00 - 11:00 AM", 10),
            ("11:00 - 12:00 PM", 12),
            ("12:00 - 01:00 PM", 15),
            ("02:00 - 03:00 PM", 12),
            ("03:00 - 04:00 PM", 10),
            ("04:00 - 05:00 PM", 10)
        ]
        slots = []
        for time_str, max_ord in slots_data:
            s = Slot(time_range=time_str, max_orders=max_ord, current_orders=0, is_active=True)
            db.add(s)
            slots.append(s)
        db.flush()

        # 3. Owner User
        owner = User(
            name="Campus Xerox Owner",
            register_number="STAFF-001",
            email="owner@printq.edu",
            hashed_password=hash_password("owner123"),
            role="owner"
        )
        db.add(owner)

        # 4. 5 Student Users
        students_raw = [
            ("Rahul Sharma", "21CS042", "rahul@printq.edu"),
            ("Ananya Patel", "21EC015", "ananya@printq.edu"),
            ("Vikram Singh", "22ME089", "vikram@printq.edu"),
            ("Priya Sundaram", "21CS102", "priya@printq.edu"),
            ("Karthik Verma", "23EE034", "karthik@printq.edu"),
        ]
        students = []
        for name, reg, email in students_raw:
            u = User(
                name=name,
                register_number=reg,
                email=email,
                hashed_password=hash_password("student123"),
                role="student"
            )
            db.add(u)
            students.append(u)
        db.flush()

        # 5. Seed 15 realistic orders
        sample_files = [
            ("OS_Lab_Manual.pdf", 24, 1, False, True, "A4", "all", 36.0),
            ("Project_Report_Final.pdf", 45, 2, True, True, "A4", "all", 720.0),
            ("Circuit_Diagrams.pdf", 5, 1, False, False, "A3", "all", 20.0),
            ("Lecture_Notes_Unit3.pdf", 12, 1, False, True, "A4", "all", 18.0),
            ("Assignment_Cover.pdf", 2, 3, True, False, "A4", "all", 60.0),
            ("Data_Structures_CheatSheet.pdf", 8, 1, False, False, "A4", "all", 16.0),
        ]

        statuses = [
            "Received", "Received", "Received", "Received",
            "Printing", "Printing", "Printing",
            "Ready", "Ready", "Ready", "Ready",
            "Collected", "Collected", "Collected", "Cancelled"
        ]

        orders_count = 0
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        for i in range(15):
            student = students[i % len(students)]
            slot = slots[i % len(slots)]
            status_val = statuses[i]

            token_num = f"P-{(i + 1):03d}"
            created_offset = timedelta(minutes=-(15 * (15 - i)))
            created_dt = now + created_offset

            comp_dt = (created_dt + timedelta(minutes=10)) if status_val in ["Ready", "Collected"] else None

            order = Order(
                token_number=token_num,
                user_id=student.id,
                user_name=student.name,
                user_reg=student.register_number,
                slot_id=slot.id,
                status=status_val,
                total_price=0.0,
                is_manual=(i == 13), # 1 walk-in order sample
                notes=f"Sample test order #{i+1}",
                created_at=created_dt,
                completed_at=comp_dt
            )
            db.add(order)
            db.flush()

            # Assign 1 or 2 files to order
            f_sample = sample_files[i % len(sample_files)]
            file_obj = OrderFile(
                order_id=order.id,
                filename=f"seed_{f_sample[0]}",
                original_name=f_sample[0],
                page_count=f_sample[1],
                copies=f_sample[2],
                is_color=f_sample[3],
                is_double_sided=f_sample[4],
                paper_size=f_sample[5],
                page_range=f_sample[6],
                orientation="portrait",
                file_price=f_sample[7]
            )
            db.add(file_obj)

            order.total_price = f_sample[7]
            if status_val in ["Received", "Printing", "Ready"]:
                slot.current_orders += 1

            orders_count += 1

        db.commit()
        print(f"Successfully seeded database with 1 owner, {len(students)} students, {len(slots)} slots, and {orders_count} orders!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
    print("Training ML model on synthetic data...")
    train_model()
