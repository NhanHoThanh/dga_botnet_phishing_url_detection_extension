const HOVER_DELAY = 200;
const TOOLTIP_OFFSET = 10;

const State = {
    activeTooltip: null,
    hoverTimeout: null,
    serverOnline: false
};

function initialize() {
    attachLinkListeners();
    observeDOMChanges();
}

function attachLinkListeners() {
    document.querySelectorAll('a[href]').forEach(link => {
        if (!link.dataset.phishingListenerAttached) {
            link.addEventListener('mouseenter', handleHover);
            link.addEventListener('mouseleave', handleLeave);
            link.addEventListener('click', handleClick, true);
            link.dataset.phishingListenerAttached = 'true';
        }
    });
}

function handleHover(event) {
    const link = event.currentTarget;
    const url = link.href;
    if (!url) return;

    if (State.hoverTimeout) clearTimeout(State.hoverTimeout);
    State.hoverTimeout = setTimeout(() => analyzeLink(link, url), HOVER_DELAY);
}

function handleLeave() {
    if (State.hoverTimeout) {
        clearTimeout(State.hoverTimeout);
        State.hoverTimeout = null;
    }
    setTimeout(() => {
        if (State.activeTooltip && !State.activeTooltip.matches(':hover')) {
            removeTooltip();
        }
    }, 300);
}

function handleClick(event) {
    const url = event.currentTarget.href;
    if (!url) return;

    const cached = State.activeTooltip?._result;
    if (cached && cached.verdict === 'malicious') {
        const confirmed = confirm(
            `WARNING\n\nThis link appears to be MALICIOUS!\nRisk Score: ${cached.risk_score}/100\n\n` +
            `${cached.reasons.slice(0, 3).join('\n')}\n\nDo you still want to proceed?`
        );
        if (!confirmed) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }
}

async function analyzeLink(link, url) {
    console.log(url);
    try {
        const result = await requestAnalysis(url);
        const normalized = {
            verdict: result.verdict.toLowerCase(),
            risk_score: result.risk_score,
            reasons: result.reasons
        };
        showTooltip(link, normalized);
    } catch (error) {
        if (!String(error).includes('Extension context invalidated')) {
            console.warn('[Phishing Analyzer] Analysis failed:', error);
        }
    }
}

function requestAnalysis(url) {
    return new Promise((resolve, reject) => {
        const port = chrome.runtime.connect({ name: 'deep_analysis' });
        port.onMessage.addListener((response) => {
            port.disconnect();
            if (response.success) resolve(response.data);
            else reject(new Error(response.error || 'Unknown error'));
        });
        port.onDisconnect.addListener(() => {
            reject(new Error(chrome.runtime.lastError?.message || 'Port disconnected'));
        });
        port.postMessage({ type: 'DEEP_ANALYSIS', url });
    });
}

function showTooltip(link, result) {
    removeTooltip();

    const icons = { safe: '✓', suspicious: '⚠', malicious: '🛑' };
    const titles = { safe: 'Safe Link', suspicious: 'Suspicious Link', malicious: 'Phishing Detected' };

    const tooltip = document.createElement('div');
    tooltip.className = 'phishing-tooltip';
    tooltip.dataset.verdict = result.verdict;
    tooltip._result = result;

    const reasonsList = result.reasons?.length
        ? `<ul>${result.reasons.slice(0, 3).map(r => `<li>${escapeHTML(r)}</li>`).join('')}</ul>`
        : '<p>No issues detected</p>';

    tooltip.innerHTML = `
        <div class="phishing-tooltip-header">
            <span class="phishing-tooltip-icon">${icons[result.verdict] ?? '?'}</span>
            <strong>${titles[result.verdict] ?? 'Unknown'}</strong>
        </div>
        <div class="phishing-tooltip-score">Risk Score: <strong>${result.risk_score}/100</strong></div>
        <div class="phishing-tooltip-reasons"><strong>Analysis:</strong>${reasonsList}</div>
        <div class="phishing-tooltip-source">Backend verified</div>
    `;

    document.body.appendChild(tooltip);
    positionTooltip(tooltip, link);
    State.activeTooltip = tooltip;

    tooltip.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (State.activeTooltip && !link.matches(':hover')) removeTooltip();
        }, 100);
    });
}

function positionTooltip(tooltip, link) {
    const linkRect = link.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = linkRect.top + window.scrollY - tooltipRect.height - TOOLTIP_OFFSET;
    let left = linkRect.left + window.scrollX + (linkRect.width / 2) - (tooltipRect.width / 2);

    if (top < window.scrollY) top = linkRect.bottom + window.scrollY + TOOLTIP_OFFSET;
    if (left < 0) left = 10;
    else if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 10;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
}

function removeTooltip() {
    if (State.activeTooltip) {
        State.activeTooltip.remove();
        State.activeTooltip = null;
    }
}

function observeDOMChanges() {
    new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if ((node.tagName === 'A' && node.href) || node.querySelectorAll?.('a[href]').length > 0) {
                            attachLinkListeners();
                            break;
                        }
                    }
                }
            }
        }
    }).observe(document.body, { childList: true, subtree: true });
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SERVER_STATUS') State.serverOnline = message.online;
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
