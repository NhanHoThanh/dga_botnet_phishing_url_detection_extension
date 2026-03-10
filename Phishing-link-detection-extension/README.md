# 🛡️ Phishing URL Analyzer - Browser Extension

A production-ready Chrome browser extension that detects phishing URLs in real-time using a two-tier detection system: fast client-side heuristics and deep backend analysis via Python Flask API.

## ✨ Features

- **Real-Time Link Analysis** - Automatically scans links on hover, drag, right-click
- **Two-Tier Detection System**
  - ⚡ **Fast Mode**: Instant client-side heuristics (0ms latency)
  - 🔍 **Deep Mode**: Backend ML analysis via Flask API
- **Visual Warnings** - Color-coded link highlighting (green/yellow/red)
- **Smart Ad Detection** - Automatically scans sponsored content and advertisements
- **Explainable Results** - Every verdict includes risk score and contributing factors
- **Intelligent Caching** - 24-hour result cache reduces API calls
- **Rate Limiting** - Built-in protection (10 requests/minute)
- **Offline Support** - Graceful fallback to fast mode when backend is unavailable

## 🚀 Installation

### For Development (Unpacked Extension)

1. **Clone or download** this extension folder to your computer

2. **Open Chrome** and navigate to `chrome://extensions/`

3. **Enable Developer Mode** (toggle in top-right corner)

4. Click **"Load unpacked"**

5. Select the extension folder: `Phishing analysis extension`

6. The extension is now installed! Look for the shield icon 🛡️ in your toolbar

### Backend Setup (Required for Deep Analysis)

The extension requires a Python Flask backend for deep phishing analysis. 

1. **Start your Flask backend** (default: `http://localhost:5000`)

2. The backend must expose a `POST /analyze` endpoint - see [API_CONTRACT.md](./API_CONTRACT.md)

3. **Configure backend URL** (if different from localhost):
   - The extension defaults to `http://localhost:5000`
   - To change: Edit `CONFIG.BACKEND_URL` in `background.js`

4. **Enable CORS** on your backend to accept requests from Chrome extensions

## 📖 Usage

### Basic Usage

1. **Visit any webpage** with links (e.g., Google search results, Wikipedia, news sites)

2. **Hover over a link** - The extension automatically analyzes it

3. **View the tooltip** showing:
   - Verdict (Safe / Suspicious / Malicious)
   - Risk score (0-100)
   - Detection reasons

4. **Link highlighting**:
   - 🟢 **Green outline** = Safe
   - 🟡 **Yellow outline** = Suspicious
   - 🔴 **Red outline** = Malicious (with warning icon)

### Extension Popup

Click the extension icon to view:

- **Last scanned URL** with verdict
- **Risk score gauge** (circular visualization)
- **Detection signals** (top contributing factors)
- **Statistics** (total scans, threats blocked)
- **Settings toggles**

### Settings

- **Full Analysis**: Enable backend deep scanning (recommended)
- **Auto-Scan Ads**: Automatically analyze advertisements
- **Fast Mode Only**: Skip backend, use only client-side detection

## 🔍 How It Works

### Fast Mode (Client-Side Heuristics)

The extension runs 8 instant heuristic checks:

1. **Keyword Detection** - Phishing-related words (login, verify, account, etc.)
2. **Suspicious TLD** - Risky top-level domains (.tk, .ml, .zip, etc.)
3. **Obfuscation** - Excessive hyphens or dots
4. **IP Addresses** - URLs using IPs instead of domains
5. **Punycode/IDN** - Homograph attacks (xn--)
6. **URL Length** - Unusually long URLs
7. **Entropy Analysis** - Random-looking domain names
8. **Typosquatting** - Mimicking popular brands (g00gle, paypa1, etc.)

**Scoring**: 0-29 = Safe, 30-59 = Suspicious, 60+ = Malicious

### Deep Mode (Backend API)

When fast mode detects suspicion (score ≥ 30), the extension calls your backend:

```
POST /analyze
{
  "url": "https://example.com"
}
```

Your backend should perform:
- Dataset matching (650k URLs)
- Bloom filter checks
- ML classification
- Google Safe Browsing
- PhishTank lookup
- Typosquatting detection
- WHOIS domain age

Response format:
```json
{
  "verdict": "Malicious",
  "risk_score": 82,
  "reasons": [
    "Domain mimics google.com",
    "Newly registered domain",
    "Contains keyword: login"
  ]
}
```

See full API specification in [API_CONTRACT.md](./API_CONTRACT.md)

## 🎯 Trigger Conditions

The extension analyzes URLs when:

- ✅ User hovers over a link
- ✅ User drags/selects a link
- ✅ User right-clicks a link
- ✅ Page loads ads/sponsored links (auto-scan)
- ✅ Links are dynamically injected (via MutationObserver)

Works on:
- Regular `<a href="">` links
- Google Ads / sponsored content
- Dynamically added links (React, Vue, Angular, etc.)

## 🛠️ Architecture

```
┌─────────────┐
│  Web Page   │
│   (Links)   │
└──────┬──────┘
       │ hover/click
       ▼
┌─────────────┐
│ Content.js  │ ← Fast Detector (client-side heuristics)
└──────┬──────┘
       │ score ≥ 30
       ▼
┌─────────────┐
│Background.js│ ← API client, caching, rate limiting
└──────┬──────┘
       │ POST /analyze
       ▼
┌─────────────┐
│ Flask API   │ ← ML model, datasets, external APIs
└─────────────┘
```

## 📂 File Structure

```
Phishing analysis extension/
├── manifest.json          # Extension configuration (Manifest v3)
├── background.js          # Service worker (API, caching, rate limiting)
├── content.js             # Link monitoring, tooltip, visual feedback
├── fast-detector.js       # Client-side heuristics
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── styles.css             # Visual styles (highlighting, tooltips)
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md              # This file
└── API_CONTRACT.md        # Backend API specification
```

## 🔒 Privacy & Security

- ✅ **Zero data collection** - No tracking or analytics
- ✅ **Local-only storage** - Results cached locally only
- ✅ **No third-party requests** - Only communicates with your backend
- ✅ **URL sanitization** - All inputs validated before processing
- ✅ **CSP compliant** - Strict Content Security Policy
- ✅ **HTTPS enforced** - Production backend must use HTTPS

## ⚙️ Configuration

### Backend URL

Edit `background.js`:

```javascript
const CONFIG = {
  BACKEND_URL: 'https://your-api.example.com', // Change this
  // ...
};
```

### Rate Limiting

Edit `background.js`:

```javascript
const CONFIG = {
  RATE_LIMIT_WINDOW: 60000,  // 1 minute in ms
  RATE_LIMIT_MAX: 10,        // Max requests per window
  // ...
};
```

### Cache Duration

Edit `background.js`:

```javascript
const CONFIG = {
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours in ms
  // ...
};
```

## 🧪 Testing

### Manual Testing

1. **Test on Wikipedia** - Many safe links
2. **Test on Google Search** - Mix of organic + ads
3. **Test on PhishTank** - Known phishing URLs
4. **Test offline** - Disconnect backend, verify fallback
5. **Test dynamic sites** - Twitter, Gmail (SPA frameworks)

### Known Phishing URLs for Testing

⚠️ **WARNING: Do NOT click these links!** Use for testing only.

- Find test URLs at: https://phishtank.org/
- Use URL shorteners for redirect testing
- Test with typosquatted domains (e.g., g00gle.com)

## 🐛 Troubleshooting

### "Backend is unreachable"

- ✅ Ensure Flask backend is running
- ✅ Check backend URL in `background.js`
- ✅ Verify CORS is enabled on backend
- ✅ Check browser console for errors (F12)

### Links not highlighting

- ✅ Check extension is enabled (`chrome://extensions/`)
- ✅ Refresh the page after installing extension
- ✅ Check browser console for JavaScript errors

### Tooltips not appearing

- ✅ Ensure you're hovering for 200ms
- ✅ Check `styles.css` is loaded
- ✅ Verify z-index conflicts with page styles

### Rate limit exceeded

- ✅ Wait 1 minute before scanning more links
- ✅ Increase limit in `background.js` CONFIG
- ✅ Enable "Fast Mode Only" in popup settings

## 🚀 Future Improvements

- 🔄 URL shortener expansion
- 🌐 Multi-language support
- 📊 Advanced analytics dashboard
- 🔔 Desktop notifications for threats
- 🦊 Firefox port (Manifest v2/v3)
- ⚡ WebAssembly for faster heuristics
- 🤖 On-device ML model (TensorFlow.js)

## 📄 License

This is a production-ready implementation. Customize and deploy as needed for your security infrastructure.

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional heuristics in fast-detector.js
- UI/UX enhancements
- Performance optimizations
- Edge case handling

## 📞 Support

For issues or questions:
1. Check browser console (F12) for errors
2. Review [API_CONTRACT.md](./API_CONTRACT.md) for backend integration
3. Verify all files are present in extension folder
4. Test with developer tools open to see network requests

---

**Built with ❤️ for security-conscious users**
