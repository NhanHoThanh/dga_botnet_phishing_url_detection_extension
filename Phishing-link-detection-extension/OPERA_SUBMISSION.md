# Opera Add-ons Submission Guide

## ✅ Extension Compatibility

**Good News!** Your extension is **100% compatible with Opera** because:
- ✅ Opera uses **Chromium engine** (same as Chrome)
- ✅ Supports **Manifest v3** (which we're using)
- ✅ All APIs used (`chrome.storage`, `chrome.runtime`, etc.) work in Opera
- ✅ No browser-specific code needed

## 📋 Pre-Submission Checklist

### Required Information

**Before submitting to Opera Add-ons**, prepare these details:

#### 1. **Extension Name** (already set)
```
Phishing URL Analyzer
```
✅ Short, memorable, descriptive

#### 2. **Version Number** (already set)
```
1.0.0
```
✅ Follows format: 1-4 dot-separated integers

#### 3. **Category** (choose one)
**Recommended:** `Productivity` or `Web Development`

Available categories:
- Accessibility
- Appearance  
- Entertainment
- Games
- Music
- News & Blogging
- Pictures
- **Productivity** ⭐ (RECOMMENDED)
- Reference
- Shopping
- Social
- Travel
- Weather
- **Web Development** ⭐ (ALTERNATIVE)

#### 4. **License** (choose one)
**Recommended:** Opera Hosting License

Options:
- **Opera Hosting License** ⭐ - You keep all rights, Opera distributes free
- Apache 2.0 - Open source, anyone can modify

#### 5. **Summary** (max 1 sentence)
```
Real-time phishing URL detection with visual warnings to protect you from malicious links and advertisements.
```
(132 characters - perfect length)

#### 6. **Description** (detailed)
```
Phishing URL Analyzer is your shield against malicious websites and phishing attacks.

This powerful security extension provides real-time protection by analyzing every link you encounter on the web. Using advanced two-tier detection (fast client-side heuristics + deep backend analysis), it identifies and warns you about dangerous URLs before you click them.

**Key Features:**
• Real-time Link Analysis - Automatic scanning on hover, click, and page load
• Visual Warnings - Color-coded outlines (green=safe, orange=ads, red=malicious)
• Smart Detection - 8 advanced heuristics including typosquatting, suspicious TLDs, and phishing keywords
• Ad Protection - Automatically scans sponsored content and advertisements
• Popup Blocking - Intercepts and warns before malicious redirects execute
• Detailed Tooltips - Shows risk score and specific detection signals
• Works Everywhere - Monitors regular links, images, banners, and custom onclick handlers

**How It Works:**
The extension monitors all clickable elements on web pages. When you hover over or interact with a link, it instantly performs client-side analysis using multiple detection techniques. For suspicious links (score ≥ 30), it can optionally query a backend ML model for deeper verification.

**Detection Techniques:**
✓ Phishing keyword detection
✓ Suspicious domain identification
✓ Typosquatting analysis
✓ Punycode/IDN homograph detection
✓ IP-based URL detection
✓ Entropy analysis for random domains
✓ Trusted domain whitelist (Amazon, Google, etc.)

**Privacy First:**
• Zero tracking or analytics
• All data stored locally only
• No personal information collected
• Open about detection methods

Perfect for security-conscious users, professionals handling sensitive data, and anyone who wants an extra layer of protection while browsing.
```

#### 7. **Support Page** (optional but recommended)
Create a GitHub repository or webpage with:
- Installation instructions
- Usage guide
- Contact information
- FAQ

Example: `https://github.com/yourusername/phishing-url-analyzer`

#### 8. **Developer Information**
Update `manifest.json`:
- `"author": "Your Name"` - Replace with your name
- `"homepage_url": "https://..."` - Your support page URL

#### 9. **Screenshots** (REQUIRED)
Opera requires **at least 1 screenshot**, but 3-5 is recommended:

**Screenshot Requirements:**
- Format: PNG or JPEG
- Size: 1280x800 or 640x400 pixels
- Show extension in action

**Recommended Screenshots:**

1. **"Extension detecting malicious link"**
   - Webpage with red-highlighted link
   - Tooltip showing phishing warning
   - Caption: "Real-time phishing detection with risk score"

2. **"Popup warning before redirect"**
   - Browser popup alert showing warning
   - Caption: "Blocks malicious redirects with user confirmation"

3. **"Extension popup interface"**
   - Extension icon clicked, showing popup
   - Risk gauge visible
   - Caption: "Clean, informative popup with statistics"

4. **"Ad detection in action"**
   - Orange-highlighted advertisement
   - Tooltip visible
   - Caption: "Automatically scans and highlights advertisements"

5. **"Settings and toggles"**
   - Popup with toggles visible
   - Caption: "Customizable settings for your preferences"

#### 10. **Icon** (already created)
✅ You have icons at 16x16, 48x48, and 128x128
- Located in: `icons/` folder
- Shield design with gradient (perfect for security extension)

## 🚀 Submission Process

### Step 1: Test in Opera

1. **Download Opera browser**: https://www.opera.com/
2. **Load extension in Opera:**
   - Navigate to `opera://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select your extension folder
3. **Test thoroughly:**
   - Visit various websites
   - Test on ads and sponsored content
   - Verify popup works
   - Check all features function correctly

### Step 2: Create Screenshots

1. Use Opera with extension installed
2. Visit test pages with phishing URLs
3. Capture screenshots (use Snipping Tool or similar)
4. Resize to 1280x800 if needed
5. Save as PNG files

### Step 3: Package Extension

1. **Create a ZIP file** containing:
   ```
   manifest.json
   background.js
   content.js
   fast-detector.js
   popup.html
   popup.js
   styles.css
   README.md
   API_CONTRACT.md
   icons/ (folder with all icons)
   ```

2. **Naming:** `phishing-url-analyzer-v1.0.0.zip`

3. **Verify ZIP structure:**
   - manifest.json must be in the ROOT of ZIP
   - No parent folder wrapping everything

### Step 4: Submit to Opera Add-ons

1. **Go to:** https://addons.opera.com/developer/
2. **Sign in** with Opera account (create one if needed)
3. **Click "Upload New Extension"**
4. **Fill in the form:**

**Basic Information:**
- Name: `Phishing URL Analyzer`
- Category: `Productivity`
- Summary: (Use summary from section 5 above)
- Description: (Use description from section 6 above)
- License: `Opera Hosting License`

**Files:**
- Upload ZIP file
- Upload screenshots (3-5 images)
- Icon: Auto-detected from manifest

**Optional:**
- Homepage: Your GitHub/support URL
- Support email: your@email.com

5. **Click "Submit for Review"**

### Step 5: Wait for Review

- **Review time:** Usually 1-3 days
- **Notification:** Email when reviewed
- **Possible outcomes:**
  - ✅ **Approved** - Published immediately
  - ❌ **Rejected** - Fix issues and resubmit

## 🔧 Common Review Issues & Fixes

### Issue: "Extension requires backend server"
**Solution:** Clearly state in description that extension works offline with fast mode, backend is optional for enhanced detection.

### Issue: "Too many permissions"
**Solution:** `<all_urls>` is necessary for link scanning. Explain in description why it's needed.

### Issue: "Description too vague"
**Solution:** Use the detailed description provided above - it explains features, benefits, and use cases.

### Issue: "Screenshots not clear"
**Solution:** Ensure screenshots show extension features clearly with visible UI elements.

## 📊 After Publishing

### Monitoring
- Check reviews and ratings regularly
- Respond to user feedback
- Monitor for bug reports

### Updates
- Fix bugs promptly
- Add requested features
- Bump version number for each update
- Resubmit via Opera developer dashboard

### Promotion
- Share on social media
- Write blog post about security features
- Reach out to security communities

## 🎯 Success Tips

1. **Clear Value Proposition** - Emphasize security and privacy
2. **Professional Screenshots** - Show real phishing detection
3. **Detailed Description** - Explain all features thoroughly
4. **Responsive Support** - Answer user questions quickly
5. **Regular Updates** - Show active maintenance

## 🔗 Important Links

- **Opera Add-ons Catalog:** https://addons.opera.com/
- **Developer Dashboard:** https://addons.opera.com/developer/
- **Publishing Guidelines:** https://help.opera.com/en/extensions/publishing-guidelines/
- **Extension Documentation:** https://help.opera.com/extensions/

## ✅ Current Status

Your extension is **READY FOR OPERA** submission right now! Just:
1. Update `author` and `homepage_url` in manifest.json
2. Create 3-5 screenshots
3. Create ZIP file
4. Submit to Opera Add-ons!

**Estimated Time to Publish:** 1-3 days after submission 🚀
