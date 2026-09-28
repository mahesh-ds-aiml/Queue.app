import os
import random
import pandas as pd
import numpy as np

def generate_synthetic_data(num_samples=1000, output_file="synthetic_orders.csv"):
    np.random.seed(42)
    random.seed(42)

    data = []
    for _ in range(num_samples):
        queue_length = random.randint(0, 15)
        pages_ahead = queue_length * random.randint(3, 20) + random.randint(0, 10)
        num_files = random.randint(1, 4)
        hour_of_day = random.randint(8, 18)
        
        # Rush hour penalty (12pm to 2pm and 4pm to 5pm)
        peak_factor = 1.35 if hour_of_day in [12, 13, 16, 17] else 1.0

        # Realistic wait time math: 3.5s per page + 15s setup per order ahead + 30s base
        base_time = (pages_ahead * 3.5) + (queue_length * 15.0) + (num_files * 10.0) + 30.0
        actual_time = base_time * peak_factor + np.random.normal(0, 15.0)
        actual_time = max(30.0, actual_time)

        data.append({
            "pages_ahead": pages_ahead,
            "queue_length": queue_length,
            "num_files": num_files,
            "hour_of_day": hour_of_day,
            "actual_duration_seconds": round(actual_time, 2)
        })

    df = pd.DataFrame(data)
    filepath = os.path.join(os.path.dirname(__file__), output_file)
    df.to_csv(filepath, index=False)
    print(f"Generated {num_samples} synthetic order records at {filepath}")
    return filepath

if __name__ == "__main__":
    generate_synthetic_data()
