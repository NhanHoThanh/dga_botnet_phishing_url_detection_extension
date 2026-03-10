# Dataset Analysis

## 1. PhiUSIIL Phishing URL Dataset

### Overview

| Property | Value |
|---|---|
| Source | UCI Machine Learning Repository (#967) |
| Paper | Arvind Prasad & Shalini Chandra, 2024 |
| Total samples | 235,795 |
| Features | 56 columns (50 numeric + 5 string + 1 label) |
| Label | `label`: 0 = Phishing, 1 = Legitimate |
| Missing values | None |

### Class Distribution

| Class | Count | Ratio |
|---|---|---|
| Legitimate (1) | 134,850 | 57.19% |
| Phishing (0) | 100,945 | 42.81% |

The dataset is moderately imbalanced (~57/43 split) but not severely so. No resampling is strictly necessary.

### Feature Categories

The 50 numeric features are divided into two groups:

#### Pre-Fetch (URL-Only) Features — 25 features

These can be computed from the URL string alone, with no network request:

| Feature | Type | Description | Mean | Std |
|---|---|---|---|---|
| URLLength | int | Total URL character count | 34.57 | 41.31 |
| DomainLength | int | Domain name length | 21.47 | 9.15 |
| IsDomainIP | binary | 1 if domain is an IP address | 0.003 | 0.05 |
| URLSimilarityIndex | float | Similarity between URL and domain (0-100) | 78.43 | 28.98 |
| CharContinuationRate | float | Rate of same-type char continuation (0-1) | 0.85 | 0.22 |
| TLDLegitimateProb | float | Probability of TLD being legitimate | 0.26 | 0.25 |
| URLCharProb | float | Character probability distribution | 0.056 | 0.011 |
| TLDLength | int | TLD character count | 2.76 | 0.60 |
| NoOfSubDomain | int | Number of subdomains | 1.16 | 0.60 |
| HasObfuscation | binary | URL contains hex encoding (%XX) | 0.002 | 0.05 |
| NoOfObfuscatedChar | int | Count of %XX patterns | 0.02 | 1.88 |
| ObfuscationRatio | float | NoOfObfuscatedChar / URLLength | 0.0001 | 0.004 |
| NoOfLettersInURL | int | Count of alphabetic characters | 19.43 | 29.09 |
| LetterRatioInURL | float | NoOfLettersInURL / URLLength | 0.52 | 0.12 |
| NoOfDegitsInURL | int | Count of digit characters | 1.88 | 11.89 |
| DegitRatioInURL | float | NoOfDegitsInURL / URLLength | 0.03 | 0.07 |
| NoOfEqualsInURL | int | Count of '=' characters | 0.06 | 0.93 |
| NoOfQMarkInURL | int | Count of '?' characters | 0.03 | 0.19 |
| NoOfAmpersandInURL | int | Count of '&' characters | 0.03 | 0.84 |
| NoOfOtherSpecialCharsInURL | int | Count of other special characters | 2.34 | 3.53 |
| SpacialCharRatioInURL | float | Special characters / URLLength | 0.06 | 0.03 |
| IsHTTPS | binary | 1 if URL uses HTTPS | 0.78 | 0.41 |
| Bank | binary | 1 if "bank" keyword in URL | 0.13 | 0.33 |
| Pay | binary | 1 if "pay" keyword in URL | 0.24 | 0.43 |
| Crypto | binary | 1 if "crypto" keyword in URL | 0.02 | 0.15 |

#### Post-Fetch (Webpage Content) Features — 25 features

These require loading the webpage and inspecting HTML/DOM:

| Feature | Type | Description |
|---|---|---|
| LineOfCode | int | Number of lines in page source |
| LargestLineLength | int | Longest line in source code |
| HasTitle | binary | Page has a `<title>` tag |
| DomainTitleMatchScore | float | Similarity between domain and page title |
| URLTitleMatchScore | float | Similarity between URL and page title |
| HasFavicon | binary | Page has a favicon |
| Robots | binary | robots.txt exists |
| IsResponsive | binary | Page is mobile-responsive |
| NoOfURLRedirect | int | Number of URL redirects |
| NoOfSelfRedirect | int | Redirects to same domain |
| HasDescription | binary | Page has meta description |
| NoOfPopup | int | Popup/overlay count |
| NoOfiFrame | int | Number of iframes |
| HasExternalFormSubmit | binary | Form submits to external domain |
| HasSocialNet | binary | Links to social networks |
| HasSubmitButton | binary | Page has submit buttons |
| HasHiddenFields | binary | Hidden form fields |
| HasPasswordField | binary | Password input fields |
| HasCopyrightInfo | binary | Copyright notice present |
| NoOfImage | int | Image count |
| NoOfCSS | int | CSS file count |
| NoOfJS | int | JavaScript file count |
| NoOfSelfRef | int | Self-referencing links |
| NoOfEmptyRef | int | Empty href links |
| NoOfExternalRef | int | External links |

### Key Statistical Findings

#### 1. URLSimilarityIndex is the strongest single predictor

| Class | Mean | Median | Std |
|---|---|---|---|
| Phishing (0) | 49.62 | 51.42 | 22.57 |
| Legitimate (1) | 100.00 | 100.00 | 0.00 |

All legitimate URLs have a perfect URLSimilarityIndex of 100.0 (URL perfectly matches domain). Phishing URLs average ~50, indicating mismatches between URL and domain structure. **Pearson correlation with label: 0.8604** (highest of all features).

#### 2. HTTPS usage is strongly discriminative

| Class | HTTP | HTTPS |
|---|---|---|
| Phishing | 50.78% | 49.22% |
| Legitimate | 0.00% | 100.00% |

100% of legitimate URLs use HTTPS. Only ~49% of phishing URLs do. **Correlation: 0.6091.**

#### 3. URL and Domain Length

| Metric | Phishing | Legitimate |
|---|---|---|
| URL Length (mean) | 45.7 | 26.2 |
| URL Length (std) | 61.1 | 4.8 |
| Domain Length (mean) | 24.5 | 19.2 |
| Domain Length (std) | 12.2 | 4.8 |

Phishing URLs are longer and have much higher variance. Legitimate URLs are tightly clustered around 26 characters.

#### 4. Top 15 Feature Correlations with Label (absolute value)

| Rank | Feature | |r| | Category |
|---|---|---|---|
| 1 | URLSimilarityIndex | 0.8604 | URL-only |
| 2 | HasSocialNet | 0.7843 | Post-fetch |
| 3 | HasCopyrightInfo | 0.7434 | Post-fetch |
| 4 | HasDescription | 0.6902 | Post-fetch |
| 5 | IsHTTPS | 0.6091 | URL-only |
| 6 | DomainTitleMatchScore | 0.5849 | Post-fetch |
| 7 | HasSubmitButton | 0.5786 | Post-fetch |
| 8 | IsResponsive | 0.5486 | Post-fetch |
| 9 | URLTitleMatchScore | 0.5394 | Post-fetch |
| 10 | SpacialCharRatioInURL | 0.5335 | URL-only |
| 11 | HasHiddenFields | 0.5077 | Post-fetch |
| 12 | HasFavicon | 0.4937 | Post-fetch |
| 13 | URLCharProb | 0.4697 | URL-only |
| 14 | CharContinuationRate | 0.4677 | URL-only |
| 15 | HasTitle | 0.4597 | Post-fetch |

Despite post-fetch features dominating ranks 2-9, the single strongest predictor (URLSimilarityIndex) is a URL-only feature. This justifies building a URL-only model for real-time, pre-click detection.

#### 5. TLD Distribution

| Rank | Phishing TLD | Count | Legitimate TLD | Count |
|---|---|---|---|---|
| 1 | com | 43,769 | com | 68,785 |
| 2 | app | 6,368 | org | 16,524 |
| 3 | co | 4,964 | uk | 6,073 |
| 4 | io | 3,769 | net | 3,998 |
| 5 | net | 3,099 | de | 3,310 |

`.com` dominates both classes. Phishing URLs disproportionately use `.app`, `.co`, `.io`, `.top`, `.dev`. Legitimate URLs are spread across country-code TLDs (`.uk`, `.de`, `.au`, `.jp`).

---

## 2. ExtraHop DGA Detection Training Dataset

### Overview

| Property | Value |
|---|---|
| Source | ExtraHop Networks (GitHub) |
| Total samples | 16,246,014 |
| Features | 2 columns: `domain` (string), `threat` (label) |
| Label | `threat`: "benign" or "dga" |
| Format | Newline-delimited JSON (NDJSON) |
| Domain format | Bare domain names (no TLD, no subdomain) |

### Class Distribution

| Class | Count (est.) | Ratio |
|---|---|---|
| DGA | ~8,261,879 | 50.84% |
| Benign | ~7,984,127 | 49.16% |

Near-perfectly balanced (~50/50 split).

### Domain Length Statistics

| Metric | Benign | DGA |
|---|---|---|
| Mean | 11.79 | 15.25 |
| Median | 11.0 | 14.0 |
| Std | 4.92 | 6.21 |
| Min | 1 | 3 |
| Max | 63 | 44 |

DGA domains are on average ~3.5 characters longer than benign domains. Benign domains cluster around 6-15 characters; DGA domains spread more evenly with a tail toward 21-30.

### Domain Length Distribution

| Length Range | Benign | DGA |
|---|---|---|
| 1-5 | 6.22% | 0.03% |
| 6-10 | 37.94% | 26.72% |
| 11-15 | 34.70% | 32.28% |
| 16-20 | 15.63% | 18.81% |
| 21-30 | 5.32% | 20.99% |
| 31-50 | 0.19% | 1.17% |

The clearest separation is in the 21-30 range: DGA domains are 4x more likely to be this length.

### Character-Level Analysis (500k sample)

| Metric | Benign | DGA |
|---|---|---|
| Shannon Entropy (mean) | 2.92 | 3.27 |
| Vowel Ratio (mean) | 0.344 | 0.240 |
| Digit Count (mean) | 0.44 | 1.14 |
| Unique Characters (mean) | 8.59 | 10.93 |
| Max Consecutive Consonants (mean) | 2.46 | 5.30 |

Key observations:
- **Entropy**: DGA domains have higher entropy (more randomness) — 3.27 vs 2.92
- **Vowel ratio**: Benign domains have 34.4% vowels (natural language). DGA domains have only 24.0% (random generation produces fewer vowels)
- **Consecutive consonants**: The strongest differentiator. DGA domains average 5.3 consecutive consonants vs 2.5 for benign. Human-readable words rarely have >3 consonants in a row.
- **Digits**: DGA domains have 2.6x more digits on average
- **Hyphens**: 11.3% of benign domains contain hyphens; 0.0% of DGA domains do (DGA generators typically don't use hyphens)

### Character Frequency Distribution

| Rank | Benign Char | Frequency | DGA Char | Frequency |
|---|---|---|---|---|
| 1 | 'e' | 9.89% | 'e' | 5.17% |
| 2 | 'a' | 9.11% | 'a' | 5.11% |
| 3 | 'i' | 7.18% | 'i' | 4.79% |
| 4 | 'o' | 6.85% | 'o' | 4.67% |
| 5 | 'r' | 6.67% | 'y' | 4.52% |

Benign domains follow English letter frequency (e > a > i > o > r). DGA domains show a much flatter distribution — character frequencies are more uniform (max 5.17% vs 9.89%), which is a hallmark of pseudo-random generation.

### Engineered Features for Model Training

The DGA model uses 71 features total:

**Character encoding (64 features)**: Each domain character is mapped to an integer via a fixed lookup table and right-aligned in a 64-element vector, zero-padded on the left.

**Statistical features (7 features)**:

| Feature | Description |
|---|---|
| length | Number of characters in domain |
| capitals | Count of uppercase characters |
| digits | Count of digit characters |
| consonants_consec | Length of longest consecutive consonant run |
| vowel_ratio | Vowels / domain length |
| entropy | Shannon entropy of the domain string |
| unique_chars | Number of unique characters |
