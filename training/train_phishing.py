"""
Train XGBoost model for phishing URL detection using PhiUSIIL dataset.
Uses only the 25 pre-fetch URL-only features (no page content required).

Usage:
    python training/train_phishing.py

Outputs:
    backend/models/phishing_xgb.json       - trained XGBoost model
    backend/models/phishing_lookups.json    - TLD/char probability lookup tables for inference
"""

import json
import os
import sys

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

URL_ONLY_FEATURES = [
    "URLLength",
    "DomainLength",
    "IsDomainIP",
    "URLSimilarityIndex",
    "CharContinuationRate",
    "TLDLegitimateProb",
    "URLCharProb",
    "TLDLength",
    "NoOfSubDomain",
    "HasObfuscation",
    "NoOfObfuscatedChar",
    "ObfuscationRatio",
    "NoOfLettersInURL",
    "LetterRatioInURL",
    "NoOfDegitsInURL",
    "DegitRatioInURL",
    "NoOfEqualsInURL",
    "NoOfQMarkInURL",
    "NoOfAmpersandInURL",
    "NoOfOtherSpecialCharsInURL",
    "SpacialCharRatioInURL",
    "IsHTTPS",
    "Bank",
    "Pay",
    "Crypto",
]


def build_lookup_tables(df: pd.DataFrame) -> dict:
    """Build TLD and character probability lookup tables from training data.
    These are needed at inference time to compute TLDLegitimateProb and URLCharProb."""

    # TLDLegitimateProb: P(legitimate | TLD) for each TLD
    tld_counts = df.groupby("TLD")["label"].agg(["sum", "count"])
    tld_probs = (tld_counts["sum"] / tld_counts["count"]).to_dict()

    # URLCharProb: compute average character frequency from training URLs
    # Build a character frequency distribution from all URLs
    char_freq = {}
    total_chars = 0
    for url in df["URL"].dropna():
        for ch in str(url).lower():
            char_freq[ch] = char_freq.get(ch, 0) + 1
            total_chars += 1
    char_probs = {ch: count / total_chars for ch, count in char_freq.items()}

    return {"tld_legitimate_prob": tld_probs, "char_probs": char_probs}


def main():
    # Load dataset
    csv_path = os.path.join(PROJECT_ROOT, "PhiUSIIL_Phishing_URL_Dataset.csv")
    if not os.path.exists(csv_path):
        # Try the inner dataset path
        csv_path = os.path.join(
            PROJECT_ROOT, "PhiUSIIL-Phishing-URL-Detection", "Dataset", "Dataset.csv"
        )
    print(f"Loading dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"Dataset shape: {df.shape}")
    print(f"Label distribution:\n{df['label'].value_counts()}")

    # Build and save lookup tables (before splitting, using full data for better coverage)
    print("\nBuilding lookup tables for inference...")
    lookups = build_lookup_tables(df)
    lookups_path = os.path.join(PROJECT_ROOT, "backend", "models", "phishing_lookups.json")
    with open(lookups_path, "w") as f:
        json.dump(lookups, f)
    print(f"Saved lookup tables to {lookups_path}")
    print(f"  TLD entries: {len(lookups['tld_legitimate_prob'])}")
    print(f"  Char entries: {len(lookups['char_probs'])}")

    # Select features and target
    X = df[URL_ONLY_FEATURES].copy()
    y = df["label"].copy()

    print(f"\nUsing {len(URL_ONLY_FEATURES)} URL-only features")
    print(f"Features: {URL_ONLY_FEATURES}")

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\nTrain: {X_train.shape[0]}, Test: {X_test.shape[0]}")

    # Train XGBoost
    print("\nTraining XGBoost...")
    model = XGBClassifier(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        gamma=0.1,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print("\n" + "=" * 50)
    print("EVALUATION RESULTS (URL-only features)")
    print("=" * 50)
    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.6f}")
    print(f"Precision: {precision_score(y_test, y_pred):.6f}")
    print(f"Recall:    {recall_score(y_test, y_pred):.6f}")
    print(f"F1 Score:  {f1_score(y_test, y_pred):.6f}")
    print(f"ROC-AUC:   {roc_auc_score(y_test, y_prob):.6f}")
    print(f"\n{classification_report(y_test, y_pred, target_names=['Phishing', 'Legitimate'])}")

    # Feature importance
    importance = sorted(
        zip(URL_ONLY_FEATURES, model.feature_importances_),
        key=lambda x: x[1],
        reverse=True,
    )
    print("Top 10 features by importance:")
    for feat, imp in importance[:10]:
        print(f"  {feat:30s} {imp:.4f}")

    # Save model
    model_path = os.path.join(PROJECT_ROOT, "backend", "models", "phishing_xgb.json")
    model.save_model(model_path)
    print(f"\nModel saved to {model_path}")


if __name__ == "__main__":
    main()
