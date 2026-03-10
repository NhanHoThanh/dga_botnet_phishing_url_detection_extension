/**
 * Popup UI Logic - Extension popup interface
 * Manages settings, displays stats, and shows last scan result
 */

// State
const State = {
    settings: {
        fastOnlyMode: false,
        fullAnalysis: true,
        autoScanAds: true
    },
    stats: {
        totalScans: 0,
        threatsBlocked: 0
    },
    lastScan: null
};

/**
 * Initialize popup
 */
function initialize() {
    // Load settings and stats
    loadSettings();
    loadStats();
    loadLastScan();

    // Attach event listeners
    attachEventListeners();

    // Listen for updates from background
    chrome.runtime.onMessage.addListener(handleMessage);
}

/**
 * Load settings from storage
 */
function loadSettings() {
    chrome.storage.sync.get(['settings'], (result) => {
        if (result.settings) {
            State.settings = { ...State.settings, ...result.settings };
            updateSettingsUI();
        }
    });
}

/**
 * Load statistics from background
 */
function loadStats() {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
        if (response && response.success) {
            State.stats = response.stats;
            updateStatsUI();
        }
    });
}

/**
 * Load last scan from storage
 */
function loadLastScan() {
    chrome.storage.local.get(['lastScan'], (result) => {
        if (result.lastScan) {
            State.lastScan = result.lastScan;
            updateLastScanUI();
        }
    });
}

/**
 * Update settings UI toggles
 */
function updateSettingsUI() {
    const toggleFullAnalysis = document.getElementById('toggleFullAnalysis');
    const toggleAutoScanAds = document.getElementById('toggleAutoScanAds');
    const toggleFastOnly = document.getElementById('toggleFastOnly');

    toggleFullAnalysis.classList.toggle('active', State.settings.fullAnalysis);
    toggleAutoScanAds.classList.toggle('active', State.settings.autoScanAds);
    toggleFastOnly.classList.toggle('active', State.settings.fastOnlyMode);
}

/**
 * Update statistics UI
 */
function updateStatsUI() {
    document.getElementById('totalScans').textContent = State.stats.totalScans || 0;
    document.getElementById('threatsBlocked').textContent = State.stats.threatsBlocked || 0;
}

/**
 * Update last scan UI
 */
function updateLastScanUI() {
    const lastScanDiv = document.getElementById('lastScan');
    const gaugeSection = document.getElementById('gaugeSection');
    const reasonsSection = document.getElementById('reasonsSection');

    if (!State.lastScan) {
        // Show empty state
        lastScanDiv.className = 'last-scan';
        lastScanDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">Hover over any link to scan for phishing</div>
      </div>
    `;
        gaugeSection.style.display = 'none';
        reasonsSection.style.display = 'none';
        return;
    }

    // Show last scan result
    const { url, verdict, risk_score, reasons } = State.lastScan;

    // Update last scan card
    lastScanDiv.className = `last-scan ${verdict}`;
    lastScanDiv.innerHTML = `
    <div class="last-scan-url">${truncateURL(url, 50)}</div>
    <span class="verdict-badge ${verdict}">${verdict}</span>
  `;

    // Update risk gauge
    updateRiskGauge(risk_score, verdict);
    gaugeSection.style.display = 'block';

    // Update reasons
    if (reasons && reasons.length > 0) {
        updateReasonsList(reasons);
        reasonsSection.style.display = 'block';
    } else {
        reasonsSection.style.display = 'none';
    }
}

/**
 * Update risk gauge visualization
 * @param {number} score - Risk score (0-100)
 * @param {string} verdict - Verdict (safe, suspicious, malicious)
 */
function updateRiskGauge(score, verdict) {
    const gaugeProgress = document.getElementById('gaugeProgress');
    const gaugeScore = document.getElementById('gaugeScore');

    // Update score text
    gaugeScore.textContent = score;

    // Calculate circumference and offset
    const radius = 54;
    const circumference = 2 * Math.PI * radius; // ~339.292
    const offset = circumference - (score / 100) * circumference;

    gaugeProgress.style.strokeDashoffset = offset;

    // Update color based on verdict
    let color;
    switch (verdict) {
        case 'safe':
            color = '#10b981';
            break;
        case 'suspicious':
            color = '#f59e0b';
            break;
        case 'malicious':
            color = '#ef4444';
            break;
        default:
            color = '#9ca3af';
    }

    gaugeProgress.style.stroke = color;
    gaugeScore.style.color = color;
}

/**
 * Update reasons list
 * @param {Array<string>} reasons - Array of reason strings
 */
function updateReasonsList(reasons) {
    const reasonsList = document.getElementById('reasonsList');
    reasonsList.innerHTML = '';

    reasons.slice(0, 5).forEach(reason => {
        const li = document.createElement('li');
        li.textContent = reason;
        reasonsList.appendChild(li);
    });
}

/**
 * Attach event listeners to UI elements
 */
function attachEventListeners() {
    // Toggle switches
    document.getElementById('toggleFullAnalysis').addEventListener('click', () => {
        toggleSetting('fullAnalysis');
    });

    document.getElementById('toggleAutoScanAds').addEventListener('click', () => {
        toggleSetting('autoScanAds');
    });

    document.getElementById('toggleFastOnly').addEventListener('click', () => {
        toggleSetting('fastOnlyMode');
    });
}

/**
 * Toggle a setting
 * @param {string} settingKey - Key of setting to toggle
 */
function toggleSetting(settingKey) {
    State.settings[settingKey] = !State.settings[settingKey];

    // Update UI
    updateSettingsUI();

    // Save to storage
    chrome.storage.sync.set({ settings: State.settings });

    // Notify content scripts
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                type: 'UPDATE_SETTINGS',
                settings: State.settings
            }).catch(() => {
                // Ignore errors for tabs without content script
            });
        });
    });

    // Show feedback
    console.log(`[Popup] Toggled ${settingKey}:`, State.settings[settingKey]);
}

/**
 * Handle messages from background or content scripts
 * @param {object} message - Message object
 */
function handleMessage(message) {
    if (message.type === 'SCAN_COMPLETE') {
        State.lastScan = message.data;
        chrome.storage.local.set({ lastScan: message.data });
        updateLastScanUI();
        loadStats(); // Refresh stats
    }
}

/**
 * Truncate URL for display
 * @param {string} url - URL to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated URL
 */
function truncateURL(url, maxLength) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
}

// Listen for storage changes (from other tabs/background)
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.settings) {
        State.settings = changes.settings.newValue;
        updateSettingsUI();
    }

    if (areaName === 'local' && changes.lastScan) {
        State.lastScan = changes.lastScan.newValue;
        updateLastScanUI();
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
