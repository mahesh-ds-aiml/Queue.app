import os
import joblib
import pandas as pd
from sqlalchemy.orm import Session
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from app.database import SessionLocal
from app.models.order import Order

def retrain_from_database():
    db: Session = SessionLocal()
    try:
        completed_orders = db.query(Order).filter(
            Order.status == "Collected",
            Order.completed_at.isnot(None)
        ).all()

        if len(completed_orders) < 5:
            print(f"Only {len(completed_orders)} completed orders in DB. Minimum 5 required for real retraining.")
            return False

        data = []
        for o in completed_orders:
            duration = (o.completed_at - o.created_at).total_seconds()
            pages = sum(f.page_count * f.copies for f in o.files)
            files_count = len(o.files)
            hour = o.created_at.hour

            data.append({
                "pages_ahead": pages,  # approx
                "queue_length": 1,
                "num_files": files_count,
                "hour_of_day": hour,
                "actual_duration_seconds": max(30.0, duration)
            })

        df = pd.DataFrame(data)
        X = df[["pages_ahead", "queue_length", "num_files", "hour_of_day"]]
        y = df["actual_duration_seconds"]

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = RandomForestRegressor(n_estimators=50, random_state=42)
        model.fit(X_scaled, y)

        model_save_path = os.path.join(os.path.dirname(__file__), "model.pkl")
        scaler_save_path = os.path.join(os.path.dirname(__file__), "scaler.pkl")

        joblib.dump(model, model_save_path)
        joblib.dump(scaler, scaler_save_path)
        print(f"Successfully retrained model with {len(completed_orders)} real DB orders.")
        return True
    finally:
        db.close()

if __name__ == "__main__":
    retrain_from_database()
