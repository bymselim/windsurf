# Netlify'a Geçiş ve Veri Taşıma Rehberi

## Özet

Projenizde **veritabanı** olarak kullanılan servisler:
1. **Redis (Upstash)** – Kategoriler, loglar, ayarlar, FAQ erişim kayıtları
2. **Vercel Blob** – Eser görselleri (upload)

Her ikisi de **platform bağımsız**. Netlify'a geçerken veriyi taşımaya gerek yok; sadece environment variable'ları Netlify'a eklemeniz yeterli.

---

## 1. Netlify'a Deploy

### Adım 1: Netlify hesabı ve site oluşturma

1. [Netlify](https://netlify.com) hesabı açın (GitHub ile giriş yapabilirsiniz)
2. **Add new site** → **Import an existing project**
3. GitHub repo'nuzu seçin (`bymselim/windsurf` veya ilgili repo)
4. Branch: `main`
5. Build ayarları (otomatik algılanır):
   - **Build command:** `npm run build` veya `next build`
   - **Publish directory:** `.next` (Next.js için Netlify otomatik ayarlar)
   - **Functions directory:** (boş bırakın, Next.js API routes otomatik işlenir)

### Adım 2: netlify.toml (opsiyonel)

Proje köküne `netlify.toml` ekleyebilirsiniz:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"
```

---

## 2. Environment Variables Taşıma

Vercel'deki tüm environment variable'ları Netlify'a kopyalayın.

### Vercel'den değerleri alma

1. Vercel Dashboard → Projeniz → **Settings** → **Environment Variables**
2. Her değişkenin değerini kopyalayın (gizli değerler için "Reveal" tıklayın)

### Netlify'a ekleme

1. Netlify Dashboard → Siteniz → **Site configuration** → **Environment variables**
2. **Add a variable** ile tek tek ekleyin veya **Import from .env** ile toplu ekleyin

### Gerekli değişkenler (tahmini)

| Değişken | Açıklama |
|----------|----------|
| `REDIS_URL` | Upstash Redis bağlantı URL'si (KV verisi) |
| `KV_REST_API_URL` | (Alternatif) Upstash REST API URL |
| `KV_REST_API_TOKEN` | (Alternatif) Upstash REST API token |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (mevcut görseller için) |
| `ADMIN_PASSWORD_HASH` | Admin panel şifresi (varsa) |
| `NEXTAUTH_SECRET` veya benzeri | Auth secret (varsa) |

**Önemli:** `BLOB_READ_WRITE_TOKEN` Vercel Blob için. Bu token Netlify'dan da çalışır; Vercel Blob API'si platform bağımsızdır. Mevcut görselleriniz aynen kalır, taşımaya gerek yok.

---

## 3. Redis Verisi – Taşımaya Gerek Yok

- **Upstash Redis** Vercel'e veya Netlify'a bağlı değildir
- Aynı `REDIS_URL` ile Netlify'dan da bağlanırsınız
- Veriler Redis'te kalır; sadece uygulama farklı platformda çalışır

---

## 4. Vercel Blob (Görseller) – Taşımaya Gerek Yok

- Vercel Blob, `BLOB_READ_WRITE_TOKEN` ile erişilir
- Bu token Netlify'dan da geçerlidir
- Mevcut görseller aynı URL'lerle çalışmaya devam eder

**Alternatif:** İleride tamamen Netlify'a geçmek isterseniz:
- [Netlify Blob](https://docs.netlify.com/blobs/overview/) (beta)
- Cloudinary
- AWS S3

Bu durumda kodda `@vercel/blob` yerine yeni storage client kullanmanız gerekir.

---

## 5. Kod Değişiklikleri (Vercel-Specific)

Projede Vercel'e özel birkaç kullanım var. Netlify ile uyumlu olması için şunlar güncellenmeli:

### 5.1 IP ve country header'ları

`app/api/faq-access/route.ts` ve `app/api/auth/route.ts` içinde:

- `x-vercel-forwarded-for` → `x-forwarded-for` (Netlify da bunu set eder)
- `x-vercel-ip-country` → `x-nf-request-country` veya `cf-ipcountry` (Netlify Cloudflare kullanıyorsa)

Önerilen yaklaşım: Her iki platformu destekleyen bir helper:

```ts
// lib/get-client-ip.ts
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  return (
    forwardedFor.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-nf-client-connection-ip") ||
    ""
  );
}
```

### 5.2 Base URL (validate-urls)

`app/api/admin/artworks/validate-urls/route.ts`:

- `process.env.VERCEL_URL` → Netlify'da `URL` veya `NETLIFY_URL` kullanılabilir

```ts
const baseUrl = process.env.URL || process.env.VERCEL_URL
  ? `https://${process.env.URL || process.env.VERCEL_URL}`
  : "";
```

---

## 6. Özet Checklist

- [ ] Netlify'da site oluştur, GitHub repo bağla
- [ ] Tüm environment variable'ları Netlify'a ekle
- [ ] (Opsiyonel) IP/URL helper'larını güncelle
- [ ] Deploy tetikle (push veya manuel)
- [ ] Test: Admin panel, galeri, FAQ, upload

---

## 7. Domain ve SSL

- Netlify varsayılan `*.netlify.app` domain ve SSL sağlar
- Özel domain: **Domain settings** → **Add custom domain**
- SSL otomatik (Let's Encrypt)

---

## 8. Vercel'den Tamamen Geçiş

Netlify stabil çalıştıktan sonra:

1. Production domain'i Netlify'a yönlendirin
2. Vercel projesini durdurabilir veya silebilirsiniz
3. `BLOB_READ_WRITE_TOKEN` Vercel Blob hesabına bağlı; Vercel hesabını kapatsanız bile Blob storage ayrı bir servis olarak çalışmaya devam edebilir (Vercel dokümantasyonunu kontrol edin)
