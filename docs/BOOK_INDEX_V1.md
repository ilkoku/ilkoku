# İlkOku Kitap Endeksi V1

## Amaç

İlkOku Kitap Endeksi, dış kitap satış platformlarının kendi çok satan
listelerini kaynak bazında takip eder, sıralama snapshot'larını tarihsel olarak
saklar ve ayrı bir **İlkOku Türkiye Kitap Endeksi** üretir.

Bu ürün dış kaynak listesini İlkOku satışı gibi göstermemelidir.

## Değişmez ürün kuralları

1. Kaynak sıralaması kaynak adına gösterilir; İlkOku tarafından yeniden
   adlandırılmaz.
2. İlkOku Türkiye Endeksi ayrı bir bileşik sıralamadır.
3. Türkiye Endeksi'nde **1 kaynak = 1 oy**.
4. Başlangıç uygunluk eşiği **en az 3 bağımsız Türkiye kaynağıdır**.
5. Kaynaklar başlangıçta eşit ağırlıklıdır.
6. Amazon Türkiye Türkiye Endeksi'ne katılabilir.
7. Amazon ABD ayrı pazardır ve Türkiye Endeksi'ne katılmaz.
8. Ham gözlemler overwrite edilmez; her fetch run kendi snapshot'ını korur.
9. Eşleştirme önceliği: ISBN-13 → ISBN-10 → normalize başlık+yazar →
   admin manuel eşleştirme.
10. Bir kaynak adaptörünün bozulması diğer kaynakların collection akışını
    durdurmamalıdır.
11. Public SEO sayfaları veri kalitesi ve yeterli tarihsel kapsam oluşmadan
    indexe açılmaz.
12. Sponsor içerik organik sıralamayı asla değiştiremez. Sponsor slotları
    açıkça "Sponsorlu" olarak ayrılır ve sponsor yoksa public layout'ta boşluk
    bırakmaz.

## V1 çekirdek kaynaklar

- Kitapyurdu
- BKM Kitap
- D&R
- idefix
- Penguen Kitabevi
- Remzi Kitabevi
- Amazon Türkiye
- Amazon ABD — ayrı pazar

## Faz 2 kaynak adayları

KitapSepeti, KitapSeç, Kitapzen, İnkılâp Kitabevi, Hepsiburada, Trendyol,
PttAVM.

## Veri katmanları

### Kaynak

`BookIndexSource`, dış platformun kimliğini ve Türkiye Endeksi'ne dahil olup
olmadığını tutar.

### Kaynak listesi

`BookIndexList`, kaynak içindeki belirli çok satan listesini tanımlar.
Kategori, dönem, maksimum sıra, kaynak URL ve composite eligibility burada
saklanır.

### Dış kitap

`BookIndexExternalBook`, kaynağın gördüğü kitabın kaynağa özgü kaydıdır.
Kaynak metni korunur; master kitapla eşleşme ayrı tutulur.

### Master kitap

`BookIndexBook`, aynı kitabın farklı platform kayıtlarını birleştiren
İlkOku kimliğidir.

### Fetch run ve observation

`BookIndexFetchRun` kaynak liste çekimini izole eder.
`BookIndexObservation` o run içindeki rank snapshot'ıdır. Geçmiş observation
silinmez ve güncel rank ile overwrite edilmez.

## Türkiye Endeksi V1 hesaplama kontratı

Bir listenin rankı `1..N` aralığında 1–100 ölçeğine normalize edilir:

`score = ((N - rank + 1) / N) * 100`

Aynı kaynak birden fazla uygun gözlem üretirse önce explicit list priority,
eşitlikte en güncel gözlem seçilir. Böylece tek kaynak birden fazla oy
üretemez.

En az üç benzersiz Türkiye kaynağı bulunmadığında kitap Türkiye Endeksi için
uygun değildir.

İlk V1'de kaynak ağırlıkları eşittir. İleride ağırlık değişecekse algoritma
versiyonlanmalı ve geçmiş endeks sonuçlarının hangi versiyonla hesaplandığı
saklanmalıdır.

## Yönetim yüzeyi

Tek giriş noktası:

`/sistem-yonetimi/kitap-endeksi`

Bu alan ileride planlanan **Ana Panel** konsolidasyonuna uyumlu kalmalıdır;
Kitap Endeksi için ikinci bir bağımsız admin kabuğu oluşturulmamalıdır.

Yönetim ekranında zamanla:

- kaynak sağlık durumu,
- son başarılı/başarısız run,
- eşleşmeyen kitaplar,
- manuel eşleştirme,
- kaynak aç/kapat,
- liste ve scheduler durumu,
- public SEO readiness

yer alacaktır.

## Public/SEO rollout

İlk foundation PR public indexable sayfa oluşturmaz.

Public rollout ancak gerçek veri biriktikten sonra yapılır:

- `/en-cok-satanlar`
- `/en-cok-satanlar/turkiye`
- `/en-cok-satanlar/amazon-tr`
- `/en-cok-satanlar/amazon-us`
- kaynak sayfaları
- kategori sayfaları
- yükselenler / yeni girişler / her yerde satanlar / uzun satanlar
- tarihsel arşiv

Sitemap açılımı ayrı bir kalite kapısından geçmelidir.

## Sponsor entegrasyonu

Sponsor altyapısı default OFF kalır. İleride:

- 7 ana yazarlık kategorisi,
- tür/eğitim rehberleri,
- Kitap Endeksi kategori sayfaları,
- bestseller liste içi sponsor kartları

için slotlar açılabilir.

Sponsorlu kartlar organik rank dizisine eklenmez ve sıra numarası almaz.

## Collector rollout notları — 25 Eylül 2026

İlk canlı collector dalgası kaynak başına ayrı doğrulanır. Anti-bot veya erişim
engeli görülen kaynaklarda korumayı aşmaya çalışılmaz; kaynak `blocked` kalır
ve resmi API/feed/izin yolu araştırılır.

### Remzi Kitabevi

- `https://www.remzi.com.tr/robots.txt`: `User-agent: * / Disallow:`
- `https://www.remzi.com.tr/anasayfa`: şeffaf İlkOku user-agent ile HTTP 200.
- Çok satan bölümü server-rendered HTML içinde `#best-sellers` altında yer
  alıyor.
- Güncel Türkçe liste `ol.turkish-books` içinde; kitap linki
  `a.book-name`, yazar `/yazar/...` altında `h4`, yayınevi parantezli
  `span` içinde bulunuyor.
- Liste haftalık olduğu için V1 kontrol tavanı günde 1 kezdir.
- İlk aşamada otomatik scheduler yoktur; admin üzerinden kontrollü canlı
  doğrulama yapılır.

Robots erişimi tek başına içerik kullanım lisansı anlamına gelmez. Operasyonel
erişim ile kaynak kullanım koşulları ayrı değerlendirilir.

### Kitapyurdu

- Public çok satan sayfası normal arama motorlarında görünür.
- `robots.txt` public çok satan yolunu kapatmıyor.
- Buna rağmen şeffaf `IlkOkuBookIndex` user-agent ile yapılan doğrudan sunucu
  isteği HTTP 403 döndürdü.
- Koruma aşılmayacak. Kaynak V1 registry içinde `blocked` kalacak; resmi
  erişim/API/feed veya açık izin yolu bulunmadan collector aktive edilmeyecek.

### BKM Kitap

- Public çok satan sayfası şeffaf user-agent ile HTTP 200 döndürüyor.
- `robots.txt` genel erişime `Allow: /` veriyor ve Cloudflare content signal
  satırında `search=yes, ai-train=no, use=reference` bildiriyor.
- Collector henüz aktive edilmedi; ürün markup parser'ı ayrıca doğrulanacak.

### Penguen Kitabevi

- `robots.txt` genel erişimi engellemiyor.
- Ana sayfa HTTP 200 dönüyor fakat doğruladığımız HTML'de güvenilir ayrı
  bestseller işareti bulunmadı.
- Kaynak `researching` durumunda kalır; tahmin edilen/uydurulan liste
  collector'ı yazılmaz.



### BKM Kitap collector

25 Eylül 2026 teknik doğrulamasında BKM Çok Satanlar sayfasının tarayıcıda
`https://bkm-best.wawlabs.com/top_sellers` public JSON beslemesini kullandığı
doğrudan network kaydından doğrulandı.

- `span=week` → 500 kayıt, `tip=Hafta`
- `span=month` → 500 kayıt, `tip=Ay`
- `span=year` → 500 kayıt, `tip=Yil`
- Feed; başlık, yazar, yayınevi/marka, GTIN/ISBN, ürün linki, görsel ve fiyat
  alanlarını sağlıyor.
- V1 public/read model için her dönemden yalnızca **Top 50** saklanır.
- Türkiye bileşik endeksine BKM'den yalnız **haftalık genel liste** oy verir.
  Aylık ve yıllık listeler kaynak görünümü/tarihçe içindir.
- Feed içindeki satış miktarı alanları public İlkOku yüzeyinde gösterilmez ve
  V1 veri modelinde ayrıca saklanmaz.


### Amazon Türkiye / Amazon ABD erişim kararı — 25 Eylül 2026

Amazon kaynakları V1'de iki ayrı pazar olarak tutulur.

**Amazon Türkiye**

- `https://www.amazon.com.tr/gp/bestsellers/books` şeffaf
  `IlkOkuBookIndex/0.1 (+https://ilkoku.com)` user-agent ile HTTP 200
  döndürüyor.
- Headless browser doğrulamasında aynı user-agent ile 30 görünür bestseller
  kartı, ASIN ve `#1..#30` rank işaretleri görüldü.
- Sayfada `data-client-recs-list` içinde rank metadata'sı bulunuyor; ancak
  düz sunucu isteği ile tarayıcı çıktısı aynı veri yoğunluğunu kararlı biçimde
  vermedi.
- Network kaydında ayrı, basit ve üretimde headless gerektirmeden
  kullanılabilecek bestseller JSON endpoint'i doğrulanmadı.
- Bu nedenle Amazon TR **researching** kalır. Üretim collector'ı sırf
  headless browser gerektiren kırılgan bir akışa bağlanmaz.

**Amazon ABD**

- `https://www.amazon.com/Best-Sellers-Books/zgbs/books` şeffaf kaynak
  isteğinde Amazon'un `automated access` / CAPTCHA sayfasını döndürdü.
- CAPTCHA, stealth user-agent, proxy veya başka anti-bot aşma yöntemi
  kullanılmayacak.
- Kaynak V1 registry içinde **blocked** tutulur. Resmi/sanctioned veri yolu
  bulunursa yeniden değerlendirilir.


### D&R erişim kararı — 25 Eylül 2026

- Çok satan kataloğu için şeffaf `IlkOkuBookIndex/0.1 (+https://ilkoku.com)`
  sunucu isteği HTTP 403 döndürdü.
- Aynı erişim katmanı `robots.txt` isteğini de normal robots metni yerine
  "Sizin İçin Çalışıyoruz" bakım/koruma sayfasına yönlendirdi.
- Anti-bot/erişim koruması aşılmayacak.
- D&R V1 registry içinde **blocked** tutulur; resmi feed/API veya açık izinli
  erişim yolu doğrulanmadan collector aktive edilmez.

### idefix

- `https://www.idefix.com/cok-satanlar-l-162` şeffaf İlkOku user-agent ile HTTP 200 döndürüyor.
- `robots.txt` bu exact çok-satanlar yolunu açıkça `Allow` ediyor.
- Sayfa server-rendered `__NEXT_DATA__` JSON içinde güncel kitap kartlarını veriyor; bu nedenle headless browser gerekmiyor.
- Kaynak JSON içinde sponsorlu kartlar `isSponsored=true` olarak işaretleniyor.
- İlkOku Türkiye Endeksi'nde kaynak sponsorlu kartlar oy kullanmaz; yalnız organik sıra korunur ve bitişik rank olarak yeniden numaralanır.
- V1 listesi ilk sayfadaki organik kitaplarla sınırlıdır; otomatik pagination eklenmeden önce ayrıca doğrulama yapılacaktır.

