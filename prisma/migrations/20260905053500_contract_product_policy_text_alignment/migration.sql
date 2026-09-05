-- Ürün sahibi kararları çalışma şablonlarının gerçek metnine yansıtılır.
-- Kaynak SOFT_* kayıtlar ve daha önce gönderilmiş UserContract snapshot'ları değiştirilmez.
-- Değişen LIB_* şablonları yeni sürüme alınır ve hukukçu incelemesi için pasif/draft kalır.

UPDATE `ContractTemplate`
SET
  `body` = REPLACE(
    REPLACE(
      `body`,
      '11. SÜRE VE DEVAM EDEN GİZLİLİK\nGizlilik yükümlülüğünün sabit süresi bu soft taslakta belirlenmemiştir. Nihai metinde bilgi türüne göre süre, eserin daha sonra kamuya açılması ve sözleşme sona erdikten sonra devam edecek yükümlülükler ayrıca düzenlenmelidir.',
      '11. SÜRE VE DEVAM EDEN GİZLİLİK\nTicari sırlar, yayınlanmamış eser ve eser bölümleri ile erişim, parola, güvenlik ve benzeri korunması niteliği gereği devam eden bilgiler; sır veya kamuya açık olmayan niteliklerini korudukları sürece zaman sınırı olmaksızın gizli tutulur. Diğer Gizli Bilgiler bakımından gizlilik yükümlülüğü ilgili ilişki, görev veya yetkili erişim sona erdikten sonra beş (5) yıl devam eder. Bilginin hukuka uygun biçimde kamuya açılması veya sır niteliğini kaybetmesi halinde yalnız o bilgi bakımından devam eden gizlilik yükümlülüğü sona erebilir.'
    ),
    'gizlilik süresi; ekip üyelerine ilişkin sorumluluk;',
    'bilgi türüne göre belirlenen gizlilik sürelerinin hukuki uygunluğu; ekip üyelerine ilişkin sorumluluk;'
  ),
  `version` = 2,
  `active` = false,
  `lifecycleStatus` = 'draft',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'LIB_GENERAL_NDA'
  AND `version` = 1;

UPDATE `ContractTemplate`
SET
  `body` = REPLACE(
    REPLACE(
      REPLACE(
        `body`,
        'İki değerlendirme arasındaki görünürlük ve karşılaştırma kuralları ürün politikası ve tarafsızlık ilkesi doğrultusunda ayrıca belirlenir.',
        'İkinci editör kendi değerlendirmesini bağımsız biçimde tamamlayana kadar birinci editör ikinci değerlendirme metnine veya sonucuna erişemez. İkinci editör değerlendirmesini tamamladıktan sonra birinci editör ikinci raporu karşılaştırma ve süreç bütünlüğü amacıyla görebilir.'
      ),
      '11. TALEBİN GERİ ÇEKİLMESİ VE DEVAM EDEN İŞLEMLER\nYazarın inceleme talebini geri çekebilme zamanı ve bunun üstlenilmiş veya tamamlanmış görevlere etkisi ürün kuralı olarak açıkça belirlenmelidir. Bu soft taslak, sistemde bulunmayan bir iptal hakkı veya editör tarafından tamamlanmış kayıtları silme taahhüdü yaratmaz. Nihai metin, geri çekme davranışı ürün üzerinde kesinleştirildikten sonra güncellenmelidir.',
      '11. TALEBİN GERİ ÇEKİLMESİ VE DEVAM EDEN İŞLEMLER\nYazar, ikinci editör bağımsız incelemeye başlamadan önce editör inceleme talebini geri çekebilir. İkinci editörün incelemeye başlamasından sonra geri çekme, devam eden görevi otomatik olarak iptal etmez. Geri çekme; daha önce tamamlanmış editör değerlendirmelerini, güvenlik kayıtlarını veya audit/denetim izlerini geriye dönük olarak silmez. Eser içeriğine yeni erişim ise mevcut yetki ve görev durumuna göre sınırlandırılır.'
    ),
    'Yazarın talebi hangi aşamaya kadar geri çekebileceği; birinci ve ikinci editörün birbirlerinin değerlendirmelerini ne zaman görebileceği;',
    'İkinci editör başlamadan önce geri çekme sınırının ve ikinci rapor tamamlandıktan sonraki görünürlüğün hukuki/etik uygunluğu;'
  ),
  `version` = 2,
  `active` = false,
  `lifecycleStatus` = 'draft',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'LIB_WRITER_EDITOR_REVIEW'
  AND `version` = 1;

UPDATE `ContractTemplate`
SET
  `body` = REPLACE(
    REPLACE(
      `body`,
      'İki editörün birbirlerinin değerlendirmelerini ne zaman görebileceği ürün politikasıyla açıkça belirlenmelidir.',
      'Birinci editör, ikinci editör kendi bağımsız değerlendirmesini tamamlayana kadar ikinci değerlendirmeyi göremez. İkinci değerlendirme tamamlandıktan sonra birinci editör ikinci raporu karşılaştırma ve süreç bütünlüğü amacıyla görebilir; bu görünürlük ikinci editörün bağımsız değerlendirmesini etkileyecek şekilde erkene alınamaz.'
    ),
    'birinci ve ikinci editör görünürlük kuralları;',
    'ikinci rapor tamamlandıktan sonraki görünürlük politikasının hukuki ve etik uygunluğu;'
  ),
  `version` = 2,
  `active` = false,
  `lifecycleStatus` = 'draft',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'LIB_EDITOR_REVIEW_ETHICS'
  AND `version` = 1;

UPDATE `ContractTemplate`
SET
  `body` = REPLACE(
    REPLACE(
      `body`,
      'Yayınlanmamış eser metni, yazar kimliği ve iletişim bilgileri, editoryal notlar, değerlendirme soruları, davet bilgileri ve süreç kayıtları kamuya açık olmayan bilgi olarak korunmalıdır. Bunlar görev dışı amaçla açıklanamaz, yayımlanamaz veya ticari ya da mesleki çıkar için kullanılamaz.',
      'Yayınlanmamış eser metni, yazar kimliği ve iletişim bilgileri, editoryal notlar, değerlendirme soruları, davet bilgileri ve süreç kayıtları kamuya açık olmayan bilgi olarak korunmalıdır. Bunlar görev dışı amaçla açıklanamaz, yayımlanamaz veya ticari ya da mesleki çıkar için kullanılamaz. Ticari sır, yayınlanmamış eser ve erişim/güvenlik bilgileri sır niteliğini koruduğu sürece zaman sınırı olmaksızın; diğer gizli bilgiler ise görev veya erişim sona erdikten sonra beş (5) yıl gizli tutulur.'
    ),
    'gizlilik yükümlülüğünün görev sonrasındaki süresi;',
    'bilgi türüne göre belirlenen gizlilik sürelerinin hukuki uygunluğu;'
  ),
  `version` = 2,
  `active` = false,
  `lifecycleStatus` = 'draft',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'LIB_EDITOR_CANDIDATE_NDA'
  AND `version` = 1;

UPDATE `ContractTemplate`
SET
  `body` = REPLACE(
    REPLACE(
      `body`,
      'Yayınlanmamış eser içeriği, özel dosyalar, yazar iletişim bilgileri, editör raporları, paylaşım notları ve kamuya açık olmayan süreç verileri yalnız ilgili yayıncılık değerlendirmesi için kullanılmalıdır. Bu bilgiler yetkisiz üçüncü kişilere açıklanmamalı veya başka eser, yazar ya da ticari amaçlar için yeniden kullanılmamalıdır.',
      'Yayınlanmamış eser içeriği, özel dosyalar, yazar iletişim bilgileri, editör raporları, paylaşım notları ve kamuya açık olmayan süreç verileri yalnız ilgili yayıncılık değerlendirmesi için kullanılmalıdır. Bu bilgiler yetkisiz üçüncü kişilere açıklanmamalı veya başka eser, yazar ya da ticari amaçlar için yeniden kullanılmamalıdır. Ticari sır, yayınlanmamış eser ve erişim/güvenlik bilgileri sır niteliğini koruduğu sürece zaman sınırı olmaksızın; diğer gizli bilgiler ilgili erişim veya iş ilişkisi sona erdikten sonra beş (5) yıl gizli tutulur.'
    ),
    'Gizlilik süresi; indirilen dosyaların saklanması ve silinmesi;',
    'Bilgi türüne göre belirlenen gizlilik sürelerinin hukuki uygunluğu; indirilen dosyaların saklanması ve silinmesi;'
  ),
  `version` = 2,
  `active` = false,
  `lifecycleStatus` = 'draft',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'LIB_PUBLISHER_DISCOVERY_NDA'
  AND `version` = 1;

UPDATE `ContractTemplate`
SET
  `body` = REPLACE(
    REPLACE(
      REPLACE(
        `body`,
        'İndirilen kopyaların yerel saklama süresi, cihaz güvenliği, silme yükümlülüğü ve kurum içi arşiv politikası nihai metin ve bilgi güvenliği politikasıyla kesinleştirilmelidir.',
        'Ekip üyesinin kişisel cihazında veya kişisel çalışma alanında bulunan indirilen kopyalar, ilgili görev ya da üyelik sona erdiğinde güvenli biçimde silinmelidir. Yayınevinin yetki kontrollü yönetici arşivinde bulunan kurumsal kopya ise yalnız kurumsal kayıt, denetim, hukuki saklama veya yetkili yayıncılık süreci amacıyla ve erişimi sınırlandırılmış şekilde tutulabilir.'
      ),
      'Üyelik pasif olduğunda veya ilgili izin kaldırıldığında yeni erişim hakkı sona erer. Sistem audit ve hukuki kayıtlarının saklama süresi ile daha önce yetkili şekilde indirilmiş yerel kopyaların silinme yöntemi ayrıca belirlenmelidir.',
      'Üyelik pasif olduğunda veya ilgili izin kaldırıldığında yeni erişim hakkı sona erer. Ayrılan ekip üyesinin kişisel/yerel kopyaları güvenli biçimde silinir. Yetki kontrollü yayınevi yönetici arşivindeki kurumsal kopya, yalnız belirlenmiş kurumsal ve hukuki amaçlarla saklanabilir. Sistem audit ve hukuki kayıtları ayrıca kendi saklama politikasına tabidir.'
    ),
    'yerel dosya saklama/silme;',
    'kişisel/yerel kopyaların silinmesi ve yetki kontrollü yönetici arşivinin saklama sınırları;'
  ),
  `version` = 2,
  `active` = false,
  `lifecycleStatus` = 'draft',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'LIB_PUBLISHER_TEAM_CONFIDENTIALITY'
  AND `version` = 1;

UPDATE `ContractTemplate`
SET
  `body` = REPLACE(
    REPLACE(
      REPLACE(
        `body`,
        '6. MÜNHASIRLIK VE ÖNCELİK\nYazar bu soft taslağı kabul etmekle yayınevine otomatik münhasırlık, ilk teklif, öncelik veya opsiyon hakkı vermez. Müzakere süresince geçici bir münhasırlık istenirse bunun süresi, kapsamı, sona erme biçimi ve karşılığı ayrıca açıkça kararlaştırılmalıdır.',
        '6. MÜNHASIRLIK / NO-SHOP\nBu yayın niyeti belgesi ileride kullanıma alınırsa, kabul tarihinden başlayan ilk otuz (30) gün boyunca yazar ilgili eser için başka bir yayıneviyle bağlayıcı yayın sözleşmesi imzalamamayı ve aynı hak paketi bakımından paralel bağlayıcı müzakere yürütmemeyi hedefleyen geçici bir no-shop yükümlülüğünü kabul eder. Bu geçici yükümlülük mali hak devri, yayın lisansı, ilk teklif veya kalıcı münhasırlık oluşturmaz ve otuzuncu günün sonunda kendiliğinden sona erer; uzatma ancak ayrıca açıkça kararlaştırılır.'
      ),
      '10. BAŞKA GÖRÜŞMELER\nBu soft taslakta ayrıca ve açıkça süreli bir münhasırlık kararlaştırılmadıkça, yazarın başka yayınevleriyle görüşme yapmasının yasaklandığı varsayılmaz. Nihai iş modeli farklı bir kural gerektiriyorsa bu kural açık ve ölçülü biçimde ayrıca düzenlenmelidir.',
      '10. BAŞKA GÖRÜŞMELER\nİlk otuz (30) günlük no-shop süresi boyunca 6. maddede belirtilen sınırlama uygulanır. Otuzuncu günden sonra, belge henüz geçerliliğini korusa dahi, ayrıca yazılı bir uzatma veya nihai sözleşme yoksa yazar başka yayınevleriyle görüşebilir. Bu hüküm yazarın eseri üzerinde kalıcı münhasırlık veya hak devri yaratmaz.'
    ),
    '11. NİHAİ SÖZLEŞMEYE GEÇİŞ\nTaraflar yayın konusunda anlaşırsa, mali hakların ve ticari koşulların açıkça gösterildiği nihai sözleşme ayrıca hazırlanmalı ve yetkili süreçten gönderilmelidir. Nihai sözleşme ile bu niyet metni arasında çelişki olursa, hukuken geçerli nihai sözleşmenin hükümleri esas alınmalıdır.',
    '11. GEÇERLİLİK VE NİHAİ SÖZLEŞMEYE GEÇİŞ\nBu yayın niyeti belgesi kabul tarihinden itibaren altmış (60) gün geçerlidir ve ayrıca uzatılmadıkça altmışıncı günün sonunda kendiliğinden sona erer. Otuz (30) günlük no-shop süresinin sona ermesi belgenin kalan geçerlilik süresini ortadan kaldırmaz. Taraflar yayın konusunda anlaşırsa, mali hakların ve ticari koşulların açıkça gösterildiği nihai sözleşme ayrıca hazırlanmalı ve yetkili süreçten gönderilmelidir. Nihai sözleşme ile bu niyet metni arasında çelişki olursa, hukuken geçerli nihai sözleşmenin hükümleri esas alınmalıdır.'
  ),
  `version` = 2,
  `active` = false,
  `lifecycleStatus` = 'draft',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'LIB_PUBLICATION_INTENT_WRITER'
  AND `version` = 1;

UPDATE `ContractTemplate`
SET
  `body` = REPLACE(
    REPLACE(
      `body`,
      '6. MÜNHASIRLIK, OPSİYON VE ÖNCELİK\nBu soft taslak yayınevine otomatik münhasırlık, opsiyon, ilk teklif veya öncelik hakkı vermez. Böyle bir ticari koruma isteniyorsa süresi, kapsamı, karşılığı ve sona erme koşulları ayrıca açıkça müzakere edilmelidir.',
      '6. RESMİ YAYIN NİYETİ, MÜNHASIRLIK VE SÜRE\nYayınevi bu belgeyi kabul ederek ilgili eser için resmi yayın niyetini sistemde kayıt altına alır. Yazar ve yayınevi tarafındaki yayın niyeti belgeleri aynı süre politikasını kullanır: belge kabul tarihinden itibaren altmış (60) gün geçerlidir; ilk otuz (30) gün aynı hak paketi bakımından geçici no-shop/münhasırlık müzakere dönemi olarak uygulanır. Bu dönem mali hak devri, yayın lisansı, opsiyon, ilk teklif veya kalıcı münhasırlık oluşturmaz. Otuzuncu günden sonra no-shop kendiliğinden sona erer; belge ayrıca uzatılmadıkça altmışıncı günün sonunda tamamen sona erer.'
    ),
    'Talep edilen mali haklar; süre, bölge, dil ve format;',
    'Yazar/yayınevi niyet belgelerinde ortak 60 günlük geçerlilik ve 30 günlük no-shop politikasının hukuki uygunluğu; talep edilen mali haklar; süre, bölge, dil ve format;'
  ),
  `version` = 2,
  `active` = false,
  `lifecycleStatus` = 'draft',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'LIB_PUBLICATION_INTENT_PUBLISHER'
  AND `version` = 1;

-- LIB_WRITER_PLATFORM_LICENSE ürün kararlarından etkilenmediği için v1 olarak bırakılır.
-- Hiçbir şablon bu migration ile approved/active yapılmaz.
