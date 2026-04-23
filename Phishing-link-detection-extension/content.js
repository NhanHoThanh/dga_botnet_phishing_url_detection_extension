/**
 * Content Script - Link monitoring, detection, and visual feedback
 * Runs in the context of web pages to scan and highlight links
 */

// Configuration
const CONFIG = {
    HOVER_DELAY: 200, // ms before analyzing link on hover
    TOOLTIP_OFFSET: 10, // pixels above link
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in ms
    MAX_TOOLTIPS: 1 // Only show one tooltip at a time
};

// State management
const State = {
    analyzedLinks: new Map(), // URL -> analysis result
    activeTooltip: null,
    hoverTimeout: null,
    serverOnline: false,
    settings: {
        fastOnlyMode: false,
        fullAnalysis: true,
        autoScanAds: true
    }
};

/**
 * Initialize the extension on page load
 */
function initialize() {
    try {
        console.log('[Phishing Analyzer] Extension initializing...');

        // Detect browser
        const browserName = detectBrowser();
        console.log('[Phishing Analyzer] Detected browser:', browserName);

        // Check if FastDetector loaded
        if (typeof window.FastDetector === 'undefined') {
            console.error('[Phishing Analyzer] FastDetector not loaded! Retrying...');
            setTimeout(initialize, 500);
            return;
        }

        // Use browser API (from polyfill)
        const api = window.browserAPI || chrome;

        // Load settings from storage with error handling
        try {
            api.storage.sync.get(['settings'], (result) => {
                if (api.runtime.lastError) {
                    console.warn('[Phishing Analyzer] Settings load warning:', api.runtime.lastError);
                }
                if (result && result.settings) {
                    State.settings = { ...State.settings, ...result.settings };
                }
                console.log('[Phishing Analyzer] Settings loaded:', State.settings);
            });
        } catch (error) {
            console.warn('[Phishing Analyzer] Storage access error:', error);
        }

        // Attach event listeners with delay for browser compatibility
        setTimeout(() => {
            attachLinkListeners();
            console.log('[Phishing Analyzer] Link listeners attached');
        }, 100);

        // Monitor for dynamically added links
        observeDOMChanges();

        // Monitor ALL clicks on the page (catch-all for popups/redirects)
        document.addEventListener('click', handleGlobalClick, true);

        // Auto-scan ads if enabled (delayed for page load)
        setTimeout(() => {
            if (State.settings.autoScanAds) {
                scanAdsOnPage();
            }
        }, 1500); // Increased delay for Brave/Opera GX

        console.log('[Phishing Analyzer] ✅ Extension initialized successfully');
    } catch (error) {
        console.error('[Phishing Analyzer] Initialization error:', error);
        // Retry initialization
        setTimeout(initialize, 1000);
    }
}

/**
 * Detect which browser is being used
 */
function detectBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('edg/')) return 'Edge';
    if (userAgent.includes('opr/') || userAgent.includes('opera')) return 'Opera';
    if (userAgent.includes('brave')) return 'Brave';
    if (userAgent.includes('chrome')) return 'Chrome';
    return 'Unknown';
}

/**
 * Attach hover and interaction listeners to all links AND clickable elements
 */
function attachLinkListeners() {
    // Regular anchor links
    const links = document.querySelectorAll('a[href]');

    links.forEach(link => {
        if (!link.dataset.phishingListenerAttached) {
            attachElementListeners(link);
        }
    });

    // Clickable elements that might be ads/popups (divs, buttons, images, etc.)
    const clickableElements = document.querySelectorAll(`
    [onclick],
    [data-href],
    [data-url],
    [data-link],
    div[role="button"],
    div[class*="ad"],
    div[class*="banner"],
    div[class*="popup"],
    img[style*="cursor: pointer"],
    button[data-href],
    [data-click-url]
  `);

    clickableElements.forEach(element => {
        if (!element.dataset.phishingListenerAttached) {
            attachElementListeners(element);
        }
    });

    // Also attach listeners to images inside links (for hover detection)
    const imageLinks = document.querySelectorAll('a[href] img, [data-href] img, [onclick] img');
    imageLinks.forEach(img => {
        if (!img.dataset.phishingListenerAttached) {
            img.addEventListener('mouseenter', handleLinkHover);
            img.addEventListener('mouseleave', handleLinkLeave);
            img.dataset.phishingListenerAttached = 'true';
        }
    });
}

/**
 * Attach event listeners to a single element
 * @param {HTMLElement} element - Element to attach listeners to
 */
function attachElementListeners(element) {
    // Hover event (works for both text and image links)
    element.addEventListener('mouseenter', handleLinkHover);
    element.addEventListener('mouseleave', handleLinkLeave);

    // Right-click event
    element.addEventListener('contextmenu', handleLinkRightClick);

    // Drag event
    element.addEventListener('dragstart', handleLinkDrag);

    // Click event - block malicious links, analyze others
    element.addEventListener('click', handleMonitoredClick, true); // Capture phase

    // Mark as processed
    element.dataset.phishingListenerAttached = 'true';

    // Also mark if it contains an image (for ad detection)
    const img = element.querySelector('img');
    if (img) {
        element.dataset.containsImage = 'true';
    }
}

/**
 * Handle link/element hover event
 * @param {Event} event - Mouse event
 */
function handleLinkHover(event) {
    // First, try to find the closest link/clickable element
    let element = event.target.closest('a, [onclick], [data-href], [data-url], div[class*="ad"], div[class*="banner"]');

    // If target is an image and we didn't find a parent, check if image itself has URL
    if (!element && event.target.tagName === 'IMG') {
        element = event.target;
    }

    if (!element) return;

    // Check if element has a URL
    const url = extractURLFromElement(element);
    if (!url) return;

    // Clear any existing timeout
    if (State.hoverTimeout) {
        clearTimeout(State.hoverTimeout);
    }

    // Debounce hover event
    State.hoverTimeout = setTimeout(() => {
        analyzeElement(element);
    }, CONFIG.HOVER_DELAY);
}

/**
 * Handle link mouse leave event
 * @param {Event} event - Mouse event
 */
function handleLinkLeave(event) {
    // Clear hover timeout
    if (State.hoverTimeout) {
        clearTimeout(State.hoverTimeout);
        State.hoverTimeout = null;
    }

    // Remove tooltip after a short delay (allows moving to tooltip)
    setTimeout(() => {
        if (State.activeTooltip && !State.activeTooltip.matches(':hover')) {
            removeTooltip();
        }
    }, 300);
}

/**
 * Handle right-click on element
 * @param {Event} event - Context menu event
 */
function handleLinkRightClick(event) {
    const element = event.target.closest('a, [onclick], [data-href]');
    if (!element) return;

    const url = extractURLFromElement(element);
    if (!url) return;

    // Immediately analyze on right-click
    analyzeElement(element, true);
}

/**
 * Handle link drag event
 * @param {Event} event - Drag event
 */
function handleLinkDrag(event) {
    const element = event.target.closest('a, [onclick], [data-href]');
    if (!element) return;

    analyzeElement(element);
}

/**
 * Handle click on non-anchor elements
 * @param {Event} event - Click event
 */
function handleElementClick(event) {
    const element = event.currentTarget;

    // Extract URL before click happens
    const url = extractURLFromElement(element);
    if (url) {
        // Analyze in background, don't block click
        setTimeout(() => analyzeElement(element), 0);
    }
}

/**
 * Handle click on monitored elements - block if malicious
 * @param {Event} event - Click event
 */
function handleMonitoredClick(event) {
    const element = event.currentTarget;
    const url = extractURLFromElement(element);
    if (!url) return;

    if (State.analyzedLinks.has(url) && State.analyzedLinks.get(url).verdict === 'malicious') {
        const result = State.analyzedLinks.get(url);
        const confirmed = confirm(
            `WARNING\n\n` +
            `This link appears to be MALICIOUS!\n` +
            `Risk Score: ${result.risk_score}/100\n\n` +
            `Reasons:\n${result.reasons.slice(0, 3).join('\n')}\n\n` +
            `Do you still want to proceed?`
        );
        if (!confirmed) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return;
        }
    }

    // For suspicious links, log a warning
    const cached = State.analyzedLinks.get(url);
    if (cached && cached.verdict === 'suspicious') {
        console.warn('[Phishing Analyzer] Suspicious link clicked:', url, `Score: ${cached.risk_score}`);
    }
}

/**
 * Extract URL from any element
 * @param {HTMLElement} element - Element to extract URL from
 * @returns {string|null} Extracted URL or null
 */
function extractURLFromElement(element) {
    // Try href first (anchor tags)
    if (element.href) {
        return element.href;
    }

    // Try data attributes
    if (element.dataset.href) return element.dataset.href;
    if (element.dataset.url) return element.dataset.url;
    if (element.dataset.link) return element.dataset.link;
    if (element.dataset.clickUrl) return element.dataset.clickUrl;

    // Try onclick attribute
    const onclick = element.getAttribute('onclick');
    if (onclick) {
        // Extract URL from onclick="window.location='...'"
        const locationMatch = onclick.match(/(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i);
        if (locationMatch) return locationMatch[1];

        // Extract URL from onclick="window.open('...')"
        const openMatch = onclick.match(/window\.open\(['"]([^'"]+)['"]/i);
        if (openMatch) return openMatch[1];

        // Extract URL from onclick="goto('...')" or similar
        const urlMatch = onclick.match(/['"]((https?:\/\/|www\.)[^'"]+)['"]/i);
        if (urlMatch) return urlMatch[1];
    }

    // Try parent anchor tag
    const parentLink = element.closest('a[href]');
    if (parentLink) return parentLink.href;

    return null;
}

/**
 * Check if a URL matches the custom blocklist in FastDetector
 * @param {string} url - URL to check
 * @returns {object|null} Blocklist result or null
 */
function checkBlocklist(url) {
    if (!window.FastDetector || !window.FastDetector.BLOCKED_DOMAINS) return null;
    const lower = url.toLowerCase();
    for (const blocked of window.FastDetector.BLOCKED_DOMAINS) {
        if (lower.includes(blocked)) {
            return {
                url: url,
                verdict: 'malicious',
                risk_score: 75,
                reasons: ['Domain is on custom blocklist'],
                source: 'blocklist',
                isAd: false
            };
        }
    }
    return null;
}

/**
 * Unified analysis function for any element
 * @param {HTMLElement} element - Element to analyze
 * @param {boolean} forceDeep - Force deep analysis
 */
async function analyzeElement(element, forceDeep = false) {
    const url = extractURLFromElement(element);

    if (!url) return;

    console.log(url);

    // Check cache
    if (State.analyzedLinks.has(url)) {
        const cached = State.analyzedLinks.get(url);
        applyVisualFeedback(element, cached);
        return;
    }

    // Check if this is an ad
    const isAd = element.dataset.isAd === 'true' ||
        element.closest('[aria-label*="Ad"]') ||
        element.closest('[aria-label*="Sponsored"]') ||
        element.closest('.ad, .ads, [data-text-ad], #tads');

    // Step 1: Fast Mode Analysis
    const fastResult = window.FastDetector.analyze(url);

    // Store in state
    let finalResult = {
        url: url,
        verdict: fastResult.quick_verdict,
        risk_score: fastResult.quick_score,
        reasons: fastResult.reasons,
        source: 'fast',
        isAd: isAd
    };

    // If it's an ad, mark it specially
    if (isAd) {
        finalResult.verdict = 'ad';
        finalResult.reasons = ['Advertisement', ...finalResult.reasons];
    }

    // Apply initial visual feedback
    applyVisualFeedback(element, finalResult);

    // Step 2: Always call backend for deep analysis
    const needsDeepAnalysis = true;

    if (needsDeepAnalysis && !isAd) { // Skip deep analysis for known ads
        try {
            // Request deep analysis from background service worker
            const deepResult = await requestDeepAnalysis(url);

            if (deepResult) {
                finalResult = {
                    url: url,
                    verdict: deepResult.verdict.toLowerCase(),
                    risk_score: deepResult.risk_score,
                    reasons: deepResult.reasons,
                    source: 'deep',
                    isAd: false
                };

                // Update visual feedback with deep analysis result
                applyVisualFeedback(element, finalResult);
            }
        } catch (error) {
            // Silently ignore "Extension context invalidated" (happens after reload)
            if (!String(error).includes('Extension context invalidated')) {
                console.warn('[Phishing Analyzer] Deep analysis failed:', error);
            }
            // Fall back to fast mode result (already applied)
        }
    }

    // Cache result
    State.analyzedLinks.set(url, finalResult);

    // Send to background for persistent storage
    try {
        chrome.runtime.sendMessage({
            type: 'CACHE_RESULT',
            data: { url, result: finalResult }
        });
    } catch (e) {
        // Context may be invalidated after extension reload
    }
}

/**
 * Request deep analysis from backend via background service worker
 * @param {string} url - URL to analyze
 * @returns {Promise<object>} Analysis result from backend
 */
function requestDeepAnalysis(url) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: 'DEEP_ANALYSIS',
            url: url
        }, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else if (response && response.success) {
                resolve(response.data);
            } else {
                reject(new Error(response?.error || 'Unknown error'));
            }
        });
    });
}

/**
 * Apply visual highlighting and tooltip based on analysis result
 * @param {HTMLElement} link - Link element
 * @param {object} result - Analysis result
 */
function applyVisualFeedback(link, result) {
    // Remove existing classes
    link.classList.remove('phishing-safe', 'phishing-suspicious', 'phishing-malicious', 'phishing-ad');

    // Apply appropriate class based on verdict
    switch (result.verdict) {
        case 'safe':
            link.classList.add('phishing-safe');
            // Auto-fade safe highlights after 3 seconds
            setTimeout(() => {
                link.classList.remove('phishing-safe');
            }, 3000);
            break;
        case 'suspicious':
            link.classList.add('phishing-suspicious');
            break;
        case 'malicious':
            link.classList.add('phishing-malicious');
            break;
        case 'ad':
            link.classList.add('phishing-ad');
            break;
    }

    // Show tooltip
    showTooltip(link, result);
}

/**
 * Create and display tooltip with analysis details
 * @param {HTMLElement} link - Link element
 * @param {object} result - Analysis result
 */
function showTooltip(link, result) {
    // Remove any existing tooltip
    removeTooltip();

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'phishing-tooltip';
    tooltip.dataset.verdict = result.verdict;

    // Determine icon based on verdict
    let icon, title;
    switch (result.verdict) {
        case 'safe':
            icon = '✓';
            title = 'Safe Link';
            break;
        case 'suspicious':
            icon = '⚠';
            title = 'Suspicious Link';
            break;
        case 'malicious':
            icon = '🛑';
            title = 'Phishing Detected';
            break;
        case 'ad':
            icon = '📢';
            title = 'Advertisement';
            break;
        default:
            icon = '?';
            title = 'Unknown';
    }

    // Build tooltip content
    const reasonsList = result.reasons && result.reasons.length > 0
        ? `<ul>${result.reasons.slice(0, 3).map(r => `<li>${escapeHTML(r)}</li>`).join('')}</ul>`
        : '<p>No specific issues detected</p>';

    tooltip.innerHTML = `
    <div class="phishing-tooltip-header">
      <span class="phishing-tooltip-icon">${icon}</span>
      <strong>${title}</strong>
    </div>
    <div class="phishing-tooltip-score">
      Risk Score: <strong>${result.risk_score}/100</strong>
    </div>
    <div class="phishing-tooltip-reasons">
      <strong>Analysis:</strong>
      ${reasonsList}
    </div>
    <div class="phishing-tooltip-source">
      ${result.source === 'deep' ? 'Backend verified' : 'Quick scan'}
    </div>
  `;

    // Position tooltip
    document.body.appendChild(tooltip);
    positionTooltip(tooltip, link);

    // Store reference
    State.activeTooltip = tooltip;

    // Auto-hide tooltip when mouse leaves both link and tooltip
    tooltip.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (State.activeTooltip && !link.matches(':hover')) {
                removeTooltip();
            }
        }, 100);
    });
}

/**
 * Position tooltip above the link
 * @param {HTMLElement} tooltip - Tooltip element
 * @param {HTMLElement} link - Link element
 */
function positionTooltip(tooltip, link) {
    const linkRect = link.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = linkRect.top + window.scrollY - tooltipRect.height - CONFIG.TOOLTIP_OFFSET;
    let left = linkRect.left + window.scrollX + (linkRect.width / 2) - (tooltipRect.width / 2);

    // Keep tooltip within viewport
    if (top < window.scrollY) {
        top = linkRect.bottom + window.scrollY + CONFIG.TOOLTIP_OFFSET; // Show below instead
    }

    if (left < 0) {
        left = 10;
    } else if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 10;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
}

/**
 * Remove active tooltip
 */
function removeTooltip() {
    if (State.activeTooltip) {
        State.activeTooltip.remove();
        State.activeTooltip = null;
    }
}

/**
 * Scan page for ads and analyze them
 */
function scanAdsOnPage() {
    // Common ad selectors
    const adSelectors = [
        '[aria-label*="Ad"]',
        '[aria-label*="Sponsored"]',
        '[aria-label*="Advertisement"]',
        '.ad', '.ads',
        '[data-text-ad]',
        '[data-commercial-unit]',
        '#tads', // Google ads container
        '#tvcap', // More Google ads
        '.ad-container',
        '.sponsored',
        '[data-ad-slot]',
        '[id*="google_ads"]',
        '[class*="ad-wrapper"]',
        'ins.adsbygoogle' // Google AdSense
    ];

    const adElements = document.querySelectorAll(adSelectors.join(','));

    adElements.forEach(adContainer => {
        // Find both direct links and image links
        const links = adContainer.querySelectorAll('a[href]');

        // Also find images within links
        const imageLinks = adContainer.querySelectorAll('a[href] img');

        links.forEach(link => {
            // Mark as ad
            link.dataset.isAd = 'true';

            // Analyze immediately
            if (!State.analyzedLinks.has(link.href)) {
                analyzeElement(link);
            }
        });

        // Also process parent links of images
        imageLinks.forEach(img => {
            const parentLink = img.closest('a[href]');
            if (parentLink && !parentLink.dataset.isAd) {
                parentLink.dataset.isAd = 'true';
                if (!State.analyzedLinks.has(parentLink.href)) {
                    analyzeElement(parentLink);
                }
            }
        });
    });

    if (adElements.length > 0) {
        console.log(`[Phishing Analyzer] Scanned ${adElements.length} ad container(s)`);
    }
}

/**
 * Observe DOM for dynamically added links
 */
function observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
        let hasNewLinks = false;

        for (let mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if node itself is a link
                        if (node.tagName === 'A' && node.href) {
                            hasNewLinks = true;
                        }
                        // Check for links within added node
                        if (node.querySelectorAll) {
                            const links = node.querySelectorAll('a[href]');
                            if (links.length > 0) {
                                hasNewLinks = true;
                            }
                        }
                    }
                });
            }
        }

        if (hasNewLinks) {
            attachLinkListeners();

            // Re-scan for ads if enabled
            if (State.settings.autoScanAds) {
                scanAdsOnPage();
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * Handle global click events (catch-all for popups/redirects)
 * @param {Event} event - Click event
 */
function handleGlobalClick(event) {
    const element = event.target;

    // Skip if already processed or is a normal link we're already monitoring
    if (element.dataset.phishingListenerAttached) return;

    // Check for URL in various ways
    const url = extractURLFromElement(element);

    if (url) {
        // Quick analysis (non-blocking)
        const fastResult = window.FastDetector.analyze(url);

        if (fastResult.quick_score >= 60) {
            // High risk - show immediate warning and block
            const confirmed = confirm(
                `⚠️ PHISHING WARNING\n\n` +
                `This link appears to be MALICIOUS!\n` +
                `Risk Score: ${fastResult.quick_score}/100\n\n` +
                `Reasons:\n${fastResult.reasons.slice(0, 3).join('\n')}\n\n` +
                `Do you still want to proceed?`
            );

            if (!confirmed) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                return false;
            }
        } else if (fastResult.quick_score >= 30) {
            // Moderate risk - log warning
            console.warn('[Phishing Analyzer] Suspicious link clicked:', url, `Score: ${fastResult.quick_score}`);
        }
    }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Listen for messages from background script
 */
(window.browserAPI || chrome).runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_SETTINGS') {
        State.settings = { ...State.settings, ...message.settings };
        sendResponse({ success: true });
    } else if (message.type === 'SERVER_STATUS') {
        State.serverOnline = message.online;
    }
});

// Initialize when DOM is ready - with multiple fallbacks for browser compatibility
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    // DOM already loaded - initialize now
    initialize();
} else {
    // Fallback - wait a bit then initialize
    setTimeout(initialize, 100);
}

// Additional safety: ensure initialization happens
window.addEventListener('load', () => {
    // Only initialize if not already done
    if (!document.body.classList.contains('phishing-analyzer-active')) {
        document.body.classList.add('phishing-analyzer-active');
        console.log('[Phishing Analyzer] Backup initialization triggered');
    }
});
