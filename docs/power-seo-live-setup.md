# İlkOku Power-SEO — canlı bağlantıları kurma ve kanıtlama

Bu proje 17 Power-SEO paketini içerir. Paket kurulumu, dış API erişimini **kanıtlamaz**.

## 1. Sunucu kimlik bilgileri

Yalnız **Hostinger / Node.js üretim sunucusu** üzerinde özel ortam değişkenlerini ayarlayın. Gerçek anahtarları GitHub'a, .env.example'a, browser localStorage'a veya destek sohbetine yapıştırmayın. Node sürecini kontrollü yeniden başlatın.

| Sağlayıcı | Gerekli üretim değişkenleri | Dış koşul |
| --- | --- | --- |
| Google Search Console (OAuth) | GSC_OAUTH_CLIENT_ID, GSC_OAUTH_CLIENT_SECRET, GSC_OAUTH_REFRESH_TOKEN, GSC_SITE_URL | property erişimi, webmasters.readonly izni |
| Google Search Console (alternatif servis hesabı) | GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GSC_SITE_URL | servis hesabını GSC property kullanıcısı olarak ekleyin |
| Ahrefs | AHREFS_API_KEY (veya AHREFS_API_TOKEN) | API erişimli abonelik |
| Semrush | SEMRUSH_API_KEY | Semrush API hakkı / kota |
| OpenAI | OPENAI_API_KEY | ayrı API hesabı, faturalama ve harcama limiti |

GSC_SITE_URL için mevcut GitHub tanı sisteminin kullandığı varsayılan property: `sc-domain:ilkoku.com`. Diğer alias'lar `GOOGLE_SEARCH_CONSOLE_PROPERTY` veya `GSC_PROPERTY` biçimindedir. Ortam anahtarı hiç yoksa API `https://ilkoku.com/` URL-prefix property dener; bu property ayrıca doğrulanmış olmalıdır.

## 2. Canlı test adımları

1. Yönetici olarak `https://ilkoku.com/sistem-yonetimi/power-seo` adresini açın.
2. Harici servisler alanında `Yapılandırma algılandı — API doğrulanmadı` görünene kadar hosting ayarlarını kontrol edin. Bu yalnız **değişkenlerin varlığıdır**.
3. Her sağlayıcının düğmesine ayrı basın. Sadece `state: verified` ve gerçek sağlayıcı alanları döndüğünde API çağrısı çalışır. `missing` ve `error` başarısız veya yapılandırılmamış anlamına gelir.
4. GSC 0 sayfa döndürürse, bu property erişiminin **doğrulandığı**, fakat yalnız örneklemin boş olduğu anlamına gelir. Genel Google indeksleme sayısı değildir.
   - Ayrı **GSC indeks durumunu sorgula** düğmesiyle yalnız tek bir public URL için Google URL Inspection API'nin kayıtlı indeksleme durumunu ve son tarama tarihini okuyabilirsiniz. Bu, canlı URL testi veya indeksleme isteği değildir; Google OAuth `webmasters.readonly` yetkisini kullanır.
5. `?mod=full-links` panelinde kullanıcı başlatmalı tam tarama ve JSON raporunu indirin; sadece `summary.complete=true` ve `pages.length=urls.length` iken tam sitemap analizi yapıldığını söyleyin.
6. GitHub Actions `Power-SEO Live Sitemap Census` raporu alternatif read-only tanıdır; sitemap HTTP, canonical ve robots sonuçlarını ayrı artifact'te tutar. Admin taramasını veya Google indeks durumunu taklit etmez.

## 3. Hata ayırımı

- `401`: yönetici oturumu yok.
- `403 Geçersiz istek kaynağı`: Origin/CSRF güvenliği; sabit public `https://ilkoku.com` adresi kontrol edilir, proxy iç hostname'i kullanılmaz.
- `Yetkilendirme gerekli`: Node üretim sürecinde secret varlığı algılanmadı. GitHub Actions secrets, Hostinger Node ortamına otomatik aktarılmaz.
- `missing`: istenen sağlayıcı için gerekli üretim credential yok.
- `error`: servis, abonelik/kota, kapsam veya ağ hatası; sunucu günlüklerini **anahtarları açığa çıkarmadan** inceleyin.
- `verified`: belirli bir sağlayıcı isteği yanıt verdi; tüm URL'lerin indekslendiği veya tüm modüllerin eksiksiz çalıştığı iddiası değildir.

## 4. Değişmez kurallar

Public robots, canonical, sitemap, Kitap Endeksi `noindex`/publish gate, mevcut GA4/GTM ve site tasarımı değiştirilmez. API sorguları yalnız kullanıcı tıklamasıyla yapılır ve ücretli olabilir. Site taraması yalnız okumadır, başlık/metadata otomatik yayınlanmaz.
