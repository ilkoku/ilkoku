-- One-time, strict CAS import of user-requested 0 TL reader terms into admin workbench.
-- A new REVIEW version, not an approved/active contract; no admin evidence is forged.
-- Only the known untouched v3 seed placeholder, already in review, may be replaced.
-- If any version, lifecycle, identity or body changed, this becomes a no-op.
-- This runs under the existing Hostinger "prisma migrate deploy" build step.
UPDATE `ContractTemplate`
SET
  `body` = 'ÇALIŞMA TASLAĞI — 0 TL DİJİTAL ESER EDİNİMİ / YÖNETİCİ İNCELEMESİ. GERÇEK SATICI, TAM ADRES VE İLETİŞİM BİLGİLERİ TAMAMLANMADAN ONAYLANAMAZ VE AKTİF EDİLEMEZ.

## I. Taraf ve işlem bilgileri

1. **Platformun görünen adı:** İlkOku (`ilkoku.com`).
2. **İşletmecinin resmî adı/unvanı:** [DOĞRULANMIŞ İŞLETMECİ UNVANI — EKSİK].
3. **İşletmecinin açık tebligat/iletişim adresi:** [CADDE/SOKAK, BİNA, İLÇE, POSTA KODU — EKSİK], İstanbul, Türkiye.
4. **İşletmecinin resmî iletişim e-postası ve telefonu:** [DOĞRULANMIŞ İLETİŞİM BİLGİLERİ — EKSİK].
5. **Eserin satıcısı/dijital içerik sağlayıcısı:** [ESER BAZINDA DOĞRULANMIŞ HUKUKÎ KİŞİ — EKSİK]. Satıcı İlkOku işletmecisi, yazar veya yetkilendirilmiş başka hak sahibi olabilir; kimliği sipariş öncesinde açıkça gösterilir.
6. **Okuyucu:** Platform hesabını kullanan, işlemi kendi adına gerçekleştiren ve sipariş anındaki kayıtlarla belirlenen kişi (değişkenler: `{{ad_soyad}}`, `{{eposta}}`, `{{tarih}}`).
7. **Eser:** Sipariş özetindeki `{{eser}}` ve ilgili eser/bölüm kimliği. Eserin açıklaması, yazar bilgisi, sağlanan dijital erişimin kapsamı ve süresi sipariş öncesinde gösterilir.

## II. Konu ve kapsam

İşbu koşullar, İlkOku üzerinden sunulan dijital yazılı eserlerin veya bölümlerin okuyucu hesabına erişim hakkı olarak tanımlanmasını düzenler. Mülkiyet veya fikrî hak devri değil, siparişte belirtilen içerikle sınırlı, kişisel ve devredilemez okuma izni sağlanır. Eserin hangi bölümlerinin ön izleme, hangilerinin erişim izni gerektirdiği işlemden önce ayrıştırılır.

Bu belge yalnızca toplam bedeli 0,00 TL olan deneme/promosyon edinim işlemlerine uygulanmak üzere hazırlanmıştır. Ücretli tahsilatın başladığı tarihten önce taraf bilgileri ve ücretli satış koşulları ayrıca gözden geçirilip onaylanmalıdır.

## III. Ön bilgilendirme ve bedel

Sipariş tamamlanmadan önce okuyucuya şu işlem-özel bilgiler, kalıcı olarak kaydedilebilir biçimde, açık ve anlaşılır biçimde sunulur:

- Esere ve edinilen bölüm/erişim kapsamına ilişkin temel özellikler.
- Doğrulanmış hukukî satıcının ve varsa aracı işletmecinin adı/unvanı, açık adresi ve iletişimi.
- Başlangıç fiyatı, varsa kupon/indirim, vergiler ve ek giderlerle birlikte **nihai tutar: 0,00 TL**.
- Erişimin açılma anı, süresi, teknik gereksinimleri ve varsa kullanım kısıtları.
- Cayma hakkı, uygulanabilen istisnalar, başvuru/şikâyet yolları ve ilgili iletişim noktası.

**Sıfır tutar koşulu:** Nihai tutar 0,00 TL değilse bu test akışında sipariş tamamlanmaz. Kart, banka hesabı veya telefon faturası üzerinden gerçek para tahsil edilmez. Sipariş, kendiliğinden ücretli aboneliğe veya daha sonra otomatik tahsilata dönüşmez. İndirim/kuponun varsa uygulanmış hâli işlem onayı öncesinde gösterilir.

## IV. Siparişin kurulması ve kayıt

Okuyucu işlem özetini ve sözleşmenin geçerli sürümünü inceleyip gerekli onayları verdiğinde sistemin 0 TL edinim koşullarını yeniden doğrulaması gerekir. Başarılı işlemde benzersiz bir sipariş numarası (örneğin `ILK-...`) üretilir. Eser, satıcı ve erişim kapsamı; sipariş anındaki fiyat/indirim, sözleşme sürümü ve belge özeti (hash) ile birlikte kaydedilir. Sonraki sözleşme değişiklikleri eski sipariş kayıtlarını geriye dönük değiştirmez.

Sistemin `Order`, `OrderConsent`, `OrderLegalSnapshot`, `WorkEntitlement` ve `FinancialLedger` kayıtları arasında tutarlılığı sağlaması hedeflenir. Sıfır tutarlı edinimde ödeme sağlayıcısı veya `Payment` tahsilat kaydı oluşturulmaz. Teknik hata hâlinde siparişin başarılı olduğu izlenimi verilmemeli; kullanıcıya uygun hata ve destek yolu sunulmalıdır.

## V. Erişim ve teknik koşullar

Erişim hakkı başarılı siparişten sonra okuyucunun hesabıyla ilişkilendirilerek `Kütüphanem / Satın Aldıklarım` ve ilgili eser alanında gösterilir. Ön izleme bölümleri ücretsiz erişilebilir kalabilir; erişim hakkı gerektiren kilitli bölümler yalnız geçerli yetkilendirmeyle açılır. Erişim süresi, içerik kısıtları ve desteklenen teknik ortam sipariş öncesi eser açıklamasında belirtilmelidir.

İlkOku, teknik bakım, güvenlik veya hukuka aykırı kullanımın önlenmesi için hizmeti ölçülü şekilde sınırlayabilir; ancak bu hüküm okurun emredici yasal haklarını ortadan kaldırmaz ve erişim taahhüdüyle çelişen keyfî kalıcı kaldırmaya izin vermez.

## VI. Fikrî mülkiyet ve kullanım sınırları

Eserlere ilişkin telif hakları eser sahibi veya yetkili hak sahibine aittir. Okuyucu, içeriği yalnız yetkili kullanım kapsamında görüntüleyebilir; yazılı izin olmadan ticari çoğaltım, yeniden yayınlama veya üçüncü kişilere hesap/erişim devri yapamaz. Bu sınırlamalar kanunun izin verdiği istisna ve hakları ortadan kaldırmaz.

## VII. Cayma, iptal, erişim hatası ve başvurular

Okuyucunun yürürlükteki tüketici mevzuatından doğan hakları saklıdır. Mesafeli sözleşmelerde genel cayma hakkı ve elektronik ortamda anında ifa/teslim edilen dijital içeriklere ilişkin istisnalar **yalnız somut işlemde kanunî koşulları varsa** uygulanır; okuyucunun hiçbir cayma hakkı bulunmadığı şeklinde otomatik bir varsayım yapılmaz.

Bu 0 TL işlemlerinde tahsilat yapılmadığından para iadesi doğmaz. Bununla birlikte sağlanmayan veya vaat edildiği gibi işlemeyen dijital erişim için okuyucu destek ve kanunî başvuru haklarını kullanabilir. Bildirim kanalı: [DOĞRULANMIŞ DESTEK E-POSTASI/ADRESİ — EKSİK]. Gerekli durumlarda tüketici hakem heyeti, tüketici mahkemesi ve diğer kanunî yollar saklıdır.

## VIII. Kişisel veriler, onay ve kayıt saklama

Hesap, sipariş, sözleşme kabulü ve erişim işlem kayıtları ilgili aydınlatma metni, yürürlükteki KVKK düzenlemeleri ve saklama yükümlülükleri çerçevesinde işlenir. Sözleşme kabulü, pazarlama iletilerine otomatik açık rıza yerine geçmez. Okuyucunun kabul ettiği sürüm ve işlem zamanı değişmez kanıt olarak saklanmalıdır.

## IX. Yürürlük ve değişiklikler

Bu koşullar, ilgili gerçek taraf kimlikleri ve tüm zorunlu ön bilgilendirmeler tamamlanıp yetkili adminin **mevcut sürüme ait açık onayı** alındıktan ve şablon yaşam döngüsünde `active` duruma geçirildikten sonra yalnız kapsamına giren yeni işlemlere uygulanabilir. Eski siparişlerin kayıtları sonradan sürüm yükseltilerek değiştirilemez.',
  `description` = '0 TL dijital eser edinim koşulları — yönetici incelemesi; resmi işletmeci, açık adres, iletişim ve eser satıcısı doğrulama bekliyor.',
  `version` = `version` + 1,
  `active` = false,
  `lifecycleStatus` = 'review',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `id` = 'c5000000-0000-4000-8000-000000000002'
  AND `code` = 'ILKOKU_READER_DIGITAL_CONTENT_PURCHASE'
  AND `targetRole` = 'reader'
  AND `version` = 3
  AND `lifecycleStatus` = 'review'
  AND `active` = false
  AND `approvedById` IS NULL
  AND `approvedAt` IS NULL
  AND `activatedAt` IS NULL
  AND `body` LIKE '%nihai hukuki metnin hazırlanacağı çalışma alanıdır%';
