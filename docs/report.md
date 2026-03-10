# Phishing URL & DGA Detection: Bao cao ky thuat

## 1. Dat van de (Problem Statement)

### 1.1 Boi canh

Trong nhung nam gan day, tan cong lua dao truc tuyen (phishing) va ma doc su dung ten mien sinh tu dong (DGA - Domain Generation Algorithm) da tro thanh hai trong nhung moi de doa an ninh mang nghiem trong nhat tren toan cau.

**Phishing** la hinh thuc tan cong ma ke tan cong tao ra cac trang web gia mao, bat chuoc giao dien cua cac trang web hop phap (ngan hang, mang xa hoi, email...) nham lua nguoi dung nhap thong tin ca nhan nhu mat khau, so the tin dung, thong tin tai khoan.

**DGA (Domain Generation Algorithm)** la ky thuat duoc su dung boi malware (phan mem doc hai) de tu dong tao ra hang ngan ten mien ngau nhien moi ngay. Malware se ket noi den cac ten mien nay de nhan lenh tu may chu dieu khien (Command & Control server). Vi so luong ten mien duoc tao ra rat lon va thay doi lien tuc, viec chan theo danh sach den (blacklist) tro nen bat kha thi.

### 1.2 Thong ke thuc te

- Theo bao cao cua Anti-Phishing Working Group (APWG), nam 2023 ghi nhan hon **4.7 trieu cuoc tan cong phishing**, muc cao nhat tung duoc ghi nhan.
- FBI bao cao thiet hai tu phishing vuot **$10 ty USD** trong nam 2022 (IC3 Report).
- Cac dong malware noi tieng nhu Conficker, CryptoLocker, Necurs su dung DGA de tao ra tu 1,000 den 50,000 ten mien moi ngay.

### 1.3 Tai sao can xay dung he thong nay?

Cac phuong phap truyen thong nhu danh sach den (blacklist) va danh sach trang (whitelist) co nhieu han che:

| Phuong phap | Han che |
|---|---|
| Blacklist | Khong the cap nhat kip thoi voi cac URL moi. Mot trang phishing co the ton tai chi vai gio truoc khi bi go xuong, nhung da du thoi gian de lua dao hang ngan nguoi. |
| Whitelist | Qua nghiem ngat, chan ca cac trang web hop phap moi. |
| Rule-based | Cac quy tac co dinh de bi vuot qua khi ke tan cong thay doi chien thuat. |

**Giai phap**: Su dung Machine Learning (hoc may) de tu dong phan tich va phat hien URL doc hai trong thoi gian thuc, dua tren cac dac trung (features) cua URL va ten mien.

### 1.4 Muc tieu du an

Xay dung mot he thong phat hien phishing URL va DGA domain voi cac yeu cau:

1. **Hai mo hinh ML rieng biet**:
   - Mo hinh phat hien Phishing URL (dua tren 25 dac trung URL-only, khong can tai trang web)
   - Mo hinh phat hien DGA domain (dua tren dac trung tu cau truc ten mien)

2. **Backend API** (FastAPI) ket hop ket qua tu ca hai mo hinh de dua ra mot phan dinh duy nhat (Safe / Suspicious / Malicious)

3. **Chrome Extension** hien thi canh bao truc quan cho nguoi dung khi ho di chuot qua cac lien ket doc hai

### 1.5 Kien truc he thong

```
[Nguoi dung duyet web]
        |
        v
[Chrome Extension]
   |         |
   |    [Fast Detector]  <-- Kiem tra nhanh phia client (8 heuristics)
   |         |
   |    Score >= 30?
   |         |
   v         v
[FastAPI Backend]
   |              |
   v              v
[Phishing Model]  [DGA Model]
   |              |
   v              v
[Ket hop diem so] --> Verdict: Safe / Suspicious / Malicious
```

## 2. Kham pha du lieu (Dataset Exploration)

Du an su dung hai bo du lieu chinh:

### 2.1 PhiUSIIL Phishing URL Dataset

**Nguon**: UCI Machine Learning Repository (ID: 967)
**Bai bao goc**: Arvind Prasad & Shalini Chandra, "PhiUSIIL: A diverse security profile empowered phishing URL detection framework based on similarity index and incremental learning", 2024.

#### Tong quan

| Thuoc tinh | Gia tri |
|---|---|
| Tong so mau | 235,795 |
| So dac trung | 56 cot (50 so + 5 chuoi + 1 nhan) |
| Nhan | `label`: 0 = Phishing, 1 = Hop phap |
| Du lieu thieu | Khong co |

#### Phan bo nhan

| Lop | So luong | Ti le |
|---|---|---|
| Hop phap (1) | 134,850 | 57.19% |
| Phishing (0) | 100,945 | 42.81% |

Du lieu mat can bang nhe (~57/43) nhung khong nghiem trong, khong bat buoc phai tai mau lai (resampling).

#### Phan loai dac trung

50 dac trung so duoc chia lam hai nhom:

**Nhom 1: Dac trung URL-only (Pre-fetch) — 25 dac trung**

Day la cac dac trung co the tinh toan chi tu chuoi URL, **khong can tai trang web**. Day la nhom dac trung chung ta su dung de huan luyen mo hinh, vi no cho phep phat hien phishing **truoc khi nguoi dung click vao link**.

| Dac trung | Kieu | Mo ta | Trung binh | Do lech chuan |
|---|---|---|---|---|
| URLLength | int | Do dai URL | 34.57 | 41.31 |
| DomainLength | int | Do dai ten mien | 21.47 | 9.15 |
| IsDomainIP | binary | Domain la dia chi IP? | 0.003 | 0.05 |
| URLSimilarityIndex | float | Do tuong dong giua URL va domain (0-100) | 78.43 | 28.98 |
| CharContinuationRate | float | Ti le ky tu cung loai lien tiep (0-1) | 0.85 | 0.22 |
| TLDLegitimateProb | float | Xac suat TLD la hop phap | 0.26 | 0.25 |
| URLCharProb | float | Phan bo xac suat ky tu | 0.056 | 0.011 |
| TLDLength | int | Do dai TLD | 2.76 | 0.60 |
| NoOfSubDomain | int | So subdomain | 1.16 | 0.60 |
| HasObfuscation | binary | URL co ma hoa hex (%XX)? | 0.002 | 0.05 |
| NoOfObfuscatedChar | int | So ky tu bi ma hoa | 0.02 | 1.88 |
| ObfuscationRatio | float | Ti le ky tu bi ma hoa | 0.0001 | 0.004 |
| NoOfLettersInURL | int | So chu cai | 19.43 | 29.09 |
| LetterRatioInURL | float | Ti le chu cai | 0.52 | 0.12 |
| NoOfDegitsInURL | int | So chu so | 1.88 | 11.89 |
| DegitRatioInURL | float | Ti le chu so | 0.03 | 0.07 |
| NoOfEqualsInURL | int | So dau '=' | 0.06 | 0.93 |
| NoOfQMarkInURL | int | So dau '?' | 0.03 | 0.19 |
| NoOfAmpersandInURL | int | So dau '&' | 0.03 | 0.84 |
| NoOfOtherSpecialCharsInURL | int | So ky tu dac biet khac | 2.34 | 3.53 |
| SpacialCharRatioInURL | float | Ti le ky tu dac biet | 0.06 | 0.03 |
| IsHTTPS | binary | URL su dung HTTPS? | 0.78 | 0.41 |
| Bank | binary | URL chua tu "bank"? | 0.13 | 0.33 |
| Pay | binary | URL chua tu "pay"? | 0.24 | 0.43 |
| Crypto | binary | URL chua tu "crypto"? | 0.02 | 0.15 |

**Nhom 2: Dac trung Post-fetch (Noi dung trang web) — 25 dac trung**

Cac dac trung nay can tai trang web de trich xuat (HTML, DOM, JavaScript). Chung ta **khong su dung** nhom nay de huan luyen vi muc tieu la phat hien phishing truoc khi nguoi dung truy cap trang web.

Bao gom: LineOfCode, HasTitle, HasFavicon, Robots, IsResponsive, HasSocialNet, HasSubmitButton, HasHiddenFields, HasPasswordField, v.v.

#### Phat hien chinh tu du lieu

**1. URLSimilarityIndex la dac trung manh nhat**

| Lop | Trung binh | Trung vi |
|---|---|---|
| Phishing | 49.62 | 51.42 |
| Hop phap | 100.00 | 100.00 |

Tat ca URL hop phap deu co URLSimilarityIndex = 100 (URL hoan toan khop voi domain). URL phishing chi dat trung binh ~50. **He so tuong quan Pearson: 0.8604** (cao nhat trong tat ca dac trung).

**2. HTTPS la yeu to phan biet manh**

| Lop | HTTP | HTTPS |
|---|---|---|
| Phishing | 50.78% | 49.22% |
| Hop phap | 0.00% | 100.00% |

100% URL hop phap su dung HTTPS. Chi ~49% URL phishing su dung HTTPS. **Tuong quan: 0.6091.**

**3. Do dai URL va Domain**

| Chi so | Phishing | Hop phap |
|---|---|---|
| Do dai URL (trung binh) | 45.7 | 26.2 |
| Do dai URL (do lech chuan) | 61.1 | 4.8 |
| Do dai Domain (trung binh) | 24.5 | 19.2 |

URL phishing dai hon va co phuong sai lon hon nhieu. URL hop phap tap trung quanh 26 ky tu.

**4. Top 10 dac trung tuong quan voi nhan (URL-only)**

| Hang | Dac trung | |r| |
|---|---|---|
| 1 | URLSimilarityIndex | 0.8604 |
| 2 | IsHTTPS | 0.6091 |
| 3 | SpacialCharRatioInURL | 0.5335 |
| 4 | URLCharProb | 0.4697 |
| 5 | CharContinuationRate | 0.4677 |
| 6 | DegitRatioInURL | 0.4320 |
| 7 | LetterRatioInURL | 0.3678 |
| 8 | Pay | 0.3597 |
| 9 | NoOfOtherSpecialCharsInURL | 0.3589 |
| 10 | DomainLength | 0.2832 |

**5. Phan bo TLD theo lop**

| Hang | TLD Phishing | So luong | TLD Hop phap | So luong |
|---|---|---|---|---|
| 1 | com | 43,769 | com | 68,785 |
| 2 | app | 6,368 | org | 16,524 |
| 3 | co | 4,964 | uk | 6,073 |
| 4 | io | 3,769 | net | 3,998 |
| 5 | net | 3,099 | de | 3,310 |

URL phishing su dung nhieu `.app`, `.co`, `.io`, `.top`. URL hop phap phan bo deu tren cac TLD quoc gia (`.uk`, `.de`, `.au`, `.jp`).

---

### 2.2 ExtraHop DGA Detection Training Dataset

**Nguon**: ExtraHop Networks (GitHub)

#### Tong quan

| Thuoc tinh | Gia tri |
|---|---|
| Tong so mau | 16,246,014 |
| Cot | 2: `domain` (chuoi), `threat` (nhan) |
| Nhan | "benign" hoac "dga" |
| Dinh dang | Newline-delimited JSON (NDJSON) |
| Dac diem | Ten mien khong co TLD, khong co subdomain |

**Vi du du lieu:**
```json
{"domain": "myhandeczema", "threat": "benign"}
{"domain": "ocymmekqogkw", "threat": "dga"}
{"domain": "gwirelessltd", "threat": "benign"}
{"domain": "deummagdbawse", "threat": "dga"}
```

#### Phan bo nhan

| Lop | So luong (uoc tinh) | Ti le |
|---|---|---|
| DGA | ~8,261,879 | 50.84% |
| Benign | ~7,984,127 | 49.16% |

Can bang gan nhu hoan hao (~50/50).

#### Phan tich do dai ten mien

| Chi so | Benign | DGA |
|---|---|---|
| Trung binh | 11.79 | 15.25 |
| Trung vi | 11.0 | 14.0 |
| Do lech chuan | 4.92 | 6.21 |
| Nho nhat | 1 | 3 |
| Lon nhat | 63 | 44 |

Ten mien DGA dai hon trung binh ~3.5 ky tu.

**Phan bo theo do dai:**

| Khoang | Benign | DGA |
|---|---|---|
| 1-5 | 6.22% | 0.03% |
| 6-10 | 37.94% | 26.72% |
| 11-15 | 34.70% | 32.28% |
| 16-20 | 15.63% | 18.81% |
| 21-30 | 5.32% | 20.99% |
| 31-50 | 0.19% | 1.17% |

Su khac biet ro nhat o khoang 21-30 ky tu: DGA gap 4 lan so voi benign.

#### Phan tich ky tu

| Chi so | Benign | DGA |
|---|---|---|
| Shannon Entropy (trung binh) | 2.92 | 3.27 |
| Ti le nguyen am | 0.344 | 0.240 |
| So chu so (trung binh) | 0.44 | 1.14 |
| So ky tu duy nhat | 8.59 | 10.93 |
| Phu am lien tiep dai nhat | 2.46 | 5.30 |
| Chua dau gach ngang | 11.3% | 0.0% |

**Nhan xet quan trong:**
- **Entropy**: DGA cao hon (ngau nhien hon) — 3.27 vs 2.92
- **Ti le nguyen am**: Ten mien benign co 34.4% nguyen am (ngon ngu tu nhien). DGA chi co 24.0%
- **Phu am lien tiep**: Dac trung phan biet manh nhat. DGA trung binh 5.3 phu am lien tiep vs 2.5 cho benign. Tu co the doc duoc hiem khi co >3 phu am lien tiep
- **Dau gach ngang**: 11.3% ten mien benign co dau gach ngang; 0% DGA co (bo tao DGA thuong khong dung ky tu nay)

**Tan suat ky tu (top 5):**

| Hang | Benign | Tan suat | DGA | Tan suat |
|---|---|---|---|---|
| 1 | 'e' | 9.89% | 'e' | 5.17% |
| 2 | 'a' | 9.11% | 'a' | 5.11% |
| 3 | 'i' | 7.18% | 'i' | 4.79% |
| 4 | 'o' | 6.85% | 'o' | 4.67% |
| 5 | 'r' | 6.67% | 'y' | 4.52% |

Ten mien benign tuan theo tan suat chu cai tieng Anh (e > a > i > o > r). DGA co phan bo phang hon nhieu (max 5.17% vs 9.89%), dac trung cua viec sinh ngau nhien.

#### Dac trung duoc su dung de huan luyen

Mo hinh DGA su dung **71 dac trung**:

**Ma hoa ky tu (64 dac trung)**: Moi ky tu trong ten mien duoc anh xa sang mot so nguyen qua bang tra cuu co dinh, can phai trong vector 64 phan tu, padding so 0 ben trai.

**Dac trung thong ke (7 dac trung)**:

| Dac trung | Mo ta |
|---|---|
| length | Do dai ten mien |
| capitals | So ky tu in hoa |
| digits | So chu so |
| consonants_consec | Do dai chuoi phu am lien tiep dai nhat |
| vowel_ratio | Ti le nguyen am |
| entropy | Shannon entropy |
| unique_chars | So ky tu duy nhat |

## 3. Kien thuc lien quan (Related Knowledge)

Phan nay giai thich cac khai niem Machine Learning can thiet de hieu mo hinh, viet cho nguoi doc chua co nen tang ve hoc may.

### 3.1 Machine Learning la gi?

**Machine Learning (Hoc may)** la mot nhanh cua Tri tue Nhan tao (AI), trong do may tinh **hoc tu du lieu** thay vi duoc lap trinh cu the cho tung truong hop.

**Vi du don gian**: Thay vi viet quy tac "neu URL dai hon 50 ky tu VA khong co HTTPS thi la phishing", chung ta cho may tinh xem hang tram ngan URL da duoc gan nhan (phishing hoac hop phap), va may tinh tu tim ra cac quy luat de phan loai.

#### Phan loai nhi phan (Binary Classification)

Bai toan cua chung ta la **phan loai nhi phan** — voi moi URL hoac ten mien dau vao, mo hinh tra loi mot trong hai: **doc hai** hoac **an toan**.

- **Dau vao (Input)**: Mot vector cac dac trung so (vi du: do dai URL = 45, co HTTPS = 1, ti le chu so = 0.08, ...)
- **Dau ra (Output)**: Xac suat thuoc lop doc hai (0.0 den 1.0)
- **Nhan thuc te (Label)**: 0 (phishing/DGA) hoac 1 (hop phap/benign)

### 3.2 Cay quyet dinh (Decision Tree)

Cay quyet dinh la mo hinh co ban nhat ma chung ta can hieu truoc khi hoc ve XGBoost.

**Y tuong**: Mo hinh dat cac cau hoi co/khong ve dac trung cua du lieu, chia du lieu thanh cac nhom nho hon cho den khi co the dua ra du doan.

**Vi du**: Phan loai URL phishing

```
                    URLSimilarityIndex <= 75?
                    /                       \
                  Yes                        No
                  /                            \
        IsHTTPS = 0?                     --> Hop phap (99.9%)
        /          \
      Yes           No
      /               \
--> Phishing (95%)   DegitRatio > 0.1?
                      /            \
                    Yes             No
                    /                 \
            --> Phishing (80%)    --> Hop phap (70%)
```

Moi nut (node) chua mot dieu kien. Du lieu di tu goc (root) xuong la (leaf) theo cac nhanh Yes/No.

**Cach chon dieu kien tai moi nut:**

Mo hinh chon dac trung va nguong sao cho viec chia tach **giam do "lon xon" (impurity)** nhieu nhat. Do lon xon duoc do bang **Gini Impurity**:

$$Gini = 1 - \sum_{i=1}^{C} p_i^2$$

Trong do $p_i$ la ti le mau thuoc lop $i$. Gini = 0 nghia la tat ca mau thuoc cung mot lop (hoan hao). Gini = 0.5 (voi 2 lop) nghia la chia deu 50/50 (te nhat).

**Han che cua mot cay quyet dinh don le:**
- De bi **overfit** (hoc thuoc du lieu huan luyen nhung kem voi du lieu moi)
- Khong on dinh: thay doi nho trong du lieu co the tao ra cay hoan toan khac
- Do chinh xac thuong khong du cao cho bai toan phuc tap

### 3.3 Ensemble Methods — Ket hop nhieu mo hinh

De khac phuc han che cua mot cay don le, nguoi ta ket hop nhieu cay lai voi nhau. Co hai chien luoc chinh:

#### Bagging (vi du: Random Forest)
- Tao nhieu cay quyet dinh, moi cay duoc huan luyen tren mot tap con ngau nhien cua du lieu
- Ket qua cuoi cung la **binh chon da so** (majority vote)
- Giam overfit nhung khong toi uu hoa loi sai

#### Boosting (vi du: Gradient Boosting, XGBoost)
- Tao cac cay **noi tiep nhau**, moi cay tap trung vao **sua loi cua cay truoc do**
- Ket qua cuoi cung la **tong co trong** cua tat ca cac cay
- Manh hon Bagging trong hau het truong hop

### 3.4 Gradient Boosting — Giai thich tu dau

#### Y tuong cot loi

Thay vi xay dung mot cay lon, Gradient Boosting xay dung nhieu cay nho (weak learners), moi cay hoc tu **sai so** cua cac cay truoc do.

**Tuong tu truc giac**: Hay tuong tuong ban ban cung va truot. Lan dau ban ban truot xa dich 10 met. Lan hai, ban dieu chinh va chi truot 3 met. Lan ba, chi truot 0.5 met. Moi lan ban dieu chinh, ban den gan dich hon. Gradient Boosting lam tuong tu — moi cay "dieu chinh" de giam sai so con lai.

#### Quy trinh toan hoc

**Buoc 1: Khoi tao**

Bat dau voi mot du doan ban dau $F_0(x)$, thuong la gia tri trung binh cua nhan:

$$F_0(x) = \arg\min_\gamma \sum_{i=1}^{n} L(y_i, \gamma)$$

Voi bai toan phan loai, day thuong la log-odds cua ti le lop duong.

**Buoc 2: Lap lai cho moi cay $m = 1, 2, ..., M$**

a) Tinh **phan du** (residual) — sai so giua gia tri thuc va du doan hien tai:

$$r_{im} = -\frac{\partial L(y_i, F(x_i))}{\partial F(x_i)} \bigg|_{F=F_{m-1}}$$

Day chinh la **gradient am** cua ham mat mat (loss function) — vi vay goi la "Gradient" Boosting.

Voi ham mat mat **Binary Cross-Entropy** (dung cho phan loai):

$$L(y, p) = -[y \cdot \log(p) + (1-y) \cdot \log(1-p)]$$

Phan du don gian la: $r_{im} = y_i - p_i$ (gia tri thuc tru xac suat du doan)

b) Huan luyen mot cay quyet dinh moi $h_m(x)$ de **du doan phan du** $r_{im}$

c) Cap nhat mo hinh:

$$F_m(x) = F_{m-1}(x) + \eta \cdot h_m(x)$$

Trong do $\eta$ (eta) la **learning rate** (toc do hoc), thuong tu 0.01 den 0.3. Learning rate nho giup mo hinh hoi tu on dinh hon nhung can nhieu cay hon.

**Buoc 3: Mo hinh cuoi cung**

$$F_M(x) = F_0(x) + \eta \sum_{m=1}^{M} h_m(x)$$

Du doan cuoi cung la tong cua du doan ban dau va tat ca cac cay dieu chinh.

### 3.5 XGBoost — Gradient Boosting duoc toi uu hoa

**XGBoost** (eXtreme Gradient Boosting) la mot thu vien do Tianqi Chen phat trien (2016), cai tien Gradient Boosting ve ca **do chinh xac** lan **toc do**.

#### Diem khac biet so voi Gradient Boosting truyen thong

**1. Regularization (Chinh quy hoa)**

XGBoost them thanh phan phat vao ham muc tieu de tranh overfit:

$$Obj = \sum_{i=1}^{n} L(y_i, \hat{y}_i) + \sum_{m=1}^{M} \Omega(h_m)$$

Trong do thanh phan chinh quy hoa:

$$\Omega(h) = \gamma T + \frac{1}{2}\lambda \sum_{j=1}^{T} w_j^2$$

- $T$: so la (leaf) cua cay — phat cay co nhieu la (qua phuc tap)
- $w_j$: trong so tai la thu $j$
- $\gamma$ (gamma): nguong toi thieu de chia nhanh moi — gia tri cao hon = cay don gian hon
- $\lambda$ (lambda): he so phat L2 cho trong so la

**2. Xap xi bac hai (Second-order approximation)**

Thay vi chi dung gradient bac nhat (nhu Gradient Boosting truyen thong), XGBoost su dung ca dao ham bac hai (Hessian):

$$Obj \approx \sum_{i=1}^{n} [g_i h_m(x_i) + \frac{1}{2} h_i h_m(x_i)^2] + \Omega(h_m)$$

Trong do:
- $g_i = \frac{\partial L(y_i, \hat{y}_i)}{\partial \hat{y}_i}$ — Gradient (dao ham bac 1)
- $h_i = \frac{\partial^2 L(y_i, \hat{y}_i)}{\partial \hat{y}_i^2}$ — Hessian (dao ham bac 2)

Dieu nay giup XGBoost tim duoc huong toi uu chinh xac hon, tuong tu nhu su khac biet giua "di ve phia doc xuong" (gradient descent) va "biet chinh xac doc xuong nhanh nhu the nao" (Newton's method).

**3. Cac toi uu hoa ky thuat**

| Ky thuat | Tac dung |
|---|---|
| Column subsampling | Moi cay chi dung mot tap con dac trung ngau nhien (nhu Random Forest) |
| Row subsampling | Moi cay chi dung mot tap con mau ngau nhien |
| Weighted Quantile Sketch | Tim nguong chia nhanh hieu qua cho du lieu lon |
| Sparsity-aware | Xu ly gia tri thieu (missing values) tu dong |
| Cache-aware | Toi uu truy cap bo nho cho du lieu lon |
| Parallel processing | Song song hoa viec tim diem chia toi uu |

#### Cac sieu tham so (Hyperparameters) su dung trong du an

| Tham so | Gia tri | Y nghia |
|---|---|---|
| n_estimators | 500 | So cay toi da |
| max_depth | 6 | Do sau toi da cua moi cay. Cay nong hon = don gian hon, it overfit hon |
| learning_rate (eta) | 0.1 | Toc do hoc. Nho hon = can nhieu cay hon nhung on dinh hon |
| subsample | 0.8 | Ti le mau dung cho moi cay (80%) |
| colsample_bytree | 0.8 | Ti le dac trung dung cho moi cay (80%) |
| gamma | 0.1 | Nguong toi thieu de chia nhanh |
| early_stopping_rounds | 50 | Dung huan luyen neu logloss khong giam sau 50 vong |

### 3.6 Cac chi so danh gia mo hinh

Sau khi huan luyen, chung ta can danh gia mo hinh bang cac chi so sau:

#### Confusion Matrix (Ma tran nham lan)

|  | Du doan: Phishing | Du doan: Hop phap |
|---|---|---|
| Thuc te: Phishing | **TP** (True Positive) | **FN** (False Negative) |
| Thuc te: Hop phap | **FP** (False Positive) | **TN** (True Negative) |

- **TP**: Phishing duoc phat hien dung
- **FN**: Phishing bi bo sot (nguy hiem!)
- **FP**: Hop phap bi danh dau nham la phishing (phien toai cho nguoi dung)
- **TN**: Hop phap duoc xac nhan dung

#### Accuracy (Do chinh xac)

$$Accuracy = \frac{TP + TN}{TP + TN + FP + FN}$$

Ti le du doan dung tren tong so mau. Don gian nhung co the bi sai lech voi du lieu mat can bang.

#### Precision (Do chinh xac duong)

$$Precision = \frac{TP}{TP + FP}$$

"Trong so URL bi danh dau la phishing, bao nhieu phan tram thuc su la phishing?"
Precision cao = it bao dong gia.

#### Recall (Do nhay)

$$Recall = \frac{TP}{TP + FN}$$

"Trong so tat ca URL phishing thuc su, bao nhieu phan tram duoc phat hien?"
Recall cao = it bo sot moi de doa.

#### F1-Score

$$F1 = 2 \cdot \frac{Precision \cdot Recall}{Precision + Recall}$$

Trung binh dieu hoa cua Precision va Recall. Huu ich khi can can bang giua hai chi so.

#### ROC-AUC

**ROC curve** ve do thi True Positive Rate (Recall) vs False Positive Rate tai cac nguong khac nhau.
**AUC** (Area Under Curve) la dien tich duoi duong cong:
- AUC = 1.0: Mo hinh hoan hao
- AUC = 0.5: Mo hinh ngau nhien (vo dung)
- AUC > 0.9: Mo hinh rat tot

### 3.7 Feature Importance (Do quan trong cua dac trung)

XGBoost cung cap do quan trong cua tung dac trung, cho biet dac trung nao dong gop nhieu nhat vao viec du doan. Co hai cach tinh:

1. **Gain**: Trung binh muc giam loss khi dac trung duoc su dung de chia nhanh
2. **Frequency**: So lan dac trung duoc dung de chia nhanh trong tat ca cac cay

Day la thong tin quy gia de hieu mo hinh va co the loai bo dac trung khong can thiet.

## 4. Ket qua huan luyen va danh gia (Training Results & Evaluation)

### 4.1 Mo hinh Phishing URL Detection

#### Cau hinh huan luyen

| Thong so | Gia tri |
|---|---|
| Du lieu | PhiUSIIL Dataset — 235,795 mau |
| Dac trung | 25 dac trung URL-only (pre-fetch) |
| Chia du lieu | 80% train (188,636) / 20% test (47,159) |
| Mo hinh | XGBClassifier |
| Sieu tham so | n_estimators=500, max_depth=6, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8 |
| Early stopping | 50 rounds, theo doi validation logloss |

#### Ket qua

| Chi so | Gia tri |
|---|---|
| **Accuracy** | **0.9998** (99.98%) |
| **Precision** | **0.9997** (99.97%) |
| **Recall** | **1.0000** (100%) |
| **F1-Score** | **0.9999** (99.99%) |
| **ROC-AUC** | **0.9999** (99.99%) |

**Classification Report:**

| Lop | Precision | Recall | F1-Score | So mau |
|---|---|---|---|---|
| Phishing (0) | 1.00 | 1.00 | 1.00 | 20,189 |
| Hop phap (1) | 1.00 | 1.00 | 1.00 | 26,970 |

#### Do quan trong dac trung (Top 10)

| Hang | Dac trung | Importance |
|---|---|---|
| 1 | URLSimilarityIndex | 0.7206 |
| 2 | NoOfDegitsInURL | 0.1017 |
| 3 | IsHTTPS | 0.0821 |
| 4 | NoOfOtherSpecialCharsInURL | 0.0710 |
| 5 | NoOfSubDomain | 0.0082 |
| 6 | LetterRatioInURL | 0.0043 |
| 7 | NoOfLettersInURL | 0.0028 |
| 8 | CharContinuationRate | 0.0021 |
| 9 | DomainLength | 0.0020 |
| 10 | Pay | 0.0016 |

#### Phan tich ket qua

1. **Hieu suat gan nhu hoan hao**: Mo hinh dat Accuracy 99.98% chi voi 25 dac trung URL-only, khong can tai trang web. Day la ket qua tuong duong voi mo hinh su dung toan bo 50 dac trung (bao gom post-fetch) trong bai bao goc.

2. **URLSimilarityIndex chiem 72% importance**: Dac trung nay don le da giai quyet phan lon bai toan. Dieu nay phu hop voi phan tich tuong quan (r = 0.8604). Ly do: URL hop phap thuong co do tuong dong cao giua URL va domain (vi du: `https://google.com` -> URLSimilarityIndex = 100), trong khi URL phishing thuong co URL dai khong lien quan den domain (vi du: `http://evil-site.tk/google-login-verify`).

3. **Recall = 100%**: Mo hinh khong bo sot bat ky URL phishing nao trong tap test. Day la dac biet quan trong vi false negative (bo sot phishing) nguy hiem hon false positive (canh bao nham).

4. **Logloss hoi tu nhanh**: Validation logloss giam tu 0.588 (vong 0) xuong 0.004 (vong 50), cho thay mo hinh hoc rat nhanh. Sau vong 100, logloss on dinh o ~0.0014.

---

### 4.2 Mo hinh DGA Detection

#### Cau hinh huan luyen

| Thong so | Gia tri |
|---|---|
| Du lieu | ExtraHop Dataset — 2,000,000 mau (lay mau tu 16.2M) |
| Dac trung | 71 dac trung (64 ma hoa ky tu + 7 thong ke) |
| Chia du lieu | 80% train (1,600,000) / 20% test (400,000) |
| Mo hinh | XGBClassifier |
| Sieu tham so | n_estimators=500, max_depth=6, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8 |
| Early stopping | 50 rounds |

#### Ket qua

| Chi so | Gia tri |
|---|---|
| **Accuracy** | **0.9745** (97.45%) |
| **Precision** | **0.9780** (97.80%) |
| **Recall** | **0.9718** (97.18%) |
| **F1-Score** | **0.9749** (97.49%) |
| **ROC-AUC** | **0.9964** (99.64%) |

**Classification Report:**

| Lop | Precision | Recall | F1-Score | So mau |
|---|---|---|---|---|
| Benign (0) | 0.97 | 0.98 | 0.97 | 196,338 |
| DGA (1) | 0.98 | 0.97 | 0.97 | 203,662 |

#### Do quan trong dac trung

**Dac trung thong ke:**

| Dac trung | Importance |
|---|---|
| consonants_consec | 0.2296 |
| digits | 0.1006 |
| length | 0.0566 |
| vowel_ratio | 0.0466 |
| unique_chars | 0.0300 |
| entropy | 0.0261 |
| capitals | 0.0000 |

**Tong hop:**

| Nhom dac trung | Tong Importance |
|---|---|
| Ma hoa ky tu (64 features) | 51.06% |
| Dac trung thong ke (7 features) | 48.94% |

#### Phan tich ket qua

1. **Vuot moc ExtraHop**: ExtraHop Networks bao cao do chinh xac >94.8% tren bo du lieu cua ho voi XGBoost. Mo hinh cua chung ta dat **97.45%**, vuot 2.65 diem phan tram.

2. **ROC-AUC 99.64%**: Cho thay mo hinh co kha nang phan biet rat tot giua DGA va benign, ngay ca khi nguong quyet dinh thay doi.

3. **Can bang giua hai nhom dac trung**: Ma hoa ky tu (51%) va dac trung thong ke (49%) dong gop gan nhu bang nhau. Dieu nay cho thay ca hai loai dac trung deu quan trong:
   - Ma hoa ky tu: bat cac mau ky tu cu the (vi du: cac chuoi ngau nhien dac trung cua tung ho DGA)
   - Dac trung thong ke: bat cac dac diem tong quat (entropy, ti le nguyen am, phu am lien tiep)

4. **consonants_consec la dac trung thong ke manh nhat** (22.96% importance): Phu hop voi phan tich du lieu — DGA trung binh co 5.3 phu am lien tiep vs 2.5 cho benign.

5. **capitals = 0 importance**: Vi du lieu ExtraHop chi chua chu thuong, nen dac trung nay khong co tac dung.

---

### 4.3 So sanh hai mo hinh

| Chi so | Phishing Model | DGA Model |
|---|---|---|
| Accuracy | 99.98% | 97.45% |
| Precision | 99.97% | 97.80% |
| Recall | 100.00% | 97.18% |
| F1-Score | 99.99% | 97.49% |
| ROC-AUC | 99.99% | 99.64% |
| So dac trung | 25 | 71 |
| So mau huan luyen | 188,636 | 1,600,000 |

**Nhan xet:**

- Mo hinh Phishing co hieu suat cao hon vi bo du lieu PhiUSIIL duoc thiet ke voi cac dac trung rat manh (dac biet URLSimilarityIndex).
- Mo hinh DGA kho hon vi chi dua vao chuoi ten mien (khong co metadata nhu TLD, protocol, path). Tuy nhien 97.45% van la ket qua rat tot cho bai toan nay.
- Ca hai mo hinh deu phu hop de trien khai trong he thong thoi gian thuc vi chi su dung dac trung co the tinh toan tu chuoi URL/domain ma khong can tai trang web.

### 4.4 Cach ket hop hai mo hinh trong he thong

Khi nguoi dung hover qua mot link, he thong:

1. **Trich xuat domain** tu URL (vi du: `https://evil-site.tk/login` -> domain = `evil-site`, TLD = `tk`)
2. **Chay dong thoi hai mo hinh**:
   - Phishing model: tinh 25 dac trung URL -> du doan xac suat phishing
   - DGA model: tinh 71 dac trung domain -> du doan xac suat DGA
3. **Ket hop diem so**:
   - `phishing_risk` = xac suat phishing * 100
   - `dga_risk` = xac suat DGA * 80 (trong so thap hon vi DGA la tin hieu hep hon)
   - `risk_score` = max(phishing_risk, dga_risk), gioi han 0-100
4. **Phan dinh**:
   - 0-29: **Safe** (An toan)
   - 30-59: **Suspicious** (Dang nghi)
   - 60-100: **Malicious** (Doc hai)

## 5. Tai lieu tham khao (References)

### Du lieu

1. Arvind Prasad, Shalini Chandra. "PhiUSIIL: A diverse security profile empowered phishing URL detection framework based on similarity index and incremental learning." *Computers & Security*, Volume 136, 2024. https://doi.org/10.1016/j.cose.2023.103545

2. PhiUSIIL Phishing URL Dataset. UCI Machine Learning Repository, Dataset #967. https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset

3. ExtraHop Networks. "DGA Detection Training Dataset." GitHub Repository. https://github.com/ExtraHop/dga-detection-training-dataset

### Mo hinh va thuat toan

4. Tianqi Chen, Carlos Guestrin. "XGBoost: A Scalable Tree Boosting System." *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 2016. https://doi.org/10.1145/2939672.2939785

5. Jerome H. Friedman. "Greedy Function Approximation: A Gradient Boosting Machine." *The Annals of Statistics*, 29(5), 2001. https://doi.org/10.1214/aos/1013203451

6. Leo Breiman. "Random Forests." *Machine Learning*, 45(1), 5-32, 2001. https://doi.org/10.1023/A:1010933404324

### An ninh mang

7. Anti-Phishing Working Group (APWG). "Phishing Activity Trends Report, 2023." https://apwg.org/trendsreports/

8. FBI Internet Crime Complaint Center. "IC3 Annual Report 2022." https://www.ic3.gov/Media/PDF/AnnualReport/2022_IC3Report.pdf

9. ExtraHop Networks. "Using Machine Learning to Detect Domain Generation Algorithm (DGA) Activity." https://www.extrahop.com/company/blog/2020/machine-learning-dga/

### Repository tham khao

10. pradhyumnaag30. "PhiUSIIL-Phishing-URL-Detection." GitHub. https://github.com/pradhyumnaag30/PhiUSIIL-Phishing-URL-Detection

11. shikhar96. "DGA-or-Benign." GitHub. https://github.com/shikhar96/DGA-or-Benign

12. Sijibomiaol. "phiUSIIL_Phishing_URL." GitHub. https://github.com/Sijibomiaol/phiUSIIL_Phishing_URL

### Thu vien va cong cu

13. XGBoost Documentation. https://xgboost.readthedocs.io/

14. FastAPI Documentation. https://fastapi.tiangolo.com/

15. scikit-learn Documentation. https://scikit-learn.org/stable/

*(Nguoi dung co the bo sung them tai lieu tham khao tai day)*
