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

2. **Backend API** (FastAPI) chạy hai mô hình độc lập và trả về kết quả riêng biệt cho từng mô hình (phishing và DGA), kèm phán định (Safe / Suspicious / Malicious)

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
[Phishing Model]        [DGA Model]
   |                      |
   v                      v
{phishing: score,      {dga: score,
 verdict, reasons}      verdict, reasons}
```

## 2. Khai phá dữ liệu

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

### 3.1 Machine Learning

**Machine Learning (Học máy)** là một nhánh của Trí tuệ Nhân tạo (AI), trong đó máy tính **học từ dữ liệu** thay vì được lập trình cụ thể cho từng trường hợp.

**Ví dụ đơn giản**: Thay vì viết quy tắc "nếu URL dài hơn 50 ký tự VÀ không có HTTPS thì là phishing", chúng ta cho máy tính xem hàng trăm nghìn URL đã được gán nhãn (phishing hoặc hợp pháp), và máy tính tự tìm ra các quy luật để phân loại.

**Phân loại nhị phân (Binary Classification)**: Bài toán của chúng ta — với mỗi URL hoặc tên miền đầu vào, mô hình trả lời một trong hai: **độc hại** hoặc **an toàn**.

- **Đầu vào (Input)**: Một vector các đặc trưng số (ví dụ: độ dài URL = 45, có HTTPS = 1, tỉ lệ chữ số = 0.08, ...)
- **Đầu ra (Output)**: Xác suất thuộc lớp độc hại (0.0 đến 1.0)
- **Nhãn thực tế (Label)**: 0 (phishing/DGA) hoặc 1 (hợp pháp/benign)

### 3.2 Cây quyết định (Decision Tree)

**Cây quyết định (Decision Tree)** là một thuật toán học máy có giám sát, hoạt động bằng cách chia dữ liệu thành các nhóm nhỏ dần thông qua một chuỗi các câu hỏi nhị phân (đúng/sai) về các đặc trưng của dữ liệu. Cấu trúc của cây bao gồm: **nút gốc** (root node) chứa toàn bộ dữ liệu, **các nút trong** (internal nodes) đại diện cho các điều kiện phân chia, và **các nút lá** (leaf nodes) chứa dự đoán cuối cùng.

Quá trình xây dựng cây quyết định là quá trình đệ quy: tại mỗi nút, thuật toán duyệt qua tất cả các đặc trưng và tất cả các ngưỡng có thể, chọn ra cặp (đặc trưng, ngưỡng) tạo ra sự phân chia "tốt nhất" — tức là các nhóm con sau khi chia càng "thuần" (chỉ chứa một lớp) càng tốt. Tiêu chí đo lường "độ thuần" phổ biến nhất là **Gini Impurity**.

Ưu điểm của cây quyết định là dễ hiểu, dễ trực quan hóa, và không cần chuẩn hóa dữ liệu. Tuy nhiên, một cây đơn lẻ thường có xu hướng **overfitting** (quá khớp dữ liệu huấn luyện) nếu không được giới hạn độ sâu. Đây là lý do các phương pháp ensemble như Random Forest và Gradient Boosting ra đời — kết hợp nhiều cây nhỏ để tạo ra mô hình mạnh hơn và ổn định hơn.

#### Ví dụ cụ thể

#### Gini Impurity — Đo "độ lẫn lộn" của một nhóm

Trước khi xây cây, cần hiểu cách đo "độ lẫn lộn" của một nhóm dữ liệu. Ý tưởng rất đơn giản:

> Hãy tưởng tượng bạn chọn ngẫu nhiên **2 URL** từ một nhóm. **Xác suất hai URL đó có nhãn khác nhau** (một phishing, một hợp pháp) chính là Gini Impurity.

**Ví dụ**: Một nhóm có 6 URL phishing và 2 URL hợp pháp (tổng 8):

```
Chọn URL thứ 1, chọn URL thứ 2. Xác suất chúng có nhãn KHÁC nhau?

P(cả hai phishing)  = 6/8 × 6/8 = 0.5625
P(cả hai hợp pháp)  = 2/8 × 2/8 = 0.0625
P(cùng nhãn)         = 0.5625 + 0.0625 = 0.625

→ P(khác nhãn) = 1 - 0.625 = 0.375
→ Gini = 0.375
```

Công thức tổng quát: $Gini = 1 - \sum p_i^2$

**Các trường hợp đặc biệt:**

| Nhóm | Gini | Ý nghĩa |
|---|---|---|
| 8 phishing, 0 hợp pháp (100%/0%) | 0.0 | **Thuần khiết** — chọn 2 URL bất kỳ, luôn cùng nhãn |
| 4 phishing, 4 hợp pháp (50%/50%) | 0.5 | **Lẫn lộn tối đa** — chọn 2 URL, xác suất khác nhãn cao nhất |
| 6 phishing, 2 hợp pháp (75%/25%) | 0.375 | Thiên về phishing nhưng vẫn lẫn |

Mục tiêu của cây quyết định: tìm cách chia dữ liệu sao cho các nhóm con có **Gini càng thấp càng tốt** (càng thuần khiết).

#### Bài toán

Giả sử chúng ta có 8 URL và muốn phân loại chúng là **Phishing (0)** hay **Hợp pháp (1)**:

| # | URLLength | IsHTTPS | NoOfDegits | Label | Ghi chú |
|---|---|---|---|---|---|
| 1 | 20 | 1 | 0 | 1 (Hợp pháp) | URL ngắn, HTTPS, không có số |
| 2 | 25 | 1 | 1 | 1 (Hợp pháp) | URL ngắn, HTTPS |
| 3 | 80 | 0 | 7 | 0 (Phishing) | URL dài, HTTP, nhiều số |
| 4 | 90 | 0 | 9 | 0 (Phishing) | URL dài, HTTP, rất nhiều số |
| 5 | 28 | 1 | 6 | 0 (Phishing) | **URL ngắn, HTTPS, nhưng nhiều số → phishing!** |
| 6 | 35 | 0 | 5 | 1 (Hợp pháp) | **HTTP nhưng hợp pháp (ví dụ: trang tin tức cũ)** |
| 7 | 50 | 1 | 3 | 0 (Phishing) | HTTPS nhưng phishing |
| 8 | 30 | 0 | 1 | 1 (Hợp pháp) | HTTP nhưng hợp pháp |

Dữ liệu này **thực tế hơn** ví dụ đơn giản: mẫu #5 là URL phishing ngắn, có HTTPS (trông an toàn) nhưng chứa nhiều chữ số — giống kiểu `https://bank-secure284719.com`. Mẫu #6 là trang hợp pháp nhưng không dùng HTTPS (trang tin tức cũ). Không có đặc trưng nào một mình tách biệt hoàn hảo 2 lớp!

#### Bước 1: Tính Gini Impurity của toàn bộ tập dữ liệu

Tập dữ liệu có 4 Phishing (0) và 4 Hợp pháp (1):

$$Gini_{root} = 1 - (4/8)^2 - (4/8)^2 = 1 - 0.25 - 0.25 = 0.5$$

Gini = 0.5 — mức lẫn lộn tối đa (50/50). Chọn 2 URL ngẫu nhiên, xác suất chúng khác nhãn = 50%. Mô hình chưa biết gì cả.

#### Bước 2 (Vòng 1): Thử tất cả đặc trưng, tất cả ngưỡng

Thuật toán thử **mọi đặc trưng** × **mọi ngưỡng có thể**, tính Gini sau mỗi cách chia, rồi chọn cách tốt nhất.

**Thử chia theo IsHTTPS:**

- IsHTTPS = 1: {#1(L), #2(L), #5(P), #7(P)} → 2 Phishing, 2 Hợp pháp → Gini = 1 - (2/4)² - (2/4)² = **0.5**
- IsHTTPS = 0: {#3(P), #4(P), #6(L), #8(L)} → 2 Phishing, 2 Hợp pháp → Gini = **0.5**

$$Gini_{split} = \frac{4}{8} \times 0.5 + \frac{4}{8} \times 0.5 = 0.5$$

Gini = 0.5 — **vô ích!** Bằng với root, không cải thiện gì. Vì mẫu #5 (phishing có HTTPS) và #6 (hợp pháp không có HTTPS) phá vỡ quy luật "HTTPS = an toàn". Đây là lý do không thể chỉ dùng 1 đặc trưng.

**Thử chia theo URLLength <= 35:**

- Nhánh trái (URLLength <= 35): {#1(20,L), #2(25,L), #5(28,P), #6(35,L), #8(30,L)} → 1 Phishing, 4 Hợp pháp → Gini = 1 - (1/5)² - (4/5)² = 1 - 0.04 - 0.64 = **0.32**
- Nhánh phải (URLLength > 35): {#3(80,P), #4(90,P), #7(50,P)} → 3 Phishing, 0 Hợp pháp → Gini = **0.0** (thuần khiết!)

$$Gini_{split} = \frac{5}{8} \times 0.32 + \frac{3}{8} \times 0.0 = 0.2$$

Gini giảm từ 0.5 xuống 0.2 — tốt hơn nhiều! Nhánh phải thuần khiết (toàn phishing). Nhưng nhánh trái vẫn lẫn: mẫu #5 (phishing, URLLength=28) lọt vào cùng nhóm với các URL hợp pháp vì nó có URL ngắn.

**Thử chia theo NoOfDegits <= 1:**

- Nhánh trái (NoOfDegits <= 1): {#1(0,L), #2(1,L), #8(1,L)} → 0 Phishing, 3 Hợp pháp → Gini = **0.0**
- Nhánh phải (NoOfDegits > 1): {#3(7,P), #4(9,P), #5(6,P), #6(5,L), #7(3,P)} → 4 Phishing, 1 Hợp pháp → Gini = 1 - (4/5)² - (1/5)² = **0.32**

$$Gini_{split} = \frac{3}{8} \times 0.0 + \frac{5}{8} \times 0.32 = 0.2$$

Cũng cho Gini = 0.2! Nhưng lần này mẫu #6 (hợp pháp, 5 chữ số) bị lẫn vào nhóm phishing.

**Tóm tắt các split đã thử (Vòng 1):**

| Split | Gini sau chia | Nhận xét |
|---|---|---|
| IsHTTPS = 1 | 0.500 | Vô ích — không cải thiện gì |
| URLLength <= 35 | **0.200** | Tốt nhất (nhánh phải thuần khiết, nhánh trái lẫn 1 mẫu) |
| NoOfDegits <= 1 | **0.200** | Tốt bằng — nhưng nhánh phải lẫn 1 mẫu |

Thuật toán chọn **URLLength <= 35** (Gini thấp nhất, gặp đầu tiên).

**Sau vòng 1:**

```
                URLLength <= 35?
               /                \
             Yes                 No
        [1P, 4L]              [3P, 0L]
        Gini=0.32             Gini=0.0 ✓ THUẦN KHIẾT
        CẦN CHIA TIẾP!       → Phishing
```

Nhánh phải đã thuần khiết (3/3 Phishing) → không cần chia nữa. Nhánh trái có 1 Phishing lẫn 4 Hợp pháp → **cần chia thêm lần nữa**.

#### Bước 3 (Vòng 2): Chia tiếp nhánh trái

Nhánh trái chứa 5 mẫu: {#1, #2, #5, #6, #8}. Gini hiện tại = 0.32.

| # | URLLength | IsHTTPS | NoOfDegits | Label |
|---|---|---|---|---|
| 1 | 20 | 1 | 0 | Hợp pháp |
| 2 | 25 | 1 | 1 | Hợp pháp |
| 5 | 28 | 1 | 6 | **Phishing** ← kẻ lẫn vào! |
| 6 | 35 | 0 | 5 | Hợp pháp |
| 8 | 30 | 0 | 1 | Hợp pháp |

Thuật toán lặp lại quy trình — thử tất cả đặc trưng trên **5 mẫu này**:

**Thử IsHTTPS trên nhánh trái:**

- IsHTTPS = 1: {#1(L), #2(L), #5(P)} → 1P, 2L → Gini = 1 - (1/3)² - (2/3)² = **0.444**
- IsHTTPS = 0: {#6(L), #8(L)} → 0P, 2L → Gini = **0.0**

$$Gini_{split} = \frac{3}{5} \times 0.444 + \frac{2}{5} \times 0.0 = 0.267$$

Giảm từ 0.32 xuống 0.267 — cải thiện, nhưng nhánh IsHTTPS=1 vẫn lẫn.

**Thử NoOfDegits <= 5 trên nhánh trái:**

- NoOfDegits <= 5: {#1(0,L), #2(1,L), #6(5,L), #8(1,L)} → 0P, 4L → Gini = **0.0** (thuần khiết!)
- NoOfDegits > 5: {#5(6,P)} → 1P, 0L → Gini = **0.0** (thuần khiết!)

$$Gini_{split} = \frac{4}{5} \times 0.0 + \frac{1}{5} \times 0.0 = 0.0$$

**Hoàn hảo!** Mẫu #5 (phishing, 6 chữ số) bị tách ra khỏi nhóm hợp pháp nhờ số lượng chữ số cao bất thường.

**Tóm tắt các split vòng 2:**

| Split (trên nhánh trái) | Gini sau chia | Nhận xét |
|---|---|---|
| IsHTTPS = 1 | 0.267 | Cải thiện nhưng chưa hoàn hảo |
| NoOfDegits <= 5 | **0.000** | Hoàn hảo! |

Thuật toán chọn **NoOfDegits <= 5**.

#### Cây quyết định hoàn chỉnh (2 vòng chia)

```
                     URLLength <= 35?
                    /                \
                  Yes                 No
            [1P, 4L]              [3P, 0L]
                 |                → Phishing ✓
          NoOfDegits <= 5?
          /              \
        Yes               No
   [0P, 4L]            [1P, 0L]
   → Hợp pháp ✓        → Phishing ✓
   {#1,#2,#6,#8}       {#5}
```

Cây cần **2 lần chia** vì không có đặc trưng nào một mình tách biệt hoàn hảo 2 lớp. Vòng 1 dùng URLLength để tách các URL dài (phishing rõ ràng). Vòng 2 dùng NoOfDegits để bắt mẫu #5 — URL phishing ngắn nhưng chứa nhiều chữ số.

#### Bước 4: Dự đoán mẫu mới

Một URL mới: URLLength=32, IsHTTPS=1, NoOfDegits=7

```
URLLength <= 35?  → CÓ (32 <= 35) → đi sang nhánh trái
NoOfDegits <= 5?  → KHÔNG (7 > 5) → đi sang nhánh phải
→ Kết quả: Phishing ✓
```

Mặc dù URL ngắn và có HTTPS (trông an toàn), cây phát hiện nó có quá nhiều chữ số → phishing.

Một URL khác: URLLength=22, IsHTTPS=0, NoOfDegits=0

```
URLLength <= 35?  → CÓ → nhánh trái
NoOfDegits <= 5?  → CÓ (0 <= 5) → nhánh trái
→ Kết quả: Hợp pháp ✓
```

**Vấn đề của cây đơn lẻ**: Với dữ liệu thực (235,795 mẫu, 25 đặc trưng), một cây đơn dễ bị overfit — nó "học thuộc" dữ liệu huấn luyện nhưng dự đoán kém trên dữ liệu mới. Đây là lý do chúng ta cần Gradient Boosting.

### 3.3 Gradient Boosting

**Gradient Boosting** là một phương pháp ensemble learning (học kết hợp), xây dựng mô hình dự đoán mạnh bằng cách kết hợp tuần tự nhiều mô hình yếu (thường là cây quyết định nông). Ý tưởng cốt lõi là: thay vì xây dựng một cây lớn, thuật toán xây dựng nhiều cây nhỏ (weak learners), mỗi cây học từ **sai số** (residual) của các cây trước đó.

Thuật toán bắt đầu bằng một dự đoán ban đầu đơn giản (thường là log-odds của lớp dương trong phân loại nhị phân), sau đó lặp lại quá trình: (1) tính sai số giữa dự đoán hiện tại và giá trị thực, (2) huấn luyện một cây quyết định nhỏ để dự đoán sai số đó, (3) cập nhật dự đoán bằng cách cộng thêm kết quả từ cây mới (nhân với learning rate để kiểm soát tốc độ học). Qua mỗi vòng lặp, mô hình dần tiến gần hơn đến giá trị thực.

Tên gọi "Gradient" đến từ việc sai số (residual) chính là **gradient âm** của hàm mất mát (loss function). Nói cách khác, Gradient Boosting thực hiện gradient descent trong không gian hàm — mỗi cây mới là một bước đi theo hướng giảm loss nhanh nhất. Jerome Friedman đề xuất phương pháp này năm 2001 trong bài báo "Greedy Function Approximation: A Gradient Boosting Machine".

#### Ví dụ: 1 vòng lặp hoàn chỉnh với số cụ thể

#### Ý tưởng trực giác

Hãy tưởng tượng bạn bắn cung và trượt. Lần đầu bạn bắn trượt xa đích 10 mét. Lần hai, bạn điều chỉnh và chỉ trượt 3 mét. Lần ba, chỉ trượt 0.5 mét. Mỗi lần bạn điều chỉnh, bạn đến gần đích hơn. Gradient Boosting làm tương tự — mỗi cây "điều chỉnh" để giảm sai số còn lại.

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

### 3.4 XGBoost (eXtreme Gradient Boosting)

**XGBoost** (Chen & Guestrin, 2016) là phiên bản cải tiến và tối ưu hóa của Gradient Boosting, được thiết kế để đạt hiệu suất cao hơn cả về tốc độ lẫn accuracy. XGBoost bổ sung ba cải tiến quan trọng so với Gradient Boosting truyền thống:

**Thứ nhất, sử dụng đạo hàm bậc hai (Hessian):** Trong khi Gradient Boosting chỉ sử dụng gradient (đạo hàm bậc 1) để xác định hướng cập nhật, XGBoost tính thêm Hessian (đạo hàm bậc 2) để xác định cả **tốc độ** cập nhật tối ưu. Điều này tương tự sự khác biệt giữa phương pháp Newton (dùng cả đạo hàm bậc 1 và 2) và gradient descent thông thường (chỉ dùng đạo hàm bậc 1) — phương pháp Newton hội tụ nhanh hơn vì hiểu được "độ cong" của hàm mất mát.

**Thứ hai, regularization tích hợp:** XGBoost thêm các tham số phạt trực tiếp vào hàm mục tiêu — bao gồm $\lambda$ (phạt L2 trên giá trị lá) và $\gamma$ (chi phí tối thiểu để thêm một lần chia). Điều này giúp kiểm soát overfitting ngay trong quá trình xây dựng cây, thay vì phải dùng kỹ thuật pruning sau khi xây xong.

**Thứ ba, tối ưu hóa kỹ thuật:** XGBoost hỗ trợ tính toán song song, xử lý giá trị thiếu (missing values) tự động, và sử dụng cấu trúc dữ liệu column-block cho phép sắp xếp đặc trưng một lần và tái sử dụng nhiều lần. Những tối ưu này cho phép XGBoost xử lý bộ dữ liệu lớn hiệu quả hơn đáng kể.

XGBoost hiện là một trong những thuật toán phổ biến nhất cho dữ liệu bảng (tabular data), thường xuyên đạt thứ hạng cao trong các cuộc thi Kaggle và được sử dụng rộng rãi trong sản xuất. Dự án của chúng em sử dụng XGBoost cho cả hai bài toán phát hiện phishing và DGA.

#### Ví dụ: Một vòng lặp hoàn chỉnh, so sánh trực tiếp với Gradient Boosting

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

### 4.4 Hai mô hình hoạt động độc lập

Hai mô hình phishing và DGA hoạt động **hoàn toàn độc lập** — mỗi mô hình nhận đầu vào riêng, trích xuất đặc trưng riêng và đưa ra dự đoán riêng.

Khi nhận được một URL, API thực hiện:

1. **Trích xuất domain** từ URL (ví dụ: `https://evil-site.tk/login` → domain = `evil-site`, TLD = `tk`)
2. **Chạy riêng biệt hai mô hình**:
   - **Phishing model**: tính 25 đặc trưng từ toàn bộ URL → trả về xác suất phishing, điểm số và phán định riêng
   - **DGA model**: tính 71 đặc trưng từ tên miền → trả về xác suất DGA, điểm số và phán định riêng
3. **Trả về kết quả tách biệt**: API trả về kết quả của từng mô hình riêng (bao gồm điểm số, xác suất và lý do), cho phép phía client hiển thị chi tiết từng phân tích

---

## 5. Kiến trúc Chrome Extension

### 5.1 Tổng quan

Extension sử dụng kiến trúc **Manifest V3** của Chrome, bao gồm 3 thành phần chính chạy trong các ngữ cảnh (context) tách biệt:

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Browser                           │
│                                                              │
│  ┌──────────────────┐    ┌─────────────────────────────────┐│
│  │  Service Worker   │    │        Web Page Context         ││
│  │  (background.js)  │    │                                 ││
│  │                    │    │  browser-polyfill.js            ││
│  │  - API calls       │◄──►  fast-detector.js               ││
│  │  - Caching         │    │  content.js                    ││
│  │  - Rate limiting   │    │  styles.css                    ││
│  │  - Context menu    │    │                                 ││
│  └──────────────────┘    └─────────────────────────────────┘│
│           ▲                                                  │
│           │                                                  │
│  ┌──────────────────┐                                       │
│  │  Popup UI         │                                       │
│  │  (popup.html/js)  │                                       │
│  │  - Settings        │                                       │
│  │  - Statistics      │                                       │
│  │  - Last scan       │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
   ┌──────────────┐
   │ FastAPI       │
   │ Backend       │
   │ localhost:8000│
   └──────────────┘
```

### 5.2 Cấu trúc file

```
Phishing-link-detection-extension/
├── manifest.json          # Cấu hình extension (Manifest V3)
├── browser-polyfill.js    # Tương thích đa trình duyệt (Chrome/Edge/Brave/Opera)
├── fast-detector.js       # Engine phân tích heuristic phía client (Tier 1)
├── content.js             # Scanner trang web + giao diện trực quan
├── background.js          # Service worker (cầu nối với backend API)
├── popup.html + popup.js  # Giao diện popup của extension
├── styles.css             # CSS cho highlight và tooltip
└── icons/                 # Icon extension
```

### 5.3 manifest.json — Điểm vào (Entry Point)

File cấu hình duy nhất **bắt buộc** của mọi Chrome Extension. Khai báo:

- **Content scripts** được inject vào mọi trang web theo thứ tự: `browser-polyfill.js` -> `fast-detector.js` -> `content.js` (cùng `styles.css`). Thứ tự quan trọng vì `content.js` gọi `window.FastDetector` từ `fast-detector.js`.
- **Service worker**: `background.js` — chạy nền, không có quyền truy cập DOM.
- **Popup**: `popup.html` — hiển thị khi click icon extension.
- **Permissions**: `activeTab`, `scripting`, `contextMenus`, `storage`, `<all_urls>`.
- **run_at**: `document_idle` — scripts chỉ chạy sau khi trang web đã tải xong.

### 5.4 Luồng thực thi (Execution Flow)

Khi người dùng mở trang web, Chrome inject các script vào trang. Hệ thống tự động gắn event listener cho mọi link và theo dõi DOM để bắt link mới được thêm động (SPA, AJAX).

**Khi người dùng hover qua link**, hệ thống thực hiện phân tích hai tầng:

```
Hover → Tier 1: FastDetector phía client (tức thì)
        ├─ Kiểm tra blocklist và whitelist
        ├─ 8 heuristic checks (keywords, TLD, IP, entropy, typosquatting...)
        ├─ Trả về điểm nhanh → highlight link ngay lập tức
        │
        └─ Nếu điểm >= 30 → Tier 2: Gửi đến backend XGBoost
                              ├─ Phishing model (25 features)
                              ├─ DGA model (71 features)
                              └─ Cập nhật highlight với kết quả chính xác hơn
```

**Khi người dùng click link độc hại**, hệ thống hiển thị dialog cảnh báo cho phép người dùng chọn tiếp tục hoặc hủy điều hướng.

### 5.5 Các thành phần chi tiết

#### fast-detector.js — Engine phân tích Tier 1

Object `FastDetector` chạy hoàn toàn phía client (không gọi mạng). Hàm chính: `FastDetector.analyze(url)`.

**Pipeline phân tích (theo thứ tự):**

1. **Blocklist check** — danh sách domain bị chặn (ví dụ: `fb88.com`). Kiểm tra cả hostname và full URL (bắt domain ẩn trong redirect URL).
2. **Trusted domain check** — whitelist domain an toàn (google.com, github.com...). Nếu khớp → trả về safe ngay.
3. **8 heuristic checks**, mỗi check trả về score (0-100) và lý do:

| Check | Phát hiện | Điểm |
|---|---|---|
| checkKeywords | Từ khóa phishing: "login", "verify", "password"... | +8/từ khóa |
| checkTLD | TLD đáng nghi: `.tk`, `.ml`, `.zip`... | +25 |
| checkObfuscation | Quá nhiều dấu gạch ngang/chấm trong hostname | +10-15 |
| checkIPAddress | Domain là địa chỉ IP thay vì tên miền | +30 |
| checkPunycode | Tấn công homograph (xn-- domains) | +20-25 |
| checkLength | URL dài bất thường (>75 ký tự) | +1-15 |
| checkEntropy | Shannon entropy cao (chuỗi ngẫu nhiên kiểu DGA) | +1-20 |
| checkTyposquatting | Khoảng cách Levenshtein gần brand phổ biến | +35 |

**Scoring**: tổng điểm (cap 100). Ngưỡng phán định: `<30` Safe, `30-59` Suspicious, `>=60` Malicious.

#### background.js — Service Worker (cầu nối Backend)

Chạy liên tục trong nền. Chức năng:

- **API communication**: `callBackendAPI(url)` → POST /analyze đến FastAPI, timeout 10 giây
- **Rate limiting**: Tối đa 10 request/phút, chặn nếu vượt giới hạn
- **Caching**: In-memory Map + persist xuống `chrome.storage.local`, TTL 24 giờ, dọn dẹp mỗi giờ
- **Context menu**: Click phải → "Analyze this link for phishing"
- **Message routing**: Nhận message từ content.js (DEEP_ANALYSIS, CACHE_RESULT) và popup.js (GET_STATS, UPDATE_BACKEND_URL, CLEAR_CACHE)

#### content.js — Scanner trang web

File lớn nhất, điều phối toàn bộ hoạt động trên trang web:

- **Khởi tạo**: Gắn listener cho mọi `<a href>`, `[onclick]`, `[data-href]`, `div[class*="ad"]`...
- **MutationObserver**: Theo dõi DOM để bắt link mới được thêm động (SPA, AJAX)
- **Visual feedback**: Thêm CSS class vào link (xanh/vàng/đỏ/cam) + tooltip floating
- **Click interception**: Chặn điều hướng đến link malicious bằng confirm dialog
- **Ad scanning**: Tự động quét container quảng cáo (#tads, .adsbygoogle...)

#### popup.html + popup.js — Giao diện Extension

Hiển thị khi click icon:
- **Last scan**: URL và verdict gần nhất
- **Risk gauge**: Vòng tròn SVG hiển thị điểm 0-100
- **Signals**: Danh sách lý do phát hiện
- **Statistics**: Tổng scans, threats blocked
- **Settings**: Full Analysis on/off, Auto-Scan Ads, Fast Mode Only

Settings được đồng bộ qua `chrome.storage.sync` và broadcast đến tất cả tab.

### 5.6 Giao diện trực quan (Visual Feedback)

CSS được inject vào mọi trang web. Khi link được phân tích:

| Verdict | Hiển thị | Hành vi |
|---|---|---|
| **Safe** | Viền xanh lá (`#10b981`) | Tự biến mất sau 3 giây |
| **Suspicious** | Viền vàng (`#f59e0b`) | Giữ nguyên |
| **Malicious** | Viền đỏ nhấp nháy (`#ef4444`) + icon cảnh báo | Giữ nguyên + chặn click |
| **Ad** | Viền cam (`#ff6b00`) + icon loa | Giữ nguyên |

Tooltip dark theme xuất hiện phía trên link khi hover, hiển thị: icon verdict, risk score, lý do phát hiện, và nguồn phân tích (Quick scan / Backend verified).

---

## 6. Tài liệu tham khảo (References)

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

16. Scott M. Lundberg, Su-In Lee. "A Unified Approach to Interpreting Model Predictions." *Advances in Neural Information Processing Systems 30 (NeurIPS)*, 2017. https://papers.nips.cc/paper/7062-a-unified-approach-to-interpreting-model-predictions

17. SHAP Documentation. https://shap.readthedocs.io/

18. Chrome Extensions Manifest V3 Documentation. https://developer.chrome.com/docs/extensions/mv3/

### Nghiên cứu liên quan (Literature Review)

19. Almashhadani et al. (2020), MaldomDetector. https://doi.org/10.1016/j.cose.2020.101787

20. Cucchiarelli et al. (2020), N-grams DGA detection. https://doi.org/10.1016/j.eswa.2020.114551

21. Mac et al. (2017), DGA Botnet Detection Using Supervised Learning. https://doi.org/10.1145/3155133.3155166

22. Li et al. (2019), ML Framework for DGA-Based Malware Detection. https://doi.org/10.1109/access.2019.2891588

23. Suryotrisongko et al. (2022), Robust Botnet DGA Detection with XAI. https://doi.org/10.1109/access.2022.3162588

24. Jeremiah et al. (2025), NIOM-DGA. https://doi.org/10.1016/j.cose.2025.104561

25. Anderson, Woodbridge & Filar (2016), DeepDGA. https://doi.org/10.1145/2996758.2996767

26. Ren et al. (2020), Attention + DNN for DGA detection. https://doi.org/10.1186/s42400-020-00046-6

27. Tuan, Long & Taniar (2021), Detecting and Classifying DGA Botnets. https://doi.org/10.1016/j.cose.2021.102549

28. Curtin et al. (2019), DGA detection with RNN and side information. https://doi.org/10.1145/3339252.3339258

29. El Mahdaouy et al. (2026), DomURLs_BERT. https://doi.org/10.1007/s10922-025-10010-9

30. Yerima, Vinod & Shaalan (2024), Transformer Embedding for DGA. https://doi.org/10.1109/cicn63059.2024.10847389

31. Peck, Nie, Sivaguru et al. (2019), CharBot. https://doi.org/10.1109/access.2019.2927075

32. Gardiner & Nagaraja (2016), Security of ML in Malware C&C Detection. https://doi.org/10.1145/3003816

33. Li et al. (2018), Stacking model for phishing detection. https://doi.org/10.1016/j.future.2018.11.004

34. Shaukat et al. (2023), Hybrid phishing detection. https://doi.org/10.3390/s23198070

35. Uddin et al. (2022), Comparative ML phishing detection using URL. https://doi.org/10.1109/prai55851.2022.9904055

36. Aslam et al. (2024), AntiPhishStack. https://doi.org/10.3390/sym16020248

37. Manyumwa et al. (2020), Malicious URL multiclass classification. https://doi.org/10.1109/bigdata50022.2020.9378029

38. Bitaab et al. (2023), Beyond Phish. https://doi.org/10.1109/sp46215.2023.10179461

39. Pavan et al. (2023), Chrome Extension for Phishing Detection. https://doi.org/10.2139/ssrn.4398136

40. Jishnu & Arthi (2024), Real-time phishing detection with ELECTRA. https://doi.org/10.1080/00051144.2024.2415797

41. Bhadane & Mane (2018), Lateral spear phishing detection. https://doi.org/10.1049/iet-ifs.2018.5090

42. Prasad & Chandra (2024), PhiUSIIL. https://doi.org/10.1016/j.cose.2023.103545

43. Gałka et al. (2024), Self-tuning ensemble framework. https://doi.org/10.1016/j.procs.2024.09.241

44. Etem & Teke (2024), t-SNE + ML phishing detection. https://doi.org/10.26650/acin.1521835

45. Aritonang et al. (2026), NLP + SVM phishing detection. https://doi.org/10.52436/1.jutif.2026.7.1.5334

46. John-Otumu et al. (2025), HyRANN-UPD. https://doi.org/10.5120/ijca2025924689

47. Yadav & Jhajharia (2025), CatBoost phishing detection. https://doi.org/10.1109/iccca66364.2025.11325141

## 7. Tổng quan nghiên cứu liên quan (Literature Review)

### 7.1 Giới thiệu

Chương này khảo sát tình hình nghiên cứu hiện tại về phát hiện DGA (Domain Generation Algorithm) và phishing URL, bao gồm các công trình học thuật, sản phẩm công nghiệp và kiến trúc triển khai thực tế. Mục tiêu là so sánh phương pháp của dự án với các nghiên cứu và hệ thống đang được sử dụng trên thế giới.

Dự án của chúng em sử dụng:
- **Phát hiện phishing**: XGBoost với 25 đặc trưng URL-only → accuracy 99.98%
- **Phát hiện DGA**: XGBoost với 71 đặc trưng (64 mã hóa vị trí ký tự + 7 thống kê) → accuracy 97.45%
- **Triển khai**: FastAPI backend + Chrome Extension với heuristics phía client

### 7.2 Các phương pháp phát hiện DGA

#### 7.2.1 Phương pháp Machine Learning truyền thống

**MaldomDetector** (Almashhadani et al., 2020) đề xuất hệ thống phát hiện tên miền DGA chỉ sử dụng các ký tự của tên miền với các đặc trưng dễ tính toán, không phụ thuộc ngôn ngữ. Họ sử dụng Random Forest, SVM và đạt kết quả tốt trên nhiều họ DGA. Tập đặc trưng bao gồm tần suất ký tự, entropy và thống kê n-gram — tương tự cách tiếp cận của dự án chúng em.

**Cucchiarelli et al. (2020)** đề xuất đặc trưng dựa trên n-gram cho phát hiện DGA, sử dụng tần suất bigram và trigram ký tự làm đầu vào cho các bộ phân loại ML truyền thống. Kết quả cho thấy n-gram nắm bắt hiệu quả các bất thường thống kê trong tên miền DGA.

**Mac et al. (2017)** đánh giá các phương pháp học có giám sát (SVM, Random Forest, Logistic Regression) cho phát hiện botnet DGA, so sánh các cách trích xuất đặc trưng bao gồm độ dài tên miền, entropy và phân bố ký tự.

**Li et al. (2019)** đề xuất framework ML cho phát hiện malware dựa trên DGA, kết hợp clustering với đặc trưng HMM và các bộ phân loại truyền thống, xử lý cả phân loại nhị phân lẫn đa họ DGA.

**Phát hiện DGA Botnet bền vững** (Suryotrisongko et al., 2022) kết hợp AI giải thích được (XAI) với OSINT để chia sẻ thông tin tình báo mối đe dọa. Đáng chú ý, **mô hình Random Forest cho khả năng chống chịu tốt hơn trước các tấn công DGA đối kháng** (CharBot, DeepDGA, MaskDGA) so với các mô hình deep learning dựa trên ký tự.

**NIOM-DGA** (Jeremiah et al., 2025) sử dụng thuật toán tối ưu hóa lấy cảm hứng từ tự nhiên để tinh chỉnh mô hình ML cho phát hiện DGA. Công trình nằm trong top 10% theo chỉ số trích dẫn, đại diện cho xu hướng kết hợp tối ưu hóa meta-heuristic với ML truyền thống.

#### 7.2.2 Phương pháp Deep Learning

**DeepDGA** (Anderson, Woodbridge & Filar, 2016) là một trong những công trình tiên phong sử dụng deep learning cho phát hiện DGA. Họ huấn luyện mạng LSTM trên chuỗi ký tự tên miền thô, **không cần trích xuất đặc trưng thủ công**. Kết quả: **AUC 0.9993** cho phân loại nhị phân (DGA vs. hợp pháp) và **F1 micro-averaged 0.9906** cho phân loại đa họ. Đạt tỷ lệ phát hiện 90% với tỷ lệ dương tính giả 1:10,000 — cải thiện 20 lần so với các phương pháp tương đương thời điểm đó.

**Ren et al. (2020)** đề xuất phương pháp phát hiện DGA tích hợp cơ chế attention với mạng neural sâu, cho phép mô hình tập trung vào các vị trí ký tự phân biệt nhất trong chuỗi tên miền.

**Tuan, Long & Taniar (2021)** giải quyết cả phát hiện và phân loại botnet DGA theo họ, đạt 56 trích dẫn và nằm trong top 3% bài báo theo chỉ số trích dẫn chuẩn hóa.

**Curtin et al. (2019)** đề xuất phát hiện DGA bằng mạng neural hồi quy kết hợp thông tin phụ trợ (đặc trưng DNS ngữ cảnh ngoài chuỗi tên miền), chứng minh rằng ngữ cảnh hành vi cải thiện khả năng phát hiện, đặc biệt với DGA dạng từ điển.

#### 7.2.3 Phương pháp Transformer và Mô hình ngôn ngữ

**DomURLs_BERT** (El Mahdaouy et al., 2026) đề xuất bộ mã hóa BERT được tiền huấn luyện bằng Masked Language Modeling trên tập dữ liệu đa ngôn ngữ gồm URL, tên miền và DGA. Mô hình được fine-tune cho phân loại nhị phân và đa lớp bao gồm phishing, malware, DGA và DNS tunneling. Kết quả **vượt trội so với các mô hình deep learning dựa trên ký tự và các mô hình BERT chuyên biệt cho an ninh mạng**.

**Yerima, Vinod & Shaalan (2024)** đề xuất mô hình phát hiện DGA dựa trên embedding transformer, sử dụng GPT embedding và so sánh với TF-IDF, Bag-of-Words, n-gram, word2vec và hai biến thể BERT. Với XGBoost làm bộ phân loại downstream, đạt **accuracy 93.1%**.

#### 7.2.4 Nghiên cứu đối kháng và lẩn tránh

**CharBot** (Peck, Nie, Sivaguru et al., 2019) chứng minh phương pháp đơn giản nhưng hiệu quả để lẩn tránh các bộ phân loại DGA bằng cách tạo tên miền qua mặt các hệ thống phát hiện tiên tiến nhất. Đây là nghiên cứu quan trọng để hiểu độ bền vững của các bộ phát hiện DGA, bao gồm cả hệ thống của chúng em.

**Gardiner & Nagaraja (2016)** phân tích bảo mật của phát hiện C&C malware dựa trên ML, đánh giá khả năng chống chịu trước các kỹ thuật lẩn tránh và tấn công vào thành phần ML.

### 7.3 Các phương pháp phát hiện Phishing URL

#### 7.3.1 Phương pháp ML dựa trên cây quyết định

**Li et al. (2018)** đề xuất mô hình stacking sử dụng cả đặc trưng URL và HTML cho phát hiện trang web phishing. Phương pháp ensemble stacking kết hợp nhiều bộ phân loại cơ sở, cho thấy ensemble vượt trội đáng kể so với các bộ phân loại đơn lẻ.

**Shaukat et al. (2023)** phát triển phương pháp hybrid cho phát hiện tấn công phishing qua quảng cáo dụ dỗ, kết hợp nhiều loại đặc trưng và ensemble các bộ phân loại.

**Uddin et al. (2022)** thực hiện phân tích so sánh các phương pháp ML cho phát hiện phishing chỉ sử dụng thông tin URL (không cần nội dung trang), đánh giá Random Forest, Decision Tree, SVM và các bộ phân loại khác. Đây là nghiên cứu trực tiếp so sánh được với cách tiếp cận URL-only của chúng em.

#### 7.3.2 Phương pháp Deep Learning và NLP

**AntiPhishStack** (Aslam et al., 2024) đề xuất mô hình stacked generalization dựa trên LSTM để tối ưu hóa phát hiện phishing URL, kết hợp khả năng nhận dạng mẫu tuần tự của LSTM với ensemble stacking.

**Manyumwa et al. (2020)** giải quyết bài toán phát hiện loại tấn công URL độc hại bằng phân loại đa lớp, phân biệt giữa phishing, malware, defacement và spam URL — vượt ra ngoài phân loại nhị phân đơn thuần.

**Beyond Phish** (Bitaab et al., 2023) — công bố tại IEEE S&P (hội nghị bảo mật hàng đầu) — đánh giá các hệ thống công nghiệp và phát hiện rằng **Google Safe Browsing chỉ phát hiện được 0.46%** các trang web thương mại điện tử gian lận. Điều này cho thấy khoảng cách giữa các hệ thống production hiện tại và bối cảnh mối đe dọa đang phát triển.

#### 7.3.3 Phát hiện phishing qua tiện ích trình duyệt

**Chrome Extension for Detecting Phishing Websites** (Pavan et al., 2023) tập trung trực tiếp vào xây dựng tiện ích Chrome cho phát hiện phishing, tương tự cách triển khai của dự án chúng em.

**Phát hiện phishing URL thời gian thực bằng ELECTRA** (Jishnu & Arthi, 2024) tích hợp mô hình deep learning với tiện ích Chrome hướng người dùng cho phát hiện phishing URL thời gian thực, sử dụng knowledge distillation để giảm kích thước mô hình cho triển khai phía client.

**Bhadane & Mane (2018)** phát triển tiện ích Chrome phát hiện tấn công spear phishing trong tổ chức, kết hợp phân tích URL với ngữ cảnh tổ chức.

### 7.4 Các nghiên cứu sử dụng bộ dữ liệu của dự án

#### 7.4.1 Bộ dữ liệu PhiUSIIL Phishing URL

Bộ dữ liệu PhiUSIIL (UCI ML Repository #967) được giới thiệu bởi Prasad & Chandra (2024) và đã được trích dẫn bởi nhiều nghiên cứu tiếp theo:

**Bài báo gốc — PhiUSIIL** (Prasad & Chandra, 2024): Đề xuất framework phát hiện phishing URL dựa trên chỉ số tương đồng và học gia tăng. Bộ dữ liệu chứa 235,795 mẫu với 56 đặc trưng. Bài báo giới thiệu đặc trưng **URLSimilarityIndex** — mà dự án của chúng em phát hiện là đặc trưng quan trọng nhất với 72% SHAP importance. Bài báo gốc sử dụng các bộ phân loại học gia tăng (SGD, Passive-Aggressive, BernoulliNB) đạt accuracy 93-96% với đặc trưng URL-only.

**Các bài báo trích dẫn/sử dụng PhiUSIIL:**

1. **Framework tự điều chỉnh với hàm tổng hợp trong ensemble** (Gałka et al., 2024) — Sử dụng PhiUSIIL để đánh giá framework giảm false positive bằng hàm tổng hợp trong bộ phân loại ensemble.

2. **DomURLs_BERT** (El Mahdaouy et al., 2026) — Sử dụng PhiUSIIL cùng các bộ dữ liệu khác để đánh giá mô hình BERT tiền huấn luyện cho phát hiện domain và URL độc hại.

3. **Phát hiện phishing nâng cao bằng t-SNE và ML** (Etem & Teke, 2024) — Sử dụng trích xuất đặc trưng t-SNE kết hợp ML trên bộ dữ liệu PhiUSIIL.

4. **NLP và SVM cho phát hiện phishing URL** (Aritonang et al., 2026) — Áp dụng kỹ thuật NLP với tối ưu hóa SVM trên PhiUSIIL.

5. **HyRANN-UPD** (John-Otumu et al., 2025) — Tăng cường phát hiện phishing URL bằng chọn đặc trưng Ridge Regression và Mạng neural nhân tạo trên PhiUSIIL.

6. **Phát hiện phishing URL bằng CatBoost** (Yadav & Jhajharia, 2025) — Áp dụng CatBoost gradient boosting trên PhiUSIIL — so sánh trực tiếp nhất với phương pháp XGBoost của chúng em.

#### 7.4.2 Bộ dữ liệu ExtraHop DGA Detection

Bộ dữ liệu ExtraHop chứa 16,246,014 mẫu tên miền (~50/50 DGA vs. hợp pháp), được phát hành như bộ dữ liệu mở cho nghiên cứu phát hiện DGA.
- Repository: https://github.com/ExtraHop/dga-detection-training-dataset

Bộ dữ liệu này tương đối mới và ít được trích dẫn hơn trong tài liệu học thuật so với các bộ dữ liệu dựa trên DGArchive. Phần lớn các bài báo phát hiện DGA sử dụng:
- **DGArchive** (Fraunhofer FKIE) — tiêu chuẩn vàng chứa thuật toán DGA dịch ngược của 100+ họ malware: https://dgarchive.caad.fkie.fraunhofer.de/
- **Alexa Top 1M** — cho mẫu tên miền hợp pháp (được DeepDGA và hầu hết các bài báo DGA sử dụng)
- **OSINT feeds** (abuse.ch, BAMBENEK) — cho danh sách tên miền DGA đã biết

Điểm mạnh của bộ dữ liệu ExtraHop là **quy mô** (16M+ mẫu) và **phân bố cân bằng**, phù hợp để huấn luyện bộ phân loại bền vững mà không cần tái chọn mẫu. Tuy nhiên, nó chỉ cung cấp chuỗi tên miền cấp hai (không có TLD, không có subdomain), giới hạn tập đặc trưng ở mức ký tự và thống kê — đúng cách tiếp cận của dự án chúng em.

### 7.5 Hệ thống thực tế

#### 7.5.1 Sản phẩm bảo mật DNS thương mại

**Cisco Umbrella** (https://umbrella.cisco.com/) hoạt động như một DNS resolver đám mây, xử lý hơn 620 tỷ truy vấn DNS mỗi ngày. Hệ thống sử dụng mô hình thống kê và phân tích đồ thị để phân loại tên miền. DGA được phát hiện thông qua phân tích tần suất ký tự, mô hình n-gram và chấm điểm entropy. Các tên miền bị đánh dấu độc hại sẽ được chuyển hướng đến trang chặn (sinkhole). Đội nghiên cứu Cisco Talos duy trì và cập nhật liên tục các mô hình phát hiện.

**CrowdStrike Falcon** (https://www.crowdstrike.com/) sử dụng phương pháp phát hiện tại endpoint. Agent Falcon chạy trực tiếp trên thiết bị người dùng, giám sát các truy vấn DNS do các tiến trình thực hiện. Mô hình ML được huấn luyện trên các đặc trưng như độ dài tên miền, entropy, phân bố ký tự và tần suất n-gram, chạy cục bộ trên endpoint để phát hiện DGA trong thời gian thực. Điểm đặc biệt là khả năng tương quan hoạt động DNS với hành vi tiến trình — nếu một tiến trình mới không có danh tiếng bắt đầu truy vấn các tên miền entropy cao, đó là tín hiệu mạnh cho thấy sự hiện diện của malware.

**Palo Alto Networks DNS Security** (https://docs.paloaltonetworks.com/dns-security) được tích hợp vào tường lửa thế hệ mới (NGFW) và Prisma Access. Các truy vấn DNS đi qua tường lửa được kiểm tra inline. Dịch vụ DNS Security trên đám mây sử dụng mô hình deep learning (đặc biệt là LSTM) để phân loại tên miền DGA trong thời gian thực, với quyết định cho phép hoặc chặn được đưa ra trong thời gian dưới mili-giây. Đội nghiên cứu Unit 42 duy trì mô hình phát hiện DGA được cập nhật liên tục.

**Akamai Secure Internet Access** (https://www.akamai.com/) là cổng bảo mật web (SWG) trên đám mây với bảo vệ tầng DNS. Hệ thống định tuyến truy vấn DNS qua các resolver đệ quy của Akamai, áp dụng tình báo mối đe dọa từ khả năng quan sát một phần lớn lưu lượng web toàn cầu. Phát hiện DGA sử dụng kết hợp danh sách uy tín và chấm điểm ML thời gian thực. Lợi thế độc đáo là khả năng tương quan dữ liệu DNS với dữ liệu tầng HTTP từ CDN, cung cấp tầm nhìn toàn bộ chuỗi từ phân giải DNS đến phân phối nội dung.

**Infoblox Threat Defense** (https://www.infoblox.com/products/bloxone-threat-defense/) sử dụng kiến trúc hybrid — các thiết bị DNS tại chỗ (on-premises) chuyển tiếp metadata truy vấn đáng nghi lên phân tích đám mây. Hệ thống áp dụng mô hình ML trên các mẫu truy vấn (thời gian, khối lượng, tỷ lệ NXDomain), ngôn ngữ học tên miền (entropy, điểm số phát âm được), và quan hệ đồ thị DNS. Đáng chú ý, Infoblox tập trung đặc biệt vào phát hiện DGA dạng từ điển — một thách thức mà nhiều hệ thống khác gặp khó khăn.

**Quad9** (https://www.quad9.net/) là DNS resolver công cộng miễn phí (9.9.9.9), chặn các tên miền độc hại đã biết. Hệ thống tổng hợp tình báo mối đe dọa từ hơn 25 nhà cung cấp (bao gồm abuse.ch, F-Secure...). Khi truy vấn DNS khớp với tên miền độc hại đã biết, resolver trả về NXDOMAIN. Phương pháp đơn giản hơn các sản phẩm thương mại — chủ yếu dựa trên blocklist thay vì phân loại ML thời gian thực, nhưng việc tổng hợp nhiều nguồn tình báo cung cấp phạm vi bao phủ rộng, với hơn 670 triệu lượt chặn mỗi ngày trên 230+ cụm resolver.

**Cloudflare Gateway** (https://www.cloudflare.com/zero-trust/products/gateway/) là một phần của nền tảng Zero Trust của Cloudflare. Tổ chức cấu hình DNS sử dụng các resolver của Cloudflare, áp dụng lọc dựa trên chính sách. Phát hiện DGA sử dụng phân loại domain dựa trên ML, có khả năng chặn DGA, phishing, C2 và DNS tunneling. Hệ thống tích hợp với WARP client để cung cấp khả năng quan sát DNS ở cấp endpoint.

**Phát hiện phishing trong công nghiệp:**
- **Google Safe Browsing**: Duy trì danh sách cập nhật liên tục các tài nguyên web không an toàn. Tuy nhiên, Bitaab et al. (2023) phát hiện nó chỉ phát hiện **0.46% trang web thương mại điện tử gian lận** — cho thấy hạn chế của phương pháp dựa trên blocklist.
- **Microsoft SmartScreen**: Tích hợp trong Edge/Windows. Kết hợp uy tín URL, phân tích nội dung trang và báo cáo người dùng.

#### 7.5.2 Công cụ mã nguồn mở

**Giám sát mạng:**
- **Zeek** (trước đây là Bro) — Framework phân tích mạng phân tích DNS traffic thụ động. Các package cộng đồng thêm phát hiện DGA qua chấm điểm entropy và theo dõi tỷ lệ NXDomain. https://github.com/zeek/zeek
- **Suricata** — IDS/IPS với kiểm tra DNS. Luật Emerging Threats khớp các mẫu DGA đã biết. Lua scripting cho phép tính entropy tùy chỉnh. https://suricata.io/
- **passivedns** — Thu thập cặp truy vấn/phản hồi DNS từ traffic mạng cho phân tích lịch sử. Quan trọng cho điều tra DGA hồi cứu. https://github.com/gamelinux/passivedns

**Bộ phát hiện DGA dựa trên ML:**
- **dga_predict** (Endgame/Elastic) — Bộ phân loại LSTM cấp ký tự. Một trong những bộ phát hiện DGA mã nguồn mở đầu tiên nổi tiếng. https://github.com/endgameinc/dga_predict
- **DGArchive** (Fraunhofer FKIE) — Cơ sở dữ liệu thuật toán DGA dịch ngược của 100+ họ malware. Tiêu chuẩn vàng cho huấn luyện và đánh giá. https://dgarchive.caad.fkie.fraunhofer.de/
- **CIRCL Passive DNS** — Cơ sở dữ liệu bản ghi DNS lịch sử cho ứng cứu sự cố và nghiên cứu. https://www.circl.lu/services/passive-dns/

#### 7.5.3 Kiến trúc triển khai production

**Phát hiện thời gian thực (inline):**

```
Truy vấn DNS → Microservice chấm điểm (gRPC) → Quyết định cho phép/chặn
                        ↓
             Mô hình ML nhẹ (logistic regression, CNN/LSTM nhỏ)
             + Cache blocklist tính trước
             Yêu cầu: độ trễ dưới mili-giây
```

Được sử dụng bởi: Cisco Umbrella, Palo Alto NGFW, Cloudflare Gateway.

**Phân tích batch (offline):**

```
DNS Logs → Data Lake (S3/HDFS) → Spark/Flink Job → Chấm điểm ML → Cảnh báo
                                        ↓
                              Mô hình nặng hơn (transformer, ensemble)
                              Phát hiện beaconing chậm, DGA từ điển
```

Được sử dụng bởi: Đội SOC hunting, điều tra hồi cứu.

**Hybrid (phổ biến nhất trong production):** Hầu hết các triển khai sử dụng cả hai. Tầng thời gian thực bắt các domain đã biết xấu và DGA rõ ràng (chuỗi ngẫu nhiên entropy cao). Tầng batch bắt các mẫu tinh vi (DGA từ điển, beaconing chậm, họ mới). Vòng phản hồi: báo cáo false positive từ analyst SOC được đưa vào huấn luyện lại mô hình.

**DNS Sinkholing:** DNS resolver trả về IP "sinkhole" cho domain độc hại. Vừa chặn giao tiếp C2 vừa xác định host bị nhiễm (host nào kết nối đến IP sinkhole là có khả năng bị xâm nhập). Đã được sử dụng trong các chiến dịch takedown phối hợp (ví dụ: Microsoft + FBI sinkhole domain C2 của botnet Necurs năm 2020).

**Thách thức lớn — DNS mã hóa:** DNS-over-HTTPS (DoH) và DNS-over-TLS (DoT) vô hiệu hóa hoàn toàn giám sát DNS thụ động ở tầng mạng. Điều này đẩy phát hiện từ tầng mạng sang tầng endpoint. Cách tiếp cận Chrome Extension của chúng em tránh được vấn đề này bằng cách hoạt động ở tầng ứng dụng.


