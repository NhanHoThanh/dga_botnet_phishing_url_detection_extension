"""
Feature extraction for inference.

Two extractors:
1. extract_url_features(url) -> 25 PhiUSIIL URL-only features
2. extract_domain_features(domain) -> 71 DGA features (64 char + 7 stats)
"""

import json
import math
import re
from difflib import SequenceMatcher
from urllib.parse import urlparse

import numpy as np
import tldextract

# ─── DGA Feature Constants ───────────────────────────────────────────────────

CHAR_MAP = {
    "a": 5, "b": 9, "c": 17, "d": 30, "e": 22, "f": 2, "g": 35, "h": 19,
    "i": 12, "j": 28, "k": 20, "l": 24, "m": 10, "n": 13, "o": 7,
    "p": 26, "q": 4, "r": 37, "s": 11, "t": 15, "u": 16, "v": 25,
    "w": 6, "x": 8, "y": 1, "z": 3, "0": 36, "1": 23, "2": 31,
    "3": 33, "4": 27, "5": 29, "6": 38, "7": 32, "8": 14, "9": 21,
    "-": 39, ".": 18, "_": 34,
}
VOWELS = set("aeiou")
CONSONANTS = set("bcdfghjklmnpqrstvwxyz")
MAX_DOMAIN_LEN = 64

# ─── Shared Utilities ─────────────────────────────────────────────────────────

def _entropy(s: str) -> float:
    if not s:
        return 0.0
    freq = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    length = len(s)
    return -sum((c / length) * math.log2(c / length) for c in freq.values())


def _longest_consecutive_consonants(s: str) -> int:
    max_run = current = 0
    for ch in s.lower():
        if ch in CONSONANTS:
            current += 1
            max_run = max(max_run, current)
        else:
            current = 0
    return max_run


_IP_RE = re.compile(
    r"^(\d{1,3}\.){3}\d{1,3}$"  # IPv4
    r"|^\[?[0-9a-fA-F:]+\]?$"    # IPv6
)
_HEX_ENCODED_RE = re.compile(r"%[0-9a-fA-F]{2}")


# ─── PhiUSIIL URL Feature Extraction (25 features) ──────────────────────────

class PhishingFeatureExtractor:
    """Extracts the 25 pre-fetch URL-only features matching the PhiUSIIL dataset schema."""

    FEATURE_NAMES = [
        "URLLength", "DomainLength", "IsDomainIP", "URLSimilarityIndex",
        "CharContinuationRate", "TLDLegitimateProb", "URLCharProb", "TLDLength",
        "NoOfSubDomain", "HasObfuscation", "NoOfObfuscatedChar", "ObfuscationRatio",
        "NoOfLettersInURL", "LetterRatioInURL", "NoOfDegitsInURL", "DegitRatioInURL",
        "NoOfEqualsInURL", "NoOfQMarkInURL", "NoOfAmpersandInURL",
        "NoOfOtherSpecialCharsInURL", "SpacialCharRatioInURL", "IsHTTPS",
        "Bank", "Pay", "Crypto",
    ]

    def __init__(self, lookups_path: str | None = None):
        self.tld_probs: dict[str, float] = {}
        self.char_probs: dict[str, float] = {}
        self.default_tld_prob = 0.5
        self.default_char_prob = 0.0001
        if lookups_path:
            self.load_lookups(lookups_path)

    def load_lookups(self, path: str):
        with open(path) as f:
            data = json.load(f)
        self.tld_probs = data.get("tld_legitimate_prob", {})
        self.char_probs = data.get("char_probs", {})
        if self.tld_probs:
            self.default_tld_prob = sum(self.tld_probs.values()) / len(self.tld_probs)
        if self.char_probs:
            self.default_char_prob = min(self.char_probs.values())

    def extract(self, url: str) -> np.ndarray:
        """Extract 25 features from a URL string. Returns a 1D numpy array."""
        parsed = urlparse(url)
        ext = tldextract.extract(url)

        domain = ext.registered_domain or ext.domain or parsed.hostname or ""
        tld = ext.suffix or ""
        subdomain = ext.subdomain or ""
        hostname = parsed.hostname or ""
        url_len = len(url)

        # Basic counts
        n_letters = sum(ch.isalpha() for ch in url)
        n_digits = sum(ch.isdigit() for ch in url)
        n_equals = url.count("=")
        n_qmark = url.count("?")
        n_amp = url.count("&")
        special_chars = set("!@#$%^&*()_+-=[]{}|;':\",./<>?`~")
        counted_special = {"=", "?", "&"}
        n_other_special = sum(ch in (special_chars - counted_special) for ch in url)
        n_all_special = n_equals + n_qmark + n_amp + n_other_special

        # Obfuscation (hex-encoded characters like %20)
        hex_matches = _HEX_ENCODED_RE.findall(url)
        n_obfuscated = len(hex_matches)

        # Subdomains
        n_subdomains = len(subdomain.split(".")) if subdomain else 0

        # URLSimilarityIndex: SequenceMatcher ratio between URL path and domain
        url_path = parsed.path or ""
        similarity = SequenceMatcher(None, domain.lower(), url_path.lower()).ratio()

        # CharContinuationRate: fraction of consecutive char pairs that are same type
        continuation = self._char_continuation_rate(url)

        # TLDLegitimateProb: lookup from training data
        tld_prob = self.tld_probs.get(tld, self.default_tld_prob)

        # URLCharProb: average character probability
        url_char_prob = self._url_char_prob(url)

        # Keywords
        url_lower = url.lower()
        has_bank = int("bank" in url_lower)
        has_pay = int("pay" in url_lower)
        has_crypto = int("crypto" in url_lower)

        features = [
            url_len,                                              # URLLength
            len(domain),                                          # DomainLength
            int(bool(_IP_RE.match(hostname))),                    # IsDomainIP
            similarity,                                           # URLSimilarityIndex
            continuation,                                         # CharContinuationRate
            tld_prob,                                             # TLDLegitimateProb
            url_char_prob,                                        # URLCharProb
            len(tld),                                             # TLDLength
            n_subdomains,                                         # NoOfSubDomain
            int(n_obfuscated > 0),                                # HasObfuscation
            n_obfuscated,                                         # NoOfObfuscatedChar
            n_obfuscated / max(url_len, 1),                       # ObfuscationRatio
            n_letters,                                            # NoOfLettersInURL
            n_letters / max(url_len, 1),                          # LetterRatioInURL
            n_digits,                                             # NoOfDegitsInURL
            n_digits / max(url_len, 1),                           # DegitRatioInURL
            n_equals,                                             # NoOfEqualsInURL
            n_qmark,                                              # NoOfQMarkInURL
            n_amp,                                                # NoOfAmpersandInURL
            n_other_special,                                      # NoOfOtherSpecialCharsInURL
            n_all_special / max(url_len, 1),                      # SpacialCharRatioInURL
            int(parsed.scheme == "https"),                         # IsHTTPS
            has_bank,                                             # Bank
            has_pay,                                              # Pay
            has_crypto,                                           # Crypto
        ]
        return np.array(features, dtype=np.float64)

    def _char_continuation_rate(self, url: str) -> float:
        """Fraction of consecutive character pairs that share the same type
        (letter-letter, digit-digit, special-special)."""
        if len(url) < 2:
            return 0.0

        def char_type(ch):
            if ch.isalpha():
                return 0
            if ch.isdigit():
                return 1
            return 2

        continuations = sum(
            char_type(url[i]) == char_type(url[i + 1])
            for i in range(len(url) - 1)
        )
        return continuations / (len(url) - 1)

    def _url_char_prob(self, url: str) -> float:
        """Average character probability from training distribution."""
        if not url or not self.char_probs:
            return 0.0
        total = sum(self.char_probs.get(ch.lower(), self.default_char_prob) for ch in url)
        return total / len(url)


# ─── DGA Feature Extraction (71 features) ────────────────────────────────────

def extract_domain_features(domain: str) -> np.ndarray:
    """Extract 71 features from a bare domain string for DGA detection.
    64 character-position features + 7 statistical features."""
    original = domain
    domain_lower = domain.lower()

    # Character encoding: right-aligned, zero-padded to 64
    char_encoded = [0] * MAX_DOMAIN_LEN
    chars = list(domain_lower[:MAX_DOMAIN_LEN])
    offset = MAX_DOMAIN_LEN - len(chars)
    for i, ch in enumerate(chars):
        char_encoded[offset + i] = CHAR_MAP.get(ch, 0)

    # Statistical features
    length = len(domain_lower)
    capitals = sum(1 for ch in original if ch.isupper())
    digits = sum(1 for ch in domain_lower if ch.isdigit())
    consec_consonants = _longest_consecutive_consonants(domain_lower)
    vowel_ratio = sum(1 for ch in domain_lower if ch in VOWELS) / max(length, 1)
    entropy = _entropy(domain_lower)
    unique_chars = len(set(domain_lower))

    features = char_encoded + [
        length, capitals, digits, consec_consonants,
        vowel_ratio, entropy, unique_chars,
    ]
    return np.array(features, dtype=np.float32)
