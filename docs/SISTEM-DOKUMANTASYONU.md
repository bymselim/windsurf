# Melike Sevinç Artworks — Sistem Dokümantasyonu

Bu belge, **luxury-art-gallery** (yenisistem) projesinin tamamını anlatır: dosya yapısı, altyapı, veri depolama, kimlik doğrulama, eserler, soru-cevap, ERP ve sıfırdan kurulum adımları.

**Güncel sürüm:** `package.json` → `version` (şu an **2.4.6**)  
**Git deposu:** `https://github.com/bymselim/windsurf.git`  
**Yerel proje yolu:** `/Users/selim/yenisistem`

---

## İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [Dosya ve Klasör Yapısı](#2-dosya-ve-klasör-yapısı)
3. [Teknoloji Yığını](#3-teknoloji-yığını)
4. [Altyapı ve Harici Servisler](#4-altyapı-ve-harici-servisler)
5. [Veri Depolama (Veritabanı Yok)](#5-veri-depolama-veritabanı-yok)
6. [Ortam Değişkenleri](#6-ortam-değişkenleri)
7. [Kimlik Doğrulama ve Yetkilendirme](#7-kimlik-doğrulama-ve-yetkilendirme)
8. [Eserler (Artworks) Sistemi](#8-eserler-artworks-sistemi)
9. [Soru-Cevap (FAQ) Sistemi](#9-soru-cevap-faq-sistemi)
10. [ERP — İş Paneli](#10-erp--iş-paneli)
11. [Sertifika Doğrulama (vadmin)](#11-sertifika-doğrulama-vadmin)
12. [E-posta ve Zamanlanmış Görevler](#12-e-posta-ve-zamanlanmış-görevler)
13. [API Yapısı](#13-api-yapısı)
14. [Sıfırdan Kurulum](#14-sıfırdan-kurulum)
15. [Vercel'e Deploy](#15-vercele-deploy)
16. [Yedekleme, Taşıma ve Sorun Giderme](#16-yedekleme-taşıma-ve-sorun-giderme)
17. [İlgili Belgeler](#17-ilgili-belgeler)

---

## 1. Genel Bakış

Bu proje, **Melike Sevinç Artworks** için geliştirilmiş, mobil öncelikli bir **Next.js 14** web uygulamasıdır. Tek bir kod tabanında şu modülleri barındırır:

| Modül | URL | Açıklama |
|-------|-----|----------|
| Ana sayfa | `/` | Türkçe / Uluslararası galeri seçimi |
| VIP Katalog (TR) | `/turkish` → `/turkish/gallery` | Şifreli Türkçe eser kataloğu |
| VIP Katalog (EN) | `/international` → `/international/gallery` | Şifreli İngilizce eser kataloğu |
| Admin paneli | `/admin` | Eser, kategori, log, ayar yönetimi |
| İş paneli (ERP) | `/ERP` veya `/erp` | Sipariş, gider, yapılacaklar, raporlar |
| Sertifika paneli | `/vadmin` | Eser sertifikası oluşturma/düzenleme |
| Soru-Cevap | `/faq`, `/faq/[slug]` | Tek seferlik erişimli SSS sayfaları |
| Sertifika doğrulama | `/verify-your-art` | Halka açık webpin ile doğrulama |
| Hızlı mesajlar | `/c` | Admin için kayıtlı yanıt şablonları |

**Önemli:** Klasik bir SQL veritabanı (PostgreSQL, MySQL, SQLite) **kullanılmaz**. Tüm uygulama verisi **Redis/KV** veya yerel **JSON dosyalarında** tutulur. Görseller **Cloudflare R2** (veya yerel `public/artworks`) üzerindedir.

---

## 2. Dosya ve Klasör Yapısı

```
yenisistem/                          # Proje kökü (~895 MB node_modules dahil)
├── app/                             # Next.js App Router — sayfalar ve API
│   ├── (turkish)/turkish/           # Türkçe galeri giriş + katalog
│   ├── (international)/international/  # İngilizce galeri giriş + katalog
│   ├── admin/                       # Admin panel sayfaları
│   ├── ERP/                         # İş paneli sayfası
│   ├── vadmin/                      # Sertifika yönetim paneli
│   ├── faq/                         # Soru-cevap sayfaları
│   ├── gallery/                     # Eski/ortak galeri rotası
│   ├── verify-your-art/             # Halka açık sertifika doğrulama
│   ├── c/                           # Hızlı mesajlar (admin)
│   ├── api/                         # Tüm REST API uçları (~59 route)
│   ├── layout.tsx, page.tsx         # Kök layout ve ana sayfa
│   └── styles/globals.css           # Global stiller
│
├── components/                      # Paylaşılan React bileşenleri
│   ├── erp/                         # ErpApp, TodosPanel, ErpImportPanel
│   ├── admin/                       # Admin yardımcı bileşenler
│   ├── ArtworkModal.tsx             # Eser detay modalı
│   ├── MasonryGrid.tsx              # Galeri ızgara görünümü
│   ├── AuthGate.tsx                 # VIP giriş formu
│   ├── KVKKModal.tsx                # KVKK onay metni
│   └── ...
│
├── lib/                             # İş mantığı, veri erişimi, auth
│   ├── data/                        # JSON veri dosyaları (git'te olanlar)
│   ├── erp/                         # ERP modülü (store, email, raporlar)
│   ├── auth.ts                      # Galeri JWT oturumu
│   ├── kv-adapter.ts                # Redis / Vercel KV soyutlaması
│   ├── object-storage.ts            # Cloudflare R2 (S3 API)
│   ├── artworks-io.ts               # Eser verisi okuma/yazma
│   ├── categories-io.ts             # Kategori verisi
│   ├── faq-data.ts                  # Soru-cevap içerikleri (statik)
│   └── ...
│
├── public/                          # Statik dosyalar
│   └── artworks/                    # Yerel geliştirme görselleri
│
├── scripts/                         # CLI araçları
│   ├── upload-to-blob.ts            # public/artworks → R2 yükleme
│   └── migrate-blob-to-r2.ts        # Eski Blob URL → R2 taşıma
│
├── docs/                            # Dokümantasyon (bu dosya dahil)
├── hooks/                           # React hook'ları
├── middleware.ts                    # Galeri JWT koruması, /erp rewrite
├── next.config.js                   # Next.js yapılandırması
├── vercel.json                      # Vercel deploy + cron
├── package.json                     # Bağımlılıklar ve sürüm
├── .env.local.example               # Ortam değişkeni şablonu
└── erp.html                         # Eski bağımsız ERP prototipi (kullanılmıyor)
```

### Git'te olan vs. çalışma zamanında oluşan dosyalar

**Repoda bulunan JSON verileri** (`lib/data/`):
- `artworks.json`, `categories.json`, `certificates.json`, `settings.json`
- `c-messages.json`, `erp-todos.json`, `erp-todo-recurring.json`

**Gitignore'da — sadece çalışma zamanında oluşur:**
- `lib/data/admin-password.txt`, `vadmin-password.txt`
- `lib/data/access-logs.json`, `gate-logs.json`
- `lib/data/blocked-phones.json`, `phone-credits.json`
- `lib/data/faq-access.json`, `verify-change-requests.json`
- `.env.local`, `.vercel/`, `node_modules/`, `.next/`

---

## 3. Teknoloji Yığını

| Katman | Teknoloji | Sürüm / Not |
|--------|-----------|-------------|
| Framework | Next.js (App Router) | 14.2.18 |
| UI | React + TypeScript | React 18 |
| Stil | Tailwind CSS | — |
| Oturum (galeri) | JWT (`jose`, HS256) | HTTP-only cookie |
| Oturum (admin) | Basit cookie flag | `admin_session=1` |
| Kalıcı veri | Redis veya Vercel KV | `@vercel/kv`, `redis` paketi |
| Medya | Cloudflare R2 | `@aws-sdk/client-s3` ile S3 uyumlu API |
| E-posta | Nodemailer | SMTP |
| Form doğrulama | Zod + react-hook-form | — |
| Görsel işleme | sharp | Thumbnail üretimi |
| Node.js | ≥ 18.18.0 | `package.json` engines |

### npm komutları

```bash
npm install          # Bağımlılıkları kur
npm run dev          # Geliştirme sunucusu (localhost:3000)
npm run build        # Üretim derlemesi
npm start            # Üretim sunucusu
npm run lint         # ESLint
npm run upload:r2    # Yerel görselleri R2'ye yükle
npm run migrate:blob-to-r2  # Eski Blob → R2 toplu taşıma
```

---

## 4. Altyapı ve Harici Servisler

### 4.1 Vercel (ana hosting)

Proje **Vercel** üzerinde çalışacak şekilde yapılandırılmıştır.

| Ayar | Değer | Dosya |
|------|-------|-------|
| Framework | Next.js | `vercel.json` |
| Bölge | `fra1` (Frankfurt) | `vercel.json` |
| Build | `npm run build` | `vercel.json` |
| Install | `npm ci` | `vercel.json` |
| Cron | Her gün 04:00 UTC (07:00 TR) | `/api/cron/erp-email` |

Güvenlik başlıkları (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`) ve API cache politikası `vercel.json` içinde tanımlıdır.

### 4.2 Cloudflare R2 (medya depolama)

Eser görselleri ve yüklenen dosyalar **Cloudflare R2** bucket'ında tutulur. Kod, AWS S3 SDK'sını R2 endpoint'ine yönlendirir:

```
https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com
```

Detaylı kurulum: [`docs/R2-SETUP.md`](./R2-SETUP.md)

### 4.3 Redis / Upstash (kalıcı veri)

Üretim ortamında JSON dosyalarına yazılamaz (Vercel dosya sistemi salt okunur). Bu nedenle tüm uygulama verisi **Redis** üzerinde saklanır.

Öncelik sırası (`lib/kv-adapter.ts`):
1. `REDIS_URL` tanımlıysa → `redis` npm paketi (Upstash uyumlu)
2. Değilse `KV_REST_API_URL` + `KV_REST_API_TOKEN` → `@vercel/kv` (eski Vercel KV)
3. İkisi de yoksa → yerel `lib/data/*.json` dosyaları

Tüm KV anahtarları `luxury_gallery:` önekiyle başlar.

Detay: [`docs/VERCEL-DATA.md`](./VERCEL-DATA.md)

### 4.4 SMTP (e-posta)

ERP günlük özeti, aylık rapor ve haftalık yedek e-postaları **Nodemailer** ile gönderilir. Herhangi bir SMTP sağlayıcısı kullanılabilir (Gmail, SendGrid, Yandex, vb.).

### 4.5 Mimari diyagram

```
                    ┌─────────────────────────────────────┐
                    │           Ziyaretçi / Admin          │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │     Vercel (Next.js, fra1)          │
                    │  middleware.ts · API routes · UI    │
                    └──────┬──────────────┬───────────────┘
                           │              │
              ┌────────────▼──┐    ┌──────▼──────────┐
              │ Redis/Upstash │    │ Cloudflare R2   │
              │ (tüm veri)    │    │ (görseller)     │
              └───────────────┘    └─────────────────┘
                           │
              ┌────────────▼──┐
              │ SMTP sunucusu │  ← ERP cron e-postaları
              └───────────────┘
```

---

## 5. Veri Depolama (Veritabanı Yok)

Bu sistemde **PostgreSQL, MySQL, SQLite veya Prisma** kullanılmaz. Veri modeli JSON belgeleridir.

### Okuma/yazma deseni

Her veri modülü aynı kalıbı izler:

1. Önce Redis/KV'den oku (`luxury_gallery:{anahtar}`)
2. KV yoksa veya boşsa → `lib/data/{dosya}.json` dosyasından oku
3. Yazarken: KV varsa KV'ye yaz; dosyaya da yazmayı dene (Vercel'de dosya yazımı sessizce başarısız olabilir)
4. İlk KV okumasında dosyadaki veri KV'ye migrate edilebilir

### Tüm KV anahtarları

| KV Anahtarı | İçerik | Modül |
|-------------|--------|-------|
| `luxury_gallery:artworks` | Eser kataloğu | `lib/artworks-io.ts` |
| `luxury_gallery:categories` | Kategoriler | `lib/categories-io.ts` |
| `luxury_gallery:settings` | Giriş kapısı + UI ayarları | `lib/access-gate-settings.ts` |
| `luxury_gallery:access_logs` | Galeri ziyaret logları | `lib/access-log.ts` |
| `luxury_gallery:gate_logs` | Telefon bazlı giriş logları | `lib/gate-log.ts` |
| `luxury_gallery:phone_credits` | Telefon yetki kredileri | `lib/phone-credits.ts` |
| `luxury_gallery:blocked_phones` | Engelli telefonlar | `lib/blocked-phones.ts` |
| `luxury_gallery:faq_access` | FAQ erişim kayıtları | `lib/faq-access-log.ts` |
| `luxury_gallery:certificates` | Sertifikalar | `lib/certificates-io.ts` |
| `luxury_gallery:c_messages` | Hızlı mesajlar | `lib/c-messages-io.ts` |
| `luxury_gallery:admin_password` | Admin şifresi | `lib/admin-password.ts` |
| `luxury_gallery:vadmin_password` | vadmin şifresi | `lib/vadmin-password.ts` |
| `luxury_gallery:erp_orders` | ERP siparişler | `lib/erp/store.ts` |
| `luxury_gallery:erp_expenses` | ERP giderler | `lib/erp/store.ts` |
| `luxury_gallery:erp_settings` | ERP ayarları | `lib/erp/store.ts` |
| `luxury_gallery:erp_recurring` | Düzenli giderler | `lib/erp/store.ts` |
| `luxury_gallery:erp_todos` | Yapılacaklar | `lib/erp/store.ts` |
| `luxury_gallery:erp_todo_recurring` | Düzenli hatırlatmalar | `lib/erp/store.ts` |
| `luxury_gallery:erp_next_id` | ERP ID sayacı | `lib/erp/store.ts` |
| `luxury_gallery:erp_email_settings` | E-posta ayarları | `lib/erp/email-store.ts` |
| `luxury_gallery:erp_label_settings` | Kargo etiketi ayarları | `lib/erp/label-store.ts` |

---

## 6. Ortam Değişkenleri

Şablon dosya: `.env.local.example` → kopyala: `.env.local`

### Zorunlu (üretim)

| Değişken | Açıklama |
|----------|----------|
| `JWT_SECRET` | Galeri oturum JWT imzalama anahtarı (min. 32 karakter) |
| `REDIS_URL` | Upstash Redis bağlantı URL'si (Vercel'de şart) |
| `ADMIN_PASSWORD` | Admin panel şifresi |

### Galeri erişimi

| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_ACCESS_PASSWORD` | Varsayılan galeri şifresi (admin ayarı yoksa) |

### Admin / vadmin

| Değişken | Açıklama |
|----------|----------|
| `ADMIN_PASSWORD` | `/admin` ve `/ERP` şifresi |
| `VADMIN_PASSWORD` | `/vadmin` şifresi (yoksa `ADMIN_PASSWORD` kullanılır) |

### Cloudflare R2

| Değişken | Açıklama |
|----------|----------|
| `R2_ACCOUNT_ID` | Cloudflare hesap ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | Bucket adı |
| `R2_PUBLIC_BASE_URL` | Public URL kökü (sonunda `/` yok) |
| `NEXT_PUBLIC_R2_IMAGE_HOST` | Next Image için hostname |

### Sipariş iletişim

| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp numarası (ülke kodu, + yok) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Sipariş e-postası |
| `NEXT_PUBLIC_INSTAGRAM_USERNAME` | Instagram kullanıcı adı |

### E-posta (ERP)

| Değişken | Açıklama |
|----------|----------|
| `SMTP_HOST` | SMTP sunucu |
| `SMTP_PORT` | SMTP port (genelde 587) |
| `SMTP_USER` | SMTP kullanıcı |
| `SMTP_PASS` | SMTP şifre |
| `SMTP_FROM` | Gönderen adresi |
| `CRON_SECRET` | Vercel cron yetkilendirme token'ı |

### Diğer

| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_IMAGES_BASE` | Görsel base URL (varsayılan: `/artworks`) |
| `NEXT_PUBLIC_APP_URL` | Uygulama base URL |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Eski Vercel KV (Redis yoksa) |

---

## 7. Kimlik Doğrulama ve Yetkilendirme

Sistemde **dört bağımsız yetkilendirme katmanı** vardır.

### 7.1 VIP Katalog girişi (ziyaretçi)

**Akış:**

```
Kullanıcı /turkish veya /international sayfasına gelir
    → AuthGate formu: ad, telefon, şifre, KVKK onayı
    → POST /api/auth
        → Telefon engelli mi? (blocked-phones)
        → Telefon kredisi var mı? (phone-credits)
        → Şifre doğru mu?
        → JWT oluştur (gallery_session cookie, 7 gün)
        → Access log + gate log kaydı
    → /turkish/gallery veya /international/gallery
    → middleware.ts JWT doğrular
```

**Şifre modları** (`lib/access-gate-settings.ts`):

| Mod | Ayar | Davranış |
|-----|------|----------|
| Statik şifre | `usePhoneBasedPassword: false` | Admin'de tanımlı `passwordTR` / `passwordEN` |
| Telefon bazlı | `usePhoneBasedPassword: true` | Telefondan türetilen dinamik şifre |

**Telefon bazlı şifre algoritması** (`lib/gate-password.ts`):
- Base: `m` + ay (1-12) + son 3 hanenin toplamı (01-27) → örn. `m308`
- Ters: `803s`
- Türkçe galeri: `m308` veya `803s` (4 karakter)
- Uluslararası: başına `y` → `ym308` veya `y803s` (5 karakter)

**Oturum:** `gallery_session` HTTP-only cookie, JWT payload: `sub`, `name`, `gallery`, `logId`

**Korunan rotalar** (`middleware.ts`):
- `/turkish/gallery/*`
- `/international/gallery/*`
- `/gallery/*`

### 7.2 Telefon yetkilendirme (kredi sistemi)

VIP kataloga erişim için telefon numarasına **kredi** atanır. Kredi bittiğinde giriş reddedilir.

- Kredi yönetimi: Admin → telefon kredileri (`/admin` içinden API)
- Yetkilendirme talebi: `YetkilendirmeButton` → WhatsApp mesajı
- Veri: `luxury_gallery:phone_credits`

### 7.3 Admin paneli (`/admin`, `/ERP`, `/c`)

**Akış:**

```
POST /api/admin/login { password }
    → getAdminPassword() ile karşılaştır
    → admin_session=1 cookie (7 gün, HTTP-only)

API istekleri:
    → Cookie admin_session=1 VEYA
    → Header x-admin-password: {şifre}
```

**Şifre çözüm sırası** (`lib/admin-password.ts`):
1. `ADMIN_PASSWORD` ortam değişkeni
2. Redis: `luxury_gallery:admin_password`
3. Dosya: `lib/data/admin-password.txt`
4. Varsayılan: `selim123`

**ERP girişi:** `/ERP` sayfası client-side `verifyAdminSession()` çağırır; yetkisizse `/admin/access-logs?next=/erp` yönlendirir.

**Client tarafı:** `adminFetch()` şifreyi `sessionStorage`/`localStorage` (`admin_password`) ve `x-admin-password` header'ında gönderir.

### 7.4 vadmin — Sertifika paneli (`/vadmin`)

Admin ile aynı desen, farklı cookie ve header:

- Cookie: `vadmin_session=1` (24 saat)
- Header: `x-vadmin-password`
- Şifre sırası: `VADMIN_PASSWORD` → `ADMIN_PASSWORD` → KV → dosya → `vadmin-change-me`

### 7.5 FAQ erişim kapısı

Her soru (`/faq/[slug]`) için **IP başına tek seferlik** erişim:

```
GET /api/faq-access?slug=1
    → Cookie faq_1=1 var mı? → izin ver
    → Bu IP bu slug için daha önce kullandı mı? → engelle
    → Form göster

POST /api/faq-access { slug, fullName, phone, kvkkAccepted }
    → Kayıt ekle → cookie set → izin ver
```

Admin: `/admin/faq-access` — erişim kayıtlarını görüntüle ve iptal et.

### 7.6 Cron yetkilendirme

`GET /api/cron/erp-email` → `Authorization: Bearer {CRON_SECRET}` zorunlu.

### Yetkilendirme özeti

| Katman | Cookie / Header | Korunan alan |
|--------|-----------------|--------------|
| Galeri JWT | `gallery_session` | Galeri sayfaları (middleware) |
| Admin | `admin_session` / `x-admin-password` | `/admin`, `/ERP`, `/c`, `/api/admin/*` |
| vadmin | `vadmin_session` / `x-vadmin-password` | `/vadmin`, `/api/vadmin/*` |
| FAQ | `faq_{slug}` | `/faq/[slug]` |
| Cron | `Authorization: Bearer` | `/api/cron/*` |

---

## 8. Eserler (Artworks) Sistemi

### 8.1 Veri modeli

Her eser (`lib/artworks-io.ts` → `ArtworkJson`):

| Alan | Açıklama |
|------|----------|
| `id` | Benzersiz sayısal ID |
| `titleTR`, `titleEN` | Başlık (çift dil) |
| `descriptionTR`, `descriptionEN` | Açıklama |
| `priceTRY`, `priceUSD` | Fiyat |
| `dimensionsCM`, `dimensionsIN` | Boyut |
| `category` | Kategori adı |
| `filename` | Ana görsel URL veya yol |
| `thumbnailFilename` | Küçük resim |
| `priceVariants` | Farklı boyut/fiyat seçenekleri |
| `useCategoryPricing` | Kategori varsayılan fiyatını kullan |
| `isFeatured` | Öne çıkan eser |
| `contentHash` | SHA hash (dedup için) |

### 8.2 Depolama

| Katman | Konum |
|--------|-------|
| Veri | `luxury_gallery:artworks` veya `lib/data/artworks.json` |
| Görseller (üretim) | Cloudflare R2: `artworks/{kategori}/` |
| Görseller (yerel) | `public/artworks/` veya `NEXT_PUBLIC_IMAGES_BASE` |

### 8.3 Halka açık görüntüleme akışı

```
Galeri sayfası yüklenir
    → GET /api/artworks?page=1&limit=24&seed=...&category=...
    → readArtworksFromFile()
    → Fisher-Yates karıştırma (seed ile tutarlı)
    → Kategori fiyatları birleştir (category-pricing.ts)
    → mapFullToArtwork(locale) — TR veya EN alanları seç
    → MasonryGrid render
    → Eser tıklanınca ArtworkModal (detay + sipariş butonları)
```

**Galeri rotaları:**
- `/turkish/gallery` — Türkçe (`locale="tr"`)
- `/international/gallery` — İngilizce (`locale="en"`)
- `/gallery` — Eski ortak rota

**Sipariş seçenekleri** (`OrderModal`): WhatsApp, E-posta, Instagram DM

### 8.4 Admin yönetimi

| İşlem | Sayfa / API |
|-------|-------------|
| Eser düzenleme | `/admin/artworks` |
| Görsel yükleme | `/admin/uploads` → `POST /api/admin/uploads` |
| Kategori yönetimi | `/admin/categories` |
| Toplu düzenleme | `POST /api/admin/artworks/bulk` |
| Fiyat % ayarı | `POST /api/admin/artworks/apply-price-percent` |
| Thumbnail backfill | `POST /api/admin/artworks/backfill-thumbnails` |
| URL doğrulama | `POST /api/admin/artworks/validate-urls` |

**Yükleme akışı:**
1. Multipart POST → `lib/object-storage.ts`
2. SHA hash ile dedup (aynı kategori + hash → tekrar yükleme yok)
3. R2'ye yükle: `artworks/{kategori}/{dosya}`
4. sharp ile thumbnail üret
5. `artworks.json` / KV güncelle

---

## 9. Soru-Cevap (FAQ) Sistemi

Ayrı bir veritabanı modülü yoktur. İçerik **statik TypeScript dosyasında** tanımlıdır: `lib/faq-data.ts`

### 9.1 İçerik

7 adet soru-cevap (`slug`: `"1"` … `"7"`). Her biri:
- `question` — soru metni
- `answer` — uzun cevap metni
- `matrixEnding` (opsiyonel, slug 7) — Matrix efekti sonrası metin

### 9.2 Sayfa akışı

```
/faq → Soru listesi (tüm slug'lar)

/faq/[slug]
    → FAQGate: erişim kontrolü
        → Daha önce erişildi mi? (cookie veya IP kaydı)
        → Hayır: form (ad, telefon, KVKK)
        → Evet: FAQAnswerClient
    → FAQAnswerClient:
        → Kelime kelime yazma animasyonu (FAQTypingText)
        → Slug 7: "Gerçek Cevap için Tıklayın" → MatrixEffect
```

Sayfalar `noindex, nofollow` — arama motorlarında görünmez.

### 9.3 Admin

`/admin/faq-access` — hangi IP/telefon hangi soruya erişti, erişimi iptal etme.

---

## 10. ERP — İş Paneli

### 10.1 Erişim

- URL: `/ERP` veya `/erp` (middleware `/ERP`'ye rewrite eder)
- Giriş: Admin şifresi gerekli
- UI: `components/erp/ErpApp.tsx` (~4000 satır)

### 10.2 Sekmeler

| Sekme | İçerik |
|-------|--------|
| Dashboard | KPI özeti |
| Siparişler | Müşteri siparişleri, durum, kalan ödeme |
| Giderler | Gider kayıtları |
| Yapılacaklar | Görev listesi + düzenli hatırlatmalar |
| Raporlar | Gelir/gider/karşılaştırma raporları |
| Tanımlamalar | Ayarlar, e-posta, kargo etiketi, CSV import, düzenli giderler |

### 10.3 Veri modelleri (`lib/erp/types.ts`)

**Sipariş (ErpOrder):** `ad`, `soyad`, `tel`, `tarih`, `bitis`, `cat`, `tur`, `adet`, `toplam`, `kapora`, `tahsilat`, `durum` (biten/bekleyen/askida), `adres`, `mapsUrl`

**Gider (ErpExpense):** `tarih`, `kat`, `subkat`, `acik`, `tutar`, `fatno`, `recurringId`

**Düzenli gider (ErpRecurringExpense):** Aylık/haftalık otomatik gider oluşturma

**Yapılacak (ErpTodo):** `title`, `note`, `status`, `dueDate`, `periodKey`

**Düzenli hatırlatma (ErpTodoRecurring):** Periyodik yapılacak oluşturma

### 10.4 Otomatik senkronizasyon

Her `readErpData()` çağrısında (`lib/erp/store.ts`):

1. **Düzenli giderler** → vadesi gelen gider satırları oluştur (`lib/erp/recurring.ts`)
2. **Düzenli hatırlatmalar** → vadesi gelen yapılacaklar (`lib/erp/todo-recurring.ts`)
3. **Düzenli ödeme todo'ları** → vadesi dolan ödemeler için notlu yapılacak (`lib/erp/recurring-todo-reminders.ts`)
4. **Sipariş hatırlatmaları** → bitiş tarihine 7/3/1 gün kala + askıda siparişler (`lib/erp/order-todo-reminders.ts`)

### 10.5 Ek özellikler

- **CSV import:** `lib/erp/import.ts`, `ErpImportPanel.tsx`
- **Kargo etiketi PDF:** `lib/erp/shipping-label.ts` — yapılandırılabilir alanlar
- **WhatsApp mesajı:** Sipariş detayından hızlı paylaşım
- **Raporlar:** `lib/erp/reports-build.ts` — dönem filtreli gelir/gider

### 10.6 API uçları

Tümü `/api/admin/erp/` altında, admin auth gerekli:

```
GET  /api/admin/erp              → tüm ERP verisi
CRUD /api/admin/erp/orders
CRUD /api/admin/erp/expenses
CRUD /api/admin/erp/todos
CRUD /api/admin/erp/recurring
CRUD /api/admin/erp/todo-recurring
POST /api/admin/erp/import
GET/PUT /api/admin/erp/settings
GET/PUT /api/admin/erp/email-settings
POST /api/admin/erp/email-test
GET/PUT /api/admin/erp/label-settings
```

---

## 11. Sertifika Doğrulama (vadmin)

### 11.1 vadmin paneli (`/vadmin`)

- Sertifika oluşturma/düzenleme
- Webpin atama
- Değişiklik taleplerini yönetme
- Doğrulama sayfası metinlerini düzenleme

Veri: `luxury_gallery:certificates` veya `lib/data/certificates.json`

### 11.2 Halka açık doğrulama (`/verify-your-art`)

```
Kullanıcı webpin girer
    → GET /api/public/verify-art?webpin=...
    → Sertifika bilgileri döner (eser adı, tarih, vb.)
    → Değişiklik talebi: POST /api/public/verify-art/change-request
```

---

## 12. E-posta ve Zamanlanmış Görevler

### Tek cron işi

`vercel.json`:
```json
{ "path": "/api/cron/erp-email", "schedule": "0 4 * * *" }
```
Her gün **07:00 Türkiye** (04:00 UTC).

### Gönderilen e-postalar (`lib/erp/email-send.ts`)

| Tür | Ne zaman | İçerik |
|-----|----------|--------|
| Günlük özet | Her gün (açıksa) | Bitime yakın siparişler, dünkü siparişler/giderler, bekleyen yapılacaklar |
| Aylık rapor | Ayın 1'i | Aylık gelir/gider özeti |
| Haftalık yedek | Pazartesi | JSON/CSV ekleriyle veri yedeği |

Ayarlar: ERP → Tanımlamalar → E-posta bölümü veya `luxury_gallery:erp_email_settings`

Manuel test: `POST /api/admin/erp/email-test` (admin auth gerekli)

---

## 13. API Yapısı

```
app/api/
├── auth/                    # Galeri giriş (JWT)
├── access-log/              # Oturum süresi güncelleme
├── artworks/                # GET public, PUT/DELETE admin
├── categories/              # GET public
├── settings/
│   ├── access-gate/         # Giriş kapısı ayarları (şifresiz)
│   └── ui/                  # UI metinleri
├── faq-access/              # FAQ erişim kapısı
├── public/
│   ├── verify-art/          # Sertifika doğrulama
│   └── verify-page-copy/    # Doğrulama sayfası metinleri
├── admin/                   # Admin auth zorunlu
│   ├── login, logout, session, change-password
│   ├── artworks/*, categories, uploads, settings
│   ├── blocked-phones, phone-credits, gate-logs
│   ├── faq-access, translate
│   └── erp/*                # Tüm ERP CRUD
├── vadmin/                  # vadmin auth zorunlu
│   ├── certificates/*, uploads, change-requests/*
│   └── verify-declaration, verify-page-copy
├── c/messages/              # Hızlı mesajlar (admin)
└── cron/erp-email/          # CRON_SECRET bearer
```

---

## 14. Sıfırdan Kurulum

### Adım 1 — Gereksinimler

- Node.js ≥ 18.18.0
- npm
- Git

### Adım 2 — Depoyu klonla

```bash
git clone https://github.com/bymselim/windsurf.git yenisistem
cd yenisistem
```

### Adım 3 — Bağımlılıkları kur

```bash
npm install
```

### Adım 4 — Ortam değişkenlerini ayarla

```bash
cp .env.local.example .env.local
```

`.env.local` dosyasını düzenle. Minimum yerel geliştirme için:

```env
JWT_SECRET="gelistirme-icin-en-az-32-karakterlik-bir-anahtar"
ADMIN_PASSWORD="istediginiz-sifre"
NEXT_PUBLIC_ACCESS_PASSWORD="gallery2024"
```

Redis ve R2 olmadan da çalışır; veriler `lib/data/*.json` dosyalarına yazılır.

### Adım 5 — Geliştirme sunucusunu başlat

```bash
npm run dev
```

Tarayıcıda: [http://localhost:3000](http://localhost:3000)

### Adım 6 — İlk girişler

| Panel | URL | Varsayılan şifre |
|-------|-----|------------------|
| Admin | http://localhost:3000/admin | `ADMIN_PASSWORD` veya `selim123` |
| ERP | http://localhost:3000/ERP | Aynı admin şifresi |
| vadmin | http://localhost:3000/vadmin | `VADMIN_PASSWORD` veya admin şifresi |
| Galeri (TR) | http://localhost:3000/turkish | `NEXT_PUBLIC_ACCESS_PASSWORD` veya admin ayarı |

### Adım 7 — (Opsiyonel) Cloudflare R2 kurulumu

1. Cloudflare hesabında R2 bucket oluştur
2. Public access aç (R2.dev subdomain veya custom domain)
3. API token oluştur (Object Read & Write)
4. `.env.local`'e `R2_*` değişkenlerini ekle
5. Yerel görselleri yükle: `npm run upload:r2`

Detay: [`docs/R2-SETUP.md`](./R2-SETUP.md)

### Adım 8 — (Opsiyonel) Redis kurulumu

Yerel geliştirmede Redis şart değil. Üretim için:

1. [Upstash](https://upstash.com) hesabı aç
2. Redis database oluştur (bölge: eu-central-1 veya fra1 yakını)
3. `REDIS_URL` değerini `.env.local` ve Vercel'e ekle

---

## 15. Vercel'e Deploy

### Adım 1 — GitHub'a push

```bash
# Sürüm bump (push öncesi zorunlu — .cursor/rules/version-bump-before-push.mdc)
# package.json ve package-lock.json içindeki version alanlarını artır

git add .
git commit -m "..."
git push origin main
```

### Adım 2 — Vercel'de proje oluştur

1. [vercel.com](https://vercel.com) → New Project
2. GitHub reposunu bağla: `bymselim/windsurf`
3. Framework: Next.js (otomatik algılanır)

### Adım 3 — Ortam değişkenlerini ekle

Vercel Dashboard → Settings → Environment Variables:

**Zorunlu:**
```
JWT_SECRET=...
REDIS_URL=...
ADMIN_PASSWORD=...
CRON_SECRET=...
```

**R2 (görseller için):**
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_BASE_URL=...
NEXT_PUBLIC_R2_IMAGE_HOST=...
```

**SMTP (ERP e-posta):**
```
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
```

**İletişim:**
```
NEXT_PUBLIC_WHATSAPP_NUMBER=...
NEXT_PUBLIC_CONTACT_EMAIL=...
NEXT_PUBLIC_INSTAGRAM_USERNAME=...
```

### Adım 4 — Deploy

Push sonrası Vercel otomatik deploy eder. `vercel.json` cron tanımı deploy ile aktif olur.

### Adım 5 — Doğrulama

- [ ] Ana sayfa açılıyor
- [ ] Galeri girişi çalışıyor
- [ ] Admin paneline giriş yapılabiliyor
- [ ] Eserler görüntüleniyor (R2 bağlıysa)
- [ ] ERP açılıyor
- [ ] Access Logs yeni girişleri gösteriyor (Redis bağlıysa)

---

## 16. Yedekleme, Taşıma ve Sorun Giderme

### Veri yedekleme

**Redis (üretim):** Upstash dashboard'dan export veya `redis-cli GET luxury_gallery:artworks` gibi komutlarla anahtarları yedekle.

**ERP haftalık yedek:** Cron Pazartesi günleri JSON/CSV ekli e-posta gönderir (`lib/erp/email-backup.ts`).

**Manuel:** Admin panelinden verileri export edebilir veya Redis'teki tüm `luxury_gallery:*` anahtarlarını kopyalayabilirsiniz.

### Sık karşılaşılan sorunlar

| Sorun | Neden | Çözüm |
|-------|-------|-------|
| Kategoriler boş | Redis'te boş array | Son kodda dosyaya fallback var; redeploy et |
| Access Logs boş | Redis yok, log dosyası gitignore'da | `REDIS_URL` ekle |
| Görseller yüklenmiyor | R2 env eksik | `R2_*` değişkenlerini kontrol et |
| ERP e-posta gitmiyor | SMTP veya CRON_SECRET eksik | Env değişkenlerini ve cron loglarını kontrol et |
| Admin şifresi tutmuyor | Redis'te eski şifre | `ADMIN_PASSWORD` env ile override et |

### Platform taşıma

Netlify veya başka bir Node.js host'a taşımak mümkün. Redis + R2 platformdan bağımsızdır. Rehber: [`docs/NETLIFY-MIGRATION.md`](./NETLIFY-MIGRATION.md)

### Sürüm yönetimi

Her `git push` öncesi `package.json` ve `package-lock.json` içindeki `version` alanı artırılmalıdır (patch: `2.4.6` → `2.4.7`). Kural: `.cursor/rules/version-bump-before-push.mdc`

Uygulama içi sürüm gösterimi: `lib/app-version.ts` → `package.json`'dan okur.

---

## 17. İlgili Belgeler

| Belge | Konu |
|-------|------|
| [`README.md`](../README.md) | Hızlı başlangıç (İngilizce) |
| [`docs/R2-SETUP.md`](./R2-SETUP.md) | Cloudflare R2 kurulumu |
| [`docs/VERCEL-DATA.md`](./VERCEL-DATA.md) | Vercel'de veri/log sorunları |
| [`docs/NETLIFY-MIGRATION.md`](./NETLIFY-MIGRATION.md) | Netlify taşıma rehberi |
| [`docs/urun-tanitimi-kisa.md`](./urun-tanitimi-kisa.md) | Kısa ürün tanıtımı |
| [`docs/urun-tanitimi-detayli.md`](./urun-tanitimi-detayli.md) | Detaylı özellik listesi |
| [`.env.local.example`](../.env.local.example) | Ortam değişkeni şablonu |

---

*Bu belge proje kod tabanına göre hazırlanmıştır. Sürüm: 2.4.6 — Son güncelleme: Eylül 2026.*
