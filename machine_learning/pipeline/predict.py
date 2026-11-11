import sys
import json
import os
import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "ridge_model.pkl")

NUMERICAL_FEATURES = [
    "lag1", "lag2", "lag3",
    "roll3", "roll6", "roll12",
    "month_sin", "month_cos", "trend",
]

def main():
    try:
        items = json.load(sys.stdin)

        if not isinstance(items, list) or not items:
            raise ValueError("A non-empty prediction batch is required.")

        model = joblib.load(MODEL_PATH)
        rows = []

        for item in items:
            sub = item.get("sub")

            if not isinstance(sub, str) or not sub.strip():
                raise ValueError("A valid subcategory is required.")

            row = {
                name: float(item[name])
                for name in NUMERICAL_FEATURES
            }
            row["sub"] = sub.strip().upper()
            rows.append(row)

        dataframe = pd.DataFrame(rows)
        predictions = model.predict(dataframe)

        results = [
            {
                "sub": row["sub"],
                "predicted_value": round(float(prediction), 2)
            }
            for row, prediction in zip(rows, predictions)
        ]

        print(json.dumps(results))

    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)

if __name__ == "__main__":
    main()