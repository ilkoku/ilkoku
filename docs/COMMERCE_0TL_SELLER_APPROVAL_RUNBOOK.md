# İlkOku — 0 TL Edinim İçin Satıcı Doğrulama ve Yetki Rehberi

**Amaç:** Gerçek ödeme sağlayıcısı olmadan, ücretli olarak işaretlenmiş eserlerin dijital okuma hakkını 0 TL sipariş ile kaydetmek. Gerçek para tahsil edilmez.

## Yazar başvurusu ve yönetici onayı

1. **Yazar — resmî satıcı kimliği taslağı:** `/satis-erisim/satici-yetkileri` (Yazar Paneli → Satış & Erişim → Satıcı ve satış yetkisi). Yazar yalnız kendi hesap kimliğine bağlanan gerçek kişi veya tüzel kişi satıcı başvurusu oluşturabilir. Resmî ad/unvan, vergi/kimlik tanımlayıcısı, adres, e-posta zorunludur. `LegalParty.ownerUserId` hesabına bağlı ve durumu `pending` olur; kendini doğrulayamaz. Platform işletmecisi `platform` türü yazar ekranından oluşturulamaz.
2. **Yazar — eser satış hakkı kanıtı:** Aynı ekranda sadece kendi yayımlanmış ve paid `ready/active` eserini, kendi satıcı kaydını, gerçek HTTPS belge referansını, incelenecek metni ve varsa bitiş tarihini seçer/girer. `WorkSalesAuthorization` `pending` oluşturulur; belge metninin SHA-256 özeti kaydedilir. Satıcı kimliği henüz incelemedeyse bile belge taslağı sunulabilir.
3. **Yönetici — kimlik incelemesi:** `/sistem-yonetimi/odeme-sistemi/satici-yetkileri` artık başvuru formu değil **inceleme ekranıdır**. Admin, orijinal resmî kaynakla bilgileri karşılaştırıp gerekçe ve açık onay verir; `verifiedById` ve denetim kanıtı saklanır.
4. **Yönetici — eser yetki incelemesi ve onay:** Admin kanıtı, eser-satıcı eşleşmesini, tarihleri ve doğrulanmış hukukî kimliği son kez inceler. Ancak sonrasında `approved` geçerli satıcı ataması oluşur. Önceki güncel atama tarihçesi korunur, eski `OrderLegalSnapshot` kayıtları değiştirilmez. Yetki iptali de gerekçe ve açık yönetici onayı gerektirir.

Yazar yalnız kendi başvuru durumlarını ve eserlerini görür; admin incelemesi/iptali yapamaz. Bu ayrım gerçek tahsilat veya ödeme sağlayıcısı açmaz.

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
