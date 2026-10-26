# İlkOku — 0 TL Edinim İçin Satıcı Doğrulama ve Yetki Rehberi

**Amaç:** Gerçek ödeme sağlayıcısı olmadan, ücretli olarak işaretlenmiş eserlerin dijital okuma hakkını 0 TL sipariş ile kaydetmek. Gerçek para tahsil edilmez.

## Yazarın gireceği bilgiler — sadece fatura ve vergi mükellefiyeti beyanı

**Yazar Paneli → Satış & Erişim → Fatura ve vergi bilgilerim** (`/satis-erisim/odeme-vergi-bilgileri`):

- **Faturalıyım:** İlgili faturayı düzenleyebildiğini beyan eder. Fatura unvanı/ad-soyad, vergi/T.C. kimlik numarası, vergi dairesi ve fatura adresi bilgilerini girer.
- **Faturasızım:** Fatura düzenlemediğini beyan eder. Fatura alanları zorunlu tutulmaz ve önceki fatura verileri temizlenir.
- Beyan yalnızca bu yazara özel `AuthorBillingProfile` içinde tutulur. Resmî vergi mükellefiyeti otomatik doğrulanmaz; `AuthorTaxReviewEvent` yönetici/muhasebe değerlendirmesi bu kayıttan bağımsızdır.
- Bu ekran eser satış yetkisi belgesi, resmî satıcı ataması, IBAN, ödeme yöntemi veya fatura oluşturma ekranı değildir. Eski `/satis-erisim/satici-yetkileri` bağlantısı fatura ekranına yönlendirilir.

## Yönetimin ayrı hukukî doğrulama süreci

`/sistem-yonetimi/odeme-sistemi/satici-yetkileri` yöneticiye ait doğrulama, satış hakkı kanıtı, onay ve yetki iptal alanıdır. **Yazar bu formu doldurmaz ve satış hakkını kendisi onaylamaz.** Gerçek 0 TL ticari sipariş için gereken doğrulanmış hukukî satıcı ile esere özel satış yetkisi şartı değişmez; yazarın faturalı/faturasız beyanı tek başına bunun yerine geçmez.

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
