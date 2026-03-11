"""
SHAP (SHapley Additive exPlanations) analysis for both models.
Generates SHAP summary statistics and per-sample explanations.

Usage:
    python training/shap_analysis.py

Requires: shap, xgboost, pandas, numpy, sklearn
"""

import json
import math
import os
import sys

import numpy as np
import pandas as pd
import shap
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# === PhiUSIIL features ===
URL_ONLY_FEATURES = [
    "URLLength", "DomainLength", "IsDomainIP", "URLSimilarityIndex",
    "CharContinuationRate", "TLDLegitimateProb", "URLCharProb", "TLDLength",
    "NoOfSubDomain", "HasObfuscation", "NoOfObfuscatedChar", "ObfuscationRatio",
    "NoOfLettersInURL", "LetterRatioInURL", "NoOfDegitsInURL", "DegitRatioInURL",
    "NoOfEqualsInURL", "NoOfQMarkInURL", "NoOfAmpersandInURL",
    "NoOfOtherSpecialCharsInURL", "SpacialCharRatioInURL", "IsHTTPS",
    "Bank", "Pay", "Crypto",
]

# === DGA features ===
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


def compute_entropy(s):
    if not s:
        return 0.0
    freq = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    length = len(s)
    return -sum((c / length) * math.log2(c / length) for c in freq.values())


def longest_consecutive_consonants(s):
    max_run = current = 0
    for ch in s.lower():
        if ch in CONSONANTS:
            current += 1
            max_run = max(max_run, current)
        else:
            current = 0
    return max_run


def encode_domain(domain):
    domain_lower = domain.lower()
    char_encoded = [0] * MAX_DOMAIN_LEN
    chars = list(domain_lower[:MAX_DOMAIN_LEN])
    offset = MAX_DOMAIN_LEN - len(chars)
    for i, ch in enumerate(chars):
        char_encoded[offset + i] = CHAR_MAP.get(ch, 0)
    length = len(domain_lower)
    capitals = sum(1 for ch in domain if ch.isupper())
    digits = sum(1 for ch in domain_lower if ch.isdigit())
    consec = longest_consecutive_consonants(domain_lower)
    vowel_ratio = sum(1 for ch in domain_lower if ch in VOWELS) / max(length, 1)
    entropy = compute_entropy(domain_lower)
    unique = len(set(domain_lower))
    return char_encoded + [length, capitals, digits, consec, vowel_ratio, entropy, unique]


def analyze_phishing_shap():
    """Run SHAP on the phishing model."""
    print("=" * 60)
    print("SHAP ANALYSIS: Phishing URL Detection Model")
    print("=" * 60)

    # Load model
    model_path = os.path.join(PROJECT_ROOT, "backend", "models", "phishing_xgb.json")
    model = XGBClassifier()
    model.load_model(model_path)

    # Load data
    csv_path = os.path.join(PROJECT_ROOT, "PhiUSIIL_Phishing_URL_Dataset.csv")
    if not os.path.exists(csv_path):
        csv_path = os.path.join(PROJECT_ROOT, "PhiUSIIL-Phishing-URL-Detection", "Dataset", "Dataset.csv")
    df = pd.read_csv(csv_path)
    X = df[URL_ONLY_FEATURES].copy()
    y = df["label"].copy()

    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Test set: {len(X_test)} samples")

    # SHAP TreeExplainer
    print("Computing SHAP values (TreeExplainer)...")
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_test)

    # Mean absolute SHAP per feature
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    shap_ranking = sorted(zip(URL_ONLY_FEATURES, mean_abs_shap), key=lambda x: x[1], reverse=True)

    print("\n--- Mean |SHAP| Feature Importance ---")
    print(f"{'Rank':<6}{'Feature':<35}{'Mean |SHAP|':<15}{'% Total':<10}")
    print("-" * 66)
    total_shap = sum(v for _, v in shap_ranking)
    for i, (feat, val) in enumerate(shap_ranking, 1):
        pct = val / total_shap * 100
        print(f"{i:<6}{feat:<35}{val:<15.4f}{pct:<10.1f}")

    # Example explanations: pick 1 phishing and 1 legitimate from test set
    print("\n--- Example SHAP Explanations ---")
    phishing_idx = y_test[y_test == 0].index[0]
    legit_idx = y_test[y_test == 1].index[0]

    for label_name, idx in [("Phishing URL", phishing_idx), ("Legitimate URL", legit_idx)]:
        row_pos = X_test.index.get_loc(idx)
        sv = shap_values[row_pos]
        features = X_test.iloc[row_pos]
        pred_prob = model.predict_proba(X_test.iloc[[row_pos]])[:, 1][0]

        print(f"\n  [{label_name}] Predicted P(legitimate) = {pred_prob:.4f}")
        print(f"  Base value (E[f(x)]): {explainer.expected_value:.4f}")
        top_contributors = sorted(zip(URL_ONLY_FEATURES, sv, features), key=lambda x: abs(x[1]), reverse=True)[:5]
        print(f"  {'Feature':<35}{'Value':<12}{'SHAP':<12}{'Direction'}")
        print(f"  {'-'*70}")
        for feat, shap_val, feat_val in top_contributors:
            direction = "-> legitimate" if shap_val > 0 else "-> phishing"
            print(f"  {feat:<35}{feat_val:<12.4f}{shap_val:<+12.4f}{direction}")

    return shap_ranking, explainer.expected_value


def analyze_dga_shap():
    """Run SHAP on the DGA model."""
    print("\n" + "=" * 60)
    print("SHAP ANALYSIS: DGA Detection Model")
    print("=" * 60)

    # Load model
    model_path = os.path.join(PROJECT_ROOT, "backend", "models", "dga_xgb.json")
    model = XGBClassifier()
    model.load_model(model_path)

    # Load data (sample for speed)
    data_path = os.path.join(PROJECT_ROOT, "dga-training-data-encoded.json")
    print("Loading DGA dataset (sampling 100k for SHAP)...")
    domains, labels = [], []
    with open(data_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            row = json.loads(line)
            domains.append(row["domain"])
            labels.append(1 if row["threat"] == "dga" else 0)
    df = pd.DataFrame({"domain": domains, "label": labels})
    df = df.sample(n=100000, random_state=42).reset_index(drop=True)

    # Featurize
    print("Engineering features...")
    feature_names = [f"char_{i}" for i in range(MAX_DOMAIN_LEN)] + [
        "length", "capitals", "digits", "consonants_consec",
        "vowel_ratio", "entropy", "unique_chars",
    ]
    features = np.array([encode_domain(d) for d in df["domain"]], dtype=np.float32)
    X = pd.DataFrame(features, columns=feature_names)
    y = df["label"]

    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Test set: {len(X_test)} samples")

    # SHAP - use a subsample for speed
    shap_sample = X_test.sample(n=min(5000, len(X_test)), random_state=42)
    print(f"Computing SHAP values on {len(shap_sample)} samples...")
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(shap_sample)

    # Mean absolute SHAP per feature
    mean_abs_shap = np.abs(shap_values).mean(axis=0)

    # Group: char encoding vs statistical
    char_shap = mean_abs_shap[:64].sum()
    stat_shap = mean_abs_shap[64:].sum()
    total_shap = char_shap + stat_shap

    print(f"\n--- SHAP by Feature Group ---")
    print(f"  Character encoding (64 features): {char_shap:.4f} ({char_shap/total_shap*100:.1f}%)")
    print(f"  Statistical features (7 features): {stat_shap:.4f} ({stat_shap/total_shap*100:.1f}%)")

    # Rank statistical features
    stat_names = feature_names[64:]
    stat_shap_values = mean_abs_shap[64:]
    stat_ranking = sorted(zip(stat_names, stat_shap_values), key=lambda x: x[1], reverse=True)

    print(f"\n--- Statistical Features Ranked by Mean |SHAP| ---")
    print(f"{'Rank':<6}{'Feature':<25}{'Mean |SHAP|':<15}{'% of Stats':<10}")
    print("-" * 56)
    for i, (feat, val) in enumerate(stat_ranking, 1):
        pct = val / stat_shap * 100
        print(f"{i:<6}{feat:<25}{val:<15.4f}{pct:<10.1f}")

    # Top char positions
    char_ranking = sorted(enumerate(mean_abs_shap[:64]), key=lambda x: x[1], reverse=True)[:5]
    print(f"\n--- Top 5 Character Positions by Mean |SHAP| ---")
    for rank, (pos, val) in enumerate(char_ranking, 1):
        actual_pos = pos - (64 - 1)  # right-aligned, so position 63 = last char
        print(f"  {rank}. char_{pos} (position ~{64-pos} from end): {val:.4f}")

    # Example explanations
    print("\n--- Example SHAP Explanations ---")
    dga_idx = y_test[y_test == 1].index[0]
    benign_idx = y_test[y_test == 0].index[0]

    for label_name, idx in [("DGA Domain", dga_idx), ("Benign Domain", benign_idx)]:
        domain = df.loc[idx, "domain"]
        row_data = X_test.loc[[idx]]
        if idx not in shap_sample.index:
            sv = explainer.shap_values(row_data)[0]
        else:
            sv = shap_values[shap_sample.index.get_loc(idx)]

        pred_prob = model.predict_proba(row_data)[:, 1][0]
        print(f"\n  [{label_name}] Domain: '{domain}', P(DGA) = {pred_prob:.4f}")

        # Show top 5 stat features contribution
        stat_sv = sv[64:]
        stat_features = row_data.iloc[0, 64:]
        top_stat = sorted(zip(stat_names, stat_sv, stat_features), key=lambda x: abs(x[1]), reverse=True)[:5]
        print(f"  {'Feature':<25}{'Value':<12}{'SHAP':<12}{'Direction'}")
        print(f"  {'-'*60}")
        for feat, shap_val, feat_val in top_stat:
            direction = "-> DGA" if shap_val > 0 else "-> benign"
            print(f"  {feat:<25}{feat_val:<12.4f}{shap_val:<+12.4f}{direction}")

    return stat_ranking, char_shap, stat_shap


if __name__ == "__main__":
    phishing_ranking, phishing_base = analyze_phishing_shap()
    dga_stat_ranking, dga_char_shap, dga_stat_shap = analyze_dga_shap()

    print("\n" + "=" * 60)
    print("SHAP analysis complete.")
    print("=" * 60)
