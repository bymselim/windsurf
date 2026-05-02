# Melike ArtWorks Galeri Sistemi — Detaylı özellik özeti

Bu doküman, sistemi üçüncü şahıslara veya müşterilere satın alma / lisans değerlendirmesi için sunabileceğiniz ürün seviyesinde bir özellik listesidir. Teknik mimari: **Next.js (App Router)**, üretimde tipik olarak **Vercel** ve isteğe bağlı **Blob / KV** ile ölçeklenebilir dağıtım.

---

## 1. Ziyaretçi vitrini (galeri)

- **Çift dil:** Türkçe (`/turkish/gallery`) ve İngilizce (`/international/gallery`) galeri; ayrıca genel `/gallery` rotası.
- **Kategori ızgarası:** Kategorilere göre görsel önizleme; kategori seçimi **URL ile (`?cat=KategoriAdı`)** senkron — mobil cihazlarda **geri** hareketi önce katalog görünümüne döner (tek sayfa içi “hayalet” gezinme yok).
- **Eser ızgarası:** Masonry düzen; görsel / video desteği; thumbnail ile hızlı yükleme.
- **Lightbox:** Eser detayı, ok tuşları ve kaydırma; **sipariş** için WhatsApp, e-posta ve Instagram seçenekleri (dil sırasına göre düzenlenir).
- **Fiyat gösterimi:** Eserde varyant listesi veya tek fiyat; kategori varsayılan listesi ve birleşik açıklama metinleriyle uyumlu sunum.

---

## 2. Fiyat ve kategori mantığı (işletme tarafı)

- **Kategori bazlı varsayılan fiyat satırları:** Ölçü + TRY (+ isteğe bağlı USD); İngilizce galeride `sizeEN` ile ölçü etiketi.
- **Kategori sabit açıklamaları (TR/EN):** Modalda üstte; esere özel **ek** açıklama ile birleştirilir.
- **Eser bazında fiyat kaynağı:** Otomatik / her zaman kategori listesi / sadece eserin kendi varyantları.
- **Toplu zam ve indirim (admin):** Seçili veya filtrelenmiş eserlere yüzde uygulama; **TRY** en yakın **binliğe**, **USD** en yakın **yüzlüğe** yuvarlanır; negatif yüzde ile indirim.
- **Kategori toplu sabit fiyat:** Aynı kategorideki tüm eserlere ana TRY/USD atama (tabloda; kayıt ile diske yazılır).

---

## 3. Yönetim paneli (admin)

- **Oturum:** Tarayıcı + sunucu çerezi; şifre yönetimi **Ayarlar** üzerinden; isteğe bağlı header ile API erişimi.
- **Eser editörü (TR/EN):** Başlık, açıklama, kategori, öne çıkan, varyant satırları, fiyat kaynağı seçimi; toplu kayıt.
- **Toplu işlemler:** Başlık, kategori, fiyat, açıklama, varyant seti — seçili eserlere tek seferde uygulama.
- **Yardım ipuçları:** Yoğun ekranlarda `?` ile kısa açıklama (bilgi balonu).
- **Medya:** Yükleme sayfası; ölü görsel linki taraması; eksik thumbnail üretimi.
- **Çeviri yardımı:** TR açıklamasından EN üretimi (harici çeviri API’si ile entegre edilebilir akış).
- **Kategoriler:** Sıra, renk, ikon, önizleme görseli, gizle/göster; varsayılan fiyat listesi ve sabit açıklamalar.

---

## 4. Güvenlik, giriş ve kayıtlar

- **Admin erişimi:** Şifre ile giriş; çıkışta yerel ve isteğe bağlı header temizliği.
- **Erişim günlükleri (access logs):** Admin oturumları / ilgili kayıtların izlenmesi.
- **Gate (ön kapı) günlükleri:** Telefon tabanlı şifre / kapı denemelerinin kaydı (yönetimde ayrı sayfa).
- **Hassas dosyalar:** `.gitignore` ile üretimde oluşan şifre ve günlük dosyalarının repoya girmemesi hedeflenir.

---

## 5. Ziyaretçi analitiği

- **Oturum günlüğü (hafif):** Ziyaret edilen sayfalar ve açılan eserler; sayfa kapanırken toplu gönderim (`keepalive`) ile ağ yükü sınırlı tutulur.
- **Analytics paneli:** Özet istatistikler (admin tarafında).

---

## 6. SSS (FAQ)

- **Slug tabanlı SSS sayfaları:** Her soru-cevap için ayrı rota; erişim için isteğe bağlı kapı bileşeni.
- **FAQ erişim kayıtları:** Hangi bağlantıların açıldığının adminde izlenmesi.

---

## 7. İçerik ve site ayarları

- **Karşılama metni, alıntılar, galeri giriş metinleri:** Ayarlar / alıntılar yönetimi ile düzenlenebilir (TR/EN).
- **Kategori önizleme süreleri:** Dönüş ve geçiş süreleri yapılandırılabilir.

---

## 8. Dağıtım ve veri

- **JSON / KV:** Kategoriler ve eserler dosya veya KV üzerinden; Vercel Blob ile medya URL’leri.
- **Dinamik API:** Galeri ve admin uçları; ham admin verisi ile birleştirilmiş halka açık cevap ayrımı (fiyat birleştirme).

---

## Satış / lisans için özet cümle

Bu paket; **çok dilli vitrin**, **merkezi fiyat ve metin yönetimi**, **ziyaretçi ve güvenlik kayıtları** ve **üretime yakın dağıtım** ihtiyacı olan sanat galerileri ve stüdyolar için uçtan uca bir web ürünüdür. İsterseniz marka ve metinleri müşteriye göre özelleştirerek “beyaz etiket” sunumu yapılabilir.
