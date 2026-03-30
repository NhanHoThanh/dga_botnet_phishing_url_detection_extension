# Literature Review: DGA & Phishing URL Detection — State of the Art

## Table of Contents

1. [Introduction](#1-introduction)
2. [DGA Detection Methods](#2-dga-detection-methods)
   - 2.1 Classical ML Approaches
   - 2.2 Deep Learning Approaches
   - 2.3 Transformer & Language Model Approaches
   - 2.4 Adversarial & Evasion Research
3. [Phishing URL Detection Methods](#3-phishing-url-detection-methods)
   - 3.1 Tree-Based & Classical ML
   - 3.2 Deep Learning & NLP Approaches
   - 3.3 Browser Extension-Based Detection
4. [Research Using Our Datasets](#4-research-using-our-datasets)
   - 4.1 PhiUSIIL Phishing URL Dataset
   - 4.2 ExtraHop DGA Detection Dataset
5. [Production Systems & Industry](#5-production-systems--industry)
   - 5.1 Commercial DNS Security Products
   - 5.2 Open-Source Tools
   - 5.3 Production Architectures
6. [Comparison With Our Approach](#6-comparison-with-our-approach)
7. [References](#7-references)

---

## 1. Introduction

This document surveys the current state of the art in DGA (Domain Generation Algorithm) detection and phishing URL detection, covering academic research, industry products, and production deployment architectures. We compare these approaches to the methods used in our project, which employs XGBoost classifiers on the **PhiUSIIL Phishing URL Dataset** and the **ExtraHop DGA Detection Training Dataset**.

Our project uses:
- **Phishing detection**: XGBoost with 25 URL-only pre-fetch features → 99.98% accuracy
- **DGA detection**: XGBoost with 71 features (64 character-position + 7 statistical) → 97.45% accuracy
- **Deployment**: FastAPI backend + Chrome Extension with client-side heuristics

---

## 2. DGA Detection Methods

### 2.1 Classical ML Approaches

**MaldomDetector** (Almashhadani et al., 2020) proposed a system for detecting algorithmically generated domain names using only the domain name's characters with easy-to-compute, language-independent features. They used classical ML classifiers (Random Forest, SVM, etc.) and demonstrated strong results on multiple DGA families. Their feature set includes character frequency, entropy, and n-gram statistics — similar to our approach.
- DOI: [10.1016/j.cose.2020.101787](https://doi.org/10.1016/j.cose.2020.101787)

**Cucchiarelli et al. (2020)** proposed n-gram-based features for DGA detection, using bigram and trigram character frequencies as input to classical ML classifiers. They showed that n-gram approaches effectively capture the statistical irregularities in DGA-generated domains compared to legitimate ones.
- DOI: [10.1016/j.eswa.2020.114551](https://doi.org/10.1016/j.eswa.2020.114551)

**Mac et al. (2017)** evaluated supervised learning methods (SVM, Random Forest, Logistic Regression) for DGA botnet detection, comparing feature engineering approaches including domain length, entropy, and character distribution features.
- DOI: [10.1145/3155133.3155166](https://doi.org/10.1145/3155133.3155166)

**Li et al. (2019)** proposed a ML framework for DGA-based malware detection combining clustering with HMM-based features and classical classifiers. Their approach handles both binary classification and multi-family identification.
- DOI: [10.1109/access.2019.2891588](https://doi.org/10.1109/access.2019.2891588)

**Robust Botnet DGA Detection** (Suryotrisongko et al., 2022) blended Explainable AI (XAI) with OSINT for cyber threat intelligence sharing. Notably, their **Random Forest model provided better robustness against adversarial DGA attacks** (CharBot, DeepDGA, MaskDGA) compared to character-based deep learning models — an important finding for production deployment.
- DOI: [10.1109/access.2022.3162588](https://doi.org/10.1109/access.2022.3162588)

**NIOM-DGA** (Jeremiah et al., 2025) used nature-inspired optimization algorithms to tune ML models for DGA detection, achieving results in the top 10% by citation impact. This represents the current trend of combining meta-heuristic optimization with traditional ML.
- DOI: [10.1016/j.cose.2025.104561](https://doi.org/10.1016/j.cose.2025.104561)

### 2.2 Deep Learning Approaches

**DeepDGA** (Anderson, Woodbridge & Filar, 2016) was one of the pioneering works using deep learning for DGA detection. They trained LSTM networks on raw domain name character sequences with **no manual feature extraction**. Results: **0.9993 AUC** for binary classification (DGA vs. benign) and **0.9906 micro-averaged F1** for multi-class family classification. They achieved a 90% detection rate with a 1:10,000 false positive rate — a 20x improvement over comparable methods at the time.
- DOI: [10.1145/2996758.2996767](https://doi.org/10.1145/2996758.2996767)
- Code: [github.com/endgameinc/dga_predict](https://github.com/endgameinc/dga_predict)

**Ren et al. (2020)** proposed a DGA detection method integrating an attention mechanism with deep neural networks, allowing the model to focus on the most discriminative character positions in the domain string.
- DOI: [10.1186/s42400-020-00046-6](https://doi.org/10.1186/s42400-020-00046-6)

**Tuan, Long & Taniar (2021)** addressed both detection and classification of DGA botnets and their families, achieving 56 citations and placing in the top 3% of papers by normalized citation impact. They compared SVM and deep learning approaches for multi-class DGA family classification.
- DOI: [10.1016/j.cose.2021.102549](https://doi.org/10.1016/j.cose.2021.102549)

**Curtin et al. (2019)** proposed detecting DGA domains with recurrent neural networks combined with side information (contextual DNS features beyond just the domain string), demonstrating that behavioral context improves detection, especially for dictionary-based DGAs.
- DOI: [10.1145/3339252.3339258](https://doi.org/10.1145/3339252.3339258)

### 2.3 Transformer & Language Model Approaches

**DomURLs_BERT** (El Mahdaouy et al., 2026) proposed a BERT-based encoder pre-trained with Masked Language Modeling on a large multilingual corpus of URLs, domain names, and DGA datasets. The model was fine-tuned for binary and multi-class classification covering phishing, malware, DGA, and DNS tunneling detection. It **outperforms state-of-the-art character-based deep learning models and cybersecurity-focused BERT models** across multiple tasks and datasets.
- DOI: [10.1007/s10922-025-10010-9](https://doi.org/10.1007/s10922-025-10010-9)
- Preprint: [arxiv.org/abs/2409.09143](https://arxiv.org/abs/2409.09143)

**Yerima, Vinod & Shaalan (2024)** proposed a transformer embedding-based model for DGA detection, using GPT embeddings and comparing against TF-IDF, Bag-of-Words, n-grams, word2vec, and two BERT variants. With XGBoost as the downstream classifier, they achieved **93.1% accuracy**.
- DOI: [10.1109/cicn63059.2024.10847389](https://doi.org/10.1109/cicn63059.2024.10847389)

### 2.4 Adversarial & Evasion Research

**CharBot** (Peck, Nie, Sivaguru et al., 2019) demonstrated a simple and effective method for evading DGA classifiers by generating domain names that fool state-of-the-art detection systems. This is critical research for understanding the robustness of DGA detectors, including ours.
- DOI: [10.1109/access.2019.2927075](https://doi.org/10.1109/access.2019.2927075)

**Gardiner & Nagaraja (2016)** analyzed the security of ML-based malware C&C detection, evaluating resilience to various evasion techniques and attacks against ML components used in detection pipelines.
- DOI: [10.1145/3003816](https://doi.org/10.1145/3003816)

---

## 3. Phishing URL Detection Methods

### 3.1 Tree-Based & Classical ML

**Li et al. (2018)** proposed a stacking model using both URL and HTML features for phishing webpage detection. Their stacking ensemble combined multiple base classifiers, demonstrating that ensemble methods significantly outperform individual classifiers for phishing detection.
- DOI: [10.1016/j.future.2018.11.004](https://doi.org/10.1016/j.future.2018.11.004)

**Shaukat et al. (2023)** developed a hybrid approach for detecting alluring ads phishing attacks using machine learning, combining multiple feature types and classifier ensembles.
- DOI: [10.3390/s23198070](https://doi.org/10.3390/s23198070)

**Uddin et al. (2022)** provided a comparative analysis of ML-based website phishing detection using URL information only (no page content), evaluating Random Forest, Decision Tree, SVM, and other classifiers. This is directly comparable to our URL-only approach.
- DOI: [10.1109/prai55851.2022.9904055](https://doi.org/10.1109/prai55851.2022.9904055)

**Feature Selection for Phishing Detection** (Rani & Foozy, 2023) studied how feature selection techniques enhance phishing website detection based on URL features, finding that careful feature selection can maintain high accuracy with fewer features.
- DOI: [10.30880/jscdm.2023.04.01.003](https://doi.org/10.30880/jscdm.2023.04.01.003)

### 3.2 Deep Learning & NLP Approaches

**AntiPhishStack** (Aslam et al., 2024) proposed an LSTM-based stacked generalization model for optimized phishing URL detection, combining the sequential pattern recognition of LSTMs with ensemble stacking.
- DOI: [10.3390/sym16020248](https://doi.org/10.3390/sym16020248)

**Manyumwa et al. (2020)** tackled malicious URL attack type detection using multiclass classification, going beyond binary (phishing vs. legitimate) to distinguish between phishing, malware, defacement, and spam URLs.
- DOI: [10.1109/bigdata50022.2020.9378029](https://doi.org/10.1109/bigdata50022.2020.9378029)

**Beyond Phish** (Bitaab et al., 2023) — published at IEEE S&P (top-tier security venue) — evaluated industry systems and found that **Google Safe Browsing has a detection rate of just 0.46%** on fraudulent e-commerce websites. This highlights the gap between current production systems and the evolving threat landscape.
- DOI: [10.1109/sp46215.2023.10179461](https://doi.org/10.1109/sp46215.2023.10179461)

### 3.3 Browser Extension-Based Detection

**Chrome Extension for Detecting Phishing Websites** (Pavan et al., 2023) directly focused on building a Chrome extension for phishing website detection, similar to our project's deployment approach.
- DOI: [10.2139/ssrn.4398136](https://doi.org/10.2139/ssrn.4398136)

**Real-time Phishing URL Detection using Knowledge Distilled ELECTRA** (Jishnu & Arthi, 2024) integrated a deep learning model with a user-centric Chrome browser extension for real-time phishing URL detection, using knowledge distillation to reduce model size for client-side deployment.
- DOI: [10.1080/00051144.2024.2415797](https://doi.org/10.1080/00051144.2024.2415797)

**Bhadane & Mane (2018)** developed a Chrome browser extension for detecting lateral spear phishing attacks in organizations, combining URL analysis with organizational context.
- DOI: [10.1049/iet-ifs.2018.5090](https://doi.org/10.1049/iet-ifs.2018.5090)

---

## 4. Research Using Our Datasets

### 4.1 PhiUSIIL Phishing URL Dataset

The PhiUSIIL dataset (UCI ML Repository #967) was introduced by Prasad & Chandra (2024) and has been cited by multiple subsequent studies:

**Original paper — PhiUSIIL** (Prasad & Chandra, 2024): Proposed a phishing URL detection framework based on similarity index and incremental learning. The dataset contains 235,795 samples with 56 features (50 numeric + 5 string + 1 label). The paper introduced the **URLSimilarityIndex** feature — which our project found to be the strongest feature at 72% importance via SHAP analysis. The original paper used incremental learning classifiers (SGD, Passive-Aggressive, BernoulliNB) achieving 93-96% accuracy with URL-only features.
- DOI: [10.1016/j.cose.2023.103545](https://doi.org/10.1016/j.cose.2023.103545)
- Dataset: [archive.ics.uci.edu/dataset/967](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset)

**Papers citing/using PhiUSIIL:**

1. **Self-tuning framework with aggregation functions in ensemble classifier** (Gałka et al., 2024) — Used the PhiUSIIL dataset to evaluate a self-tuning framework for reducing false positive instances using aggregation functions in ensemble classifiers.
   - DOI: [10.1016/j.procs.2024.09.241](https://doi.org/10.1016/j.procs.2024.09.241)

2. **DomURLs_BERT** (El Mahdaouy et al., 2026) — Used PhiUSIIL among other datasets to evaluate their pre-trained BERT model for malicious domain and URL detection, outperforming character-based deep learning models.
   - DOI: [10.1007/s10922-025-10010-9](https://doi.org/10.1007/s10922-025-10010-9)

3. **Advanced Phishing Detection using t-SNE and ML** (Etem & Teke, 2024) — Leveraged t-SNE feature extraction combined with machine learning on the PhiUSIIL dataset.
   - DOI: [10.26650/acin.1521835](https://doi.org/10.26650/acin.1521835)

4. **NLP and SVM for Phishing URL Detection** (Aritonang et al., 2026) — Applied NLP techniques with SVM optimization on the PhiUSIIL dataset.
   - DOI: [10.52436/1.jutif.2026.7.1.5334](https://doi.org/10.52436/1.jutif.2026.7.1.5334)

5. **HyRANN-UPD** (John-Otumu et al., 2025) — Enhanced phishing URL detection using Ridge Regression-based feature selection and Artificial Neural Networks on the PhiUSIIL dataset.
   - DOI: [10.5120/ijca2025924689](https://doi.org/10.5120/ijca2025924689)

6. **URL-Based Phishing Detection Using CatBoost** (Yadav & Jhajharia, 2025) — Applied CatBoost gradient boosting on the PhiUSIIL dataset for phishing URL detection.
   - DOI: [10.1109/iccca66364.2025.11325141](https://doi.org/10.1109/iccca66364.2025.11325141)

### 4.2 ExtraHop DGA Detection Training Dataset

The ExtraHop dataset contains 16,246,014 domain samples (~50/50 DGA vs. benign), released as an open dataset for DGA detection research.
- Repository: [github.com/ExtraHop/dga-detection-training-dataset](https://github.com/ExtraHop/dga-detection-training-dataset)

This dataset is relatively newer and less cited in academic literature compared to DGArchive-based datasets. Most DGA detection papers use:
- **DGArchive** (Fraunhofer FKIE) — the gold standard containing reverse-engineered DGA algorithms for 100+ malware families: [dgarchive.caad.fkie.fraunhofer.de](https://dgarchive.caad.fkie.fraunhofer.de/)
- **Alexa Top 1M** — for benign domain samples (used by DeepDGA and most DGA papers)
- **OSINT feeds** (abuse.ch, BAMBENEK) — for known DGA domain lists

The ExtraHop dataset's strength is its **scale** (16M+ samples) and **balanced distribution**, making it suitable for training robust classifiers without resampling. However, it only provides bare second-level domain strings (no TLD, no subdomain), which limits the feature set to character-level and statistical features — exactly the approach our project takes.

---

## 5. Production Systems & Industry

### 5.1 Commercial DNS Security Products

| Product | Vendor | Approach | Key Technique | URL |
|---------|--------|----------|---------------|-----|
| **Umbrella** | Cisco | Cloud recursive DNS resolver | Statistical models + graph analysis on 620B+ queries/day. DGA detected via character-frequency, n-gram, entropy scoring. Malicious domains are sinkholed. | [umbrella.cisco.com](https://umbrella.cisco.com/) |
| **Falcon** | CrowdStrike | Endpoint agent | ML models (entropy, char distribution, n-grams) run locally on endpoints. Correlates DNS with process behavior. | [crowdstrike.com](https://www.crowdstrike.com/products/threat-intelligence/) |
| **DNS Security** | Palo Alto | Inline NGFW inspection | Cloud-based deep learning / LSTM classifiers. Sub-millisecond inline scoring. Maintained by Unit 42 research team. | [docs.paloaltonetworks.com/dns-security](https://docs.paloaltonetworks.com/dns-security) |
| **Secure Internet Access** | Akamai | Cloud SWG + DNS | Reputation lists + real-time ML. Unique advantage: correlates DNS with HTTP-layer CDN data. | [akamai.com](https://www.akamai.com/products/secure-internet-access-enterprise) |
| **Threat Defense** | Infoblox | Hybrid on-prem + cloud | DNS Early Detection Program with ML on query patterns, domain linguistics, DNS graph. Focus on dictionary-based DGA detection. | [infoblox.com](https://www.infoblox.com/products/bloxone-threat-defense/) |
| **Quad9** | Quad9 Foundation | Public DNS resolver (9.9.9.9) | Aggregates 25+ threat intel feeds. Blocklist-based (not real-time ML). 670M+ daily blocks across 230+ resolver clusters. | [quad9.net](https://www.quad9.net/) |
| **Gateway** | Cloudflare | Zero Trust DNS filtering | ML-based domain categorization. Blocks DGA, phishing, C2, DNS tunneling. Integrates with WARP client. | [cloudflare.com/gateway](https://www.cloudflare.com/zero-trust/products/gateway/) |

**Industry phishing detection:**
- **Google Safe Browsing**: Maintains a continuously updated list of unsafe web resources. However, Bitaab et al. (2023) found it detects only **0.46% of fraudulent e-commerce sites** — highlighting gaps in blocklist-based approaches.
- **Microsoft SmartScreen**: Integrated into Edge/Windows. Combines URL reputation, page content analysis, and user reports.
- **PhishTank**: Community-driven phishing URL database. Open data available for research.

### 5.2 Open-Source Tools

**Network Monitoring:**
- **Zeek** (formerly Bro) — Network analysis framework that parses DNS traffic passively. Community packages add DGA detection via entropy scoring and NXDomain ratio tracking. [github.com/zeek/zeek](https://github.com/zeek/zeek)
- **Suricata** — IDS/IPS with DNS inspection. Emerging Threats rules match known DGA patterns. Lua scripting enables custom entropy calculations. [suricata.io](https://suricata.io/) | Rules: [rules.emergingthreats.net](https://rules.emergingthreats.net/)
- **passivedns** — Captures DNS query/response pairs from network traffic for historical analysis. Critical for retrospective DGA investigation. [github.com/gamelinux/passivedns](https://github.com/gamelinux/passivedns)

**ML-Based DGA Detectors:**
- **dga_predict** (Endgame/Elastic) — Character-level LSTM classifier. One of the earliest well-known open-source ML DGA detectors. [github.com/endgameinc/dga_predict](https://github.com/endgameinc/dga_predict)
- **DGArchive** (Fraunhofer FKIE) — Database of reverse-engineered DGA algorithms for 100+ malware families. Gold standard for training and evaluation. [dgarchive.caad.fkie.fraunhofer.de](https://dgarchive.caad.fkie.fraunhofer.de/)
- **CIRCL Passive DNS** — Historical DNS record database for incident response and research. [circl.lu/services/passive-dns](https://www.circl.lu/services/passive-dns/)

### 5.3 Production Architectures

**Real-Time (Inline) Detection:**
```
DNS Query → Scoring Microservice (gRPC) → Allow/Block Decision
                    ↓
         Lightweight ML Model (logistic regression, small CNN/LSTM)
         + Pre-computed blocklist cache
         Requirement: sub-millisecond latency
```
Used by: Cisco Umbrella, Palo Alto NGFW, Cloudflare Gateway.

**Batch (Offline) Analysis:**
```
DNS Logs → Data Lake (S3/HDFS) → Spark/Flink Job → ML Scoring → Alerts
                                        ↓
                              Heavier models (transformers, ensembles)
                              Can detect slow beaconing, dictionary DGA
```
Used by: SOC hunting teams, retrospective investigation.

**Hybrid (Most Common in Production):**
- Real-time layer catches known-bad domains and obvious DGA (high-entropy random strings)
- Batch layer catches subtle patterns (dictionary DGA, slow beaconing, novel families)
- Feedback loop: SOC analyst false-positive reports retrain models

**DNS Sinkholing:**
- Recursive DNS resolvers return a controlled "sinkhole" IP for malicious domains
- Blocks C2 communication AND identifies infected hosts (any host connecting to the sinkhole is likely compromised)
- Used in coordinated takedowns (e.g., Microsoft + FBI sinkholing Necurs botnet C2 domains in 2020)

**Key Challenge — Encrypted DNS:**
- DNS-over-HTTPS (DoH) and DNS-over-TLS (DoT) bypass network-level passive DNS monitoring entirely
- This is pushing detection from network-level to endpoint-level
- Our Chrome Extension approach sidesteps this issue by operating at the application layer

---

## 6. Comparison With Our Approach

### 6.1 DGA Detection Comparison

| Aspect | Our Project | DeepDGA (Anderson et al.) | MaldomDetector (Almashhadani et al.) | DomURLs_BERT (El Mahdaouy et al.) |
|--------|------------|---------------------------|--------------------------------------|-----------------------------------|
| **Model** | XGBoost | LSTM | Random Forest, SVM | Fine-tuned BERT |
| **Features** | 71 (64 char-position + 7 statistical) | Raw characters (no feature engineering) | Character frequency, entropy, n-grams | Learned embeddings (MLM pre-training) |
| **Dataset** | ExtraHop (16M samples, 2M used) | Alexa + 11 DGA families | Multiple DGA family datasets | Multiple DGA + phishing datasets |
| **Accuracy** | 97.45% | 99.93% AUC | Not directly comparable | Outperforms char-based DL |
| **Inference Speed** | Fast (tree-based) | Moderate (LSTM) | Fast (tree-based) | Slow (transformer) |
| **Feature Engineering** | Required (manual) | Not required (end-to-end) | Required (manual) | Not required (end-to-end) |
| **Dictionary DGA** | Limited (entropy-based features may miss) | Better (learns sequences) | Limited | Best (language understanding) |

**Key observations:**
- Our XGBoost approach trades some accuracy for **interpretability** (SHAP analysis) and **fast inference**
- Deep learning approaches (LSTM, BERT) achieve higher accuracy but require more compute and are harder to interpret
- Our character-position encoding (64 features) is a middle ground — more informative than simple entropy but simpler than learned embeddings
- **Weakness**: Our statistical features (entropy, vowel_ratio) may struggle with dictionary-based DGAs that mimic natural language patterns

### 6.2 Phishing URL Detection Comparison

| Aspect | Our Project | PhiUSIIL Original (Prasad & Chandra) | CatBoost (Yadav & Jhajharia) | ELECTRA Extension (Jishnu & Arthi) |
|--------|------------|--------------------------------------|-------------------------------|-------------------------------------|
| **Model** | XGBoost | SGD, Passive-Aggressive, BernoulliNB | CatBoost | Knowledge-distilled ELECTRA |
| **Features** | 25 URL-only pre-fetch | 25 URL-only (incremental) / 50 full | 25 URL-only | Learned from raw URL text |
| **Dataset** | PhiUSIIL (235K samples) | PhiUSIIL (235K samples) | PhiUSIIL (235K samples) | Various |
| **Accuracy** | 99.98% | 93-96% (URL-only incremental) | Likely comparable | Not specified |
| **Top Feature** | URLSimilarityIndex (72% SHAP) | URLSimilarityIndex (by design) | URL features | Learned embeddings |
| **Incremental Learning** | No | Yes (key contribution) | No | No |
| **Deployment** | FastAPI + Chrome Extension | Not specified | Not specified | Chrome Extension |

**Key observations:**
- Our **99.98% accuracy significantly outperforms** the original PhiUSIIL paper's 93-96% on URL-only features, primarily because XGBoost is a stronger classifier than the incremental learning methods (SGD, PA, BernoulliNB) they used
- The original paper's contribution was **incremental learning** (ability to update without full retraining) — a feature we don't have but could add
- Our URLSimilarityIndex dominance (72% SHAP importance) aligns with the original paper's design intent
- The CatBoost paper (Yadav & Jhajharia, 2025) on the same dataset provides the most direct comparison — both are gradient boosting approaches

### 6.3 Architecture Comparison

| Aspect | Our Project | Commercial Products | Academic Papers |
|--------|------------|--------------------|-----------------|
| **Detection Layer** | Browser extension (application layer) | DNS resolver / NGFW (network layer) | Varies |
| **Pre-click Detection** | Yes (URL-only features, no page load needed) | Yes (DNS query interception) | Varies |
| **Client-Side Heuristics** | Yes (8 rules in fast-detector.js) | Some (CrowdStrike endpoint agent) | Rare |
| **Two-Model Approach** | Yes (Phishing + DGA combined) | Often separate pipelines | Usually single-task |
| **Risk Scoring** | Combined weighted score (max of phishing/DGA) | Typically binary block/allow | Binary classification |
| **SHAP Interpretability** | Yes | Rarely exposed to users | Common in papers |

**Strengths of our approach:**
1. **Application-layer detection** avoids encrypted DNS blind spots (DoH/DoT)
2. **Pre-click protection** via URL-only features — no need to load the page
3. **Combined phishing + DGA scoring** provides broader threat coverage than single-model approaches
4. **Client-side heuristics** provide instant first-pass filtering without backend latency
5. **Interpretable** via SHAP — users/analysts can understand why a URL was flagged

**Limitations compared to production systems:**
1. **No behavioral context** — production systems analyze NXDomain ratios, query timing, IP reputation, which help with dictionary DGAs
2. **No incremental learning** — the original PhiUSIIL paper's key contribution; our models require full retraining
3. **Static model** — no feedback loop from false positives to retrain
4. **Single-user scope** — commercial products aggregate intelligence across millions of users/queries
5. **No DNS-level blocking** — our extension warns but doesn't prevent resolution at the network level

---

## 7. References

### DGA Detection — Academic Papers

1. Anderson, H.S., Woodbridge, J., & Filar, B. (2016). "DeepDGA: Adversarially-Tuned Domain Generation and Detection." *ACM CCS Workshop on AISec*. DOI: [10.1145/2996758.2996767](https://doi.org/10.1145/2996758.2996767)

2. Almashhadani, A.O., Kaiiali, M., Carlin, D., & Sezer, S. (2020). "MaldomDetector: A system for detecting algorithmically generated domain names with machine learning." *Computers & Security*, 93. DOI: [10.1016/j.cose.2020.101787](https://doi.org/10.1016/j.cose.2020.101787)

3. Cucchiarelli, A., Morbidoni, C., Spalazzi, L., & Baldi, M. (2020). "Algorithmically generated malicious domain names detection based on n-grams features." *Expert Systems with Applications*, 170. DOI: [10.1016/j.eswa.2020.114551](https://doi.org/10.1016/j.eswa.2020.114551)

4. Mac, H., Tran, D., Tong, V., Nguyen, L.G., & Tran, H.A. (2017). "DGA Botnet Detection Using Supervised Learning Methods." *ACM SoICT*. DOI: [10.1145/3155133.3155166](https://doi.org/10.1145/3155133.3155166)

5. Li, Y., Xiong, K., Chin, T., & Hu, C. (2019). "A Machine Learning Framework for Domain Generation Algorithm-Based Malware Detection." *IEEE Access*, 7. DOI: [10.1109/access.2019.2891588](https://doi.org/10.1109/access.2019.2891588)

6. Suryotrisongko, H., Musashi, Y., Tsuneda, A., & Sugitani, K. (2022). "Robust Botnet DGA Detection: Blending XAI and OSINT for Cyber Threat Intelligence Sharing." *IEEE Access*, 10. DOI: [10.1109/access.2022.3162588](https://doi.org/10.1109/access.2022.3162588)

7. Jeremiah, D., Rafiq, H., Ta, V.T., Usman, M., Raza, M., & Awais, M. (2025). "NIOM-DGA: Nature-inspired optimised ML-based model for DGA detection." *Computers & Security*, 157. DOI: [10.1016/j.cose.2025.104561](https://doi.org/10.1016/j.cose.2025.104561)

8. Ren, F., Jiang, Z., Wang, X., & Liu, J. (2020). "A DGA domain names detection modeling method based on integrating an attention mechanism and deep neural network." *Cybersecurity*, 3(4). DOI: [10.1186/s42400-020-00046-6](https://doi.org/10.1186/s42400-020-00046-6)

9. Tuan, T.A., Long, H.V., & Taniar, D. (2021). "On Detecting and Classifying DGA Botnets and their Families." *Computers & Security*, 113. DOI: [10.1016/j.cose.2021.102549](https://doi.org/10.1016/j.cose.2021.102549)

10. Curtin, R., Gardner, J., Grzonkowski, S., Kleymenov, A., & Mosquera, A. (2019). "Detecting DGA domains with recurrent neural networks and side information." *ACM AISec Workshop*. DOI: [10.1145/3339252.3339258](https://doi.org/10.1145/3339252.3339258)

11. El Mahdaouy, A., Lamsiyah, S., Janati Idrissi, M., Alami, H., Yartaoui, Z., & Berrada, I. (2026). "DomURLs_BERT: Pre-trained BERT-based Model for Malicious Domains and URLs Detection and Classification." *Journal of Network and Systems Management*, 34(2). DOI: [10.1007/s10922-025-10010-9](https://doi.org/10.1007/s10922-025-10010-9)

12. Yerima, S.Y., Vinod, P., & Shaalan, K. (2024). "A Transformer Embedding-Based Model for Malicious DGA-Generated Domain Detection." *IEEE CICN*. DOI: [10.1109/cicn63059.2024.10847389](https://doi.org/10.1109/cicn63059.2024.10847389)

### DGA — Adversarial & Evasion

13. Peck, J., Nie, C., Sivaguru, R., Grumer, C., Olumofin, F., Yu, B., Nascimento, A.C., & De Cock, M. (2019). "CharBot: A Simple and Effective Method for Evading DGA Classifiers." *IEEE Access*, 7. DOI: [10.1109/access.2019.2927075](https://doi.org/10.1109/access.2019.2927075)

14. Gardiner, J. & Nagaraja, S. (2016). "On the Security of Machine Learning in Malware C&C Detection." *ACM Computing Surveys*, 49(3). DOI: [10.1145/3003816](https://doi.org/10.1145/3003816)

### Phishing URL Detection — Academic Papers

15. Prasad, A. & Chandra, S. (2024). "PhiUSIIL: A diverse security profile empowered phishing URL detection framework based on similarity index and incremental learning." *Computers & Security*, 136. DOI: [10.1016/j.cose.2023.103545](https://doi.org/10.1016/j.cose.2023.103545)

16. Li, Y., Yang, Z., Chen, X., Yuan, H., & Liu, W. (2018). "A stacking model using URL and HTML features for phishing webpage detection." *Future Generation Computer Systems*, 94. DOI: [10.1016/j.future.2018.11.004](https://doi.org/10.1016/j.future.2018.11.004)

17. Shaukat, M.W., Amin, R., Muslam, M.M.A., Alshehri, A.H., & Xie, J. (2023). "A Hybrid Approach for Alluring Ads Phishing Attack Detection Using Machine Learning." *Sensors*, 23(19). DOI: [10.3390/s23198070](https://doi.org/10.3390/s23198070)

18. Aslam, S., Aslam, H., Manzoor, A., Chen, H., & Rasool, A. (2024). "AntiPhishStack: LSTM-Based Stacked Generalization Model for Optimized Phishing URL Detection." *Symmetry*, 16(2). DOI: [10.3390/sym16020248](https://doi.org/10.3390/sym16020248)

19. Manyumwa, T., Chapita, P.F., Wu, H., & Ji, S. (2020). "Towards Fighting Cybercrime: Malicious URL Attack Type Detection using Multiclass Classification." *IEEE BigData*. DOI: [10.1109/bigdata50022.2020.9378029](https://doi.org/10.1109/bigdata50022.2020.9378029)

20. Uddin, M.M., Islam, K.A., Mamun, M., Tiwari, V., & Park, J. (2022). "A Comparative Analysis of ML-Based Website Phishing Detection Using URL Information." *IEEE PRAI*. DOI: [10.1109/prai55851.2022.9904055](https://doi.org/10.1109/prai55851.2022.9904055)

21. Bitaab, M., et al. (2023). "Beyond Phish: Toward Detecting Fraudulent e-Commerce Websites at Scale." *IEEE S&P*. DOI: [10.1109/sp46215.2023.10179461](https://doi.org/10.1109/sp46215.2023.10179461)

### Phishing — Papers Using PhiUSIIL Dataset

22. Gałka, W., et al. (2024). "Self-tuning framework to reduce the number of false positive instances using aggregation functions in ensemble classifier." *Procedia Computer Science*. DOI: [10.1016/j.procs.2024.09.241](https://doi.org/10.1016/j.procs.2024.09.241)

23. Etem, T. & Teke, M. (2024). "Advanced Phishing Detection: Leveraging t-SNE Feature Extraction and Machine Learning on a Comprehensive URL Dataset." DOI: [10.26650/acin.1521835](https://doi.org/10.26650/acin.1521835)

24. Aritonang, M.A.S., et al. (2026). "NLP and SVM Optimization in Detecting Phishing Website URLs." DOI: [10.52436/1.jutif.2026.7.1.5334](https://doi.org/10.52436/1.jutif.2026.7.1.5334)

25. John-Otumu, A.M., Aniugo, V.O., & Nwachukwu, V.C. (2025). "HyRANN-UPD: Enhancing Phishing URL Detection Using Ridge Regression-Based Feature Selection and ANN." DOI: [10.5120/ijca2025924689](https://doi.org/10.5120/ijca2025924689)

26. Yadav, H. & Jhajharia, K. (2025). "URL-Based Phishing Detection Using CatBoost." *IEEE ICCCA*. DOI: [10.1109/iccca66364.2025.11325141](https://doi.org/10.1109/iccca66364.2025.11325141)

### Phishing — Browser Extensions

27. Pavan, M., et al. (2023). "Chrome Extension for Detecting Phishing Websites." DOI: [10.2139/ssrn.4398136](https://doi.org/10.2139/ssrn.4398136)

28. Jishnu, K.S. & Arthi, B. (2024). "Real-time phishing URL detection framework using knowledge distilled ELECTRA." *Automatika*, 65(4). DOI: [10.1080/00051144.2024.2415797](https://doi.org/10.1080/00051144.2024.2415797)

29. Bhadane, A. & Mane, S.B. (2018). "Detecting lateral spear phishing attacks in organisations." *IET Information Security*, 13(2). DOI: [10.1049/iet-ifs.2018.5090](https://doi.org/10.1049/iet-ifs.2018.5090)

### Foundational Works

30. Chen, T. & Guestrin, C. (2016). "XGBoost: A Scalable Tree Boosting System." *ACM KDD*. DOI: [10.1145/2939672.2939785](https://doi.org/10.1145/2939672.2939785)

31. Friedman, J.H. (2001). "Greedy Function Approximation: A Gradient Boosting Machine." *Annals of Statistics*, 29(5). DOI: [10.1214/aos/1013203451](https://doi.org/10.1214/aos/1013203451)

32. Lundberg, S.M. & Lee, S.-I. (2017). "A Unified Approach to Interpreting Model Predictions." *NeurIPS*. [papers.nips.cc/paper/7062](https://papers.nips.cc/paper/7062-a-unified-approach-to-interpreting-model-predictions)

### Datasets

33. PhiUSIIL Phishing URL Dataset — UCI ML Repository #967: [archive.ics.uci.edu/dataset/967](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset)

34. ExtraHop DGA Detection Training Dataset: [github.com/ExtraHop/dga-detection-training-dataset](https://github.com/ExtraHop/dga-detection-training-dataset)

35. DGArchive (Fraunhofer FKIE): [dgarchive.caad.fkie.fraunhofer.de](https://dgarchive.caad.fkie.fraunhofer.de/)

### Industry & Production Systems

36. Cisco Umbrella: [umbrella.cisco.com](https://umbrella.cisco.com/)
37. Palo Alto Networks DNS Security: [docs.paloaltonetworks.com/dns-security](https://docs.paloaltonetworks.com/dns-security)
38. Cloudflare Gateway: [cloudflare.com/zero-trust/products/gateway](https://www.cloudflare.com/zero-trust/products/gateway/)
39. Quad9: [quad9.net](https://www.quad9.net/)
40. Infoblox Threat Defense: [infoblox.com/products/bloxone-threat-defense](https://www.infoblox.com/products/bloxone-threat-defense/)
41. Suricata IDS/IPS: [suricata.io](https://suricata.io/)
42. Zeek Network Analysis: [github.com/zeek/zeek](https://github.com/zeek/zeek)
43. Endgame dga_predict: [github.com/endgameinc/dga_predict](https://github.com/endgameinc/dga_predict)
44. passivedns: [github.com/gamelinux/passivedns](https://github.com/gamelinux/passivedns)
45. CIRCL Passive DNS: [circl.lu/services/passive-dns](https://www.circl.lu/services/passive-dns/)

---

*Document generated on 2026-03-30. Academic paper references were sourced from the OpenAlex API. Industry product URLs were verified via live fetching. DOI links follow the format `https://doi.org/<DOI>` and resolve to the publisher's page.*
