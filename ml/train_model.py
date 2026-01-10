import json
import joblib
import numpy as np
from sklearn.linear_model import SGDRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

# 1. Feature Extraction Function (Must match API)
def extract_features(title, description, tags):
    # Ensure tags is a list of lowercase strings
    if isinstance(tags, str):
        tags = [t.strip().lower() for t in tags.split(",")]
    else:
        tags = [t.lower() for t in tags]
    
    title = title or ""
    description = description or ""
    
    # Combine all text for keyword search
    full_text = (title + " " + description).lower()
    
    # Common tags in the dataset
    common_tags = [
        "frontend", "backend", "ai", "blockchain", 
        "security", "ui/ux", "devops", "marketing",
        "qa", "analytics", "mobile"
    ]
    
    features = [
        len(title),
        len(description),
        len(tags)
    ]
    
    # One-hot-ish encoding for common tags
    for tag_keyword in common_tags:
        # Check if tag is in tags list OR if keyword appears in text
        has_tag = (tag_keyword in tags) or (tag_keyword in full_text)
        features.append(int(has_tag))
        
    return features

# 2. Load Data
data_path = "trainingdata.json"
try:
    with open(data_path, "r") as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"Error: {data_path} not found.")
    exit(1)

X = []
y = []

for item in data:
    # Use 'cost_usd' based on file content, fallback to 'cost' if needed
    cost = item.get("cost_usd", item.get("cost", 0))
    
    features = extract_features(
        item.get("title", ""),
        item.get("description", ""),
        item.get("tags", [])
    )
    X.append(features)
    y.append(cost)

X = np.array(X)
y = np.array(y)

# 3. Train Model
# SGDRegressor is sensitive to feature scaling, so we use a pipeline with StandardScaler
model = make_pipeline(StandardScaler(), SGDRegressor(max_iter=1000, tol=1e-3))
model.fit(X, y)

# 4. Save Model
model_path = "cost_model.pkl"
joblib.dump(model, model_path)

print(f"✅ Model trained on {len(data)} records.")
print(f"✅ Saved to {model_path}")
print("Sample prediction for 'Build admin dashboard' (Frontend, Backend):")
sample_feat = extract_features("Build admin dashboard", "CRUD dashboard with charts", ["frontend", "backend"])
print(f"Predicted: ${model.predict([sample_feat])[0]:.2f}")
