import joblib
import pandas as pd

MODEL_PATH = "C:/Projects/paw_track/machine_learning/pipeline/ridge_model.pkl"

model = joblib.load(MODEL_PATH)

print("Model loaded successfully.")
print("Model type:", type(model))

features = pd.DataFrame([{
    "lag1": 30,
    "lag2": 28,
    "lag3": 32,
    "roll3": 30,
    "c_DOG/CAT FOOD": 1,
    "c_MEDICINE": 0,
    "c_SMALL ITEMS": 0,
    "c_Uncategorized": 0
}])

prediction = model.predict(features)

print("Predicted daily demand:", prediction[0])
print("Predicted monthly demand:", round(prediction[0] * 30))