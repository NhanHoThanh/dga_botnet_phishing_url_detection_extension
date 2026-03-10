# Kien thuc lien quan — Giai thich chi tiet voi vi du so

## 1. Cay quyet dinh (Decision Tree) — Vi du cu the

### Bai toan

Gia su chung ta co 6 URL va muon phan loai chung la **Phishing (0)** hay **Hop phap (1)**:

| # | URLLength | IsHTTPS | NoOfDegits | Label |
|---|---|---|---|---|
| 1 | 25 | 1 | 0 | 1 (Hop phap) |
| 2 | 22 | 1 | 0 | 1 (Hop phap) |
| 3 | 80 | 0 | 5 | 0 (Phishing) |
| 4 | 95 | 0 | 8 | 0 (Phishing) |
| 5 | 30 | 1 | 2 | 1 (Hop phap) |
| 6 | 60 | 0 | 3 | 0 (Phishing) |

### Buoc 1: Tinh Gini Impurity cua toan bo tap du lieu

Tap du lieu co 3 Phishing (0) va 3 Hop phap (1):

$$Gini_{root} = 1 - p_0^2 - p_1^2 = 1 - (3/6)^2 - (3/6)^2 = 1 - 0.25 - 0.25 = 0.5$$

Gini = 0.5 la muc lon xon toi da (50/50), mo hinh chua biet gi.

### Buoc 2: Thu chia theo tung dac trung

**Thu chia theo IsHTTPS:**

- Nhanh IsHTTPS = 0: {#3, #4, #6} → 3 Phishing, 0 Hop phap → Gini = 1 - (3/3)² - (0/3)² = **0.0** (hoan hao!)
- Nhanh IsHTTPS = 1: {#1, #2, #5} → 0 Phishing, 3 Hop phap → Gini = 1 - (0/3)² - (3/3)² = **0.0** (hoan hao!)

Gini trung binh co trong so:

$$Gini_{split} = \frac{3}{6} \times 0.0 + \frac{3}{6} \times 0.0 = 0.0$$

**Thu chia theo URLLength <= 50:**

- Nhanh URLLength <= 50: {#1, #2, #5} → 0 Phishing, 3 Hop phap → Gini = 0.0
- Nhanh URLLength > 50: {#3, #4, #6} → 3 Phishing, 0 Hop phap → Gini = 0.0

$$Gini_{split} = \frac{3}{6} \times 0.0 + \frac{3}{6} \times 0.0 = 0.0$$

Ca hai dac trung deu cho ket qua hoan hao. Mo hinh se chon dac trung dau tien tim duoc (hoac theo thu tu). Gia su chon **IsHTTPS**:

```
          IsHTTPS = 1?
          /          \
        Yes           No
        /               \
  {#1,#2,#5}         {#3,#4,#6}
  3/3 Hop phap       3/3 Phishing
  --> Label = 1       --> Label = 0
```

Cay chi can **1 lan chia** la phan loai dung 100%. Trong thuc te voi du lieu phuc tap, cay se sau hon nhieu.

### Buoc 3: Du doan mau moi

Mot URL moi: URLLength=45, IsHTTPS=0, NoOfDegits=4

- Di tu goc: IsHTTPS = 1? → **Khong** → di sang nhanh phai
- Den la: **Label = 0 (Phishing)**

**Van de cua cay don le**: Voi du lieu thuc (235,795 mau, 25 dac trung), mot cay don de bi overfit — no "hoc thuoc" du lieu huan luyen nhung du doan kem tren du lieu moi. Day la ly do chung ta can Gradient Boosting.

## 2. Gradient Boosting — 1 vong lap hoan chinh voi so cu the

### Du lieu

Dung lai 6 URL o tren, nhung lan nay chung ta di qua **tung buoc cua Gradient Boosting**.

| # | URLLength | IsHTTPS | Label ($y$) |
|---|---|---|---|
| 1 | 25 | 1 | 1 |
| 2 | 22 | 1 | 1 |
| 3 | 80 | 0 | 0 |
| 4 | 95 | 0 | 0 |
| 5 | 30 | 1 | 1 |
| 6 | 60 | 0 | 0 |

### Buoc 0: Khoi tao du doan ban dau

Voi phan loai nhi phan, du doan ban dau $F_0$ la **log-odds** cua lop duong:

$$F_0 = \log\frac{\text{so mau lop 1}}{\text{so mau lop 0}} = \log\frac{3}{3} = \log(1) = 0$$

Chuyen sang xac suat bang ham sigmoid:

$$p_0 = \frac{1}{1 + e^{-F_0}} = \frac{1}{1 + e^{0}} = \frac{1}{2} = 0.5$$

Vay ban dau, mo hinh du doan **tat ca 6 URL deu co xac suat 0.5** (50% phishing, 50% hop phap). Chua biet gi ca — hop ly!

### Buoc 1 (Vong 1): Tinh phan du (Residuals)

Phan du = Gia tri thuc - Xac suat du doan hien tai:

$$r_i = y_i - p_i$$

| # | $y_i$ (thuc) | $p_i$ (du doan) | $r_i$ (phan du) |
|---|---|---|---|
| 1 | 1 | 0.5 | **+0.5** |
| 2 | 1 | 0.5 | **+0.5** |
| 3 | 0 | 0.5 | **-0.5** |
| 4 | 0 | 0.5 | **-0.5** |
| 5 | 1 | 0.5 | **+0.5** |
| 6 | 0 | 0.5 | **-0.5** |

- Phan du **duong** (+0.5): Mo hinh dang du doan thap hon thuc te → can **tang** xac suat
- Phan du **am** (-0.5): Mo hinh dang du doan cao hon thuc te → can **giam** xac suat

### Buoc 2 (Vong 1): Huan luyen cay de du doan phan du

Bay gio chung ta xay dung mot cay quyet dinh NHO (vi du: do sau = 1, chi 1 lan chia) de **du doan phan du**, khong phai du doan label goc.

| # | URLLength | IsHTTPS | Phan du $r_i$ |
|---|---|---|---|
| 1 | 25 | 1 | +0.5 |
| 2 | 22 | 1 | +0.5 |
| 3 | 80 | 0 | -0.5 |
| 4 | 95 | 0 | -0.5 |
| 5 | 30 | 1 | +0.5 |
| 6 | 60 | 0 | -0.5 |

Cay tim ra: Chia theo **IsHTTPS** la tot nhat:
- IsHTTPS = 1 → du doan phan du = **+0.5** (trung binh cua +0.5, +0.5, +0.5)
- IsHTTPS = 0 → du doan phan du = **-0.5** (trung binh cua -0.5, -0.5, -0.5)

(Ghi chu: Trong thuc te, gia tri la (leaf value) duoc tinh phuc tap hon, nhung y tuong la nhu vay)

Goi du doan cua cay nay la $h_1(x)$:

| # | $h_1(x)$ |
|---|---|
| 1 | +0.5 |
| 2 | +0.5 |
| 3 | -0.5 |
| 4 | -0.5 |
| 5 | +0.5 |
| 6 | -0.5 |

### Buoc 3 (Vong 1): Cap nhat mo hinh

$$F_1(x) = F_0(x) + \eta \cdot h_1(x)$$

Voi learning rate $\eta = 0.3$ (chung ta dung gia tri nho de mo hinh hoc tu tu):

| # | $F_0$ | $\eta \cdot h_1$ | $F_1$ | $p_1 = sigmoid(F_1)$ |
|---|---|---|---|---|
| 1 | 0 | 0.3 × 0.5 = 0.15 | 0.15 | 0.537 |
| 2 | 0 | 0.3 × 0.5 = 0.15 | 0.15 | 0.537 |
| 3 | 0 | 0.3 × (-0.5) = -0.15 | -0.15 | 0.463 |
| 4 | 0 | 0.3 × (-0.5) = -0.15 | -0.15 | 0.463 |
| 5 | 0 | 0.3 × 0.5 = 0.15 | 0.15 | 0.537 |
| 6 | 0 | 0.3 × (-0.5) = -0.15 | -0.15 | 0.463 |

Trong do: $sigmoid(x) = \frac{1}{1+e^{-x}}$. Vi du: $sigmoid(0.15) = \frac{1}{1+e^{-0.15}} = 0.537$

**Sau vong 1**: Mau hop phap (#1,2,5) co xac suat tang tu 0.5 len **0.537**. Mau phishing (#3,4,6) co xac suat giam tu 0.5 xuong **0.463**. Mo hinh da bat dau hoc dung huong!

### Buoc 4: Lap lai (Vong 2)

Tinh phan du moi:

| # | $y_i$ | $p_1$ | $r_i = y_i - p_1$ |
|---|---|---|---|
| 1 | 1 | 0.537 | **+0.463** |
| 2 | 1 | 0.537 | **+0.463** |
| 3 | 0 | 0.463 | **-0.463** |
| 4 | 0 | 0.463 | **-0.463** |
| 5 | 1 | 0.537 | **+0.463** |
| 6 | 0 | 0.463 | **-0.463** |

Phan du da **giam** tu ±0.5 xuong ±0.463! Mo hinh dang tien bo.

Huan luyen cay thu 2 de du doan phan du moi → cap nhat → phan du giam tiep. Sau 500 vong, xac suat hop phap se rat gan 1.0 va phishing rat gan 0.0.

### Tom tat Gradient Boosting

```
Vong 0:  Tat ca du doan = 0.5 (khong biet gi)
Vong 1:  Hop phap: 0.5 → 0.537 (+0.037)    Phishing: 0.5 → 0.463 (-0.037)
Vong 2:  Hop phap: 0.537 → 0.571 (+0.034)   Phishing: 0.463 → 0.429 (-0.034)
Vong 3:  Hop phap: 0.571 → 0.602 (+0.031)   Phishing: 0.429 → 0.398 (-0.031)
...
Vong 50: Hop phap: ~0.98                     Phishing: ~0.02
...
Vong 200: Hop phap: ~0.999                   Phishing: ~0.001
```

Moi vong, moi cay sua mot it sai so. Qua nhieu vong, du doan hoi tu ve gia tri dung.

## 3. XGBoost — Mot vong lap hoan chinh, so sanh truc tiep voi Gradient Boosting

Chung ta se dung **cung du lieu, cung trang thai** nhu Gradient Boosting o tren, va di qua **Vong 1 cua XGBoost** de thay su khac biet cu the.

### Diem xuat phat (giong nhau)

Giong Gradient Boosting, XGBoost bat dau voi $F_0 = 0$, $p_0 = 0.5$ cho tat ca 6 mau.

| # | $y_i$ | $p_0$ |
|---|---|---|
| 1 | 1 | 0.5 |
| 2 | 1 | 0.5 |
| 3 | 0 | 0.5 |
| 4 | 0 | 0.5 |
| 5 | 1 | 0.5 |
| 6 | 0 | 0.5 |

### Buoc 1: Tinh Gradient VA Hessian (khac biet dau tien)

**Gradient Boosting** chi tinh gradient (dao ham bac 1):

$$g_i = p_i - y_i$$

**XGBoost** tinh them hessian (dao ham bac 2):

$$h_i = p_i \times (1 - p_i)$$

| # | $y_i$ | $p_0$ | $g_i = p_0 - y_i$ | $h_i = p_0(1-p_0)$ |
|---|---|---|---|---|
| 1 | 1 | 0.5 | -0.5 | 0.25 |
| 2 | 1 | 0.5 | -0.5 | 0.25 |
| 3 | 0 | 0.5 | +0.5 | 0.25 |
| 4 | 0 | 0.5 | +0.5 | 0.25 |
| 5 | 1 | 0.5 | -0.5 | 0.25 |
| 6 | 0 | 0.5 | +0.5 | 0.25 |

(Luu y: gradient $g_i$ co dau nguoc voi residual $r_i$ o GB. $g_i = -(r_i)$. Residual = $y - p$, gradient = $p - y$.)

### Buoc 2: Xay dung cay — Chon diem chia bang Gain (khac biet thu hai)

**Gradient Boosting** chon split bang cach toi thieu squared error tren residual.

**XGBoost** chon split bang cong thuc **Gain** co tinh den ca gradient, hessian, VA regularization:

$$Gain = \frac{1}{2}\left[\frac{G_L^2}{H_L + \lambda} + \frac{G_R^2}{H_R + \lambda} - \frac{(G_L + G_R)^2}{H_L + H_R + \lambda}\right] - \gamma$$

Dat $\lambda = 1.0$ (regularization tren trong so la), $\gamma = 0.1$ (chi phi chia nhanh).

**Thu split: IsHTTPS = 1?**

Nhanh trai (IsHTTPS=1): mau #1,2,5
$$G_L = (-0.5) + (-0.5) + (-0.5) = -1.5$$
$$H_L = 0.25 + 0.25 + 0.25 = 0.75$$

Nhanh phai (IsHTTPS=0): mau #3,4,6
$$G_R = 0.5 + 0.5 + 0.5 = +1.5$$
$$H_R = 0.25 + 0.25 + 0.25 = 0.75$$

Tong:
$$G_L + G_R = -1.5 + 1.5 = 0$$
$$H_L + H_R = 0.75 + 0.75 = 1.5$$

$$Gain = \frac{1}{2}\left[\frac{(-1.5)^2}{0.75 + 1} + \frac{1.5^2}{0.75 + 1} - \frac{0^2}{1.5 + 1}\right] - 0.1$$

$$= \frac{1}{2}\left[\frac{2.25}{1.75} + \frac{2.25}{1.75} - 0\right] - 0.1$$

$$= \frac{1}{2}[1.286 + 1.286] - 0.1 = 1.286 - 0.1 = \mathbf{1.186}$$

Gain = 1.186 > 0 → **Chia!**

**Thu split: URLLength <= 27.5?**

Nhanh trai (<=27.5): mau #1(25), #2(22)
$$G_L = (-0.5) + (-0.5) = -1.0, \quad H_L = 0.5$$

Nhanh phai (>27.5): mau #3(80), #4(95), #5(30), #6(60)
$$G_R = 0.5 + 0.5 + (-0.5) + 0.5 = +1.0, \quad H_R = 1.0$$

$$Gain = \frac{1}{2}\left[\frac{1.0}{0.5+1} + \frac{1.0}{1.0+1} - \frac{0}{1.5+1}\right] - 0.1 = \frac{1}{2}[0.667 + 0.5] - 0.1 = 0.483$$

Gain = 0.483, thap hon 1.186.

**Ket qua**: IsHTTPS cho Gain cao nhat (1.186) → chon lam diem chia. (Giong ket qua cua GB, nhung cach tinh khac.)

### Buoc 3: Tinh gia tri la (khac biet thu ba — quan trong nhat!)

Day la buoc khac biet lon nhat giua GB va XGBoost.

**Gradient Boosting**: gia tri la = trung binh residual

$$w_{GB} = \frac{\sum r_i}{n} = \frac{0.5 + 0.5 + 0.5}{3} = +0.5 \quad \text{(la trai, 3 mau hop phap)}$$

**XGBoost**: gia tri la co tinh hessian va regularization

$$w_{XGB} = -\frac{\sum g_i}{\sum h_i + \lambda} = -\frac{-1.5}{0.75 + 1.0} = -\frac{-1.5}{1.75} = +0.857$$

| La | Gradient Boosting | XGBoost | Chenh lech |
|---|---|---|---|
| Trai (hop phap) | +0.500 | +0.857 | XGB buoc lon hon |
| Phai (phishing) | -0.500 | -0.857 | XGB buoc lon hon |

**Tai sao XGBoost buoc lon hon?** Vi no su dung hessian de biet do cong cua ham loss. Tai $p = 0.5$, hessian = 0.25, nghia la ham loss tuong doi "phang" → co the buoc lon hon mot cach an toan. Gradient Boosting khong biet dieu nay nen buoc than trong hon.

**Nhung $\lambda$ kiem soat do lon**: Neu $\lambda = 10$ thay vi 1:

$$w = -\frac{-1.5}{0.75 + 10} = +0.140$$

$\lambda$ lon → gia tri la nho → mo hinh than trong hon → chong overfit. Day la regularization trong thuc te.

### Buoc 4: Cap nhat du doan

Voi learning rate $\eta = 0.3$ (giong GB):

**Gradient Boosting:**
$$F_1 = F_0 + \eta \times w_{GB} = 0 + 0.3 \times 0.5 = 0.15 \quad \Rightarrow \quad p_1 = sigmoid(0.15) = 0.537$$

**XGBoost:**
$$F_1 = F_0 + \eta \times w_{XGB} = 0 + 0.3 \times 0.857 = 0.257 \quad \Rightarrow \quad p_1 = sigmoid(0.257) = 0.564$$

### So sanh sau Vong 1

| # | Label | GB: $p_1$ | XGB: $p_1$ |
|---|---|---|---|
| 1 (Hop phap) | 1 | 0.537 | **0.564** |
| 2 (Hop phap) | 1 | 0.537 | **0.564** |
| 3 (Phishing) | 0 | 0.463 | **0.436** |
| 4 (Phishing) | 0 | 0.463 | **0.436** |
| 5 (Hop phap) | 1 | 0.537 | **0.564** |
| 6 (Phishing) | 0 | 0.463 | **0.436** |

**XGBoost tien bo nhanh hon trong cung 1 vong!**
- Hop phap: GB di tu 0.5 → 0.537 (+0.037). XGB di tu 0.5 → 0.564 (+0.064)
- Phishing: GB di tu 0.5 → 0.463 (-0.037). XGB di tu 0.5 → 0.436 (-0.064)

Qua nhieu vong, XGBoost hoi tu nhanh hon → can it cay hon → nhanh hon.

### Tom tat qua trinh 1 vong, GB vs XGBoost

```
                    GRADIENT BOOSTING                    XGBOOST
                    =================                    =======

Buoc 1: Tinh sai   residual = y - p                     gradient g = p - y
         so         (chi bac 1)                          hessian h = p(1-p)
                                                         (bac 1 VA bac 2)

Buoc 2: Chon       Toi thieu squared error               Toi da Gain (co gamma, lambda)
         split      cua residual                          Gain < 0 → khong chia!

Buoc 3: Gia tri    w = mean(residual)                    w = -sum(g) / (sum(h) + lambda)
         la         = +0.500                              = +0.857 (voi lambda=1)

Buoc 4: Cap nhat   F1 = F0 + 0.3 × 0.500 = 0.15        F1 = F0 + 0.3 × 0.857 = 0.257
                    p1 = 0.537                            p1 = 0.564
                    (tien 0.037)                          (tien 0.064 — nhanh hon 73%!)
```

---

Phan duoi day giai thich chi tiet tung cai tien cua XGBoost:

### Cai tien 1: Regularization (Chong overfit)

#### Van de

Trong Gradient Boosting thuong, cay co the tao ra cac gia tri la (leaf value) rat lon de fit chinh xac du lieu huan luyen. Vi du:

```
Cay khong co regularization:
  IsHTTPS = 1? → La: w = +12.5 (qua lon!)
  IsHTTPS = 0? → La: w = -12.5 (qua lon!)
```

Gia tri lon nhu vay khien mo hinh "tu tin qua muc" va kem tren du lieu moi.

#### Giai phap cua XGBoost

XGBoost them **phan phat** (penalty) vao ham muc tieu:

$$Obj = \underbrace{\sum_{i=1}^{n} L(y_i, \hat{y}_i)}_{\text{Loss (sai so)}} + \underbrace{\gamma T + \frac{1}{2}\lambda \sum_{j=1}^{T} w_j^2}_{\text{Penalty (phan phat)}}$$

**Vi du so**: Gia su cay co 2 la ($T = 2$), voi $\gamma = 1.0$, $\lambda = 1.0$:

| | Khong co Regularization | Co Regularization |
|---|---|---|
| La 1: $w_1 = +12.5$ | Loss = 0.001 | Loss = 0.001 + 1×2 + 0.5×1×(12.5² + 12.5²) = 0.001 + 2 + 156.25 = **158.25** |
| La 1: $w_1 = +2.0$ | Loss = 0.05 | Loss = 0.05 + 1×2 + 0.5×1×(2² + 2²) = 0.05 + 2 + 4 = **6.05** |

Mo hinh voi $w = +2.0$ co Loss goc cao hon (0.05 vs 0.001), nhung **tong Loss + Penalty thap hon nhieu** (6.05 vs 158.25). XGBoost se chon $w = +2.0$ — gia tri vua phai hon, khong overfit.

- $\gamma$ (gamma) **phat so luong la**: $\gamma$ cao → cay it la hon → don gian hon
- $\lambda$ (lambda) **phat gia tri la lon**: $\lambda$ cao → cac la co gia tri nho hon → du doan "nhe nhang" hon

### Cai tien 2: Su dung dao ham bac 2 (Second-order approximation)

#### Gradient Boosting thuong: Chi dung dao ham bac 1

Dao ham bac 1 (gradient) chi cho biet **huong** can di, khong cho biet **di bao xa**.

Tuong tu nhu dung tren doi nui trong suong mu:
- Dao ham bac 1: "Di ve ben trai" (biet huong nhung khong biet doc bao nhieu)
- Dao ham bac 2: "Di ve ben trai, doc dang tuoi — di cham thoi!" (biet ca huong VA do doc)

#### Vi du so

Voi mau #1 (y=1, du doan hien tai $p = 0.537$):

**Gradient (dao ham bac 1):**
$$g = p - y = 0.537 - 1 = -0.463$$

**Hessian (dao ham bac 2):**
$$h = p \times (1 - p) = 0.537 \times 0.463 = 0.2486$$

**Gradient Boosting thuong**: Gia tri la = trung binh cua gradient:
$$w = \frac{\sum g_i}{n} = \frac{-0.463 \times 3}{3} = -0.463$$

**XGBoost**: Gia tri la duoc tinh chinh xac hon:
$$w = -\frac{\sum g_i}{\sum h_i + \lambda}$$

Voi 3 mau hop phap tai la nay va $\lambda = 1.0$:
$$w = -\frac{3 \times (-0.463)}{3 \times 0.2486 + 1.0} = -\frac{-1.389}{1.746} = +0.796$$

So sanh:
| Phuong phap | Gia tri la | Y nghia |
|---|---|---|
| Gradient Boosting | -0.463 | Chi dung gradient, khong tinh toi do cong |
| XGBoost | +0.796 | Tinh toi ca gradient VA do cong → buoc di toi uu hon |

Ket qua: XGBoost hoi tu nhanh hon (can it vong lap hon de dat cung do chinh xac).

### Cai tien 3: Quyet dinh co chia nhanh hay khong (Pruning)

Gradient Boosting thuong: xay cay den do sau toi da roi cat tia sau (post-pruning).

XGBoost: kinh tra **truoc** khi chia nhanh, neu loi ich khong du lon thi **khong chia** (pre-pruning).

**Cong thuc tinh loi ich cua viec chia nhanh:**

$$Gain = \frac{1}{2}\left[\frac{G_L^2}{H_L + \lambda} + \frac{G_R^2}{H_R + \lambda} - \frac{(G_L + G_R)^2}{H_L + H_R + \lambda}\right] - \gamma$$

Trong do:
- $G_L, G_R$: tong gradient cua nhanh trai va phai
- $H_L, H_R$: tong hessian cua nhanh trai va phai
- $\gamma$: chi phi chia nhanh (hyperparameter)

**Vi du**: Chia 6 mau theo IsHTTPS:

Nhanh trai (IsHTTPS=1): #1,2,5 → $G_L = 3 \times (-0.463) = -1.389$, $H_L = 3 \times 0.2486 = 0.746$
Nhanh phai (IsHTTPS=0): #3,4,6 → $G_R = 3 \times 0.463 = 1.389$, $H_R = 3 \times 0.2486 = 0.746$

$$Gain = \frac{1}{2}\left[\frac{(-1.389)^2}{0.746 + 1} + \frac{1.389^2}{0.746 + 1} - \frac{0^2}{1.492 + 1}\right] - \gamma$$

$$= \frac{1}{2}\left[\frac{1.929}{1.746} + \frac{1.929}{1.746} - 0\right] - \gamma = \frac{1}{2}[1.105 + 1.105] - \gamma = 1.105 - \gamma$$

- Neu $\gamma = 0.1$: Gain = 1.105 - 0.1 = **1.005 > 0** → **Chia!** (loi ich du lon)
- Neu $\gamma = 2.0$: Gain = 1.105 - 2.0 = **-0.895 < 0** → **Khong chia!** (chi phi qua cao)

Day la cach $\gamma$ kiem soat do phuc tap cua cay.

### Tom tat 3 cai tien cua XGBoost

| | Gradient Boosting | XGBoost |
|---|---|---|
| Regularization | Khong co | Co ($\gamma$ va $\lambda$ chong overfit) |
| Tinh gia tri la | Chi dung gradient (bac 1) | Dung gradient + hessian (bac 2) |
| Chia nhanh | Xay het roi cat tia | Kiem tra truoc, khong chia neu khong co loi |
| Toc do | Cham (tuan tu) | Nhanh (song song, toi uu bo nho) |

## 4. Cac chi so danh gia — Vi du cu the

### Bai toan

Sau khi huan luyen, chung ta test mo hinh tren **10 URL moi** ma mo hinh chua tung thay:

| # | URL | Thuc te | Mo hinh du doan |
|---|---|---|---|
| 1 | https://google.com | Hop phap | Hop phap |
| 2 | http://g00gle-login.tk | Phishing | Phishing |
| 3 | https://facebook.com | Hop phap | Hop phap |
| 4 | http://faceb0ok.verify.co | Phishing | Phishing |
| 5 | https://amazon.com | Hop phap | Hop phap |
| 6 | http://amaz0n-secure.xyz | Phishing | Hop phap |
| 7 | https://github.com | Hop phap | Hop phap |
| 8 | http://verify-paypal.tk | Phishing | Phishing |
| 9 | https://wikipedia.org | Hop phap | Hop phap |
| 10 | http://bank-login.gq | Phishing | Phishing |

Mo hinh du doan sai duy nhat mau **#6**: mot URL phishing nhung bi mo hinh cho la hop phap.

### Confusion Matrix

|  | Du doan: Phishing | Du doan: Hop phap |
|---|---|---|
| **Thuc te: Phishing** | TP = **4** (#2,4,8,10) | FN = **1** (#6) |
| **Thuc te: Hop phap** | FP = **0** | TN = **5** (#1,3,5,7,9) |

- **TP = 4**: 4 URL phishing bi phat hien dung
- **FN = 1**: 1 URL phishing bi bo sot (mau #6 — **nguy hiem!** nguoi dung co the click vao)
- **FP = 0**: Khong co URL hop phap nao bi danh dau nham
- **TN = 5**: 5 URL hop phap duoc xac nhan dung

### Tinh cac chi so

**Accuracy** (do chinh xac tong the):
$$Accuracy = \frac{TP + TN}{TP + TN + FP + FN} = \frac{4 + 5}{4 + 5 + 0 + 1} = \frac{9}{10} = 0.90 \ (90\%)$$

**Precision** (trong so URL bi danh dau phishing, bao nhieu % dung?):
$$Precision = \frac{TP}{TP + FP} = \frac{4}{4 + 0} = \frac{4}{4} = 1.00 \ (100\%)$$

Precision = 100% nghia la: moi khi mo hinh bao "day la phishing" thi no dung 100%. Khong co bao dong gia.

**Recall** (trong so tat ca phishing thuc su, bao nhieu % duoc phat hien?):
$$Recall = \frac{TP}{TP + FN} = \frac{4}{4 + 1} = \frac{4}{5} = 0.80 \ (80\%)$$

Recall = 80% nghia la: mo hinh phat hien duoc 4/5 URL phishing, bo sot 1. Trong an ninh mang, **Recall quan trong hon Precision** vi bo sot phishing (FN) nguy hiem hon canh bao nham (FP).

**F1-Score** (can bang giua Precision va Recall):
$$F1 = 2 \times \frac{Precision \times Recall}{Precision + Recall} = 2 \times \frac{1.0 \times 0.8}{1.0 + 0.8} = 2 \times \frac{0.8}{1.8} = 0.889 \ (88.9\%)$$

### So sanh voi ket qua thuc te cua du an

| Chi so | Vi du tren (10 mau) | Mo hinh Phishing (47,159 mau) | Mo hinh DGA (400,000 mau) |
|---|---|---|---|
| Accuracy | 90.0% | **99.98%** | **97.45%** |
| Precision | 100.0% | **99.97%** | **97.80%** |
| Recall | 80.0% | **100.0%** | **97.18%** |
| F1-Score | 88.9% | **99.99%** | **97.49%** |
| ROC-AUC | — | **99.99%** | **99.64%** |

Mo hinh Phishing dat Recall = 100%, nghia la **khong bo sot bat ky URL phishing nao** trong 47,159 mau test. Day la ket qua ly tuong cho he thong bao mat.

### ROC-AUC giai thich truc quan

Mo hinh tra ve **xac suat** (0.0 den 1.0), khong phai nhan truc tiep. Chung ta can chon **nguong** (threshold) de quyet dinh:

- Neu xac suat > nguong → Phishing
- Neu xac suat <= nguong → Hop phap

| Nguong | Phat hien dung (Recall) | Bao dong gia (FPR) | Nhan xet |
|---|---|---|---|
| 0.1 | 100% | 20% | Bat het phishing, nhung nhieu bao dong gia |
| 0.3 | 95% | 5% | Gan nhu bat het, it bao dong gia |
| **0.5** | **90%** | **1%** | **Can bang tot** |
| 0.7 | 70% | 0.1% | It bao dong gia nhung bo sot nhieu |
| 0.9 | 40% | 0% | Khong bao dong gia nhung bo sot qua nhieu |

**ROC curve** ve tat ca cac diem (FPR, Recall) khi thay doi nguong tu 0 den 1.

**AUC** la dien tich duoi duong cong:
- AUC = 1.0 → Mo hinh tach biet hoan hao 2 lop tai moi nguong
- AUC = 0.5 → Mo hinh khong tot hon doan ngau nhien
- Mo hinh cua chung ta: AUC = 0.9999 (Phishing) va 0.9964 (DGA) → **gan hoan hao**
