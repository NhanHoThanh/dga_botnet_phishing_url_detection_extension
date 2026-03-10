/**
 * Fast Mode Detector - Client-side phishing heuristics
 * Performs instant URL analysis without backend calls
 */

const FastDetector = {
    // Phishing-related keywords commonly found in malicious URLs
    PHISHING_KEYWORDS: [
        'login', 'verify', 'account', 'secure', 'update', 'confirm',
        'suspend', 'expire', 'banking', 'signin', 'password', 'credential',
        'validate', 'authenticate', 'unlock', 'restore', 'billing',
        'payment', 'urgent', 'action', 'required', 'immediately'
    ],

    // Suspicious top-level domains often used for phishing
    SUSPICIOUS_TLDS: [
        '.tk', '.ml', '.ga', '.cf', '.gq', '.zip', '.review', '.country',
        '.kim', '.cricket', '.science', '.work', '.party', '.trade',
        '.download', '.racing', '.accountant', '.stream', '.bid', '.win'
    ],

    // Commonly targeted legitimate domains for typosquatting
    TARGETED_DOMAINS: [
        'google', 'facebook', 'amazon', 'paypal', 'apple', 'microsoft',
        'linkedin', 'twitter', 'instagram', 'netflix', 'ebay', 'yahoo',
        'dropbox', 'github', 'stackoverflow', 'reddit', 'wikipedia'
    ],

    // Trusted domains that should never be flagged (whitelist)
    TRUSTED_DOMAINS: [
        'google.com', 'google.co', 'google.in', 'google.co.uk',
        'facebook.com', 'fb.com',
        'amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.de',
        'paypal.com',
        'apple.com',
        'microsoft.com', 'live.com', 'outlook.com', 'office.com',
        'linkedin.com',
        'twitter.com', 'x.com',
        'instagram.com',
        'netflix.com',
        'ebay.com', 'ebay.in', 'ebay.co.uk',
        'yahoo.com', 'search.yahoo.com', 'r.search.yahoo.com',
        'dropbox.com',
        'github.com',
        'stackoverflow.com',
        'reddit.com',
        'wikipedia.org',
        'youtube.com',
        'bing.com',
        'whatsapp.com'
    ],

    // Custom blocklist - domains always flagged as suspicious/malicious
    BLOCKED_DOMAINS: [
        'fb88', 'fb88.com', 'fb88.net', 'fb88.org',"fb88b.co.com", "fut.uk.com"
    ],

    // Known legitimate redirect domains
    TRUSTED_REDIRECTORS: [
        'r.search.yahoo.com',
        'google.com/url',
        'bing.com/ck/a',
        'l.facebook.com',
        't.co' // Twitter shortener
    ],

    /**
     * Normalize URL for consistent analysis
     * @param {string} url - Raw URL string
     * @returns {object} Parsed URL components
     */
    normalizeURL(url) {
        try {
            // Handle relative URLs
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'http://' + url;
            }

            const urlObj = new URL(url);
            return {
                protocol: urlObj.protocol,
                hostname: urlObj.hostname.toLowerCase(),
                pathname: urlObj.pathname,
                search: urlObj.search,
                full: urlObj.href
            };
        } catch (e) {
            // Invalid URL
            return null;
        }
    },

    /**
     * Calculate Shannon entropy to detect random strings
     * Higher entropy suggests randomly generated domains
     * @param {string} str - String to analyze
     * @returns {number} Entropy value
     */
    calculateEntropy(str) {
        const frequencies = {};
        for (let char of str) {
            frequencies[char] = (frequencies[char] || 0) + 1;
        }

        let entropy = 0;
        const len = str.length;
        for (let freq of Object.values(frequencies)) {
            const p = freq / len;
            entropy -= p * Math.log2(p);
        }

        return entropy;
    },

    /**
     * Check if URL contains suspicious keywords
     * @param {string} url - URL to check
     * @returns {object} Detection result
     */
    checkKeywords(url) {
        const lowerURL = url.toLowerCase();
        const foundKeywords = this.PHISHING_KEYWORDS.filter(keyword =>
            lowerURL.includes(keyword)
        );

        return {
            score: foundKeywords.length * 8, // 8 points per keyword
            reason: foundKeywords.length > 0
                ? `Contains suspicious keywords: ${foundKeywords.slice(0, 3).join(', ')}`
                : null
        };
    },

    /**
     * Check for suspicious TLD
     * @param {string} hostname - Domain hostname
     * @returns {object} Detection result
     */
    checkTLD(hostname) {
        for (let tld of this.SUSPICIOUS_TLDS) {
            if (hostname.endsWith(tld)) {
                return {
                    score: 25,
                    reason: `Suspicious TLD: ${tld}`
                };
            }
        }
        return { score: 0, reason: null };
    },

    /**
     * Check for excessive hyphens and dots (obfuscation)
     * @param {string} hostname - Domain hostname
     * @returns {object} Detection result
     */
    checkObfuscation(hostname) {
        const hyphenCount = (hostname.match(/-/g) || []).length;
        const dotCount = (hostname.match(/\./g) || []).length;

        let score = 0;
        let reasons = [];

        if (hyphenCount > 3) {
            score += 15;
            reasons.push(`Excessive hyphens (${hyphenCount})`);
        }

        if (dotCount > 4) {
            score += 10;
            reasons.push(`Excessive dots (${dotCount})`);
        }

        return {
            score,
            reason: reasons.length > 0 ? reasons.join(', ') : null
        };
    },

    /**
     * Check if URL uses IP address instead of domain
     * @param {string} hostname - Domain hostname
     * @returns {object} Detection result
     */
    checkIPAddress(hostname) {
        // IPv4 pattern
        const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        // IPv6 pattern (simplified)
        const ipv6Pattern = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;

        if (ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname)) {
            return {
                score: 30,
                reason: 'Uses IP address instead of domain name'
            };
        }

        return { score: 0, reason: null };
    },

    /**
     * Check for punycode (IDN homograph attack)
     * @param {string} hostname - Domain hostname
     * @returns {object} Detection result
     */
    checkPunycode(hostname) {
        if (hostname.includes('xn--')) {
            return {
                score: 20,
                reason: 'Contains punycode (possible homograph attack)'
            };
        }

        // Check for mixed scripts (e.g., Latin + Cyrillic)
        const hasCyrillic = /[а-яА-ЯЁё]/.test(hostname);
        const hasLatin = /[a-zA-Z]/.test(hostname);

        if (hasCyrillic && hasLatin) {
            return {
                score: 25,
                reason: 'Mixed character scripts detected'
            };
        }

        return { score: 0, reason: null };
    },

    /**
     * Check if domain is trusted
     * @param {string} hostname - Domain hostname
     * @returns {boolean} True if trusted
     */
    isTrustedDomain(hostname) {
        // Check exact match
        for (let trusted of this.TRUSTED_DOMAINS) {
            if (hostname === trusted || hostname.endsWith('.' + trusted)) {
                return true;
            }
        }

        // Check trusted redirectors
        for (let redirector of this.TRUSTED_REDIRECTORS) {
            if (hostname.includes(redirector)) {
                return true;
            }
        }

        return false;
    },

    /**
     * Check URL length (phishing URLs tend to be longer)
     * @param {string} url - Full URL
     * @param {string} hostname - Domain hostname
     * @returns {object} Detection result
     */
    checkLength(url, hostname) {
        // Trusted domains can have long URLs (tracking params, etc.)
        if (this.isTrustedDomain(hostname)) {
            return { score: 0, reason: null };
        }

        if (url.length > 75) {
            const score = Math.min(15, Math.floor((url.length - 75) / 10));
            return {
                score,
                reason: `Unusually long URL (${url.length} chars)`
            };
        }
        return { score: 0, reason: null };
    },

    /**
     * Check domain entropy (randomness)
     * @param {string} hostname - Domain hostname
     * @returns {object} Detection result
     */
    checkEntropy(hostname) {
        // Remove TLD for entropy calculation
        const domain = hostname.split('.')[0];
        const entropy = this.calculateEntropy(domain);

        // High entropy (>4.0) suggests random string
        if (entropy > 4.0) {
            return {
                score: Math.min(20, Math.floor((entropy - 4.0) * 10)),
                reason: `High domain randomness (entropy: ${entropy.toFixed(2)})`
            };
        }

        return { score: 0, reason: null };
    },

    /**
     * Check for typosquatting of popular domains
     * @param {string} hostname - Domain hostname
     * @returns {object} Detection result
     */
    checkTyposquatting(hostname) {
        // Skip if this is a trusted domain
        if (this.isTrustedDomain(hostname)) {
            return { score: 0, reason: null };
        }

        const domainPart = hostname.split('.')[0];

        for (let target of this.TARGETED_DOMAINS) {
            // Skip if domain matches the target exactly
            if (domainPart === target) {
                continue;
            }

            // Check for common typosquatting techniques
            const techniques = [
                // Character substitution (g00gle)
                () => {
                    const variations = [
                        domainPart.replace(/o/g, '0'),
                        domainPart.replace(/i/g, '1'),
                        domainPart.replace(/l/g, '1'),
                        domainPart.replace(/e/g, '3')
                    ];
                    return variations.includes(target) ||
                        target.replace(/o/g, '0') === domainPart ||
                        target.replace(/i/g, '1') === domainPart;
                },
                // Additional character (googlle) - but not legitimate variations
                () => {
                    if (domainPart.includes(target) &&
                        domainPart.length === target.length + 1) {
                        // Check if it's a common legitimate pattern
                        const legitimatePatterns = [
                            target + 's',  // plurals
                            target + 'app',
                            target + 'api'
                        ];
                        return !legitimatePatterns.includes(domainPart);
                    }
                    return false;
                },
                // Missing character (gogle) - only if very similar
                () => {
                    if (target.includes(domainPart) &&
                        target.length === domainPart.length + 1) {
                        // Calculate Levenshtein distance
                        return this.calculateLevenshteinDistance(domainPart, target) === 1;
                    }
                    return false;
                },
                // Subdomain trick (google.phishing.com) - but not official subdomains
                () => {
                    if (hostname.includes(target + '.') &&
                        !hostname.startsWith(target + '.')) {
                        // Check if it's on a trusted TLD for that brand
                        const trustedPattern = new RegExp(`${target}\.(com|co\.uk|co\.in|de|fr)$`);
                        return !trustedPattern.test(hostname);
                    }
                    return false;
                }
            ];

            for (let check of techniques) {
                if (check()) {
                    return {
                        score: 35,
                        reason: `Possible typosquatting of ${target}.com`
                    };
                }
            }
        }

        return { score: 0, reason: null };
    },

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {number} Edit distance
     */
    calculateLevenshteinDistance(a, b) {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    },

    /**
     * Main analysis function - runs all heuristics
     * @param {string} url - URL to analyze
     * @returns {object} Analysis result with score, verdict, and reasons
     */
    analyze(url) {
        const normalized = this.normalizeURL(url);

        if (!normalized) {
            return {
                quick_score: 0,
                quick_verdict: 'invalid',
                reasons: ['Invalid URL format']
            };
        }

        // Check custom blocklist FIRST (before trusted domain check)
        // Also check the full URL to catch blocked domains hidden in redirect URLs
        for (const blocked of this.BLOCKED_DOMAINS) {
            if (normalized.hostname.includes(blocked) || normalized.full.includes(blocked)) {
                return {
                    quick_score: 75,
                    quick_verdict: 'malicious',
                    reasons: ['Domain is on custom blocklist']
                };
            }
        }

        // Check if this is a trusted domain - if so, give it a pass
        if (this.isTrustedDomain(normalized.hostname)) {
            return {
                quick_score: 0,
                quick_verdict: 'safe',
                reasons: ['Trusted domain']
            };
        }

        // Run all detection checks
        const checks = [
            this.checkKeywords(normalized.full),
            this.checkTLD(normalized.hostname),
            this.checkObfuscation(normalized.hostname),
            this.checkIPAddress(normalized.hostname),
            this.checkPunycode(normalized.hostname),
            this.checkLength(normalized.full, normalized.hostname),
            this.checkEntropy(normalized.hostname),
            this.checkTyposquatting(normalized.hostname)
        ];

        // Calculate total score and collect reasons
        let totalScore = 0;
        const reasons = [];

        for (let check of checks) {
            totalScore += check.score;
            if (check.reason) {
                reasons.push(check.reason);
            }
        }

        // Cap score at 100
        totalScore = Math.min(100, totalScore);

        // Determine verdict
        let verdict;
        if (totalScore < 30) {
            verdict = 'safe';
        } else if (totalScore < 60) {
            verdict = 'suspicious';
        } else {
            verdict = 'malicious';
        }

        return {
            quick_score: totalScore,
            quick_verdict: verdict,
            reasons: reasons.slice(0, 5) // Top 5 reasons
        };
    }
};

// Make available to content script
if (typeof window !== 'undefined') {
    window.FastDetector = FastDetector;
}
