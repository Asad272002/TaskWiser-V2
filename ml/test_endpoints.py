import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_predict():
    print("Testing /predict endpoint...")
    payload = {
        "title": "Build a React Dashboard",
        "description": "Create a responsive admin dashboard with charts",
        "tags": ["frontend", "react", "charts"]
    }
    try:
        response = requests.post(f"{BASE_URL}/predict", json=payload)
        response.raise_for_status()
        data = response.json()
        print(f"Prediction successful: {data}")
        return True
    except Exception as e:
        print(f"Prediction failed: {e}")
        if response.text:
            print(f"Response: {response.text}")
        return False

def test_update():
    print("\nTesting /update endpoint...")
    payload = {
        "title": "Build a React Dashboard",
        "description": "Create a responsive admin dashboard with charts",
        "tags": ["frontend", "react", "charts"],
        "actual_cost": 500
    }
    try:
        response = requests.post(f"{BASE_URL}/update", json=payload)
        response.raise_for_status()
        data = response.json()
        print(f"Update successful: {data}")
        return True
    except Exception as e:
        print(f"Update failed: {e}")
        if response.text:
            print(f"Response: {response.text}")
        return False

if __name__ == "__main__":
    if test_predict():
        test_update()
