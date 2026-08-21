-- Yeni üyelikte zorunlu temel platform kullanımı ve gizlilik taahhüdü.
-- Legacy/backfill yoktur: kabul kanıtı yalnız yeni kayıt transaction'ında oluşturulur.
INSERT INTO `ContractTemplate` (
  `id`, `code`, `title`, `description`, `targetRole`, `body`, `version`, `active`,
  `lifecycleStatus`, `sourceTemplateId`, `approvedById`, `approvedAt`, `activatedAt`,
  `createdById`, `updatedById`, `createdAt`, `updatedAt`
) VALUES (
  'c4000000-0000-4000-8000-000000000001',
  'PLATFORM_MEMBERSHIP_CONFIDENTIALITY_V1',
  'İlkOku Platform Kullanım ve Gizlilik Taahhüdü',
  'Yeni hesap açılışında tüm kullanıcıların kabul etmesi gereken temel platform kullanım ve gizlilik metni.',
  'any',
  'İLKOKU PLATFORM KULLANIM VE GİZLİLİK TAAHHÜDÜ\n\n## 1. Amaç ve kapsam\nBu metin, İlkOku hesabı oluşturulurken platformun temel kullanım ve gizlilik kurallarının kullanıcı tarafından bilinmesini ve kabul edilmesini kayıt altına alır. Rol bazlı özellikler için ayrıca gösterilen özel sözleşme, taahhüt veya süreç kuralları saklıdır.\n\n## 2. Hesap güvenliği\nHesap kişiye özeldir. Kullanıcı, şifre ve oturum bilgilerini üçüncü kişilerle paylaşmamalı; yetkisiz erişim şüphesinde hesabını güvene almak için gerekli adımları atmalıdır.\n\n## 3. Eserler, içerikler ve fikrî haklar\nİlkOku üzerinde görülen eser, bölüm, değerlendirme, editör notu, yayınevi bilgisi veya diğer kullanıcı içerikleri yalnızca kullanıcının sahip olduğu platform yetkileri ve hizmetin amacı çerçevesinde kullanılabilir. Yetkisiz kopyalama, dışarı aktarma, çoğaltma veya üçüncü kişilerle paylaşma yapılamaz. Eser ve içerik üzerindeki fikrî haklar hak sahibinde kalır; bu taahhüdün kabulü herhangi bir telif veya mali hakkın İlkOku''ya ya da başka bir kullanıcıya devri anlamına gelmez.\n\n## 4. Gizlilik\nKullanıcı, rolü veya kendisine verilen erişim nedeniyle gördüğü kamuya açık olmayan eser, taslak, dosya, değerlendirme, iletişim veya çalışma bilgilerini yetkisiz kişilerle paylaşmamayı kabul eder. Kamuya açık hale gelmiş bilgiler ile kullanıcının hukuken açıklama hakkı bulunan bilgiler bu kapsamın dışındadır.\n\n## 5. Uygun kullanım\nPlatform; hukuka aykırı faaliyet, başkalarının haklarını ihlal, yetkisiz veri toplama, güvenlik önlemlerini aşma, hesap veya içeriğe izinsiz erişme ve hizmetin çalışmasını bozma amacıyla kullanılamaz. Ciddi ihlal veya güvenlik riski halinde platform kuralları ve uygulanabilir mevzuat çerçevesinde erişim sınırlandırılabilir.\n\n## 6. Kişisel veriler\nKişisel verilerin işlenmesine ilişkin bilgilendirme bu taahhütten ayrı olan KVKK Aydınlatma Metni ve ilgili yasal metinlerde yapılır. Bu taahhüt KVKK aydınlatma yükümlülüğünün yerine geçmez ve ayrı bir açık rıza beyanı olarak yorumlanmaz.\n\n## 7. Elektronik kabul kaydı\nKullanıcının kayıt ekranındaki kabul işlemi; kabul edilen şablonun kodu, sürümü, başlığı ve metin görüntüsüyle birlikte İlkOku sözleşme kayıtlarında saklanır. Bu platform içi kabul kaydı, tek başına 5070 sayılı Elektronik İmza Kanunu kapsamında nitelikli elektronik imza işlemi olduğu iddiasını taşımaz.\n\n## 8. Diğer hükümler\nBu temel taahhüt; yayınevi yayın sözleşmesi, editör hizmet sözleşmesi, telif devri, münhasırlık, royalty, avans veya başka bir ticari hak düzenlemesi oluşturmaz. Bu konular gerektiğinde ayrıca ve açık şekilde düzenlenir.\n\nKullanıcı, kayıt sırasında bu metni okuyup kabul ettiğini elektronik olarak beyan eder.',
  1,
  true,
  'active',
  NULL,
  NULL,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3),
  NULL,
  NULL,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);
