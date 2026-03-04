# ARYA Atelier — Vercel Deploy Kılavuzu

## Proje Yapısı

```
arya-project/
├── index.html          ← Ana uygulama (müşteri + admin paneli)
├── api/
│   └── upload.js       ← Vercel Serverless Function (Blob yükleme)
├── package.json        ← @vercel/blob bağımlılığı
├── vercel.json         ← Vercel yapılandırması
├── .env.example        ← Token şablonu (gerçek token buraya yazılmaz!)
└── .gitignore
```

---

## 🚀 Deploy Adımları

### 1. GitHub'a Yükle

```bash
git init
git add .
git commit -m "ARYA Atelier v2.1 — Vercel Blob entegrasyonu"
git remote add origin https://github.com/KULLANICI_ADI/arya-atelier.git
git push -u origin main
```

### 2. Vercel'e Bağla

1. [vercel.com](https://vercel.com) → **Add New Project**
2. GitHub reposunu seç → **Import**
3. Framework: **Other** (otomatik algılanır)
4. **Deploy** butonuna bas

### 3. Environment Variable Ekle ⚠️ ÖNEMLİ

Vercel Dashboard → Projen → **Settings** → **Environment Variables**

| Name | Value | Environment |
|------|-------|-------------|
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_bSqtU61fCAVCWQMD_...` | Production, Preview, Development |

Ekledikten sonra **Redeploy** yap.

---

## 🔑 Güvenlik Notları

- Token'ı **asla** `index.html` veya kaynak koduna yazmayın
- Token yalnızca `api/upload.js` içinde `process.env.BLOB_READ_WRITE_TOKEN` ile okunur
- `.gitignore` `.env` dosyasını zaten dışarıda bırakıyor

---

## 📁 Blob Depolama

Yüklenen görseller Vercel Blob'da şu yapıda saklanır:

```
arya/hizmetler/1720000000000-abc123.jpg
arya/hizmetler/1720000000001-def456.png
```

Vercel Dashboard → **Storage** → **Blob** sekmesinden yönetebilirsin.

---

## 🔥 Firebase (İsteğe Bağlı)

Admin Panel → **Ayarlar** → Firebase Config JSON'unu yapıştır.  
Firebase olmadan localStorage kullanılır (yalnızca o tarayıcıda görünür).

---

## Admin Paneli

- İlk girişte şifre belirlenir
- Şifre SHA-256 ile hash'lenerek saklanır
- Session 30 dakika sürer
