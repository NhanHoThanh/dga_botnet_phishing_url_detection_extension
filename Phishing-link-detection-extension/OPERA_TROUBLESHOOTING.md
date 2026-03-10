# Opera Troubleshooting Guide

## Common Issue: Extension Not Working on Web Links

If the extension isn't highlighting links in Opera, follow these steps:

### Step 1: Check Extension is Loaded
1. Go to `opera://extensions`
2. Find "Phishing URL Analyzer"
3. Verify it's **enabled** (toggle should be blue/on)
4. Check if there's a **"Reload"** link - click it if present

### Step 2: Verify Permissions
1. On `opera://extensions`, click **"Details"** on your extension
2. Scroll to **"Permissions"**
3. Ensure these are granted:
   - ✅ "Read and change all your data on all websites"
   - ✅ "Store unlimited amount of client-side data"
4. If any are missing, **remove and reinstall** the extension

### Step 3: Test on Specific Pages
Opera may block extensions on certain pages. Test on:

**✅ SHOULD WORK:**
- https://www.wikipedia.org
- https://www.bbc.com
- https://news.ycombinator.com

**❌ WON'T WORK (by design):**
- opera://extensions
- opera://settings
- Chrome Web Store
- Other browser internal pages

### Step 4: Check Console for Errors
1. Visit a test page (like Wikipedia)
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for:
   - `[Phishing Analyzer] Extension initialized` ← Should see this
   - Any **red error messages**

**Common errors and fixes:**

**Error:** `Uncaught ReferenceError: chrome is not defined`
**Fix:** Opera should support `chrome.*` API. Try reloading the extension.

**Error:** `Cannot read property 'FastDetector' of undefined`
**Fix:** Script load order issue. Check manifest has `fast-detector.js` before `content.js`

### Step 5: Force Reload
1. Go to `opera://extensions`
2. Find your extension
3. Click **"Reload"** button
4. **Refresh** the webpage you're testing on
5. Hover over a link - should see outline within 200ms

### Step 6: Test Manually
Open console (F12) on any webpage and run:
```javascript
// Check if extension loaded
console.log(window.FastDetector ? "✅ Detector loaded" : "❌ Detector missing");

// Test a URL manually
if (window.FastDetector) {
  window.FastDetector.analyze("https://test.com");
}
```

If you see `❌ Detector missing`, the content script isn't injecting.

### Step 7: Verify File Structure
Make sure your extension folder has:
```
Phishing analysis extension/
├── manifest.json          ✅
├── persona.ini            ✅ (Opera required)
├── background.js          ✅
├── content.js             ✅
├── fast-detector.js       ✅
├── popup.html             ✅
├── popup.js               ✅
├── styles.css             ✅
└── icons/
    ├── icon16.png         ✅
    ├── icon48.png         ✅
    └── icon128.png        ✅
```

### Step 8: Reinstall Extension
If still not working:
1. Go to `opera://extensions`
2. Click **"Remove"** on the extension
3. **Restart Opera completely**
4. Re-load the extension:
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select your extension folder
5. Visit a test page and try again

### Step 9: Check Opera Version
The extension requires:
- **Opera 90+** (for Manifest v3 support)
- Check your version: `opera://about`
- Update if needed: Help → About Opera

### Step 10: Test in Chrome First
To verify the extension code works:
1. Load extension in **Chrome** (`chrome://extensions`)
2. If works in Chrome but not Opera:
   - Possible Opera-specific bug
   - Check Opera console for errors
3. If doesn't work in Chrome either:
   - Code issue, not Opera-specific

## Quick Test Command

Run this in the console (F12) on any webpage:

```javascript
// Quick test
const testLink = document.createElement('a');
testLink.href = 'http://malicious-test.tk';
testLink.textContent = 'Test Phishing Link';
testLink.style.cssText = 'display:block; padding:20px; margin:20px; font-size:20px;';
document.body.insertBefore(testLink, document.body.firstChild);

console.log('Test link added at top of page - hover over it!');
```

If the test link doesn't highlight on hover:
- Content script not running
- Check steps 1-8 above

## Still Not Working?

### Debug Mode
Enable detailed logging:

1. Open `content.js`
2. Add to line 30 (after initialization):
```javascript
console.log('[DEBUG] Extension loaded successfully');
console.log('[DEBUG] FastDetector available:', typeof window.FastDetector);
```

3. Reload extension
4. Check console - should see debug messages

### Report the Issue
If none of the above work, this information will help debug:

1. **Opera version**: (from opera://about)
2. **Operating System**: Windows/Mac/Linux
3. **Console errors**: (screenshot of F12 console)
4. **Works in Chrome?**: Yes/No
5. **Test page URL**: (which page you tested on)

---

## Most Common Fix

**90% of issues are solved by:**
1. Going to `opera://extensions`
2. Clicking **"Reload"** on the extension
3. **Refreshing** the webpage
4. Making sure Developer mode is **ON**

Try this first before all other steps!
