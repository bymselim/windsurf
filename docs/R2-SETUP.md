# Cloudflare R2 ile medya depolama

Bu proje medya yüklemeleri için **Cloudflare R2** (S3 uyumlu API) kullanır. `R2_*` ortam değişkenleri üretimde tanımlı olmalıdır.

## 1) Cloudflare’de

1. **R2** → Create bucket (ör. `gallery-media`).
2. **Settings → Public access** (veya bucket için **R2.dev subdomain** / **Custom Domain**) ile dosyaların HTTPS ile okunmasını açın.  
   - Public URL örneği: `https://pub-xxxxxxxxx.r2.dev` veya `https://cdn.sizin-domain.com`
3. **R2 → Manage R2 API Tokens** → Object Read & Write yetkili token oluşturun (Access Key ID + Secret Access Key).
4. **Account ID**: Cloudflare sağ üst veya R2 genel sayfasından kopyalayın.

## 2) Vercel ortam değişkenleri

Projede **Production** (ve gerekirse Preview) için ekleyin:

| Değişken | Örnek / açıklama |
|----------|------------------|
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | Bucket adı |
| `R2_PUBLIC_BASE_URL` | Public kök, **sonunda /** olmadan. Örn: `https://pub-xxxxx.r2.dev` |
| `NEXT_PUBLIC_R2_IMAGE_HOST` | Sadece **hostname** (Next Image için). Örn: `pub-xxxxx.r2.dev` veya `cdn.sizin-domain.com` |

> `NEXT_PUBLIC_*` değişkeni deploy sonrası `next.config.js` içinde `images.remotePatterns` için kullanılır; değiştirdikten sonra **yeniden deploy** gerekir.

## 3) Eski depodan R2’ye geçiş

1. Eski ortamdaki dosyaları bilgisayara veya doğrudan R2’ye kopyalayın (Cloudflare **Super Slurper** veya `rclone`).
2. Eser kayıtlarındaki `filename` / `thumbnailFilename` URL’lerini yeni R2 public URL’leri ile güncelleyin (admin veya JSON düzenlemesi).

Yerel `public/artworks` klasöründen toplu yükleme:

```bash
npm run upload:r2
```

(`R2_*` dolu olmalı; çıktı: `scripts/blob-mapping.json`)

## 4) Vercel Blob → R2 toplu taşıma (kategori kategori)

Üretim verisini güncellemek için makinede proje kökünde, `.env.local` içinde **R2_*** ve **REDIS_URL** (KV kullanıyorsanız) tanımlı olsun.

```bash
# Blob URL’si olan kategorileri listele
npm run migrate:blob-to-r2 -- --list-categories

# Önce kuru deneme (kayıt yazılmaz)
npm run migrate:blob-to-r2 -- --category=Stone --dry-run

# Tek kategori
npm run migrate:blob-to-r2 -- --category=Stone

# İlk 10 eser (test)
npm run migrate:blob-to-r2 -- --category=Stone --limit=10

# Tüm kategoriler (dikkat: uzun sürer)
npm run migrate:blob-to-r2 -- --all
```

Dosyalar R2’de `migrated/artworks/{Kategori}/` altına konur; aynı Blob URL tekrar görülürse yeniden indirilmez (önbellek).

## 5) Maliyet

Güncel tablo: [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
