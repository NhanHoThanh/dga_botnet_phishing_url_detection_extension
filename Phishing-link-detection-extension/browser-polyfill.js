/**
 * Browser Compatibility Polyfill
 * Ensures extension works across Chrome, Brave, Opera GX, Edge, and other Chromium browsers
 */

// Universal browser API reference
// Note: use globalThis to avoid TDZ with const declaration
const browser = (() => {
    // Check if browser API exists (Firefox)
    if (typeof globalThis.browser !== 'undefined' && globalThis.browser.runtime) {
        return globalThis.browser;
    }
    // Check if chrome API exists (Chromium browsers)
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        return chrome;
    }
    // Fallback - create mock object to prevent errors
    console.error('[Phishing Analyzer] No browser API found!');
    return {
        runtime: { onMessage: { addListener: () => { } }, sendMessage: () => { } },
        storage: { sync: { get: () => { }, set: () => { } }, local: { get: () => { }, set: () => { } } }
    };
})();

// Make browser API globally available
if (typeof window !== 'undefined') {
    window.browserAPI = browser;
}

// Log browser detection
console.log('[Phishing Analyzer] Browser API detected:',
    typeof chrome !== 'undefined' ? 'Chrome API' :
        typeof browser !== 'undefined' ? 'Browser API' : 'Unknown');
