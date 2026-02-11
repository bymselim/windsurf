# Vercel'de Kategoriler ve Loglar

## Neden boş görünüyor?

### 1. Access logları (loglar)
- `lib/data/access-logs.json` **.gitignore'da** → repoda yok, Vercel’e hiç gitmez.
- Sunucu önce **Redis/KV**’den okur; yoksa dosyadan okumaya çalışır. Dosya Vercel’de olmadığı için loglar boş döner.
- **Çözüm:** Vercel’de kalıcı depolama için **Redis (Upstash)** kullanın. Projede `REDIS_URL` veya `KV_REST_API_*` tanımlı olmalı.

### 2. Kategoriler
- Kategoriler önce **Redis/KV**’den okunur. Redis’te `luxury_gallery:categories` **boş array (`[]`)** ise kod dosyaya hiç düşmeden boş döner.
- Kod güncellendi: KV’den boş array gelse bile artık **dosyaya fallback** yapılıyor (`lib/data/categories.json` repoda ve Vercel’de var). Yeni deploy sonrası kategoriler tekrar görünmeli.

## Yapmanız gerekenler

1. **Vercel Dashboard → Proje → Settings → Environment Variables**
   - **Redis kullanıyorsanız:** `REDIS_URL` tanımlı olsun (Upstash veya kullandığınız Redis servisi).
   - Eski **Vercel KV** kullanıyorsanız: Artık deprecated; Vercel’in önerdiği şekilde **Upstash Redis**’e geçip `REDIS_URL` ekleyin.

2. **Deploy**
   - Bu repodaki son değişiklikleri push edip yeni bir deploy alın. Kategoriler için boş-KV fallback’i böyle devreye girer.

3. **Loglar**
   - Redis bağlandıktan sonra yeni girişler Redis’e yazılır; admin paneldeki Access Logs sayfasında görünür.
   - Eski loglar sadece lokalde veya eski KV’de kaldıysa Vercel’de geri gelmez; sadece yeni loglar birikir.

## Özet
- **Kategoriler:** Son kodla KV boş olsa bile `lib/data/categories.json` kullanılıyor; deploy sonrası düzelir.
- **Loglar:** Vercel’de logların görünmesi için **REDIS_URL** (veya geçerli KV) tanımlı olmalı; aksi halde log dosyası orada olmadığı için liste hep boş kalır.
