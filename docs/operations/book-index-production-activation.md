# Book Index production activation checklist

Status: **CODE READY / PRODUCTION ACTIVATION GATED**

Bu belge Kitap Endeksi kodu hazırlandıktan sonra production aktivasyonunun
hangi sırayla yapılacağını tanımlar. Adımların sırası bilinçlidir; sonraki
kapıya önceki kapı doğrulanmadan geçilmez.

## 1. Scheduler secret pair

Production ve GitHub Actions için aynı isimde, yalnız bu işe ait ayrı bir
secret oluştur:

- Production: `BOOK_INDEX_SCHEDULER_SECRET`
- GitHub Actions: `BOOK_INDEX_SCHEDULER_SECRET`

Kurallar:

- en az 32 rastgele byte;
- başka job secret'larıyla aynı değer kullanılmaz;
- değer repo, PR, issue, log veya chat içine yazılmaz;
- iki yüzeydeki değer birebir aynı olmalıdır.

Bu adım tamamlanmadan otomatik scheduler açılmaz.

## 2. Manual scheduler canary

GitHub Actions içindeki **Book Index scheduler canary** workflow'unu yalnız
manuel çalıştır.

PASS kriterleri:

- internal endpoint yetkilendirmeyi kabul eder;
- due olan listeler `BookIndexFetchRun` üretir;
- bir kaynak hata verirse sonraki due listeler çalışmaya devam eder;
- aynı liste `collectionEveryMinutes` süresi dolmadan tekrar çağrılmaz;
- immutable observation geçmişi overwrite edilmez;
- blocked/researching kaynaklar zorla collector akışına sokulmaz.

Canary başarısızsa cron açılmaz.

## 3. Automatic scheduler activation

Manual canary PASS sonrasında scheduler cron'u ayrı ve küçük bir PR ile açılır.

Hedef kontrol periyodu:

`17 * * * *`

Bu saatlik kontrol, her kaynağın saatlik çekileceği anlamına gelmez.
Gerçek cadence her `BookIndexList.collectionEveryMinutes` değeri tarafından
belirlenir.

Workflow concurrency:

- group: `book-index-scheduler`
- `cancel-in-progress: false`

## 4. Snapshot birikimi

Cron açıldıktan sonra admin **Kitap Endeksi** ekranından şu alanlar izlenir:

- son kontrol;
- son başarılı snapshot;
- sonraki due;
- kaynak hata kodu;
- başarılı/hatalı run sayısı;
- ilk ve son observation zamanı;
- tarihsel veri süresi.

Tek bir başarılı run public yayın için yeterli kabul edilmez.

## 5. Master-book matching

Bekleyen dış kitap kayıtları eşleştirilir.

Sıra değişmez:

1. ISBN-13
2. ISBN-10
3. normalize başlık + yazar
4. admin manuel eşleştirme

Aynı normalize başlık+yazar için birden fazla güvenli aday varsa otomatik
tahmin yapılmaz.

Admin readiness ekranında özellikle şu metrik izlenir:

- eşleşmiş dış kitap;
- eşleşmemiş dış kitap;
- master eşleşme yüzdesi.

## 6. Türkiye Endeksi kanıtı

Public açılımdan önce doğrulanması gereken ürün kuralları:

- en az 3 bağımsız Türkiye kaynağı;
- 1 kaynak = 1 oy;
- kaynak-native rank ile İlkOku composite score ayrıdır;
- sponsorlu içerik composite oyu kullanmaz;
- kategori kaynakları genel composite'e yanlışlıkla oy vermez.

Admin Türkiye Endeksi önizlemesi gerçek production snapshot'larıyla kontrol
edilir.

## 7. SEO policy belirleme

Kod içinde varsayılan kalite eşiği yoktur.

Yeterli production geçmişi görüldükten sonra aşağıdaki değerler ayrıca
kararlaştırılır ve policy version ile birlikte production env'e girilir:

- `BOOK_INDEX_SEO_POLICY_VERSION`
- `BOOK_INDEX_SEO_MIN_COMPOSITE_SOURCES`
- `BOOK_INDEX_SEO_MIN_MATCH_COVERAGE_PERCENT`
- `BOOK_INDEX_SEO_MIN_HISTORY_DAYS`
- `BOOK_INDEX_SEO_MIN_TURKEY_ITEMS`

Eşikler production kanıtına göre belirlenmeden boş kalır.

## 8. SEO gate dry-run

Önce yalnız değerlendirme açılır:

`BOOK_INDEX_SEO_GATE_ENABLED=true`

Bu aşamada:

`BOOK_INDEX_SEO_PUBLISH_ENABLED=false`

kalmalıdır.

Admin ekranında gate sonucu izlenir:

- `policy_incomplete`
- `insufficient_evidence`
- `eligible`

Dry-run sırasında public bestseller route'ları yayınlanmaz.

## 9. Publication approval

Gate gerçek production verisiyle `eligible` olduğunda ayrıca yayın kararı
verilir.

Yayın anahtarı:

`BOOK_INDEX_SEO_PUBLISH_ENABLED=true`

Bu anahtar gate değerlendirmesinden ayrıdır. Gate eligible olsa bile publish
switch kapalıysa public yayın yapılmaz.

Mevcut fail-closed route kabuğu:

- `/en-cok-satanlar`
- `/en-cok-satanlar/turkiye`

Gate/publish/policy/evidence zincirinin herhangi biri eksikse route 404/noindex
davranışını korur.

## 10. Sitemap ve navigation activation

Sitemap ve public navigation kodu fail-closed olarak önceden hazırlanmıştır.
Gerçek görünürlük yalnız publication gate geçildiğinde açılır.

Ana menü davranışı:

- **En Çok Satanlar** üst menüsü **Destek** menüsünün hemen yanında görünür;
- masaüstü ve mobilde doğrudan `/en-cok-satanlar` sayfasına gider;
- gate/publish/policy/evidence zincirinden biri eksikse menü bağlantısı hiç
  gösterilmez;
- route 404 iken kullanıcıya kırık ana menü bağlantısı sunulmaz.

Production görünürlüğü açılmadan önce doğrulanacaklar:

- public route HTTP 200;
- canonical doğru;
- robots index/follow;
- structured data geçerli;
- mobil/browser QA PASS;
- production smoke PASS;
- sitemap yalnız gerçekten yayınlanan Book Index URL'lerini içeriyor.

Amazon TR/US veya başka bir kaynak availability `researching`/`blocked`
ise sitemap'te sahte kaynak sayfası oluşturulmaz.

## 11. Analytics / trafik ölçümü

Book Index public yayın açıldığında mevcut site analytics altyapısı kullanılır;
ayrı tracker veya consent sistemi kurulmaz.

- `book_index_view`: overview veya Türkiye yüzeyi görüntülendiğinde;
- `book_index_navigation_click`: Book Index içindeki overview/Türkiye
  navigasyonu kullanıldığında.

Event'ler yalnız analytics consent uygunsa gönderilir. GTM yüklüyse öncelik
GTM'dedir; doğrudan GA4 yalnız fallback olarak kullanılır ve çift event
üretilmez.

## 12. IndexNow / GSC

Sitemap aktivasyonundan sonra:

- IndexNow yalnız yeni public URL'lere uygulanır;
- sitemap Google Search Console'da yeniden okunur;
- ilk günlerde "URL is unknown to Google" tek başına hata sayılmaz;
- canonical/indexability değişimleri takip edilir.

## 13. Rollback

Herhangi bir aşamada sorun görülürse en küçük geri dönüş uygulanır.

Scheduler problemi:

- otomatik cron kapatılır;
- manuel collector/snapshot geçmişi korunur.

SEO/public problemi:

- önce `BOOK_INDEX_SEO_PUBLISH_ENABLED=false`;
- gerekirse `BOOK_INDEX_SEO_GATE_ENABLED=false`;
- sitemap/navigation aktivasyon PR'ı geri alınır;
- observation ve master-book verileri silinmez.

Kaynak erişim problemi:

- yalnız ilgili kaynak paused/blocked yapılır;
- diğer collector'lar devam eder;
- anti-bot koruması aşılmaz.

## Aktivasyon özeti

Sıra:

**Secret → Manual Canary → Cron → Snapshot Birikimi → Matching → Readiness
Kanıtı → SEO Policy → Gate Dry-run → Publish → Sitemap/Navigation → GSC**

Bu sıra dışında otomatik public yayın yapılmaz.
