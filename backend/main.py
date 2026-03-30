"""
FastAPI backend for phishing URL and DGA detection.

Serves POST /analyze matching the browser extension's API contract.
Loads two XGBoost models:
  1. Phishing URL classifier (25 URL-only features)
  2. DGA domain classifier (71 character/statistical features)

Usage:
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import logging

import numpy as np
import tldextract
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from xgboost import XGBClassifier

from backend.feature_engineering import PhishingFeatureExtractor, extract_domain_features

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

# ─── Load models at startup ──────────────────────────────────────────────────

phishing_model: XGBClassifier | None = None
dga_model: XGBClassifier | None = None
phishing_extractor: PhishingFeatureExtractor | None = None


def load_models():
    global phishing_model, dga_model, phishing_extractor

    phishing_path = os.path.join(MODELS_DIR, "phishing_xgb.json")
    if os.path.exists(phishing_path):
        phishing_model = XGBClassifier()
        phishing_model.load_model(phishing_path)
        logger.info("Loaded phishing model from %s", phishing_path)
    else:
        logger.warning("Phishing model not found at %s", phishing_path)

    dga_path = os.path.join(MODELS_DIR, "dga_xgb.json")
    if os.path.exists(dga_path):
        dga_model = XGBClassifier()
        dga_model.load_model(dga_path)
        logger.info("Loaded DGA model from %s", dga_path)
    else:
        logger.warning("DGA model not found at %s", dga_path)

    lookups_path = os.path.join(MODELS_DIR, "phishing_lookups.json")
    phishing_extractor = PhishingFeatureExtractor(
        lookups_path if os.path.exists(lookups_path) else None
    )
    if os.path.exists(lookups_path):
        logger.info("Loaded phishing lookup tables from %s", lookups_path)


# ─── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(title="Phishing & DGA Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Chrome extensions send Origin: chrome-extension://...
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    load_models()


# ─── Request/Response Models ─────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    url: str


class ModelResult(BaseModel):
    score: float
    probability: float
    verdict: str
    reasons: list[str]


class AnalyzeResponse(BaseModel):
    verdict: str
    risk_score: int
    reasons: list[str]
    confidence: float
    phishing: ModelResult
    dga: ModelResult
    metadata: dict


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _verdict_from_score(score: float) -> str:
    if score < 30:
        return "Safe"
    elif score < 60:
        return "Suspicious"
    return "Malicious"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "phishing_model_loaded": phishing_model is not None,
        "dga_model_loaded": dga_model is not None,
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail={"error": "MISSING_URL"})

    # Extract domain info
    ext = tldextract.extract(url)
    domain = ext.domain or ""
    tld = ext.suffix or ""
    registered_domain = ext.registered_domain or domain

    reasons = []
    phishing_prob = 0.0
    dga_prob = 0.0
    phishing_reasons: list[str] = []
    dga_reasons: list[str] = []

    # ── Run phishing model ────────────────────────────────────────────────
    if phishing_model is not None and phishing_extractor is not None:
        features = phishing_extractor.extract(url).reshape(1, -1)
        # Model predicts P(legitimate), so P(phishing) = 1 - P(legitimate)
        probs = phishing_model.predict_proba(features)[0]
        phishing_prob = float(probs[0])  # class 0 = phishing

        if phishing_prob > 0.7:
            phishing_reasons.append(f"ML phishing classifier: {phishing_prob:.0%} phishing probability")
        elif phishing_prob > 0.4:
            phishing_reasons.append(f"ML phishing classifier: moderately suspicious ({phishing_prob:.0%})")
        else:
            phishing_reasons.append("URL appears safe based on phishing analysis")

    # ── Run DGA model ─────────────────────────────────────────────────────
    if dga_model is not None and domain:
        dga_features = extract_domain_features(domain).reshape(1, -1)
        dga_probs = dga_model.predict_proba(dga_features)[0]
        dga_prob = float(dga_probs[1])  # class 1 = DGA

        if dga_prob > 0.7:
            dga_reasons.append(f"Domain appears algorithmically generated (DGA score: {dga_prob:.0%})")
        elif dga_prob > 0.4:
            dga_reasons.append(f"Domain has some DGA-like characteristics ({dga_prob:.0%})")
        else:
            dga_reasons.append("Domain appears to be human-generated")

    # ── Individual model results ──────────────────────────────────────────
    phishing_score = phishing_prob * 100
    dga_score = dga_prob * 100

    phishing_result = ModelResult(
        score=round(phishing_score, 1),
        probability=round(phishing_prob, 4),
        verdict=_verdict_from_score(phishing_score),
        reasons=phishing_reasons,
    )
    dga_result = ModelResult(
        score=round(dga_score, 1),
        probability=round(dga_prob, 4),
        verdict=_verdict_from_score(dga_score),
        reasons=dga_reasons,
    )

    # ── Combine into final score ──────────────────────────────────────────
    # Phishing probability is the primary signal, DGA is secondary (capped at 80)
    combined_dga_score = dga_prob * 80
    risk_score = int(min(100, max(phishing_score, combined_dga_score)))

    # Collect all reasons
    reasons = phishing_reasons + dga_reasons
    if not reasons:
        reasons.append("URL appears safe based on ML analysis")

    verdict = _verdict_from_score(risk_score)

    # Confidence: higher when models agree, lower when they diverge
    if phishing_model is not None and dga_model is not None:
        confidence = max(phishing_prob, dga_prob)
    elif phishing_model is not None:
        confidence = phishing_prob
    elif dga_model is not None:
        confidence = dga_prob
    else:
        confidence = 0.0

    return AnalyzeResponse(
        verdict=verdict,
        risk_score=risk_score,
        reasons=reasons,
        confidence=round(confidence, 3),
        phishing=phishing_result,
        dga=dga_result,
        metadata={
            "phishing_score": round(phishing_score, 1),
            "dga_score": round(dga_score, 1),
            "domain": registered_domain,
            "tld": tld,
        },
    )
