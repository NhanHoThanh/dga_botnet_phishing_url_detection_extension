"""
Train XGBoost model for DGA (Domain Generation Algorithm) detection
using the ExtraHop DGA Training Dataset.

Features: 64-position character encoding + 7 statistical features = 71 features

Usage:
    python training/train_dga.py [--sample N]

    --sample N   Use N rows instead of full 16M dataset (for faster iteration)

Outputs:
    backend/models/dga_xgb.json  - trained XGBoost model
"""

import argparse
import json
import math
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

# Character encoding lookup (from DGA-or-Benign repo)
CHAR_MAP = {
    "a": 5, "b": 9, "c": 17, "d": 30, "e": 22, "f": 2, "g": 35, "h": 19,
    "i": 12, "j": 28, "k": 20, "l": 24, "m": 10, "n": 13, "o": 7,
    "p": 26, "q": 4, "r": 37, "s": 11, "t": 15, "u": 16, "v": 25,
    "w": 6, "x": 8, "y": 1, "z": 3, "0": 36, "1": 23, "2": 31,
    "3": 33, "4": 27, "5": 29, "6": 38, "7": 32, "8": 14, "9": 21,
    "-": 39, ".": 18, "_": 34,
}

VOWELS = set("aeiou")
CONSONANTS = set("bcdfghjklmnpqrstvwxyz")
MAX_DOMAIN_LEN = 64


def compute_entropy(s: str) -> float:
    """Shannon entropy of a string."""
    if not s:
        return 0.0
    freq = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    length = len(s)
    return -sum((c / length) * math.log2(c / length) for c in freq.values())


def longest_consecutive_consonants(s: str) -> int:
    """Length of the longest run of consecutive consonants."""
    max_run = 0
    current = 0
    for ch in s.lower():
        if ch in CONSONANTS:
            current += 1
            max_run = max(max_run, current)
        else:
            current = 0
    return max_run


def encode_domain(domain: str) -> list:
    """Encode a domain into 71 features: 64 char positions + 7 stats."""
    original = domain
    domain_lower = domain.lower()

    # Character encoding: right-aligned in 64-element vector, zero-padded
    char_encoded = [0] * MAX_DOMAIN_LEN
    chars = list(domain_lower[:MAX_DOMAIN_LEN])
    offset = MAX_DOMAIN_LEN - len(chars)
    for i, ch in enumerate(chars):
        char_encoded[offset + i] = CHAR_MAP.get(ch, 0)

    # Statistical features
    length = len(domain_lower)
    capitals = sum(1 for ch in original if ch.isupper())
    digits = sum(1 for ch in domain_lower if ch.isdigit())
    consec_consonants = longest_consecutive_consonants(domain_lower)
    vowel_ratio = sum(1 for ch in domain_lower if ch in VOWELS) / max(length, 1)
    entropy = compute_entropy(domain_lower)
    unique_chars = len(set(domain_lower))

    return char_encoded + [length, capitals, digits, consec_consonants, vowel_ratio, entropy, unique_chars]


def load_extrahop_data(path: str, sample_size: int | None = None) -> pd.DataFrame:
    """Load the ExtraHop NDJSON dataset."""
    print(f"Loading ExtraHop dataset from {path}...")
    domains = []
    labels = []
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            row = json.loads(line)
            domains.append(row["domain"])
            labels.append(1 if row["threat"] == "dga" else 0)

    df = pd.DataFrame({"domain": domains, "label": labels})
    print(f"Full dataset: {len(df)} rows")
    print(f"Label distribution:\n{df['label'].value_counts()}")

    if sample_size and sample_size < len(df):
        df = df.sample(n=sample_size, random_state=42).reset_index(drop=True)
        print(f"Sampled to {len(df)} rows")

    return df


def featurize(domains: pd.Series) -> np.ndarray:
    """Convert a series of domain strings to feature matrix."""
    print("Engineering features...")
    features = []
    for i, domain in enumerate(domains):
        features.append(encode_domain(str(domain)))
        if (i + 1) % 500000 == 0:
            print(f"  Processed {i + 1}/{len(domains)} domains...")
    return np.array(features, dtype=np.float32)


def main():
    parser = argparse.ArgumentParser(description="Train DGA XGBoost model")
    parser.add_argument(
        "--sample", type=int, default=None,
        help="Use N rows instead of full dataset (e.g. --sample 2000000)",
    )
    args = parser.parse_args()

    # Load dataset
    data_path = os.path.join(
        PROJECT_ROOT, "dga-training-data-encoded.json"
    )
    df = load_extrahop_data(data_path, sample_size=args.sample)

    # Featurize
    X = featurize(df["domain"])
    y = df["label"].values
    feature_names = [f"char_{i}" for i in range(MAX_DOMAIN_LEN)] + [
        "length", "capitals", "digits", "consonants_consec",
        "vowel_ratio", "entropy", "unique_chars",
    ]
    print(f"Feature matrix shape: {X.shape}")

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
    print("EVALUATION RESULTS (DGA Detection)")
    print("=" * 50)
    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.6f}")
    print(f"Precision: {precision_score(y_test, y_pred):.6f}")
    print(f"Recall:    {recall_score(y_test, y_pred):.6f}")
    print(f"F1 Score:  {f1_score(y_test, y_pred):.6f}")
    print(f"ROC-AUC:   {roc_auc_score(y_test, y_prob):.6f}")
    print(f"\n{classification_report(y_test, y_pred, target_names=['Benign', 'DGA'])}")

    # Feature importance (top stats features)
    importances = model.feature_importances_
    stat_importance = list(zip(feature_names[64:], importances[64:]))
    stat_importance.sort(key=lambda x: x[1], reverse=True)
    print("Statistical feature importance:")
    for feat, imp in stat_importance:
        print(f"  {feat:25s} {imp:.4f}")

    char_total = importances[:64].sum()
    stat_total = importances[64:].sum()
    print(f"\nChar encoding total importance: {char_total:.4f}")
    print(f"Statistical features total importance: {stat_total:.4f}")

    # Save model
    model_path = os.path.join(PROJECT_ROOT, "backend", "models", "dga_xgb.json")
    model.save_model(model_path)
    print(f"\nModel saved to {model_path}")


if __name__ == "__main__":
    main()
