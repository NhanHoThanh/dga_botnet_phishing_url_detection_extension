# Backend API Contract

This document specifies the API contract between the browser extension and the Python Flask backend.

## Endpoint

```
POST /analyze
```

## Request Format

### Headers

```
Content-Type: application/json
```

### Body

```json
{
  "url": "https://example.com/suspicious/path?param=value"
}
```

### Request Schema

| Field | Type   | Required | Description                    |
|-------|--------|----------|--------------------------------|
| url   | string | Yes      | Full URL to analyze (including protocol) |

### Example Request

```bash
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://suspicious-site.com/login"}'
```

## Response Format

### Success Response (200 OK)

```json
{
  "verdict": "Malicious",
  "risk_score": 82,
  "reasons": [
    "Domain mimics google.com",
    "Newly registered domain (< 30 days)",
    "Contains phishing keyword: login",
    "Flagged by Google Safe Browsing",
    "Matches PhishTank database"
  ],
  "confidence": 0.95,
  "metadata": {
    "domain_age_days": 5,
    "tld": ".tk",
    "external_flags": {
      "google_safe_browsing": true,
      "phishtank": true
    }
  }
}
```

### Response Schema

| Field      | Type   | Required | Description                                  |
|------------|--------|----------|----------------------------------------------|
| verdict    | string | Yes      | One of: "Safe", "Suspicious", "Malicious"    |
| risk_score | number | Yes      | Risk score from 0 to 100                     |
| reasons    | array  | Yes      | Array of strings explaining detection signals|
| confidence | number | No       | Confidence level (0.0 to 1.0)                |
| metadata   | object | No       | Additional analysis details                  |

### Verdict Values

- **"Safe"** (risk_score: 0-29) - No significant threats detected
- **"Suspicious"** (risk_score: 30-59) - Some red flags, proceed with caution
- **"Malicious"** (risk_score: 60-100) - Clear phishing indicators, block recommended

### Error Response (400 Bad Request)

```json
{
  "error": "Invalid URL format",
  "code": "INVALID_URL"
}
```

### Error Response (500 Internal Server Error)

```json
{
  "error": "Backend analysis failed",
  "code": "ANALYSIS_ERROR"
}
```

### Error Response (429 Too Many Requests)

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT",
  "retry_after": 60
}
```

## Analysis Components

Your Flask backend should implement the following analysis techniques:

### 1. Dataset Exact Match

- **650k URL dataset** - Check if URL exists in known phishing database
- **Weight**: 40 points if match found

### 2. Bloom Filter

- **Fast probabilistic check** for URL membership
- **Weight**: 30 points if positive match

### 3. ML Classification

- **Machine Learning model** trained on phishing features
- Extract features: URL length, special chars, keywords, etc.
- **Weight**: 35 points based on ML confidence

### 4. Google Safe Browsing

- **External API**: Check against Google's blacklist
- **Weight**: 40 points if flagged

### 5. PhishTank Lookup

- **External API**: Query PhishTank database
- **Weight**: 35 points if listed

### 6. Typosquatting Detection

- **Levenshtein distance** from popular domains
- **Homograph detection** (visually similar chars)
- **Weight**: 30 points if typosquatting detected

### 7. WHOIS Domain Age

- **Young domains** (< 30 days) are suspicious
- **Weight**: 15-25 points based on age

### 8. URL Pattern Analysis

- **Regex patterns** for common phishing structures
- **Subdomain depth** (legitimate sites rarely exceed 3)
- **Weight**: 10-20 points

## Weighted Scoring Algorithm

The backend should use a weighted scoring system:

```python
total_score = 0
max_score = 100

# Dataset match (40 points)
if url in phishing_dataset:
    total_score += 40

# Bloom filter (30 points)
if bloom_filter.check(url):
    total_score += 30

# ML model (35 points, scaled by confidence)
ml_confidence = ml_model.predict(url)
total_score += 35 * ml_confidence

# Google Safe Browsing (40 points)
if google_safe_browsing.check(url):
    total_score += 40

# PhishTank (35 points)
if phishtank.check(url):
    total_score += 35

# Typosquatting (30 points)
if detect_typosquatting(url):
    total_score += 30

# Domain age (25 points for < 30 days)
domain_age = get_domain_age(url)
if domain_age < 30:
    total_score += 25 * ((30 - domain_age) / 30)

# Normalize to 0-100
final_score = min(100, total_score)

# Determine verdict
if final_score < 30:
    verdict = "Safe"
elif final_score < 60:
    verdict = "Suspicious"
else:
    verdict = "Malicious"
```

## CORS Configuration

Your Flask backend **must** enable CORS to accept requests from the Chrome extension.

### Flask-CORS Setup

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# OR, for specific origin:
CORS(app, resources={r"/analyze": {"origins": "chrome-extension://*"}})
```

### Manual CORS Headers

```python
from flask import jsonify, request

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return response
```

## Rate Limiting

Implement server-side rate limiting to prevent abuse:

```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=lambda: request.remote_addr,
    default_limits=["100 per hour"]
)

@app.route('/analyze', methods=['POST'])
@limiter.limit("20 per minute")
def analyze():
    # Analysis logic
    pass
```

## Performance Requirements

- **Response time**: < 2 seconds (target: < 1 second)
- **Timeout**: Extension will timeout after 10 seconds
- **Keep response payload small**: < 10 KB

## Example Flask Implementation

```python
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    
    # Validate input
    if not data or 'url' not in data:
        return jsonify({
            'error': 'URL required',
            'code': 'MISSING_URL'
        }), 400
    
    url = data['url']
    
    # Validate URL format
    if not url.startswith(('http://', 'https://')):
        return jsonify({
            'error': 'Invalid URL format',
            'code': 'INVALID_URL'
        }), 400
    
    try:
        # Run analysis (implement your logic)
        result = run_phishing_analysis(url)
        
        return jsonify({
            'verdict': result['verdict'],
            'risk_score': result['risk_score'],
            'reasons': result['reasons'],
            'confidence': result.get('confidence', 0.0),
            'metadata': result.get('metadata', {})
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Analysis failed',
            'code': 'ANALYSIS_ERROR'
        }), 500

def run_phishing_analysis(url):
    """
    Implement your phishing detection logic here
    """
    # Placeholder - replace with actual implementation
    return {
        'verdict': 'Suspicious',
        'risk_score': 45,
        'reasons': ['Example reason 1', 'Example reason 2'],
        'confidence': 0.75
    }

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

## Testing the API

### Using curl

```bash
# Test safe URL
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com"}'

# Test suspicious URL
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://g00gle-login-verify.tk/account"}'

# Test error handling
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "invalid-url"}'
```

### Using Python requests

```python
import requests

response = requests.post(
    'http://localhost:5000/analyze',
    json={'url': 'https://suspicious-site.com'}
)

print(response.json())
```

## Security Considerations

1. **Input Validation** - Always validate and sanitize the URL
2. **SQL Injection** - Use parameterized queries for database lookups
3. **SSRF Protection** - Don't blindly fetch URLs sent by clients
4. **Rate Limiting** - Implement both client and server-side limits
5. **Logging** - Log all requests for security auditing (but not sensitive data)
6. **HTTPS Only** - Use HTTPS in production
7. **Authentication** (Optional) - Add API keys if needed

## Monitoring & Logging

Log the following for analytics:

```python
import logging

logging.info(f"Analyzed URL: {url}, Verdict: {verdict}, Score: {risk_score}")
```

Track metrics:
- Request count
- Average response time
- Verdict distribution (safe/suspicious/malicious)
- Cache hit rate
- External API latency

---

**For extension integration questions, see [README.md](./README.md)**
