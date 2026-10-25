-- User-approved SEO metadata only: five already-published Turkish legal pages.
-- No public bodyJson, title, canonical, status, publishedAt, revision, or editor identity changes.
-- Guard by exact contentKey, public slug, published state and old descriptions.
-- If content has since been edited, leave it untouched (no silent overwrite).

UPDATE `ContentPage`
SET `seoDescription` = 'İlkOku KVKK Aydınlatma Metni: işlenen veri kategorilerini, kişisel verilerin kullanım amaçlarını, hukuki sebepleri ve başvuru yollarını inceleyin.', `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `contentKey` = 'legal:kvkk'
  AND `slug` = '/yasal/kvkk'
  AND `status` = 'published'
  AND JSON_VALID(`bodyJson`) = 1
  AND JSON_UNQUOTE(JSON_EXTRACT(`bodyJson`, '$.description')) = '6698 sayılı Kanun kapsamında İlkOku kullanıcılarına yönelik aydınlatma metni.'
  AND (`seoDescription` IS NULL OR `seoDescription` = '6698 sayılı Kanun kapsamında İlkOku kullanıcılarına yönelik aydınlatma metni.');

UPDATE `ContentPage`
SET `seoDescription` = 'İlkOku Gizlilik Politikası: hesap, profil, eser ve etkileşim verilerinin işlenme amaçlarını, veri güvenliğini ve kullanıcıların başvuru yollarını öğrenin.', `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `contentKey` = 'legal:gizlilik-politikasi'
  AND `slug` = '/yasal/gizlilik-politikasi'
  AND `status` = 'published'
  AND JSON_VALID(`bodyJson`) = 1
  AND JSON_UNQUOTE(JSON_EXTRACT(`bodyJson`, '$.description')) = 'İlkOku''nun kişisel verileri ve kullanıcı gizliliğini ele alma yaklaşımı.'
  AND (`seoDescription` IS NULL OR `seoDescription` = 'İlkOku''nun kişisel verileri ve kullanıcı gizliliğini ele alma yaklaşımı.');

UPDATE `ContentPage`
SET `seoDescription` = 'İlkOku Telif Hakkı Politikası: eser sahipliği, kullanıcı sorumlulukları, telif ihlali bildirimleri ve içerik inceleme süreçleri hakkında bilgi edinin.', `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `contentKey` = 'legal:telif-hakki-politikasi'
  AND `slug` = '/yasal/telif-hakki-politikasi'
  AND `status` = 'published'
  AND JSON_VALID(`bodyJson`) = 1
  AND JSON_UNQUOTE(JSON_EXTRACT(`bodyJson`, '$.description')) = 'İlkOku''da eser sahipliği, hak ihlali bildirimi ve içerik kaldırma süreci.'
  AND (`seoDescription` IS NULL OR `seoDescription` = 'İlkOku''da eser sahipliği, hak ihlali bildirimi ve içerik kaldırma süreci.');

UPDATE `ContentPage`
SET `seoDescription` = 'İlkOku Kullanım Şartları: üyelik, hesap güvenliği, eser ve kullanıcı içerikleri, fikrî haklar ve platform kullanım kuralları hakkında bilgi edinin.', `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `contentKey` = 'legal:kullanim-sartlari'
  AND `slug` = '/yasal/kullanim-sartlari'
  AND `status` = 'published'
  AND JSON_VALID(`bodyJson`) = 1
  AND JSON_UNQUOTE(JSON_EXTRACT(`bodyJson`, '$.description')) = 'İlkOku platformunun kullanımına ilişkin temel koşullar.'
  AND (`seoDescription` IS NULL OR `seoDescription` = 'İlkOku platformunun kullanımına ilişkin temel koşullar.');

UPDATE `ContentPage`
SET `seoDescription` = 'İlkOku Çerez Politikası: oturum ve hesap güvenliğinde kullanılan zorunlu çerezleri, saklama sürelerini ve tarayıcıdan yönetim seçeneklerini inceleyin.', `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `contentKey` = 'legal:cerez-politikasi'
  AND `slug` = '/yasal/cerez-politikasi'
  AND `status` = 'published'
  AND JSON_VALID(`bodyJson`) = 1
  AND JSON_UNQUOTE(JSON_EXTRACT(`bodyJson`, '$.description')) = 'İlkOku''nun zorunlu çerez kullanımına ilişkin açıklamalar.'
  AND (`seoDescription` IS NULL OR `seoDescription` = 'İlkOku''nun zorunlu çerez kullanımına ilişkin açıklamalar.');
