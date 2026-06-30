"""
train_model.py
==============
Train the crop recommendation model from the real Crop Recommendation dataset
(2,200 rows, 22 crops — N, P, K, temperature, humidity, pH, rainfall) and save
it as a pickle file for the Django API to load.

Usage:
    cd backend/krishiai_backend/predictor
    python train_model.py

Produces:
    crop_model.pkl       — trained RandomForestClassifier
    label_encoder.pkl    — LabelEncoder mapping crop name <-> integer class
    model_metadata.json  — accuracy, dataset size, training date (read by /health)

Dataset
-------
data/crop_recommendation.csv — the well-known public "Crop Recommendation
Dataset" (built from rainfall, climate and fertilizer data for India; 2,200
rows, 22 crops, 100 samples per class, no missing values).

To use your own / a larger dataset, replace data/crop_recommendation.csv with
any CSV containing these exact columns and re-run this script:
    N,P,K,temperature,humidity,ph,rainfall,label
"""

import json
import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder

# ─────────────────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────────────────

HERE = Path(__file__).resolve().parent
DATA_PATH = HERE / "data" / "crop_recommendation.csv"
MODEL_PATH = HERE / "crop_model.pkl"
ENCODER_PATH = HERE / "label_encoder.pkl"
METADATA_PATH = HERE / "model_metadata.json"

FEATURE_NAMES = ["N", "P", "K", "ph", "temperature", "rainfall", "humidity"]
# Note: API-facing field name is "pH" (capital H) for readability; the
# dataset/sklearn-facing name is "ph". views.py handles that mapping.

# ─────────────────────────────────────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────────────────────────────────────


def load_dataset() -> pd.DataFrame:
    if not DATA_PATH.exists():
        sys.exit(
            f"Dataset not found at {DATA_PATH}\n"
            "Expected a CSV with columns: N,P,K,temperature,humidity,ph,rainfall,label"
        )
    df = pd.read_csv(DATA_PATH)

    required_cols = {"N", "P", "K", "temperature", "humidity", "ph", "rainfall", "label"}
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        sys.exit(f"Dataset is missing required columns: {missing_cols}")

    before = len(df)
    df = df.dropna()
    df = df.drop_duplicates()
    after = len(df)
    if after < before:
        print(f"Dropped {before - after} rows with nulls/duplicates ({before} -> {after}).")

    return df


def main():
    print("=" * 60)
    print("KrishiAI — Training crop recommendation model")
    print("=" * 60)

    df = load_dataset()
    print(f"Loaded dataset: {len(df)} rows, {df['label'].nunique()} crops")
    print(f"Crops: {sorted(df['label'].unique())}")

    class_counts = df["label"].value_counts()
    if class_counts.min() < 10:
        print(
            f"WARNING: smallest class has only {class_counts.min()} samples — "
            "predictions for that crop will be unreliable."
        )

    # ── Prepare features / labels ──────────────────────────────────────────
    X = df[FEATURE_NAMES].to_numpy(dtype=float)
    y_raw = df["label"].str.lower().str.strip().to_numpy()

    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    # ── Train/test split (stratified so every crop is represented in test) ──
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # ── Evaluate on held-out test set ────────────────────────────────────────
    y_pred = model.predict(X_test)
    test_acc = accuracy_score(y_test, y_pred)
    test_f1 = f1_score(y_test, y_pred, average="macro")

    print(f"\nHeld-out test accuracy: {test_acc * 100:.2f}%")
    print(f"Held-out test macro F1: {test_f1:.3f}")
    print("\nPer-crop performance:")
    print(classification_report(y_test, y_pred, target_names=le.classes_, zero_division=0))

    # ── Cross-validation on the full dataset (more robust than one split) ───
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=cv, scoring="accuracy", n_jobs=-1)
    print(f"5-fold cross-validation accuracy: {cv_scores.mean() * 100:.2f}% "
          f"(+/- {cv_scores.std() * 100:.2f}%)")

    # ── Refit on the FULL dataset for the model we actually ship ────────────
    # (train/test split above is only for honest evaluation; the deployed
    # model should learn from every available row)
    final_model = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
    )
    final_model.fit(X, y)

    # ── Save model + encoder ─────────────────────────────────────────────────
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(final_model, f)
    with open(ENCODER_PATH, "wb") as f:
        pickle.dump(le, f)

    metadata = {
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset_path": str(DATA_PATH.relative_to(HERE)),
        "dataset_rows": int(len(df)),
        "n_crops": int(df["label"].nunique()),
        "crops": sorted(le.classes_.tolist()),
        "feature_names": FEATURE_NAMES,
        "held_out_test_accuracy": round(float(test_acc), 4),
        "held_out_test_macro_f1": round(float(test_f1), 4),
        "cv_accuracy_mean": round(float(cv_scores.mean()), 4),
        "cv_accuracy_std": round(float(cv_scores.std()), 4),
        "model_type": "RandomForestClassifier",
        "n_estimators": final_model.n_estimators,
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved: {MODEL_PATH.name}")
    print(f"Saved: {ENCODER_PATH.name}")
    print(f"Saved: {METADATA_PATH.name}")
    print("\nNext step: python manage.py runserver")


if __name__ == "__main__":
    main()
