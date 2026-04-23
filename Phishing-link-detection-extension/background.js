/**
 * Background Service Worker - API communication, caching, and rate limiting
 * Handles deep analysis requests to backend and manages extension state
 */

// Configuration
const CONFIG = {
    BACKEND_URL: 'http://localhost:8000',
    CACHE_TTL: 24 * 60 * 60 * 1000,
    REQUEST_TIMEOUT: 15000
};

const State = {
    cache: new Map(),
    stats: {
        totalScans: 0,
        threatsBlocked: 0,
        cacheHits: 0
    },
    blocklistVersion: null,
    serverOnline: false
};

/**
 * Initialize background service worker
 */
function initialize() {
    console.log('[Phishing Analyzer] Background service worker initialized');

    // Load cache and stats from storage
    chrome.storage.local.get(['cache', 'stats'], (result) => {
        if (result.cache) {
            State.cache = new Map(Object.entries(result.cache));
            cleanExpiredCache();
        }
        if (result.stats) {
            State.stats = { ...State.stats, ...result.stats };
        }
    });

    // Load backend URL from settings
    chrome.storage.sync.get(['backendUrl'], (result) => {
        if (result.backendUrl) {
            CONFIG.BACKEND_URL = result.backendUrl;
        }
    });

    // Set up context menu
    createContextMenu();
}

/**
 * Create right-click context menu option
 */
function createContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'analyze-link',
            title: 'Analyze this link for phishing',
            contexts: ['link']
        });
    });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'analyze-link' && info.linkUrl) {
        // Send message to content script to analyze the link
        chrome.tabs.sendMessage(tab.id, {
            type: 'ANALYZE_URL',
            url: info.linkUrl
        });
    }
});

/**
 * Handle long-lived port connections (used for DEEP_ANALYSIS to keep
 * the service worker alive until the async fetch completes).
 */
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'deep_analysis') return;
    port.onMessage.addListener(async (message) => {
        if (message.type !== 'DEEP_ANALYSIS') return;
        try {
            const cached = getCachedResult(message.url);
            if (cached) {
                State.stats.cacheHits++;
                persistStats();
                port.postMessage({ success: true, data: cached, fromCache: true });
                return;
            }
            const result = await callBackendAPI(message.url);
            State.stats.totalScans++;
            if (result.verdict === 'Malicious') State.stats.threatsBlocked++;
            persistStats();
            cacheResult(message.url, result);
            port.postMessage({ success: true, data: result, fromCache: false });
        } catch (error) {
            port.postMessage({ success: false, error: error.message || 'Backend analysis failed' });
        }
    });
});

/**
 * Handle one-shot messages from content scripts and popup.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'CACHE_RESULT':
            handleCacheResult(message.data);
            sendResponse({ success: true });
            break;

        case 'GET_STATS':
            sendResponse({ success: true, stats: State.stats });
            break;

        case 'UPDATE_BACKEND_URL':
            CONFIG.BACKEND_URL = message.url;
            chrome.storage.sync.set({ backendUrl: message.url });
            sendResponse({ success: true });
            break;

        default:
            sendResponse({ success: false, error: 'Unknown message type' });
    }
});

/**
 * Handle deep analysis request
 * @param {string} url - URL to analyze
 * @param {function} sendResponse - Callback to send response
 */
async function handleDeepAnalysis(url, sendResponse) {
    try {
        // Check cache first
        const cached = getCachedResult(url);
        if (cached) {
            State.stats.cacheHits++;
            persistStats();
            sendResponse({
                success: true,
                data: cached,
                fromCache: true
            });
            return;
        }

        // Check rate limit
        if (!checkRateLimit()) {
            sendResponse({
                success: false,
                error: 'Rate limit exceeded. Please wait a moment.'
            });
            return;
        }

        // Make API request
        const result = await callBackendAPI(url);

        // Update stats
        State.stats.totalScans++;
        if (result.verdict === 'Malicious') {
            State.stats.threatsBlocked++;
        }
        persistStats();

        // Cache result
        cacheResult(url, result);

        sendResponse({
            success: true,
            data: result,
            fromCache: false
        });

    } catch (error) {
        console.error('[Phishing Analyzer] Deep analysis error:', error);
        sendResponse({
            success: false,
            error: error.message || 'Backend analysis failed'
        });
    }
}

/**
 * Call backend API for deep analysis
 * @param {string} url - URL to analyze
 * @returns {Promise<object>} Analysis result
 */
async function callBackendAPI(url) {
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url }),
            signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.verdict || typeof data.risk_score !== 'number') {
            throw new Error('Invalid response format from backend');
        }

        return data;

    } catch (error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Backend request timed out');
        }

        if (error.message.includes('Failed to fetch')) {
            throw new Error('Backend is unreachable. Please check if it\'s running.');
        }

        throw error;
    }
}


/**
 * Get cached result if not expired
 * @param {string} url - URL to look up
 * @returns {object|null} Cached result or null
 */
function getCachedResult(url) {
    const cached = State.cache.get(url);

    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > CONFIG.CACHE_TTL) {
        // Expired
        State.cache.delete(url);
        return null;
    }

    return cached.result;
}

/**
 * Cache analysis result
 * @param {string} url - URL
 * @param {object} result - Analysis result
 */
function cacheResult(url, result) {
    State.cache.set(url, {
        result,
        timestamp: Date.now()
    });

    // Persist to storage (throttled)
    persistCache();
}

/**
 * Handle cache result from content script
 * @param {object} data - Data containing url and result
 */
function handleCacheResult(data) {
    cacheResult(data.url, data.result);
}

/**
 * Clean expired entries from cache
 */
function cleanExpiredCache() {
    const now = Date.now();
    let cleaned = 0;

    for (let [url, cached] of State.cache.entries()) {
        if (now - cached.timestamp > CONFIG.CACHE_TTL) {
            State.cache.delete(url);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`[Phishing Analyzer] Cleaned ${cleaned} expired cache entries`);
        persistCache();
    }
}

/**
 * Persist cache to storage (debounced)
 */
let persistCacheTimeout = null;
function persistCache() {
    if (persistCacheTimeout) {
        clearTimeout(persistCacheTimeout);
    }

    persistCacheTimeout = setTimeout(() => {
        // Convert Map to Object for storage
        const cacheObj = Object.fromEntries(State.cache);

        chrome.storage.local.set({ cache: cacheObj }, () => {
            if (chrome.runtime.lastError) {
                console.error('[Phishing Analyzer] Cache persist error:', chrome.runtime.lastError);
            }
        });
    }, 1000); // Debounce 1 second
}

/**
 * Persist stats to storage
 */
function persistStats() {
    chrome.storage.local.set({ stats: State.stats }, () => {
        if (chrome.runtime.lastError) {
            console.error('[Phishing Analyzer] Stats persist error:', chrome.runtime.lastError);
        }
    });
}

/**
 * Clear all cache (called from popup)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CLEAR_CACHE') {
        State.cache.clear();
        persistCache();
        sendResponse({ success: true });
    }
});

// Initialize on install/update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Phishing Analyzer] Extension installed');
        // Show welcome page or instructions
        chrome.tabs.create({
            url: 'https://github.com/yourusername/phishing-analyzer#readme'
        });
    } else if (details.reason === 'update') {
        console.log('[Phishing Analyzer] Extension updated to version', chrome.runtime.getManifest().version);
    }

    initialize();
});

// Initialize on startup
initialize();

// Periodic cache cleanup (every hour)
setInterval(cleanExpiredCache, 60 * 60 * 1000);

/**
 * Poll backend for blocklist version changes and clear URL cache if updated.
 */
async function checkBlocklistVersion() {
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/blocklist/version`, {
            signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) return;
        const { version } = await response.json();
        if (State.blocklistVersion !== null && version !== State.blocklistVersion) {
            console.log('[Phishing Analyzer] Blocklist updated — clearing URL cache');
            State.cache.clear();
            persistCache();
        }
        State.blocklistVersion = version;
    } catch {
        // Backend unreachable, skip silently
    }
}

// Poll blocklist version every 60 seconds
setInterval(checkBlocklistVersion, 60 * 1000);
checkBlocklistVersion();

/**
 * Health check — polls /health every 5s and broadcasts server status to all tabs.
 */
async function runHealthCheck() {
    let online = false;
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/health`, {
            signal: AbortSignal.timeout(4000)
        });
        online = response.ok;
    } catch {
        online = false;
    }

    State.serverOnline = online;

    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'SERVER_STATUS',
                online
            }).catch(() => {});
        }
    });
}

setInterval(runHealthCheck, 5000);
runHealthCheck();
