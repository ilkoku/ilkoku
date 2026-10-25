# İlkOku — 0 TL Edinim İçin Satıcı Doğrulama ve Yetki Rehberi

**Amaç:** Gerçek ödeme sağlayıcısı olmadan, ücretli olarak işaretlenmiş eserlerin dijital okuma hakkını 0 TL sipariş ile kaydetmek. Gerçek para tahsil edilmez.

## Yöneticinin yapacağı dört işlem

1. **Resmî satıcı kimliği** — `/sistem-yonetimi/odeme-sistemi/satici-yetkileri` üzerinden fiili hukukî işletmeci veya üçüncü kişi için resmi unvan, doğrulanabilir vergi/kimlik tanımlayıcısı, adres ve e-posta girilir. Yeni kayıt `pending` durumundadır. Okura görünen platform adı `ilkoku` olabilir; resmî unvanın yerine geçmez.
2. **Kimlik kanıtını incele** — Yetkili yönetici, orijinal kaydın güvenilir HTTPS referansını açıp bilgileri karşılaştırır, gerekçe yazar ve açık doğrulama kutusuyla onay verir. Tarih, işlem yapan yönetici ve kanıt referansı denetim kaydına yazılır. Belge görülmeden hiçbir otomatik onay verilmez.
3. **Eser bazlı yetki** — Satış modeli `paid`, durumu `ready` / `active` olan eser ile doğrulanmış satıcı seçilir. Eser dijital satış yetkisini gösteren gerçek belgenin kaynağı ve incelenen metin girilir. Kanıt metninin yalnız SHA-256 özeti kaydedilir; geçerlilik tarihi varsa belirtilir.
4. **Eser satıcısını onayla** — Yönetici satış yetkisinin gerçekliği ve kapsamını son kez kontrol eder. Önceki güncel atama işlem geçmişi korunarak iptal edilir, yeni güncel atama aktif olur. Eski siparişlere bağlı `OrderLegalSnapshot` değişmez.

## Ayrı zorunlu şart: Okur sözleşmesi

`/sozlesme/sablonlar` içindeki `ILKOKU_READER_DIGITAL_CONTENT_PURCHASE` metni gerçek, uygun ve onaylanmış sürüme ulaşmadan 0 TL sipariş verilmez. Yer tutucu taslak aktive edilmiş görünse dahi uygulama `getActiveReaderPurchaseTerms()` ile bu metni reddeder. Bu belge yöneticinin hukuki değerlendirmesine tabidir; otomatik uydurulmaz veya onaysız yayımlanmaz.

## Çapraz kabul

- Bölüm 1 `preview`: satın alma hakkı olmadan okunur
- Bölüm 2 `locked`: hak yoksa içerik döndürmez; `/satinal/<slug>` bağlantısını gösterir
- Satış onayı ve geçerli okur koşulları mevcutsa 0 TL edinim `Order`, `OrderConsent`, `OrderLegalSnapshot`, `WorkEntitlement` ve `FinancialLedger` kayıtlarını atomik oluşturur
- %100 indirimde `CouponRedemption` eklenir; platform ve yazar kuponlarının indirim muhasebesi ayrı tutulur
- `Payment` kaydı veya kart/telefon tahsilatı oluşmaz
- Eski sipariş ve erişim kayıtları yetki değişimi sırasında silinmez

## Güvenlik sınırı

Kanıt bağlantıları ve iddiaları yönetici tarafından doğrulanmalı. Bu çalışma alanı tek başına resmî belge oluşturmaz, dış kurumlardan otomatik kimlik doğrulaması yapmaz veya hukuki geçerliliği garanti etmez. Gerçek satış/hakediş gerektiren işlemler için ayrı sözleşme ve finansal kontrol gerekir.
