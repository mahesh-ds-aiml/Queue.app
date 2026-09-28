import os
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "scaler.pkl")

def predict_wait_time(
    pages_ahead: int,
    queue_length: int,
    num_files: int = 1,
    hour_of_day: int = 12,
    seconds_per_page: float = 4.0
) -> tuple[float, str]:
    """
    Predicts wait time in seconds.
    Returns (estimated_seconds, model_used).
    """
    # Check if ML model and scaler exist
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            scaler = joblib.load(SCALER_PATH)
            
            # Feature vector: [pages_ahead, queue_length, num_files, hour_of_day]
            features = np.array([[pages_ahead, queue_length, num_files, hour_of_day]])
            scaled_features = scaler.transform(features)
            predicted_seconds = model.predict(scaled_features)[0]
            
            # Ensure non-negative sensible lower bound
            est_sec = max(30.0, float(predicted_seconds))
            return round(est_sec, 1), "scikit-learn (RandomForest)"
        except Exception as e:
            print(f"ML Prediction fallback due to error: {e}")

    # Fallback Formula: (pages_ahead * seconds_per_page) + (queue_length * 20 sec handling per order) + 30s base
    formula_seconds = (pages_ahead * seconds_per_page) + (queue_length * 15.0) + 30.0
    return round(formula_seconds, 1), "formula"
