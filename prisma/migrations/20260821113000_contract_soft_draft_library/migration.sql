INSERT INTO `ContractTemplate`
  (`id`,`code`,`title`,`description`,`targetRole`,`body`,`version`,`active`,`createdAt`,`updatedAt`)
VALUES
  (
    'c2000000-0000-4000-8000-000000000001',
    'SOFT_GENERAL_NDA',
    'Genel Gizlilik ve Eser Bilgisi Koruma Taslağı',
    'SOFT TASLAK. Eser, dosya ve kamuya açık olmayan süreç bilgilerinin korunması için başlangıç metni.',
    'any',
    'SOFT TASLAK — HUKUKİ İNCELEME GEREKİR\n\nTaraf: {{ad_soyad}}\nE-posta: {{eposta}}\nRol: {{rol}}\nTarih: {{tarih}}\nİlgili eser: {{eser}}\n\n1. Amaç\nBu taslak, İlkOku üzerinden erişilen yayınlanmamış eser, dosya, editoryal not, kullanıcı bilgisi ve yayın görüşmesi bilgisinin yalnız ilgili değerlendirme veya operasyon amacıyla kullanılmasına ilişkin başlangıç çerçevesidir.\n\n2. Gizlilik\nKamuya açık olmayan içerik üçüncü kişilerle paylaşılmaz, yetkisiz biçimde çoğaltılmaz ve farklı bir amaçla kullanılmaz. Zorunlu ekip içi erişim varsa yalnız görev için gerekli kişilerle sınırlı tutulur.\n\n3. Haklar\nBu taslak herhangi bir telif hakkı devri, yayın hakkı lisansı veya münhasırlık oluşturmaz. Eser üzerindeki haklar ayrıca yazılı olarak kararlaştırılmadıkça hak sahibinde kalır.\n\n4. Güvenlik\nErişim bilgileri paylaşılmaz; yetkisiz erişim veya veri sızıntısı şüphesi gecikmeden İlkOku yönetimine bildirilir.\n\n5. Nihai metin\nSüre, istisnalar, yaptırım ve uyuşmazlık hükümleri hukuk incelemesi sonrasında eklenmelidir. İlkOku içindeki kabul kaydı nitelikli elektronik imza değildir.',
    1,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c2000000-0000-4000-8000-000000000002',
    'SOFT_WRITER_PLATFORM_LICENSE',
    'Yazar Eser Yayınlama ve Platform Lisansı Taslağı',
    'SOFT TASLAK. Yazarın hak sahipliği beyanı ve İlkOku üzerinde sınırlı gösterim izni için başlangıç metni.',
    'writer',
    'SOFT TASLAK — HUKUKİ İNCELEME GEREKİR\n\nYazar: {{ad_soyad}}\nE-posta: {{eposta}}\nTarih: {{tarih}}\nEser: {{eser}}\n\n1. Hak sahipliği beyanı\nYazar, platforma yüklediği eseri paylaşmaya yetkili olduğunu ve bilerek üçüncü kişi haklarını ihlal eden içerik sunmadığını beyan eder.\n\n2. Platform izni\nYazar, eser platformda yayında olduğu sürece İlkOku hizmetinin çalışması için gerekli teknik barındırma, görüntüleme, önizleme ve kullanıcıya iletim işlemleri bakımından sınırlı ve devredilemez bir kullanım izni verilmesini kabul eder.\n\n3. Mülkiyet\nBu izin eser sahipliğinin veya mali hakların İlkOkuya devri değildir. Yazarın telif hakları ayrıca açıkça kararlaştırılmadıkça yazarda kalır.\n\n4. Yayından kaldırma\nArşivleme, yayından kaldırma, güvenlik kopyaları ve kayıt saklama sınırları ürün politikası ile nihai hukuki metinde açıklaştırılmalıdır.\n\n5. Üçüncü taraf yayın anlaşmaları\nYayınevi ile yapılacak baskı, dağıtım, dijital yayın veya telif anlaşmaları ayrı bir nihai sözleşme gerektirir.\n\n6. Nihai metin\nLisans süresi, bölge, teknik kopyalar, ihlal bildirimi ve fesih hükümleri hukuk incelemesi ile tamamlanmalıdır.',
    1,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c2000000-0000-4000-8000-000000000003',
    'SOFT_WRITER_EDITOR_REVIEW',
    'Editör İnceleme Süreci Onay Taslağı',
    'SOFT TASLAK. Yazarın eserini bağımsız editör inceleme sürecine açması için başlangıç metni.',
    'writer',
    'SOFT TASLAK — HUKUKİ İNCELEME GEREKİR\n\nYazar: {{ad_soyad}}\nTarih: {{tarih}}\nEser: {{eser}}\n\n1. İnceleme amacı\nYazar, eserin İlkOku editör havuzunda birinci ve gerektiğinde ikinci bağımsız editör tarafından okunması ve değerlendirilmesi için erişime açılmasını talep eder.\n\n2. Erişim kapsamı\nEditör erişimi yalnız inceleme görevi, notlama ve değerlendirme sonucunun üretilmesi amacıyla kullanılır.\n\n3. Editoryal görüş\nEditör değerlendirmesi tavsiye niteliğindedir; eserin yayımlanacağını, yayınevi kabulünü veya ticari başarıyı garanti etmez.\n\n4. Gizlilik beklentisi\nİlkOku editörlerinden yayınlanmamış eser içeriğini ve yazar bilgilerini görev dışında paylaşmamaları beklenir; editör yükümlülükleri ayrı editör taslağında düzenlenir.\n\n5. Haklar\nİncelemeye açma telif hakkı devri veya yayın lisansı değildir.\n\n6. Nihai metin\nİnceleme saklama süresi, geri çekme, çıkar çatışması ve sorumluluk sınırları hukuk incelemesinde kesinleştirilmelidir.',
    1,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c2000000-0000-4000-8000-000000000004',
    'SOFT_EDITOR_REVIEW_ETHICS',
    'Editör İnceleme, Gizlilik ve Tarafsızlık Taslağı',
    'SOFT TASLAK. Editör inceleme görevi, gizlilik, çıkar çatışması ve bağımsızlık için başlangıç metni.',
    'editor',
    'SOFT TASLAK — HUKUKİ İNCELEME GEREKİR\n\nEditör: {{ad_soyad}}\nE-posta: {{eposta}}\nTarih: {{tarih}}\nİlgili eser: {{eser}}\n\n1. Görev kapsamı\nEditör yalnız kendisine atanan veya usulüne uygun olarak üstlendiği eserleri İlkOku editoryal süreci kapsamında inceler.\n\n2. Gizlilik\nYayınlanmamış eser metni, yazar kimliği, diğer editör notları ve süreç bilgileri görev dışında paylaşılmaz veya başka bir amaçla kullanılmaz.\n\n3. Tarafsızlık\nEditör kişisel, mesleki veya mali çıkar çatışması varsa görevi kabul etmeden önce bildirir ve gerekli durumda incelemeden çekilir.\n\n4. Bağımsız değerlendirme\nBirinci ve ikinci editör süreçlerinde editör kendi değerlendirmesini bağımsız biçimde oluşturur; sistemde izin verilmeyen başka bir değerlendirmeyi yönlendirici biçimde kullanmaz.\n\n5. Eser hakları\nİnceleme erişimi editöre eser üzerinde herhangi bir kullanım, çoğaltma veya yayın hakkı vermez.\n\n6. Nihai metin\nGörev standardı, süre, ücret varsa ücret modeli, yaptırım ve fesih hükümleri ayrı iş modeli kararı ve hukuk incelemesi ile tamamlanmalıdır.',
    1,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c2000000-0000-4000-8000-000000000005',
    'SOFT_EDITOR_CANDIDATE_NDA',
    'Editör Adayı ve Dış Editör Gizlilik Taslağı',
    'SOFT TASLAK. Editör adayı veya davetli dış editörün sınırlı içerik erişimi için başlangıç metni.',
    'editor_pending',
    'SOFT TASLAK — HUKUKİ İNCELEME GEREKİR\n\nKatılımcı: {{ad_soyad}}\nE-posta: {{eposta}}\nRol: {{rol}}\nTarih: {{tarih}}\nEser: {{eser}}\n\n1. Sınırlı erişim\nKatılımcıya verilen erişim yalnız değerlendirme, yetkinlik doğrulama veya kendisine bildirilen editoryal görev amacıyla kullanılabilir.\n\n2. Gizlilik\nEser içeriği, yazar bilgisi, platform içi notlar ve davet bağlantıları üçüncü kişilerle paylaşılmaz.\n\n3. Kopyalama yasağı\nGörev için zorunlu olmayan indirme, çoğaltma, ekran kaydı, harici depolama veya yeniden dağıtım yapılmaz.\n\n4. Rol kazanımı\nBu metin editör rolünün otomatik onayı, istihdam ilişkisi veya ücret hakkı oluşturmaz.\n\n5. Sonlandırma\nDavet veya erişim sona erdiğinde gizlilik yükümlülüğünün hangi süreyle devam edeceği nihai metinde belirlenmelidir.\n\n6. Nihai metin\nSüre, yaptırım, veri silme ve uyuşmazlık hükümleri hukuk incelemesiyle tamamlanmalıdır.',
    1,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c2000000-0000-4000-8000-000000000006',
    'SOFT_PUBLISHER_DISCOVERY_NDA',
    'Yayınevi Eser Keşif ve Gizlilik Taslağı',
    'SOFT TASLAK. Yayınevinin keşif, paylaşım ve başvuru sırasında gördüğü sınırlı eser bilgisini korumak için başlangıç metni.',
    'publisher',
    'SOFT TASLAK — HUKUKİ İNCELEME GEREKİR\n\nYayınevi kullanıcısı: {{ad_soyad}}\nE-posta: {{eposta}}\nTarih: {{tarih}}\nEser: {{eser}}\n\n1. Değerlendirme amacı\nYayınevi, kendisine açılan eser ve yazar bilgilerini yalnız yayıncılık açısından değerlendirme, iç editoryal inceleme ve yetkili ekip içi karar amacıyla kullanır.\n\n2. Gizlilik\nYayınlanmamış eser, dosya, yazar iletişim bilgisi ve İlkOku üzerinden edinilen özel süreç bilgisi yetkisiz üçüncü kişilerle paylaşılmaz.\n\n3. Ekip içi paylaşım\nKurum içi paylaşım yalnız ilgili görev için yetkilendirilmiş ekip üyeleriyle ve ihtiyaç ölçüsünde yapılır.\n\n4. Haklar\nKeşif veya dosya erişimi yayınevine telif hakkı, yayın hakkı, öncelik veya münhasırlık sağlamaz.\n\n5. Temas\nYazarla temas ve teklif süreci İlkOku ürün politikasına ve tarafların ayrıca kararlaştıracağı koşullara uygun yürütülür.\n\n6. Nihai metin\nGizlilik süresi, izin verilen kurum içi kopyalar, silme ve yaptırım hükümleri hukuk incelemesiyle tamamlanmalıdır.',
    1,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c2000000-0000-4000-8000-000000000007',
    'SOFT_PUBLISHER_TEAM_CONFIDENTIALITY',
    'Yayınevi Ekip Yetki ve Gizlilik Taahhüdü Taslağı',
    'SOFT TASLAK. Yayınevi ekip üyelerinin kişi bazlı yetki ve kurum içi veri paylaşım sorumluluğu için başlangıç metni.',
    'publisher',
    'SOFT TASLAK — HUKUKİ İNCELEME GEREKİR\n\nEkip üyesi: {{ad_soyad}}\nE-posta: {{eposta}}\nTarih: {{tarih}}\nİlgili eser: {{eser}}\n\n1. Yetki sınırı\nKullanıcı yalnız İlkOku üzerinde kendisine tanımlanan yayınevi üyeliği ve kişi bazlı yetkiler kapsamında işlem yapar.\n\n2. Hesap güvenliği\nHesap, oturum ve davet bilgileri başka çalışanlarla paylaşılmaz. Yetki ihtiyacı değiştiğinde kurum yöneticisi üzerinden güncellenir.\n\n3. Gizli bilgi\nEserler, dosyalar, editör talepleri, yazar bilgileri ve sözleşme verileri yalnız görevin gerektirdiği ölçüde kullanılır.\n\n4. Kurum içi sorumluluk\nEkipten ayrılma veya görev değişikliğinde erişimin kaldırılması kurum ve kullanıcı sorumluluğunda takip edilir.\n\n5. Haklar\nEkip erişimi eser veya sözleşme üzerinde kişisel hak sağlamaz.\n\n6. Nihai metin\nKurum sorumluluğu, erişim sonlandırma süresi, denetim ve yaptırım hükümleri hukuk incelemesi ile tamamlanmalıdır.',
    1,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c2000000-0000-4000-8000-000000000008',
    'SOFT_PUBLICATION_INTENT_WRITER',
    'Yazar Yayın Niyeti ve Ön Mutabakat Taslağı',
    'SOFT TASLAK. Yazar tarafında nihai yayın sözleşmesi öncesi kapsam ve müzakere başlıklarını kaydetmek için.',
    'writer',
    'SOFT TASLAK — BAĞLAYICI NİHAİ YAYIN SÖZLEŞMESİ DEĞİLDİR\n\nYazar: {{ad_soyad}}\nTarih: {{tarih}}\nEser: {{eser}}\n\n1. Amaç\nBu metin, eser için bir yayıneviyle yayın görüşmesine geçildiğini ve tarafların nihai sözleşme öncesinde müzakere edeceği başlıkları görünür kılar.\n\n2. Açık başlıklar\nBaskı ve dijital haklar, lisans veya devir türü, süre, bölge, dil, münhasırlık, avans, royalty oranı, hesap dönemi, baskı adedi, stok, iade, pazarlama, kapak ve çeviri hakları ayrıca kararlaştırılmalıdır.\n\n3. Yazar onayı\nYazar, ticari ve hukuki koşullar kesinleşmeden eserin haklarını devretmiş sayılmaz.\n\n4. Yayın planı\nHedef tarih, ISBN, baskı adedi ve üretim aşamaları planlama verisi olabilir; tek başına mali hak devri oluşturmaz.\n\n5. Sonraki adım\nNihai yayın sözleşmesi hukuk incelemesinden geçmeli ve tarafların gerçek ticari kararlarını açıkça içermelidir.\n\n6. Platform kaydı\nİlkOku içindeki kabul veya görüntüleme kaydı nitelikli elektronik imza veya tek başına telif devri işlemi değildir.',
    1,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c2000000-0000-4000-8000-000000000009',
    'SOFT_PUBLICATION_INTENT_PUBLISHER',
    'Yayınevi Yayın Niyeti ve Ön Mutabakat Taslağı',
    'SOFT TASLAK. Yayınevi tarafında yayın planı öncesi niyet, sorumluluk ve açık ticari başlıkları kaydetmek için.',
    'publisher',
    'SOFT TASLAK — BAĞLAYICI NİHAİ YAYIN SÖZLEŞMESİ DEĞİLDİR\n\nYayınevi kullanıcısı: {{ad_soyad}}\nTarih: {{tarih}}\nEser: {{eser}}\n\n1. Yayın niyeti\nYayınevi, eseri yayıncılık değerlendirmesinde ilerletme niyetini bildirir. Bu niyet tek başına eserin mali haklarını devraldığı anlamına gelmez.\n\n2. Planlama\nHedef yayın tarihi, ISBN, baskı adedi, kapak, mizanpaj, üretim ve dağıtım adımları ayrıca yayın planında izlenebilir.\n\n3. Açık ticari koşullar\nAvans, royalty, mali hak kapsamı, süre, bölge, dil, münhasırlık, baskı ve dijital kullanım, alt lisans, çeviri, pazarlama ve fesih koşulları nihai sözleşmede belirlenmelidir.\n\n4. Gizlilik\nMüzakere sırasında erişilen yayınlanmamış eser ve ticari görüşme bilgileri yetkisiz kişilerle paylaşılmaz.\n\n5. Üretime geçiş\nNihai koşullar onaylanmadan geri döndürülemez mali hak devri veya kapsamı belirsiz yayın taahhüdü oluşturulmamalıdır.\n\n6. Nihai metin\nBu taslak hukukçu incelemesi ve gerçek ticari parametreler olmadan nihai yayın sözleşmesi olarak kullanılmamalıdır.',
    1,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  );
