import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from app.ml.generate_synthetic_data import generate_synthetic_data

def train_model():
    data_path = os.path.join(os.path.dirname(__file__), "synthetic_orders.csv")
    if not os.path.exists(data_path):
        data_path = generate_synthetic_data()

    df = pd.read_csv(data_path)
    X = df[["pages_ahead", "queue_length", "num_files", "hour_of_day"]]
    y = df["actual_duration_seconds"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 1. Linear Regression
    lr_model = LinearRegression()
    lr_model.fit(X_train_scaled, y_train)
    lr_preds = lr_model.predict(X_test_scaled)
    lr_mae = mean_absolute_error(y_test, lr_preds)

    # 2. Random Forest Regressor
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_model.fit(X_train_scaled, y_train)
    rf_preds = rf_model.predict(X_test_scaled)
    rf_mae = mean_absolute_error(y_test, rf_preds)

    print("--- ML Model Evaluation ---")
    print(f"Linear Regression MAE: {lr_mae:.2f} seconds")
    print(f"Random Forest MAE:    {rf_mae:.2f} seconds")

    best_model = rf_model if rf_mae <= lr_mae else lr_model
    model_name = "RandomForest" if rf_mae <= lr_mae else "LinearRegression"
    print(f"Selected best model: {model_name}")

    model_save_path = os.path.join(os.path.dirname(__file__), "model.pkl")
    scaler_save_path = os.path.join(os.path.dirname(__file__), "scaler.pkl")

    joblib.dump(best_model, model_save_path)
    joblib.dump(scaler, scaler_save_path)
    print(f"Saved trained model to {model_save_path}")

if __name__ == "__main__":
    train_model()
