# Phishing URL & DGA Detection

Demo Video: https://www.youtube.com/watch?v=vsHU1LZXOsA

## 1. Đặt vấn đề (Problem Statement)

### 1.1 Bối cảnh

Trong những năm gần đây, tấn công lừa đảo trực tuyến (phishing) và mã độc sử dụng tên miền sinh tự động (DGA - Domain Generation Algorithm) đã trở thành hai trong những mối đe dọa an ninh mạng nghiêm trọng nhất trên toàn cầu.

**Phishing** là hình thức tấn công mà kẻ tấn công tạo ra các trang web giả mạo, bắt chước giao diện của các trang web hợp pháp (ngân hàng, mạng xã hội, email...) nhằm lừa người dùng nhập thông tin cá nhân như mật khẩu, số thẻ tín dụng, thông tin tài khoản.

**DGA (Domain Generation Algorithm)** là kỹ thuật được sử dụng bởi malware (phần mềm độc hại) để tự động tạo ra hàng nghìn tên miền ngẫu nhiên mỗi ngày. Malware sẽ kết nối đến các tên miền này để nhận lệnh từ máy chủ điều khiển (Command & Control server). Vì số lượng tên miền được tạo ra rất lớn và thay đổi liên tục, việc chặn theo danh sách đen (blacklist) trở nên bất khả thi.

### 1.2 Thống kê thực tế

- Theo báo cáo của Anti-Phishing Working Group (APWG), năm 2023 ghi nhận hơn **4.7 triệu cuộc tấn công phishing**, mức cao nhất từng được ghi nhận.
- FBI báo cáo thiệt hại từ phishing vượt **$10 tỷ USD** trong năm 2022 (IC3 Report).
- Các dòng malware nổi tiếng như Conficker, CryptoLocker, Necurs sử dụng DGA để tạo ra từ 1,000 đến 50,000 tên miền mỗi ngày.

### 1.3 Tại sao cần xây dựng hệ thống này?

Các phương pháp truyền thống như danh sách đen (blacklist) và danh sách trắng (whitelist) có nhiều hạn chế:

| Phương pháp | Hạn chế |
|---|---|
| Blacklist | Không thể cập nhật kịp thời với các URL mới. Một trang phishing có thể tồn tại chỉ vài giờ trước khi bị gỡ xuống, nhưng đã đủ thời gian để lừa đảo hàng nghìn người. |
| Whitelist | Quá nghiêm ngặt, chặn cả các trang web hợp pháp mới. |
| Rule-based | Các quy tắc cố định dễ bị vượt qua khi kẻ tấn công thay đổi chiến thuật. |

**Giải pháp**: Sử dụng Machine Learning (học máy) để tự động phân tích và phát hiện URL độc hại trong thời gian thực, dựa trên các đặc trưng (features) của URL và tên miền.

### 1.4 Mục tiêu dự án

Xây dựng một hệ thống phát hiện phishing URL và DGA domain với các yêu cầu:

1. **Hai mô hình ML riêng biệt**:
   - Mô hình phát hiện Phishing URL (dựa trên 25 đặc trưng URL-only, không cần tải trang web)
   - Mô hình phát hiện DGA domain (dựa trên đặc trưng từ cấu trúc tên miền)

2. **Backend API** (FastAPI) kết hợp kết quả từ cả hai mô hình để đưa ra một phán định duy nhất (Safe / Suspicious / Malicious)

3. **Chrome Extension** hiển thị cảnh báo trực quan cho người dùng khi họ di chuột qua các liên kết độc hại

### 1.5 Kiến trúc hệ thống

```
[Người dùng duyệt web]
        |
        v
[Chrome Extension]
   |         |
   |    [Fast Detector]  <-- Kiểm tra nhanh phía client
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
[Kết hợp điểm số] --> Verdict: Safe / Suspicious / Malicious
```

## 2. Khám phá dữ liệu (Dataset Exploration)

Dự án sử dụng hai bộ dữ liệu chính:

### 2.1 PhiUSIIL Phishing URL Dataset

**Nguồn**: UCI Machine Learning Repository (ID: 967)
**Bài báo gốc**: Arvind Prasad & Shalini Chandra, "PhiUSIIL: A diverse security profile empowered phishing URL detection framework based on similarity index and incremental learning", 2024.

#### Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Tổng số mẫu | 235,795 |
| Số đặc trưng | 56 cột (50 số + 5 chuỗi + 1 nhãn) |
| Nhãn | `label`: 0 = Phishing, 1 = Hợp pháp |
| Dữ liệu thiếu | Không có |

#### Phân bố nhãn

| Lớp | Số lượng | Tỉ lệ |
|---|---|---|
| Hợp pháp (1) | 134,850 | 57.19% |
| Phishing (0) | 100,945 | 42.81% |

Dữ liệu mất cân bằng nhẹ (~57/43) nhưng không nghiêm trọng, không bắt buộc phải tái mẫu lại (resampling).

#### Phân loại đặc trưng

50 đặc trưng số được chia làm hai nhóm:

**Nhóm 1: Đặc trưng URL-only (Pre-fetch) — 25 đặc trưng**

Đây là các đặc trưng có thể tính toán chỉ từ chuỗi URL, **không cần tải trang web**. Đây là nhóm đặc trưng chúng ta sử dụng để huấn luyện mô hình, vì nó cho phép phát hiện phishing **trước khi người dùng click vào link**.

| Đặc trưng | Kiểu | Mô tả | Trung bình | Độ lệch chuẩn |
|---|---|---|---|---|
| URLLength | int | Độ dài URL | 34.57 | 41.31 |
| DomainLength | int | Độ dài tên miền | 21.47 | 9.15 |
| IsDomainIP | binary | Domain là địa chỉ IP? | 0.003 | 0.05 |
| URLSimilarityIndex | float | Độ tương đồng giữa URL và domain (0-100) | 78.43 | 28.98 |
| CharContinuationRate | float | Tỉ lệ ký tự cùng loại liên tiếp (0-1) | 0.85 | 0.22 |
| TLDLegitimateProb | float | Xác suất TLD là hợp pháp | 0.26 | 0.25 |
| URLCharProb | float | Phân bố xác suất ký tự | 0.056 | 0.011 |
| TLDLength | int | Độ dài TLD | 2.76 | 0.60 |
| NoOfSubDomain | int | Số subdomain | 1.16 | 0.60 |
| HasObfuscation | binary | URL có mã hóa hex (%XX)? | 0.002 | 0.05 |
| NoOfObfuscatedChar | int | Số ký tự bị mã hóa | 0.02 | 1.88 |
| ObfuscationRatio | float | Tỉ lệ ký tự bị mã hóa | 0.0001 | 0.004 |
| NoOfLettersInURL | int | Số chữ cái | 19.43 | 29.09 |
| LetterRatioInURL | float | Tỉ lệ chữ cái | 0.52 | 0.12 |
| NoOfDegitsInURL | int | Số chữ số | 1.88 | 11.89 |
| DegitRatioInURL | float | Tỉ lệ chữ số | 0.03 | 0.07 |
| NoOfEqualsInURL | int | Số dấu '=' | 0.06 | 0.93 |
| NoOfQMarkInURL | int | Số dấu '?' | 0.03 | 0.19 |
| NoOfAmpersandInURL | int | Số dấu '&' | 0.03 | 0.84 |
| NoOfOtherSpecialCharsInURL | int | Số ký tự đặc biệt khác | 2.34 | 3.53 |
| SpacialCharRatioInURL | float | Tỉ lệ ký tự đặc biệt | 0.06 | 0.03 |
| IsHTTPS | binary | URL sử dụng HTTPS? | 0.78 | 0.41 |
| Bank | binary | URL chứa từ "bank"? | 0.13 | 0.33 |
| Pay | binary | URL chứa từ "pay"? | 0.24 | 0.43 |
| Crypto | binary | URL chứa từ "crypto"? | 0.02 | 0.15 |

**Nhóm 2: Đặc trưng Post-fetch (Nội dung trang web) — 25 đặc trưng**

Các đặc trưng này cần tải trang web để trích xuất (HTML, DOM, JavaScript). Chúng ta **không sử dụng** nhóm này để huấn luyện vì mục tiêu là phát hiện phishing trước khi người dùng truy cập trang web.

Bao gồm: LineOfCode, HasTitle, HasFavicon, Robots, IsResponsive, HasSocialNet, HasSubmitButton, HasHiddenFields, HasPasswordField, v.v.

#### Phát hiện chính từ dữ liệu

**1. URLSimilarityIndex là đặc trưng mạnh nhất**

| Lớp | Trung bình | Trung vị |
|---|---|---|
| Phishing | 49.62 | 51.42 |
| Hợp pháp | 100.00 | 100.00 |

Tất cả URL hợp pháp đều có URLSimilarityIndex = 100 (URL hoàn toàn khớp với domain). URL phishing chỉ đạt trung bình ~50. **Hệ số tương quan Pearson: 0.8604** (cao nhất trong tất cả đặc trưng).

**2. HTTPS là yếu tố phân biệt mạnh**

| Lớp | HTTP | HTTPS |
|---|---|---|
| Phishing | 50.78% | 49.22% |
| Hợp pháp | 0.00% | 100.00% |

100% URL hợp pháp sử dụng HTTPS. Chỉ ~49% URL phishing sử dụng HTTPS. **Tương quan: 0.6091.**

**3. Độ dài URL và Domain**

| Chỉ số | Phishing | Hợp pháp |
|---|---|---|
| Độ dài URL (trung bình) | 45.7 | 26.2 |
| Độ dài URL (độ lệch chuẩn) | 61.1 | 4.8 |
| Độ dài Domain (trung bình) | 24.5 | 19.2 |

URL phishing dài hơn và có phương sai lớn hơn nhiều. URL hợp pháp tập trung quanh 26 ký tự.

**4. Top 10 đặc trưng tương quan với nhãn (URL-only)**

| Hạng | Đặc trưng | \|r\| |
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

**5. Phân bố TLD theo lớp**

| Hạng | TLD Phishing | Số lượng | TLD Hợp pháp | Số lượng |
|---|---|---|---|---|
| 1 | com | 43,769 | com | 68,785 |
| 2 | app | 6,368 | org | 16,524 |
| 3 | co | 4,964 | uk | 6,073 |
| 4 | io | 3,769 | net | 3,998 |
| 5 | net | 3,099 | de | 3,310 |

URL phishing sử dụng nhiều `.app`, `.co`, `.io`, `.top`. URL hợp pháp phân bố đều trên các TLD quốc gia (`.uk`, `.de`, `.au`, `.jp`).

---

### 2.2 ExtraHop DGA Detection Training Dataset

**Nguồn**: ExtraHop Networks (GitHub)

#### Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Tổng số mẫu | 16,246,014 |
| Cột | 2: `domain` (chuỗi), `threat` (nhãn) |
| Nhãn | "benign" hoặc "dga" |
| Định dạng | Newline-delimited JSON (NDJSON) |
| Đặc điểm | Tên miền không có TLD, không có subdomain |

**Ví dụ dữ liệu:**
```json
{"domain": "myhandeczema", "threat": "benign"}
{"domain": "ocymmekqogkw", "threat": "dga"}
{"domain": "gwirelessltd", "threat": "benign"}
{"domain": "deummagdbawse", "threat": "dga"}
```

#### Phân bố nhãn

| Lớp | Số lượng (ước tính) | Tỉ lệ |
|---|---|---|
| DGA | ~8,261,879 | 50.84% |
| Benign | ~7,984,127 | 49.16% |

Cân bằng gần như hoàn hảo (~50/50).

#### Phân tích độ dài tên miền

| Chỉ số | Benign | DGA |
|---|---|---|
| Trung bình | 11.79 | 15.25 |
| Trung vị | 11.0 | 14.0 |
| Độ lệch chuẩn | 4.92 | 6.21 |
| Nhỏ nhất | 1 | 3 |
| Lớn nhất | 63 | 44 |

Tên miền DGA dài hơn trung bình ~3.5 ký tự.

**Phân bố theo độ dài:**

| Khoảng | Benign | DGA |
|---|---|---|
| 1-5 | 6.22% | 0.03% |
| 6-10 | 37.94% | 26.72% |
| 11-15 | 34.70% | 32.28% |
| 16-20 | 15.63% | 18.81% |
| 21-30 | 5.32% | 20.99% |
| 31-50 | 0.19% | 1.17% |

Sự khác biệt rõ nhất ở khoảng 21-30 ký tự: DGA gấp 4 lần so với benign.

#### Phân tích ký tự

| Chỉ số | Benign | DGA |
|---|---|---|
| Shannon Entropy (trung bình) | 2.92 | 3.27 |
| Tỉ lệ nguyên âm | 0.344 | 0.240 |
| Số chữ số (trung bình) | 0.44 | 1.14 |
| Số ký tự duy nhất | 8.59 | 10.93 |
| Phụ âm liên tiếp dài nhất | 2.46 | 5.30 |
| Chứa dấu gạch ngang | 11.3% | 0.0% |

**Nhận xét quan trọng:**
- **Entropy**: DGA cao hơn (ngẫu nhiên hơn) — 3.27 vs 2.92
- **Tỉ lệ nguyên âm**: Tên miền benign có 34.4% nguyên âm (ngôn ngữ tự nhiên). DGA chỉ có 24.0%
- **Phụ âm liên tiếp**: Đặc trưng phân biệt mạnh nhất. DGA trung bình 5.3 phụ âm liên tiếp vs 2.5 cho benign. Từ có thể đọc được hiếm khi có >3 phụ âm liên tiếp
- **Dấu gạch ngang**: 11.3% tên miền benign có dấu gạch ngang; 0% DGA có (bộ tạo DGA thường không dùng ký tự này)

**Tần suất ký tự (top 5):**

| Hạng | Benign | Tần suất | DGA | Tần suất |
|---|---|---|---|---|
| 1 | 'e' | 9.89% | 'e' | 5.17% |
| 2 | 'a' | 9.11% | 'a' | 5.11% |
| 3 | 'i' | 7.18% | 'i' | 4.79% |
| 4 | 'o' | 6.85% | 'o' | 4.67% |
| 5 | 'r' | 6.67% | 'y' | 4.52% |

Tên miền benign tuân theo tần suất chữ cái tiếng Anh (e > a > i > o > r). DGA có phân bố phẳng hơn nhiều (max 5.17% vs 9.89%), đặc trưng của việc sinh ngẫu nhiên.

#### Đặc trưng được sử dụng để huấn luyện

Mô hình DGA sử dụng **71 đặc trưng**:

**Mã hóa ký tự (64 đặc trưng)**: Mỗi ký tự trong tên miền được ánh xạ sang một số nguyên qua bảng tra cứu cố định, căn phải trong vector 64 phần tử, padding số 0 bên trái.

**Đặc trưng thống kê (7 đặc trưng)**:

| Đặc trưng | Mô tả |
|---|---|
| length | Độ dài tên miền |
| capitals | Số ký tự in hoa |
| digits | Số chữ số |
| consonants_consec | Độ dài chuỗi phụ âm liên tiếp dài nhất |
| vowel_ratio | Tỉ lệ nguyên âm |
| entropy | Shannon entropy |
| unique_chars | Số ký tự duy nhất |

## 3. Kiến thức liên quan

### 3.1 Machine Learnin

**Machine Learning (Học máy)** là một nhánh của Trí tuệ Nhân tạo (AI), trong đó máy tính **học từ dữ liệu** thay vì được lập trình cụ thể cho từng trường hợp.

**Ví dụ đơn giản**: Thay vì viết quy tắc "nếu URL dài hơn 50 ký tự VÀ không có HTTPS thì là phishing", chúng ta cho máy tính xem hàng trăm nghìn URL đã được gán nhãn (phishing hoặc hợp pháp), và máy tính tự tìm ra các quy luật để phân loại.

**Phân loại nhị phân (Binary Classification)**: Bài toán của chúng ta — với mỗi URL hoặc tên miền đầu vào, mô hình trả lời một trong hai: **độc hại** hoặc **an toàn**.

- **Đầu vào (Input)**: Một vector các đặc trưng số (ví dụ: độ dài URL = 45, có HTTPS = 1, tỉ lệ chữ số = 0.08, ...)
- **Đầu ra (Output)**: Xác suất thuộc lớp độc hại (0.0 đến 1.0)
- **Nhãn thực tế (Label)**: 0 (phishing/DGA) hoặc 1 (hợp pháp/benign)

### 3.2 Cây quyết định (Decision Tree) — Ví dụ cụ thể

#### Bài toán

Giả sử chúng ta có 6 URL và muốn phân loại chúng là **Phishing (0)** hay **Hợp pháp (1)**:

| # | URLLength | IsHTTPS | NoOfDegits | Label |
|---|---|---|---|---|
| 1 | 25 | 1 | 0 | 1 (Hợp pháp) |
| 2 | 22 | 1 | 0 | 1 (Hợp pháp) |
| 3 | 80 | 0 | 5 | 0 (Phishing) |
| 4 | 95 | 0 | 8 | 0 (Phishing) |
| 5 | 30 | 1 | 2 | 1 (Hợp pháp) |
| 6 | 60 | 0 | 3 | 0 (Phishing) |

#### Bước 1: Tính Gini Impurity của toàn bộ tập dữ liệu

Tập dữ liệu có 3 Phishing (0) và 3 Hợp pháp (1):

$$Gini_{root} = 1 - p_0^2 - p_1^2 = 1 - (3/6)^2 - (3/6)^2 = 1 - 0.25 - 0.25 = 0.5$$

Gini = 0.5 là mức lộn xộn tối đa (50/50), mô hình chưa biết gì.

#### Bước 2: Thử chia theo từng đặc trưng

Thuật toán thử **mọi đặc trưng** và **mọi ngưỡng có thể** (ví dụ: URLLength <= 22, <= 25, <= 30, <= 60, ...), rồi chọn cách chia giảm Gini nhiều nhất.

**Thử chia theo IsHTTPS:**

- Nhánh IsHTTPS = 0: {#3, #4, #6} → 3 Phishing, 0 Hợp pháp → Gini = 1 - (3/3)² - (0/3)² = **0.0** (hoàn hảo!)
- Nhánh IsHTTPS = 1: {#1, #2, #5} → 0 Phishing, 3 Hợp pháp → Gini = 1 - (0/3)² - (3/3)² = **0.0** (hoàn hảo!)

$$Gini_{split} = \frac{3}{6} \times 0.0 + \frac{3}{6} \times 0.0 = 0.0$$

Cây chỉ cần **1 lần chia** là phân loại đúng 100%:

```
          IsHTTPS = 1?
          /          \
        Yes           No
        /               \
  {#1,#2,#5}         {#3,#4,#6}
  3/3 Hợp pháp       3/3 Phishing
  --> Label = 1       --> Label = 0
```

#### Bước 3: Dự đoán mẫu mới

Một URL mới: URLLength=45, IsHTTPS=0, NoOfDegits=4

- Đi từ gốc: IsHTTPS = 1? → **Không** → đi sang nhánh phải
- Đến lá: **Label = 0 (Phishing)**

**Vấn đề của cây đơn lẻ**: Với dữ liệu thực (235,795 mẫu, 25 đặc trưng), một cây đơn dễ bị overfit — nó "học thuộc" dữ liệu huấn luyện nhưng dự đoán kém trên dữ liệu mới. Đây là lý do chúng ta cần Gradient Boosting.

### 3.3 Gradient Boosting — 1 vòng lặp hoàn chỉnh với số cụ thể

#### Ý tưởng cốt lõi

Thay vì xây dựng một cây lớn, Gradient Boosting xây dựng nhiều cây nhỏ (weak learners), mỗi cây học từ **sai số** của các cây trước đó.

**Tương tự trực giác**: Hãy tưởng tượng bạn bắn cung và trượt. Lần đầu bạn bắn trượt xa đích 10 mét. Lần hai, bạn điều chỉnh và chỉ trượt 3 mét. Lần ba, chỉ trượt 0.5 mét. Mỗi lần bạn điều chỉnh, bạn đến gần đích hơn. Gradient Boosting làm tương tự — mỗi cây "điều chỉnh" để giảm sai số còn lại.

#### Dữ liệu

Dùng lại 6 URL ở trên:

| # | URLLength | IsHTTPS | Label ($y$) |
|---|---|---|---|
| 1 | 25 | 1 | 1 |
| 2 | 22 | 1 | 1 |
| 3 | 80 | 0 | 0 |
| 4 | 95 | 0 | 0 |
| 5 | 30 | 1 | 1 |
| 6 | 60 | 0 | 0 |

#### Bước 0: Khởi tạo dự đoán ban đầu

Với phân loại nhị phân, dự đoán ban đầu $F_0$ là **log-odds** của lớp dương:

$$F_0 = \log\frac{3}{3} = \log(1) = 0$$

Chuyển sang xác suất bằng hàm sigmoid:

$$p_0 = \frac{1}{1 + e^{-F_0}} = \frac{1}{1 + e^{0}} = \frac{1}{2} = 0.5$$

Vậy ban đầu, mô hình dự đoán **tất cả 6 URL đều có xác suất 0.5** (50% phishing, 50% hợp pháp). Chưa biết gì cả — hợp lý!

#### Bước 1 (Vòng 1): Tính phần dư (Residuals)

Phần dư = Giá trị thực - Xác suất dự đoán hiện tại:

$$r_i = y_i - p_i$$

| # | $y_i$ (thực) | $p_i$ (dự đoán) | $r_i$ (phần dư) |
|---|---|---|---|
| 1 | 1 | 0.5 | **+0.5** |
| 2 | 1 | 0.5 | **+0.5** |
| 3 | 0 | 0.5 | **-0.5** |
| 4 | 0 | 0.5 | **-0.5** |
| 5 | 1 | 0.5 | **+0.5** |
| 6 | 0 | 0.5 | **-0.5** |

- Phần dư **dương** (+0.5): Mô hình đang dự đoán thấp hơn thực tế → cần **tăng** xác suất
- Phần dư **âm** (-0.5): Mô hình đang dự đoán cao hơn thực tế → cần **giảm** xác suất

#### Bước 2 (Vòng 1): Huấn luyện cây để dự đoán phần dư

Bây giờ chúng ta xây dựng một cây quyết định NHỎ (ví dụ: độ sâu = 1, chỉ 1 lần chia) để **dự đoán phần dư**, không phải dự đoán label gốc.

Cây tìm ra: Chia theo **IsHTTPS** là tốt nhất (tối thiểu squared error trên phần dư):
- IsHTTPS = 1 → dự đoán phần dư = **+0.5** (trung bình của +0.5, +0.5, +0.5)
- IsHTTPS = 0 → dự đoán phần dư = **-0.5** (trung bình của -0.5, -0.5, -0.5)

#### Bước 3 (Vòng 1): Cập nhật mô hình

$$F_1(x) = F_0(x) + \eta \cdot h_1(x)$$

Với learning rate $\eta = 0.3$ (chúng ta dùng giá trị nhỏ để mô hình học từ từ):

| # | $F_0$ | $\eta \cdot h_1$ | $F_1$ | $p_1 = sigmoid(F_1)$ |
|---|---|---|---|---|
| 1 | 0 | 0.3 × 0.5 = 0.15 | 0.15 | 0.537 |
| 2 | 0 | 0.3 × 0.5 = 0.15 | 0.15 | 0.537 |
| 3 | 0 | 0.3 × (-0.5) = -0.15 | -0.15 | 0.463 |
| 4 | 0 | 0.3 × (-0.5) = -0.15 | -0.15 | 0.463 |
| 5 | 0 | 0.3 × 0.5 = 0.15 | 0.15 | 0.537 |
| 6 | 0 | 0.3 × (-0.5) = -0.15 | -0.15 | 0.463 |

**Sau vòng 1**: Mẫu hợp pháp (#1,2,5) có xác suất tăng từ 0.5 lên **0.537**. Mẫu phishing (#3,4,6) có xác suất giảm từ 0.5 xuống **0.463**. Mô hình đã bắt đầu học đúng hướng!

#### Tóm tắt Gradient Boosting

```
Vòng 0:  Tất cả dự đoán = 0.5 (không biết gì)
Vòng 1:  Hợp pháp: 0.5 → 0.537 (+0.037)    Phishing: 0.5 → 0.463 (-0.037)
Vòng 2:  Hợp pháp: 0.537 → 0.571 (+0.034)   Phishing: 0.463 → 0.429 (-0.034)
Vòng 3:  Hợp pháp: 0.571 → 0.602 (+0.031)   Phishing: 0.429 → 0.398 (-0.031)
...
Vòng 50: Hợp pháp: ~0.98                     Phishing: ~0.02
...
Vòng 200: Hợp pháp: ~0.999                   Phishing: ~0.001
```

Mỗi vòng, mỗi cây sửa một ít sai số. Qua nhiều vòng, dự đoán hội tụ về giá trị đúng.

### 3.4 XGBoost — Một vòng lặp hoàn chỉnh, so sánh trực tiếp với Gradient Boosting

Chúng ta sẽ dùng **cùng dữ liệu, cùng trạng thái** như Gradient Boosting ở trên, và đi qua **Vòng 1 của XGBoost** để thấy sự khác biệt cụ thể.

#### Điểm xuất phát (giống nhau)

Giống Gradient Boosting, XGBoost bắt đầu với $F_0 = 0$, $p_0 = 0.5$ cho tất cả 6 mẫu.

#### Bước 1: Tính Gradient VÀ Hessian (khác biệt đầu tiên)

**Gradient Boosting** chỉ tính gradient (đạo hàm bậc 1): $g_i = p_i - y_i$

**XGBoost** tính thêm hessian (đạo hàm bậc 2): $h_i = p_i \times (1 - p_i)$

| # | $y_i$ | $p_0$ | $g_i = p_0 - y_i$ | $h_i = p_0(1-p_0)$ |
|---|---|---|---|---|
| 1 | 1 | 0.5 | -0.5 | 0.25 |
| 2 | 1 | 0.5 | -0.5 | 0.25 |
| 3 | 0 | 0.5 | +0.5 | 0.25 |
| 4 | 0 | 0.5 | +0.5 | 0.25 |
| 5 | 1 | 0.5 | -0.5 | 0.25 |
| 6 | 0 | 0.5 | +0.5 | 0.25 |

(Lưu ý: gradient $g_i$ có dấu ngược với residual $r_i$ ở GB. Residual = $y - p$, gradient = $p - y$.)

#### Bước 2: Xây dựng cây — Chọn điểm chia bằng Gain (khác biệt thứ hai)

**Gradient Boosting** chọn split bằng cách tối thiểu squared error trên residual.

**XGBoost** chọn split bằng công thức **Gain** có tính đến cả gradient, hessian, VÀ regularization:

$$Gain = \frac{1}{2}\left[\frac{G_L^2}{H_L + \lambda} + \frac{G_R^2}{H_R + \lambda} - \frac{(G_L + G_R)^2}{H_L + H_R + \lambda}\right] - \gamma$$

Đặt $\lambda = 1.0$ (regularization trên trọng số lá), $\gamma = 0.1$ (chi phí chia nhánh).

**Thử split: IsHTTPS = 1?**

Nhánh trái (IsHTTPS=1): mẫu #1,2,5
$$G_L = (-0.5) + (-0.5) + (-0.5) = -1.5, \quad H_L = 0.75$$

Nhánh phải (IsHTTPS=0): mẫu #3,4,6
$$G_R = 0.5 + 0.5 + 0.5 = +1.5, \quad H_R = 0.75$$

$$Gain = \frac{1}{2}\left[\frac{(-1.5)^2}{0.75 + 1} + \frac{1.5^2}{0.75 + 1} - \frac{0^2}{1.5 + 1}\right] - 0.1 = \frac{1}{2}[1.286 + 1.286] - 0.1 = \mathbf{1.186}$$

Gain = 1.186 > 0 → **Chia!** Nếu $\gamma = 2.0$ thì Gain = 1.186 - 2.0 = -0.814 < 0 → **Không chia!** Đây là cách $\gamma$ kiểm soát độ phức tạp của cây.

#### Bước 3: Tính giá trị lá (khác biệt thứ ba — quan trọng nhất!)

Đây là bước khác biệt lớn nhất giữa GB và XGBoost.

**Gradient Boosting**: giá trị lá = trung bình residual

$$w_{GB} = \frac{0.5 + 0.5 + 0.5}{3} = +0.5$$

**XGBoost**: giá trị lá có tính hessian và regularization

$$w_{XGB} = -\frac{\sum g_i}{\sum h_i + \lambda} = -\frac{-1.5}{0.75 + 1.0} = +0.857$$

| Lá | Gradient Boosting | XGBoost | Chênh lệch |
|---|---|---|---|
| Trái (hợp pháp) | +0.500 | +0.857 | XGB bước lớn hơn |
| Phải (phishing) | -0.500 | -0.857 | XGB bước lớn hơn |

**Tại sao XGBoost bước lớn hơn?** Vì nó sử dụng hessian để biết độ cong của hàm loss. Tại $p = 0.5$, hessian = 0.25, nghĩa là hàm loss tương đối "phẳng" → có thể bước lớn hơn một cách an toàn.

**Nhưng $\lambda$ kiểm soát độ lớn**: Nếu $\lambda = 10$ thay vì 1: $w = -\frac{-1.5}{0.75 + 10} = +0.140$. $\lambda$ lớn → giá trị lá nhỏ → mô hình thận trọng hơn → chống overfit.

#### Bước 4: Cập nhật dự đoán

Với learning rate $\eta = 0.3$:

**Gradient Boosting:**
$$F_1 = 0 + 0.3 \times 0.5 = 0.15 \Rightarrow p_1 = sigmoid(0.15) = 0.537$$

**XGBoost:**
$$F_1 = 0 + 0.3 \times 0.857 = 0.257 \Rightarrow p_1 = sigmoid(0.257) = 0.564$$

#### So sánh sau Vòng 1

| # | Label | GB: $p_1$ | XGB: $p_1$ |
|---|---|---|---|
| 1 (Hợp pháp) | 1 | 0.537 | **0.564** |
| 2 (Hợp pháp) | 1 | 0.537 | **0.564** |
| 3 (Phishing) | 0 | 0.463 | **0.436** |
| 4 (Phishing) | 0 | 0.463 | **0.436** |
| 5 (Hợp pháp) | 1 | 0.537 | **0.564** |
| 6 (Phishing) | 0 | 0.463 | **0.436** |

**XGBoost tiến bộ nhanh hơn trong cùng 1 vòng!**
- Hợp pháp: GB +0.037, XGB +0.064 (nhanh hơn 73%)
- Phishing: GB -0.037, XGB -0.064

#### Tóm tắt quá trình 1 vòng, GB vs XGBoost

```
                    GRADIENT BOOSTING                    XGBOOST
                    =================                    =======

Bước 1: Tính sai   residual = y - p                     gradient g = p - y
         số         (chỉ bậc 1)                          hessian h = p(1-p)
                                                         (bậc 1 VÀ bậc 2)

Bước 2: Chọn       Tối thiểu squared error               Tối đa Gain (có gamma, lambda)
         split      của residual                          Gain < 0 → không chia!

Bước 3: Giá trị    w = mean(residual)                    w = -sum(g) / (sum(h) + lambda)
         lá         = +0.500                              = +0.857 (với lambda=1)

Bước 4: Cập nhật   F1 = F0 + 0.3 × 0.500 = 0.15        F1 = F0 + 0.3 × 0.857 = 0.257
                    p1 = 0.537                            p1 = 0.564
                    (tiến 0.037)                          (tiến 0.064 — nhanh hơn 73%!)
```

#### Siêu tham số (Hyperparameters) sử dụng trong dự án

| Tham số | Giá trị | Ý nghĩa |
|---|---|---|
| n_estimators | 500 | Số cây tối đa |
| max_depth | 6 | Độ sâu tối đa của mỗi cây. Cây nông hơn = đơn giản hơn, ít overfit hơn |
| learning_rate (eta) | 0.1 | Tốc độ học. Nhỏ hơn = cần nhiều cây hơn nhưng ổn định hơn |
| subsample | 0.8 | Tỉ lệ mẫu dùng cho mỗi cây (80%) |
| colsample_bytree | 0.8 | Tỉ lệ đặc trưng dùng cho mỗi cây (80%) |
| gamma | 0.1 | Ngưỡng tối thiểu để chia nhánh |
| early_stopping_rounds | 50 | Dừng huấn luyện nếu logloss không giảm sau 50 vòng |

### 3.5 Các chỉ số đánh giá — Ví dụ cụ thể

Sau khi huấn luyện, chúng ta test mô hình trên **10 URL mới** mà mô hình chưa từng thấy:

| # | URL | Thực tế | Mô hình dự đoán |
|---|---|---|---|
| 1 | https://google.com | Hợp pháp | Hợp pháp |
| 2 | http://g00gle-login.tk | Phishing | Phishing |
| 3 | https://facebook.com | Hợp pháp | Hợp pháp |
| 4 | http://faceb0ok.verify.co | Phishing | Phishing |
| 5 | https://amazon.com | Hợp pháp | Hợp pháp |
| 6 | http://amaz0n-secure.xyz | Phishing | Hợp pháp |
| 7 | https://github.com | Hợp pháp | Hợp pháp |
| 8 | http://verify-paypal.tk | Phishing | Phishing |
| 9 | https://wikipedia.org | Hợp pháp | Hợp pháp |
| 10 | http://bank-login.gq | Phishing | Phishing |

Mô hình dự đoán sai duy nhất mẫu **#6**: một URL phishing nhưng bị mô hình cho là hợp pháp.

#### Confusion Matrix (Ma trận nhầm lẫn)

|  | Dự đoán: Phishing | Dự đoán: Hợp pháp |
|---|---|---|
| **Thực tế: Phishing** | TP = **4** (#2,4,8,10) | FN = **1** (#6) |
| **Thực tế: Hợp pháp** | FP = **0** | TN = **5** (#1,3,5,7,9) |

- **TP = 4**: 4 URL phishing bị phát hiện đúng
- **FN = 1**: 1 URL phishing bị bỏ sót (mẫu #6 — **nguy hiểm!** người dùng có thể click vào)
- **FP = 0**: Không có URL hợp pháp nào bị đánh dấu nhầm
- **TN = 5**: 5 URL hợp pháp được xác nhận đúng

#### Tính các chỉ số

**Accuracy** (độ chính xác tổng thể):
$$Accuracy = \frac{TP + TN}{TP + TN + FP + FN} = \frac{4 + 5}{4 + 5 + 0 + 1} = \frac{9}{10} = 0.90 \ (90\%)$$

**Precision** (trong số URL bị đánh dấu phishing, bao nhiêu % đúng?):
$$Precision = \frac{TP}{TP + FP} = \frac{4}{4 + 0} = 1.00 \ (100\%)$$

Precision = 100% nghĩa là: mỗi khi mô hình báo "đây là phishing" thì nó đúng 100%. Không có báo động giả.

**Recall** (trong số tất cả phishing thực sự, bao nhiêu % được phát hiện?):
$$Recall = \frac{TP}{TP + FN} = \frac{4}{4 + 1} = 0.80 \ (80\%)$$

Recall = 80% nghĩa là: mô hình phát hiện được 4/5 URL phishing, bỏ sót 1. Trong an ninh mạng, **Recall quan trọng hơn Precision** vì bỏ sót phishing (FN) nguy hiểm hơn cảnh báo nhầm (FP).

**F1-Score** (cân bằng giữa Precision và Recall):
$$F1 = 2 \times \frac{Precision \times Recall}{Precision + Recall} = 2 \times \frac{1.0 \times 0.8}{1.0 + 0.8} = 0.889 \ (88.9\%)$$

#### ROC-AUC giải thích trực quan

Mô hình trả về **xác suất** (0.0 đến 1.0), không phải nhãn trực tiếp. Chúng ta cần chọn **ngưỡng** (threshold) để quyết định:

| Ngưỡng | Phát hiện đúng (Recall) | Báo động giả (FPR) | Nhận xét |
|---|---|---|---|
| 0.1 | 100% | 20% | Bắt hết phishing, nhưng nhiều báo động giả |
| 0.3 | 95% | 5% | Gần như bắt hết, ít báo động giả |
| **0.5** | **90%** | **1%** | **Cân bằng tốt** |
| 0.7 | 70% | 0.1% | Ít báo động giả nhưng bỏ sót nhiều |
| 0.9 | 40% | 0% | Không báo động giả nhưng bỏ sót quá nhiều |

**ROC curve** vẽ tất cả các điểm (FPR, Recall) khi thay đổi ngưỡng từ 0 đến 1. **AUC** là diện tích dưới đường cong:
- AUC = 1.0 → Mô hình tách biệt hoàn hảo 2 lớp tại mọi ngưỡng
- AUC = 0.5 → Mô hình không tốt hơn đoán ngẫu nhiên
- Mô hình của chúng ta: AUC = 0.9999 (Phishing) và 0.9964 (DGA) → **gần hoàn hảo**

## 4. Kết quả huấn luyện và đánh giá (Training Results & Evaluation)

### 4.1 Mô hình Phishing URL Detection

#### Cấu hình huấn luyện

| Thông số | Giá trị |
|---|---|
| Dữ liệu | PhiUSIIL Dataset — 235,795 mẫu |
| Đặc trưng | 25 đặc trưng URL-only (pre-fetch) |
| Chia dữ liệu | 80% train (188,636) / 20% test (47,159) |
| Mô hình | XGBClassifier |
| Siêu tham số | n_estimators=500, max_depth=6, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8 |
| Early stopping | 50 rounds, theo dõi validation logloss |

#### Kết quả

| Chỉ số | Giá trị |
|---|---|
| **Accuracy** | **0.9998** (99.98%) |
| **Precision** | **0.9997** (99.97%) |
| **Recall** | **1.0000** (100%) |
| **F1-Score** | **0.9999** (99.99%) |
| **ROC-AUC** | **0.9999** (99.99%) |

**Classification Report:**

| Lớp | Precision | Recall | F1-Score | Số mẫu |
|---|---|---|---|---|
| Phishing (0) | 1.00 | 1.00 | 1.00 | 20,189 |
| Hợp pháp (1) | 1.00 | 1.00 | 1.00 | 26,970 |

#### Độ quan trọng đặc trưng (Top 10)

| Hạng | Đặc trưng | Importance |
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

#### Phân tích kết quả

1. **Hiệu suất gần như hoàn hảo**: Mô hình đạt Accuracy 99.98% chỉ với 25 đặc trưng URL-only, không cần tải trang web. Đây là kết quả tương đương với mô hình sử dụng toàn bộ 50 đặc trưng trong bài báo gốc.

2. **URLSimilarityIndex chiếm 72% importance**: Đặc trưng này đơn lẻ đã giải quyết phần lớn bài toán. URL hợp pháp thường có độ tương đồng cao giữa URL và domain (ví dụ: `https://google.com` → URLSimilarityIndex = 100), trong khi URL phishing thường có URL dài không liên quan đến domain (ví dụ: `http://evil-site.tk/google-login-verify`).

3. **Recall = 100%**: Mô hình không bỏ sót bất kỳ URL phishing nào trong tập test. Đây là đặc biệt quan trọng vì false negative (bỏ sót phishing) nguy hiểm hơn false positive (cảnh báo nhầm).

4. **Logloss hội tụ nhanh**: Validation logloss giảm từ 0.588 (vòng 0) xuống 0.004 (vòng 50), cho thấy mô hình học rất nhanh.

---

### 4.2 Mô hình DGA Detection

#### Cấu hình huấn luyện

| Thông số | Giá trị |
|---|---|
| Dữ liệu | ExtraHop Dataset — 2,000,000 mẫu (lấy mẫu từ 16.2M) |
| Đặc trưng | 71 đặc trưng (64 mã hóa ký tự + 7 thống kê) |
| Chia dữ liệu | 80% train (1,600,000) / 20% test (400,000) |
| Mô hình | XGBClassifier |
| Siêu tham số | n_estimators=500, max_depth=6, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8 |
| Early stopping | 50 rounds |

#### Kết quả

| Chỉ số | Giá trị |
|---|---|
| **Accuracy** | **0.9745** (97.45%) |
| **Precision** | **0.9780** (97.80%) |
| **Recall** | **0.9718** (97.18%) |
| **F1-Score** | **0.9749** (97.49%) |
| **ROC-AUC** | **0.9964** (99.64%) |

#### Độ quan trọng đặc trưng

| Nhóm đặc trưng | Tổng Importance |
|---|---|
| Mã hóa ký tự (64 features) | 51.06% |
| Đặc trưng thống kê (7 features) | 48.94% |

Đặc trưng thống kê mạnh nhất: consonants_consec (22.96%), digits (10.06%), length (5.66%).

#### Phân tích kết quả

1. **Vượt mốc ExtraHop**: ExtraHop Networks báo cáo độ chính xác >94.8% trên bộ dữ liệu của họ với XGBoost. Mô hình của chúng ta đạt **97.45%**, vượt 2.65 điểm phần trăm.

2. **Cân bằng giữa hai nhóm đặc trưng**: Mã hóa ký tự (51%) và đặc trưng thống kê (49%) đóng góp gần như bằng nhau, cho thấy cả hai loại đều quan trọng.

3. **consonants_consec là đặc trưng thống kê mạnh nhất**: Phù hợp với phân tích dữ liệu — DGA trung bình có 5.3 phụ âm liên tiếp vs 2.5 cho benign.

---

### 4.3 So sánh hai mô hình

| Chỉ số | Phishing Model | DGA Model |
|---|---|---|
| Accuracy | 99.98% | 97.45% |
| Precision | 99.97% | 97.80% |
| Recall | 100.00% | 97.18% |
| F1-Score | 99.99% | 97.49% |
| ROC-AUC | 99.99% | 99.64% |
| Số đặc trưng | 25 | 71 |
| Số mẫu huấn luyện | 188,636 | 1,600,000 |

Cả hai mô hình đều phù hợp để triển khai trong hệ thống thời gian thực vì chỉ sử dụng đặc trưng có thể tính toán từ chuỗi URL/domain mà không cần tải trang web.

### 4.4 Cách kết hợp hai mô hình trong hệ thống

Khi người dùng hover qua một link, hệ thống:

1. **Trích xuất domain** từ URL (ví dụ: `https://evil-site.tk/login` → domain = `evil-site`, TLD = `tk`)
2. **Chạy đồng thời hai mô hình**:
   - Phishing model: tính 25 đặc trưng URL → dự đoán xác suất phishing
   - DGA model: tính 71 đặc trưng domain → dự đoán xác suất DGA
3. **Kết hợp điểm số**:
   - `phishing_risk` = xác suất phishing × 100
   - `dga_risk` = xác suất DGA × 80 (trọng số thấp hơn vì DGA là tín hiệu hẹp hơn)
   - `risk_score` = max(phishing_risk, dga_risk), giới hạn 0-100
4. **Phán định**:
   - 0-29: **Safe** (An toàn)
   - 30-59: **Suspicious** (Đáng nghi)
   - 60-100: **Malicious** (Độc hại)

## 5. Tài liệu tham khảo (References)

### Dữ liệu

1. Arvind Prasad, Shalini Chandra. "PhiUSIIL: A diverse security profile empowered phishing URL detection framework based on similarity index and incremental learning." *Computers & Security*, Volume 136, 2024. https://doi.org/10.1016/j.cose.2023.103545

2. PhiUSIIL Phishing URL Dataset. UCI Machine Learning Repository, Dataset #967. https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset

3. ExtraHop Networks. "DGA Detection Training Dataset." GitHub Repository. https://github.com/ExtraHop/dga-detection-training-dataset

### Mô hình và thuật toán

4. Tianqi Chen, Carlos Guestrin. "XGBoost: A Scalable Tree Boosting System." *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 2016. https://doi.org/10.1145/2939672.2939785

5. Jerome H. Friedman. "Greedy Function Approximation: A Gradient Boosting Machine." *The Annals of Statistics*, 29(5), 2001. https://doi.org/10.1214/aos/1013203451

6. Leo Breiman. "Random Forests." *Machine Learning*, 45(1), 5-32, 2001. https://doi.org/10.1023/A:1010933404324

### An ninh mạng

7. Anti-Phishing Working Group (APWG). "Phishing Activity Trends Report, 2023." https://apwg.org/trendsreports/

8. FBI Internet Crime Complaint Center. "IC3 Annual Report 2022." https://www.ic3.gov/Media/PDF/AnnualReport/2022_IC3Report.pdf

9. ExtraHop Networks. "Using Machine Learning to Detect Domain Generation Algorithm (DGA) Activity." https://www.extrahop.com/company/blog/2020/machine-learning-dga/

### Repository tham khảo

10. pradhyumnaag30. "PhiUSIIL-Phishing-URL-Detection." GitHub. https://github.com/pradhyumnaag30/PhiUSIIL-Phishing-URL-Detection

11. shikhar96. "DGA-or-Benign." GitHub. https://github.com/shikhar96/DGA-or-Benign

12. Sijibomiaol. "phiUSIIL_Phishing_URL." GitHub. https://github.com/Sijibomiaol/phiUSIIL_Phishing_URL

### Thư viện và công cụ

13. XGBoost Documentation. https://xgboost.readthedocs.io/

14. FastAPI Documentation. https://fastapi.tiangolo.com/

15. scikit-learn Documentation. https://scikit-learn.org/stable/

*(Người dùng có thể bổ sung thêm tài liệu tham khảo tại đây)*
