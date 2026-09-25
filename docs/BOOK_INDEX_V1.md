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
- KitapSepeti
- Kitapzen
- İnkılâp Kitabevi

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

### SEO kalite kapısı foundation

SEO kalite kapısı iki ayrı anahtar kullanır:

1. **Gate evaluation:** `BOOK_INDEX_SEO_GATE_ENABLED=true`
2. **Publication:** `BOOK_INDEX_SEO_PUBLISH_ENABLED=true`

Gate için gereken minimum composite kaynak, eşleşme kapsamı, tarihsel gün ve
Türkiye Endeksi sonuç sayısı kod içinde varsayılan olarak belirlenmez.
Eşiklerin tamamı ve `BOOK_INDEX_SEO_POLICY_VERSION` açıkça yapılandırılmadan
durum `policy_incomplete` kalır.

Gate ancak şu gerçek readiness ölçümlerini değerlendirir:

- başarılı composite kaynak sayısı,
- master kitap eşleşme yüzdesi,
- tarihsel snapshot gün sayısı,
- üretilebilen Türkiye Endeksi kayıt sayısı.

Kanıtlar eşikleri geçse bile ayrı publication anahtarı açılmadıkça
`canPublish=false` kalır. Bu foundation PR sitemap veya public route
yayınlamaz.

### Gated public route kabuğu

İlk public route kabuğu iki yüzey için hazırlanır:

- `/en-cok-satanlar`
- `/en-cok-satanlar/turkiye`

Bu route'lar kodda bulunsa da yayın kapısı açık değilse public sayfa olarak
davranmaz:

1. `BOOK_INDEX_SEO_GATE_ENABLED=true`
2. `BOOK_INDEX_SEO_PUBLISH_ENABLED=true`
3. Policy version ve dört kalite eşiği eksiksiz
4. Güncel readiness kanıtları tüm eşikleri geçiyor

Bu zincirin herhangi bir adımı sağlanmazsa route `notFound()` ile 404 döner
ve metadata `noindex` kalır. Ana menüdeki **En Çok Satanlar** bağlantısı da
aynı public access gate'ine bağlıdır; gate geçmeden gösterilmez.

Türkiye route'u ayrıca gerçekten üretilebilir Türkiye Endeksi verisi yoksa
404 davranışını korur.

### Kontrollü sitemap wiring

Sitemap, Kitap Endeksi URL'lerini statik olarak yayınlamaz. Ayrı
`loadBookIndexSitemapEntries()` helper'ı aynı public access gate'ini
değerlendirir.

Yalnız şu koşullarda iki URL sitemap'e eklenebilir:

- public gate ve publication anahtarları açık,
- policy eksiksiz,
- readiness kanıtları eşikleri geçmiş,
- Türkiye Endeksi gerçekten `available`.

Bu durumda:

- `/en-cok-satanlar`
- `/en-cok-satanlar/turkiye`

eklenir. Gate kapalıysa, policy eksikse, veri yetersizse veya helper hata
verirse boş liste döner. Genel sitemap DB/CMS fallback'i de Kitap Endeksi
URL'lerini içermez. Ana menü bağlantısı aynı gate geçildiğinde **Destek** ana
menüsünün hemen yanında görünür ve doğrudan `/en-cok-satanlar` sayfasına gider.

### Trafik ve arama görünürlüğü sinyalleri

Public gate geçildiğinde Kitap Endeksi iki katmanda arama motorlarına güncel
sinyal verir:

- ranking satırları `ItemList` + `Book` structured data ile işaretlenir;
- `CollectionPage.dateModified` ve sitemap `lastModified` gerçek son
  snapshot zamanından üretilir;
- sayfada son veri güncellemesi kullanıcıya görünür;
- yöntem/metodoloji metni organik sıralamayı, bağımsız kaynak kuralını ve
  sponsor ayrımını açıklar;
- IndexNow, kod değişikliklerinde mevcut sitemap seçimini kullanmaya devam eder;
- ayrıca günlük scheduled refresh yalnız sitemap'te gerçekten yayınlanmış
  `/en-cok-satanlar` URL'lerini gönderir.

Gate kapalıyken URL'ler sitemap'te olmadığı için scheduled IndexNow refresh
boş liste üretir; publication gate bypass edilmez.

### Public read-model sözleşmesi

Public route açılmadan önce server-side veri sözleşmesi dört yüzeyi hazırlar:

- **Türkiye:** mevcut bileşik Türkiye Endeksi read-model'i kullanılır.
- **Amazon Türkiye:** sanctioned/stabil collector oluşana kadar `researching`
  availability döner; sahte/boş bestseller listesi üretilmez.
- **Amazon ABD:** erişim engeli sürdüğü sürece `blocked` availability döner.
- **Kaynak listeleri:** her listenin yalnız son başarılı/`no_change`
  snapshot'ı, kaynağın kendi `rank` sırasıyla döner.

Kaynak rankı ile İlkOku Türkiye Endeksi puanı aynı veri alanına karıştırılmaz.
Public fiyat alanı JSON-safe string olarak taşınır; `BigInt` doğrudan public
katmana sızdırılmaz.

Bu read-model tek başına route veya sitemap açmaz; `publicRolloutState=gated`
kalır.

### İçgörü read-model sözleşmesi

Public yüzeyler açılmadan önce dört türe ait read-model hazırlanır:

- **Yeni girişler:** son başarılı snapshot'ta görünen, aynı listenin bir önceki
  başarılı snapshot'ında bulunmayan eşleşmiş master kitaplar.
- **Yükselenler:** aynı listede önceki başarılı snapshot'a göre rankı iyileşen
  eşleşmiş master kitaplar; artış kaynak ve sıra farkıyla ölçülür.
- **Her yerde satanlar:** mevcut composite snapshot'larda en az
  `TURKEY_INDEX_MIN_SOURCES` bağımsız Türkiye kaynağında bulunan kitaplar.
- **Uzun satanlar:** composite observation geçmişindeki ilk/son görülme zamanı,
  tarihsel gün sayısı, bağımsız kaynak ve observation sayısıyla sıralanır.

Bu modeller sabit “7 gün/30 gün” gibi henüz kanıtlanmamış eşikler üretmez.
Gerçek snapshot geçmişi biriktikçe public ürün etiketleri ayrıca kilitlenir.

### Kaynak bazlı SEO sayfaları

Public gate geçtikten sonra yalnız gerçek başarılı snapshot içeren kaynaklar
için kaynak-native arama sayfaları yayınlanabilir.

İlk slug sözleşmesi:

- BKM Kitap → `/en-cok-satanlar/kaynak/bkm-kitap`
- Remzi Kitabevi → `/en-cok-satanlar/kaynak/remzi-kitabevi`
- idefix → `/en-cok-satanlar/kaynak/idefix`
- KitapSepeti → `/en-cok-satanlar/kaynak/kitapsepeti`
- Kitapzen → `/en-cok-satanlar/kaynak/kitapzen`
- İnkılâp Kitabevi → `/en-cok-satanlar/kaynak/inkilap-kitabevi`
- KitapSeç → `/en-cok-satanlar/kaynak/kitapsec`

Kaynak sayfası için iki koşul zorunludur:

1. ortak Book Index public gate geçmiş olmalı;
2. ilgili kaynakta en az bir `available` ve boş olmayan liste snapshot'ı bulunmalı.

Bu şartlar yoksa route 404/noindex kalır ve sitemap/site haritasında link
üretilmez. `blocked`, `researching`, `paused` veya boş kaynaklar için
SEO sayfası üretilmez. Kaynak sırası değiştirilmez; Türkiye Endeksi puanı
kaynak-native rank yerine gösterilmez.

### Public readiness ölçümleri

Public açılım öncesi admin ekranında yalnız ölçülebilir durum gösterilir:

- başarılı snapshot üretmiş bağımsız composite kaynak sayısı,
- dış kitapların master kitap eşleşme kapsamı,
- ilk ve son observation zamanı,
- birikmiş tarihsel veri süresi.

Bu metrikler tek başına public yayın kararı vermez. Henüz gerçek tarihsel veri
oluşmadan keyfî yüzde/gün eşiği tanımlanmaz. Eşikler, üretim verisi
gözlemlendikten sonra ayrı ve versiyonlanabilir bir kalite kapısı kararı olarak
belirlenecektir.

`/en-cok-satanlar` ve ilgili sitemap kayıtları bu karar verilene kadar kapalı
kalır.

## Sponsor entegrasyonu

Sponsor altyapısı default OFF kalır. İleride:

- 7 ana yazarlık kategorisi,
- tür/eğitim rehberleri,
- Kitap Endeksi kategori sayfaları,
- bestseller liste içi sponsor kartları

için slotlar açılabilir.

Sponsorlu kartlar organik rank dizisine eklenmez ve sıra numarası almaz.

Book Index entegrasyon noktaları üç yüzey için sözleşme olarak tanımlanır:

- genel endeks,
- kategori endeksi,
- kaynak görünümü.

Bu slotların tamamı `default OFF` durumundadır. Slot tanımı tek başına
reklam/kreatif yayınlamaz. Aktivasyon ve kreatif yönetimi mevcut
**Banner / Reklam Alanları** yönetim yüzeyiyle birleştirilecektir; ikinci bir
reklam yönetim sistemi kurulmaz.

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

## Master kitap eşleştirme V1

Collector artık güçlü kimliği olan dış kitap kayıtlarını otomatik olarak master
kitaba bağlar:

1. ISBN-13 tam eşleşme — confidence 1.00.
2. ISBN-10 tam eşleşme — confidence 0.98.
3. Normalize başlık + normalize yazar tam eşleşme — confidence 0.92.
4. Yukarıdakilerden hiçbiri güvenli değilse kayıt `unmatched` kalır ve admin
   kuyruğuna gider.

Aynı normalize başlık+yazar için birden fazla master aday varsa sistem tahmin
yapmaz; kayıt manuel incelemeye bırakılır. `manual_matched` ve `rejected`
kararları sonraki collector çalışmaları tarafından ezilmez.

Admin Kitap Endeksi ekranındaki **Bekleyenleri eşleştir** işlemi daha önce
toplanmış `unmatched` kayıtları da aynı kurallarla yeniden işler.

## Türkiye Endeksi yönetim önizlemesi

İlk üç canlı Türkiye kaynağı olan Remzi, BKM ve idefix aynı master kitaba
bağlanabildiğinde yönetim ekranında bileşik sıralama önizlemesi hesaplanır.

Önizleme kuralları:

- Yalnız `includeInComposite=true` listeler kullanılır.
- Her listenin son başarılı veya `no_change` fetch run'ı kullanılır.
- Yalnız master kitaba bağlanmış dış kayıtlar hesaba girer.
- Normalizasyon için o run'da gerçekten saklanan kayıt sayısı kullanılır.
- Mevcut `1 kaynak = 1 oy` ve minimum 3 bağımsız kaynak kuralı aynen korunur.
- Bu görünüm yalnız admin içindir; public route ve sitemap açılımı hâlâ kapalıdır.

### KitapSepeti

- `https://www.kitapsepeti.com/cok-satan-kitaplar` şeffaf
  `IlkOkuBookIndex/0.1 (+https://ilkoku.com)` user-agent ile HTTP 200
  döndürüyor.
- Çok satanlar sayfası ürünleri server-rendered HTML içinde sıralı
  `product-item` kartları olarak veriyor; headless browser gerekmiyor.
- Kart içinde başlık `product-title`, yayınevi `brand-title`, yazar
  `model-title`, fiyat `product-price` ve ürün/görsel URL'leri bulunuyor.
- İlk sayfadaki görünür sıralama kaynak sırası olarak korunur; V1 collector
  Top 30 ile sınırlıdır ve en az 20 geçerli kart yoksa fail-closed davranır.
- ISBN listing üzerinde güvenilir biçimde görünmediği için ilk eşleştirme
  normalize başlık+yazar üzerinden yapılır; gerektiğinde manuel eşleştirme
  kuyruğu kullanılır.
- Kaynak V1 Türkiye Endeksi'ne dahil edilir; ancak sponsorlu/özel yerleşim
  sinyali ileride tespit edilirse organik ranktan ayrılmalıdır.

### Kitapzen

- `https://www.kitapzen.com/index.php?mod_id=41&p=ProductBestsellers&page=1&period=weekly`
  şeffaf `IlkOkuBookIndex/0.1 (+https://ilkoku.com)` user-agent ile HTTP 200
  döndürüyor.
- Çok satan sayfası server-rendered HTML içinde 20 sıralı `Product_b` kartı
  veriyor; headless browser gerekmiyor.
- Kart açılışında `data-prd-id` ve 13 haneli `data-prd-barcode` bulunuyor.
  Bu nedenle ISBN-13 eşleştirmesi doğrudan yapılabiliyor.
- Kartta başlık, yazar, yayınevi, ürün URL'si, görsel ve satış fiyatı
  bulunuyor.
- Aynı endpoint `period=weekly`, `period=monthly` ve `period=yearly`
  dönemlerini destekliyor.
- Türkiye bileşik endeksinde yalnız haftalık genel liste oy verir; aylık ve
  yıllık listeler kaynak görünümü ve tarihsel analiz içindir.
- V1 collector ilk sayfadaki Top 20 ile sınırlıdır; 15'ten az geçerli kart
  görülürse parser fail-closed davranır.

### İnkılâp Kitabevi

- `https://www.inkilap.com/cok-satanlar` şeffaf
  `IlkOkuBookIndex/0.1 (+https://ilkoku.com)` user-agent ile HTTP 200
  döndürüyor.
- İlk sayfa server-rendered HTML içinde 20 sıralı `productBox` kartı veriyor.
- Kartta barcode, yayınevi/marka, kitap başlığı + yazar, ürün URL'si, görsel
  ve satış fiyatı bulunuyor.
- Başlık satırı `Kitap Başlığı | Yazar` biçiminde olduğu için kaynak başlığı
  ve yazar ayrı alanlara bölünür.
- 13 haneli her barcode ISBN değildir; yalnız 978/979 ile başlayan barkodlar
  `isbn13` olarak kabul edilir. Diğer barkodlar kaynak kimliği olarak
  korunabilir fakat ISBN eşleştirmesine girmez.
- V1 collector ilk sayfadaki Top 20 ile sınırlıdır ve 15'ten az geçerli kartta
  fail-closed davranır.
- Kaynak Türkiye bileşik endeksine dahil edilir.


### Hepsiburada erişim kararı — 25 Eylül 2026

- Kitap ana kategorisinde `?order=4` görünümü **Çok satanlar** sıralamasını
  temsil ediyor ve normal tarayıcı çıktısında ürün JSON'u bulunuyor.
- Görünür ilk sayfa 36 ürün sağlıyor; `productId`, ürün URL'si,
  yayınevi/brand, fiyat, görsel ve `isPromoted` işareti mevcut.
- Listing üzerinde güvenilir ISBN/barcode alanı doğrulanmadı.
- Buna rağmen şeffaf `IlkOkuBookIndex/0.1 (+https://ilkoku.com)` user-agent
  ile yapılan doğrudan sunucu isteği HTTP **403** döndürdü.
- Koruma aşılmayacak; proxy/stealth/CAPTCHA yaklaşımı kullanılmayacak.
- Bu nedenle Hepsiburada `phase_2` registry içinde **blocked** tutulur.
  Resmî API/feed veya açık izinli erişim yolu doğrulanırsa yeniden
  değerlendirilebilir.



### Trendyol ve PttAVM erişim kararı — 25 Eylül 2026

**Trendyol**

- Genel `/kitap-x-c91` kitap kategorisi arama motoru görünümünde
  `En Çok Satan N. Ürün` işaretleri gösterebiliyor; yani platform içinde
  bestseller sinyali bulunduğu doğrulandı.
- Buna rağmen şeffaf `IlkOkuBookIndex/0.1 (+https://ilkoku.com)` user-agent
  ile doğrudan sunucu isteği HTTP **403** döndü.
- Koruma aşılmayacak. Trendyol `phase_2` kaynağı **blocked** kalır ve
  collector aktive edilmez.

**PttAVM**

- Ana kitap kategorisi `https://www.pttavm.com/kitap-c-15` normal tarayıcı
  görünümünde ürün kartları ve bazı `Çok Satan` rozetleri sağlıyor.
- Ancak ürün kartlarında güvenilir, bitişik `1..N` bestseller rank dizisi
  doğrulanmadı.
- Şeffaf İlkOku user-agent ile doğrudan istek HTTP **403** ve Cloudflare
  challenge cevabı döndürdü.
- Hem açık rank eksikliği hem de erişim koruması nedeniyle PttAVM
  `phase_2` kaynağı **blocked** kalır; collector yazılmaz.


### KitapSeç — kategori kaynağı

- Resmî Edebiyat çok satanlar canonical'ı:
  `https://www.kitapsec.com/Products/Edebiyat/Cok-Satan-Kitaplar/1-6-0a0-0-0-0-0-0.xhtml`.
- Şeffaf `IlkOkuBookIndex/0.1 (+https://ilkoku.com)` user-agent ile HTTP 200
  dönüyor ve server-rendered `schema.org/ItemList` sağlıyor.
- Sayfa `numberOfItems=48` bildiriyor; her `Ks_UrunSatir` kartında açık
  `position`, Product `name/url/image/sku` ve Offer `price/currency`
  metadatası var.
- `sku` alanı 978/979 ISBN-13 ise master kitap eşleştirmesinde doğrudan
  kullanılabilir.
- Sayfa kapsamı **Edebiyat** olduğu için V1 Türkiye genel bileşik endeksine
  oy vermez. `includeInComposite=false` zorunludur.
- Kaynak KitapSeç kaynak görünümü, Edebiyat kategori endeksi ve tarihsel SEO
  verisi için toplanabilir.
- Çocuk ve Gençlik bestseller canonical'ı:
  `https://www.kitapsec.com/Products/Cocuk-ve-Genclik-Kitaplari/Cok-Satan-Kitaplar/`.
- 25 Eylül 2026 canlı doğrulamasında sayfa HTTP 200 döndü ve Edebiyat
  collector'ıyla aynı server-rendered `schema.org/ItemList` kontratını
  sağladı.
- Sayfa `numberOfItems=48` bildiriyor; `Ks_UrunSatir` kartları açık
  `position=1..48`, 978/979 ISBN-13 `sku`, ürün URL/görseli,
  `price/priceCurrency` ve yayınevi bilgisini sağlıyor.
- Bu nedenle ikinci bir parser yazılmaz; mevcut KitapSeç adaptörü ayrı
  `BookIndexList` üzerinden tekrar kullanılır.
- Kapsam **Çocuk ve Gençlik** kategorisi olduğu için liste
  `includeInComposite=false` kalır ve Türkiye genel endeksine oy vermez.

