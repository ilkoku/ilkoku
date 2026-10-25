# İlkOku – Gün Sonu Muhasebe Aktarımı (v1 hazırlık)

## Kapsam
İlkOku fatura, e-Arşiv, e-Fatura, e-SMM, gider pusulası veya muhasebe fişi düzenlemez. Gün sonu siparişleri, değişmez KDV/fiyat ve komisyon oranlarını, finans hareketleri ile işlenmiş iadeleri salt okunur aktarır.

- Yönetici: /sistem-yonetimi/finans-gelirler/gun-sonu-aktarim
- İndirme: /sistem-yonetimi/finans-gelirler/gun-sonu-aktarim/indir?gun=YYYY-MM-DD
- ZIP: siparisler.csv, finans_hareketleri.csv, iadeler.csv, iade_ledger_mutabakat.csv, uyarilar.csv, mutabakat.csv, gun_sonu_ozet.csv, muhasebe_on_hazirlik.csv, yazar_hesap_ozeti.csv, muhasebe_tl_inceleme.csv, alan_esleme.json, manifest.json.
- iade_ledger_mutabakat.csv: İlgili iş günündeki işlenmiş iadeleri, aynı günün **refund** türündeki finans hareketleriyle sipariş ve para birimi bazında karşılaştırır. Negatif veya pozitif tek yönlü ledger tutarları, mutlak toplamı işlenmiş iade toplamına eşitse temel kontrol geçer; karşıt işaretlerin birbirini götürmesi geçerli eşleşme sayılmaz. Başka günde muhasebeleştirilmiş iade hareketi o günün dosyasında mevcut olmayabileceğinden, eksiklik **iade gerçekleşmedi** anlamına gelmez; yalnız dış muhasebe incelemesi gerektirir.
- Manifest, `refundLedgerMatchedGroups` ve `refundLedgerReviewGroups` sayılarını ayrı bildirir. Bu kontrol orijinal `iadeler.csv` kaydını, yazar bakiyesini veya tahsilat sonucunu değiştirmez.
- muhasebe_tl_inceleme.csv: yalnız temel kontrolleri geçmiş siparişler için TL tutarları (kuruşlardan BigInt ile **tam** iki ondalığa çevrim), UTF-8 BOM, noktalı virgül ayraç ve virgüllü ondalık, başlık+satışlar; alıcı vergi numarası veya fatura numarası içermez. Bağımsız muhasebeci kontrolü içindir, Logo/Mikro/Paraşüt şablonu değildir. Satış, KDV, komisyon ve aracılık ön inceleme tutarları **birbiriyle toplanacak aynı tür gelirler değildir**.
- yazar_hesap_ozeti.csv yazar / geçerli iç mali belge inceleme türü / para birimi bazında net satış, gösterilen satış KDV'si, brüt tahsilat, komisyon ve koşullu aracılığı yalnız gözden geçirilen pozitif siparişler için ayrı toplar. Bu toplamlar kâr/zarar, vergi tahakkuku veya düzenlenmiş hizmet faturası değildir.
- CSV: UTF-8 BOM, virgül ayracı, CRLF, bütün parasal tutarlar kuruş; formül enjeksiyonu güvenlik önlemi.
- Gün: Europe/Istanbul 00:00–24:00. Satış paidAt, iade processedAt, günlük finans hareketi createdAt tarihine göre. Mutabakat için brüt satış ledger kayıtları sipariş bağlantısından, farklı bir günde oluşmuş olsa da okunur.
- Sipariş numarası ILK-... dış muhasebe eşleştirme referansıdır, fatura numarası DEĞİLDİR.
- Manifest: ILK-DAY-YYYY-MM-DD toplu işlem anahtarı; dosyaların SHA-256 değerleri.
- Her veri türünde üst sınır 5.000 kayıt; aşılırsa eksik paket oluşturulmaz.

## Kontroller
- Eksik komisyon oranı veya KDV snapshot, kupon, 0 TL, iade, doğrulanmamış satıcı, yanlış para birimi, tahsilat uyuşmazlığı, siparişe ait eksik/çift sale_gross ledger veya mükerrer başarılı ödeme ayrı uyarı satırı doğurur.
- Mutabakat, siparişe ait kaydedilmiş brüt liste fiyatını (originalAmount) ilgili sale_gross ledger tutarıyla karşılaştırır; bu tutar indirim sonrası finalAmount ile karıştırılmaz.
- Ödeme kaydı sonradan `refunded` olarak değişse bile ilk başarılı tahsilatın `completedAt` kaydı, `paidAt` zamanı ve Türkiye gün sonu sınırı eşleşiyorsa geçmiş satıştaki tahsilat korunur. `succeeded` veya `refunded` kaydında tamamlanma kanıtı eksik/geç/çelişkiliyse işlem muhasebe ön hazırlığına alınmaz.
- Satışın `paidAt`, iadenin `processedAt`, gün içi ledger hareketinin `createdAt` tarihi seçilen Türkiye iş gününe aykırıysa ayrı uyarı oluşturulur. Ödemeden önce görünen iade `IADE_ODEMEDEN_ONCE` olarak işaretlenir. Siparişe bağlı geç oluşan ledger, ayrı mutabakat verisidir; önceki günün ledger hareketleri dosyasına yanlış taşınmaz.
- iadeler.csv, tamamlanmış iadelerin sipariş tahsilatını ve ilgili iş gününün sonuna kadar tamamlanmış bütün iadelerin toplamını ayrı alanlarda gösterir. Para birimi uyuşmazlığı, orijinal ödemesi bulunmayan sipariş, sıfır veya geçersiz tutar ve toplam iadenin tahsilatı aşması uyarıya ayrılır. Sonraki günlerin iadeleri önceki günün kümülatif kontrolüne girmez.
- gun_sonu_ozet.csv, gün içi ledger hareketlerini tür ve para birimi bazında, imzalı kuruş tutarıyla özetler. Brüt satış, platform komisyonu, yazar kazancı ve iadeler otomatik kâr/zarar hesaplaması sayılmaz.
- Muhasebe ön hazırlık satırına yalnız temel veri kontrollerini geçen pozitif satışlar alınır. Komisyonun örnek net tutarı siparişe sabitlenen oran ile KDV hariç fiyat üzerinden gösterilir. Bu sayı onaylı hizmet bedeli/fatura veya vergi kaydı değildir.
- alan_esleme.json, Logo/Mikro/Paraşüt şemalarını açıkça UNVERIFIED olarak işaretler. Program uyumluluğu, cari kod, hesap planı ve resmî belge tipi yalnız dış muhasebe onayıyla belirlenir.
- Geçmiş sipariş oranı yalnız siparişe sabitlenmiş oran snapshotundan okunur.
- Siparişe sabitlenmiş %15 genel komisyon veya yazar/eser özel oranı değişmez; diğer tutarlardan ayrı hesaplanır.
- Yazarın siparişin ödendiği anda geçerli **son yönetici mali belge inceleme kaydı** esas alınır (`AuthorTaxReviewEvent`). `commercial_invoice` ve `self_employed_receipt` doğrulanmışsa **%0 aracılık**; `gvk18_expense_receipt` doğrulanmışsa **%5 koşullu aracılık** hesaplama örneği oluşturulur.
- Mali belge incelemesi eksik, `needs_revision`/`revoked`, süresi geçmiş ya da sipariş tarihinden sonra yapılmışsa ilgili satış aktarım ön hazırlığına alınmaz ve uyarı kaydedilir. Böylece her yazara körlemesine %5 uygulanmaz.
- `muhasebe_on_hazirlik.csv` ve `manifest.json` yalnız hesaplama örnekleri ve inceleme toplamlarını taşır: yazarın vergi mükellefiyetini devlet sisteminden doğrulamaz; İlkOku komisyon/hizmet faturası, gider pusulası, muhasebe fişi veya vergi beyanı düzenlemez.
- Alıcı vergi/kimlik bilgileri, hukuki belge uygunluğu, KDV indirimi, stopaj ve mali müşavir onayı bu aktarımda doğrulanmaz.
- Uyarısız kayıt bile otomatik fatura kesme onayı değildir; muhasebe sisteminde gerekli belge bilgileri ayrıca tamamlanır.
- CSV formatı genel amaçlıdır. Logo/Mikro/Paraşüt gibi programların kendi import şemalarına doğrudan uyum henüz doğrulanmamıştır.

## Gece otomatik kapanışı — ETKİN DEĞİL
Hazırlanan isteğe bağlı, gizli anahtarlı arşiv endpoint'i:
POST /api/internal/commerce/day-close

Kullanım için ayrıca açık yayın ve cron etkinleştirme onayı gereklidir. Bu onaydan sonra sunucuda şu yapılandırma yapılmalıdır:
- ILKOKU_DAY_CLOSE_CRON_SECRET: en az 32 karakter, gizli Bearer anahtarı; GitHub'a yazılmaz.
- ILKOKU_DAY_CLOSE_ARCHIVE_DIR: uygulama/web kökü dışında, önceden oluşturulmuş, sahip yetkisi 0700 özel mutlak dizin.
- Hostinger cron: Europe/Istanbul 00:10 (gerçek cron zaman dilimi doğrulanarak) yetkili POST çağrısı gönderecek şekilde programlanır.
- Arşiv dosyası tek sefer yazılır; yeniden deneme aynı içeriği çoğaltmaz. Değişmiş dosya 409 manuel inceleme gerektirir; eski arşiv ezilmez.
- Gerçek finans mutasyonu, fatura kesimi, e-posta gönderimi veya üçüncü taraf programa otomatik aktarım yoktur.

## Yayın öncesi
1. CI, admin yetkisi, ZIP okunabilirliği ve 390px mobil QA.
2. Muhasebe programlarının import alan haritaları ve alıcı cari kartı gereksinimleri.
3. Mali müşavir onayı: KDV, telif, gider pusulası, iade ve komisyon esasları.
4. Arşiv erişim günlüğü, yedek, saklama süresi ve veri güvenliği.
5. Kullanıcıdan PR merge / canlı kurulum / Hostinger cron etkinleştirme onayı.

## Resmî sağlayıcı araştırması (25.10.2026)
- Paraşüt, satış faturaları, cariler, giderler ve ürün/hizmetler için ayrı Excel aktarım şablonları sunar: https://www.parasut.com/kullanim-kilavuzu/mevcut-verilerin-parasute-aktarilmasi . İlkOku'nun mevcut CSV'si bu resmî XLSX şablonlarından biri olduğunu iddia etmez.
- Mikro, resmî MuhasebeFisKaydetV2 API yolunu belgelendirir; bu işlem kayıt oluşturabildiğinden İlkOku tarafında kullanılmaz: https://apidocs.mikro.com.tr/apis/muhasebe . Program-sürüm bazlı dosya aktarım biçimi ayrıca doğrulanacaktır.
- Logo'da aktarım araçları ürün ve sürüme bağlıdır: https://polaris.logo.com.tr/docs/tiger-3-enterprise/detail/ZXh0ZXJuYWw_Y2lkPTkzZjJhODlkLWZmZGYtNGJiYS04ZjgyLTcyYzA0ZGI0OWJmYyZsaW5rPTJmZGMwMjNhLTM1NzgtNDQ3OC1iYjcxLTc5YzYyZmZmZDEwNiZ0ZW5hbnRJZD1jZGQ4N2UxMy0zMDA5LTRkZDEtYTViOC0yYTAwNWMwZTU4ZGEmaGlkZU5hbWU9VHJ1ZQ . İçe aktarma alanları teyit edilmeden Logo muhasebe fişi üretilmez.

Muhasebe yazılımının kesin ürün/sürümü ve mali müşavirin sağladığı güncel şablon olmadan hiçbirine "doğrudan uyumlu" etiket verilmez. Bu çalışma yalnız aktarım verisi hazırlığından ibarettir.
