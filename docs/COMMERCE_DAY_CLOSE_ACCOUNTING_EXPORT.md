# İlkOku – Gün Sonu Muhasebe Aktarımı (v1 hazırlık)

## Kapsam
İlkOku fatura, e-Arşiv, e-Fatura, e-SMM, gider pusulası veya muhasebe fişi düzenlemez. Gün sonu siparişleri, değişmez KDV/fiyat ve komisyon oranlarını, finans hareketleri ile işlenmiş iadeleri salt okunur aktarır.

- Yönetici: /sistem-yonetimi/finans-gelirler/gun-sonu-aktarim
- İndirme: /sistem-yonetimi/finans-gelirler/gun-sonu-aktarim/indir?gun=YYYY-MM-DD
- ZIP: siparisler.csv, finans_hareketleri.csv, iadeler.csv, uyarilar.csv, mutabakat.csv, gun_sonu_ozet.csv, muhasebe_on_hazirlik.csv, alan_esleme.json, manifest.json.
- CSV: UTF-8 BOM, virgül ayracı, CRLF, bütün parasal tutarlar kuruş; formül enjeksiyonu güvenlik önlemi.
- Gün: Europe/Istanbul 00:00–24:00. Satış paidAt, iade processedAt, günlük finans hareketi createdAt tarihine göre. Mutabakat için brüt satış ledger kayıtları sipariş bağlantısından, farklı bir günde oluşmuş olsa da okunur.
- Sipariş numarası ILK-... dış muhasebe eşleştirme referansıdır, fatura numarası DEĞİLDİR.
- Manifest: ILK-DAY-YYYY-MM-DD toplu işlem anahtarı; dosyaların SHA-256 değerleri.
- Her veri türünde üst sınır 5.000 kayıt; aşılırsa eksik paket oluşturulmaz.

## Kontroller
- Eksik komisyon oranı veya KDV snapshot, kupon, 0 TL, iade, doğrulanmamış satıcı, yanlış para birimi, tahsilat uyuşmazlığı, siparişe ait eksik/çift sale_gross ledger veya mükerrer başarılı ödeme ayrı uyarı satırı doğurur.
- Mutabakat, siparişe ait kaydedilmiş brüt liste fiyatını (originalAmount) ilgili sale_gross ledger tutarıyla karşılaştırır; bu tutar indirim sonrası finalAmount ile karıştırılmaz.
- gun_sonu_ozet.csv, gün içi ledger hareketlerini tür ve para birimi bazında, imzalı kuruş tutarıyla özetler. Brüt satış, platform komisyonu, yazar kazancı ve iadeler otomatik kâr/zarar hesaplaması sayılmaz.
- Muhasebe ön hazırlık satırına yalnız temel veri kontrollerini geçen pozitif satışlar alınır. Komisyonun örnek net tutarı siparişe sabitlenen oran ile KDV hariç fiyat üzerinden gösterilir. Bu sayı onaylı hizmet bedeli/fatura veya vergi kaydı değildir.
- alan_esleme.json, Logo/Mikro/Paraşüt şemalarını açıkça UNVERIFIED olarak işaretler. Program uyumluluğu, cari kod, hesap planı ve resmî belge tipi yalnız dış muhasebe onayıyla belirlenir.
- Geçmiş sipariş oranı yalnız siparişe sabitlenmiş oran snapshotundan okunur.
- %15 genel komisyon ve uygun faturasız telif için ayrı %5 oranı saklanır; %5 tutarı otomatik resmî hizmet faturası satırına dönüştürülmez.
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
