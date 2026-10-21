-- User-approved SEO descriptions (21 October 2026), five existing TR legal CMS records.
-- Only exact, unchanged published source snapshots are eligible.
-- A CMS revision is recorded alongside each publication update.
-- Body text, title, document update label, canonical, status, author IDs and other locales remain intact.
START TRANSACTION;

-- kvkk: snapshot the approved metadata-only revision, attributed to system deployment.
INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
SELECT UUID(), page.id,
  (SELECT COALESCE(MAX(revision.version), 0) + 1 FROM ContentRevision revision WHERE revision.pageId = page.id),
  JSON_OBJECT('kind', 'legal', 'locale', 'tr', 'title', page.title, 'description', 'İlkOku KVKK Aydınlatma Metni: işlenen veri kategorilerini, kişisel verilerin kullanım amaçlarını, hukuki sebepleri ve başvuru yollarını inceleyin.',
    'updatedLabel', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.updatedLabel')), ''),
    'body', JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.body')), 'status', 'published'),
  NULL, CURRENT_TIMESTAMP(3)
FROM ContentPage page
WHERE page.contentKey = 'legal:kvkk'
  AND page.slug = '/yasal/kvkk'
  AND page.status = 'published'
  AND JSON_VALID(page.bodyJson) = 1
  AND BINARY page.seoDescription = BINARY '6698 sayılı Kanun kapsamında İlkOku kullanıcılarına yönelik aydınlatma metni.'
  AND BINARY JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.description')) = BINARY '6698 sayılı Kanun kapsamında İlkOku kullanıcılarına yönelik aydınlatma metni.'
  AND CHAR_LENGTH(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.body')), ''))) > 0;

UPDATE ContentPage
SET seoDescription = 'İlkOku KVKK Aydınlatma Metni: işlenen veri kategorilerini, kişisel verilerin kullanım amaçlarını, hukuki sebepleri ve başvuru yollarını inceleyin.',
    bodyJson = JSON_SET(bodyJson, '$.description', 'İlkOku KVKK Aydınlatma Metni: işlenen veri kategorilerini, kişisel verilerin kullanım amaçlarını, hukuki sebepleri ve başvuru yollarını inceleyin.'),
    updatedAt = CURRENT_TIMESTAMP(3)
WHERE contentKey = 'legal:kvkk'
  AND slug = '/yasal/kvkk'
  AND status = 'published'
  AND JSON_VALID(bodyJson) = 1
  AND BINARY seoDescription = BINARY '6698 sayılı Kanun kapsamında İlkOku kullanıcılarına yönelik aydınlatma metni.'
  AND BINARY JSON_UNQUOTE(JSON_EXTRACT(bodyJson, '$.description')) = BINARY '6698 sayılı Kanun kapsamında İlkOku kullanıcılarına yönelik aydınlatma metni.'
  AND CHAR_LENGTH(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(bodyJson, '$.body')), ''))) > 0;

-- gizlilik-politikasi: snapshot the approved metadata-only revision, attributed to system deployment.
INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
SELECT UUID(), page.id,
  (SELECT COALESCE(MAX(revision.version), 0) + 1 FROM ContentRevision revision WHERE revision.pageId = page.id),
  JSON_OBJECT('kind', 'legal', 'locale', 'tr', 'title', page.title, 'description', 'İlkOku Gizlilik Politikası: hesap, profil, eser ve etkileşim verilerinin işlenme amaçlarını, veri güvenliğini ve kullanıcıların başvuru yollarını öğrenin.',
    'updatedLabel', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.updatedLabel')), ''),
    'body', JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.body')), 'status', 'published'),
  NULL, CURRENT_TIMESTAMP(3)
FROM ContentPage page
WHERE page.contentKey = 'legal:gizlilik-politikasi'
  AND page.slug = '/yasal/gizlilik-politikasi'
  AND page.status = 'published'
  AND JSON_VALID(page.bodyJson) = 1
  AND BINARY page.seoDescription = BINARY 'İlkOku''nun kişisel verileri ve kullanıcı gizliliğini ele alma yaklaşımı.'
  AND BINARY JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.description')) = BINARY 'İlkOku''nun kişisel verileri ve kullanıcı gizliliğini ele alma yaklaşımı.'
  AND CHAR_LENGTH(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.body')), ''))) > 0;

UPDATE ContentPage
SET seoDescription = 'İlkOku Gizlilik Politikası: hesap, profil, eser ve etkileşim verilerinin işlenme amaçlarını, veri güvenliğini ve kullanıcıların başvuru yollarını öğrenin.',
    bodyJson = JSON_SET(bodyJson, '$.description', 'İlkOku Gizlilik Politikası: hesap, profil, eser ve etkileşim verilerinin işlenme amaçlarını, veri güvenliğini ve kullanıcıların başvuru yollarını öğrenin.'),
    updatedAt = CURRENT_TIMESTAMP(3)
WHERE contentKey = 'legal:gizlilik-politikasi'
  AND slug = '/yasal/gizlilik-politikasi'
  AND status = 'published'
  AND JSON_VALID(bodyJson) = 1
  AND BINARY seoDescription = BINARY 'İlkOku''nun kişisel verileri ve kullanıcı gizliliğini ele alma yaklaşımı.'
  AND BINARY JSON_UNQUOTE(JSON_EXTRACT(bodyJson, '$.description')) = BINARY 'İlkOku''nun kişisel verileri ve kullanıcı gizliliğini ele alma yaklaşımı.'
  AND CHAR_LENGTH(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(bodyJson, '$.body')), ''))) > 0;

-- telif-hakki-politikasi: snapshot the approved metadata-only revision, attributed to system deployment.
INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
SELECT UUID(), page.id,
  (SELECT COALESCE(MAX(revision.version), 0) + 1 FROM ContentRevision revision WHERE revision.pageId = page.id),
  JSON_OBJECT('kind', 'legal', 'locale', 'tr', 'title', page.title, 'description', 'İlkOku Telif Hakkı Politikası: eser sahipliği, kullanıcı sorumlulukları, telif ihlali bildirimleri ve içerik inceleme süreçleri hakkında bilgi edinin.',
    'updatedLabel', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.updatedLabel')), ''),
    'body', JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.body')), 'status', 'published'),
  NULL, CURRENT_TIMESTAMP(3)
FROM ContentPage page
WHERE page.contentKey = 'legal:telif-hakki-politikasi'
  AND page.slug = '/yasal/telif-hakki-politikasi'
  AND page.status = 'published'
  AND JSON_VALID(page.bodyJson) = 1
  AND BINARY page.seoDescription = BINARY 'İlkOku''da eser sahipliği, hak ihlali bildirimi ve içerik kaldırma süreci.'
  AND BINARY JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.description')) = BINARY 'İlkOku''da eser sahipliği, hak ihlali bildirimi ve içerik kaldırma süreci.'
  AND CHAR_LENGTH(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.body')), ''))) > 0;

UPDATE ContentPage
SET seoDescription = 'İlkOku Telif Hakkı Politikası: eser sahipliği, kullanıcı sorumlulukları, telif ihlali bildirimleri ve içerik inceleme süreçleri hakkında bilgi edinin.',
    bodyJson = JSON_SET(bodyJson, '$.description', 'İlkOku Telif Hakkı Politikası: eser sahipliği, kullanıcı sorumlulukları, telif ihlali bildirimleri ve içerik inceleme süreçleri hakkında bilgi edinin.'),
    updatedAt = CURRENT_TIMESTAMP(3)
WHERE contentKey = 'legal:telif-hakki-politikasi'
  AND slug = '/yasal/telif-hakki-politikasi'
  AND status = 'published'
  AND JSON_VALID(bodyJson) = 1
  AND BINARY seoDescription = BINARY 'İlkOku''da eser sahipliği, hak ihlali bildirimi ve içerik kaldırma süreci.'
  AND BINARY JSON_UNQUOTE(JSON_EXTRACT(bodyJson, '$.description')) = BINARY 'İlkOku''da eser sahipliği, hak ihlali bildirimi ve içerik kaldırma süreci.'
  AND CHAR_LENGTH(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(bodyJson, '$.body')), ''))) > 0;

-- kullanim-sartlari: snapshot the approved metadata-only revision, attributed to system deployment.
INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
SELECT UUID(), page.id,
  (SELECT COALESCE(MAX(revision.version), 0) + 1 FROM ContentRevision revision WHERE revision.pageId = page.id),
  JSON_OBJECT('kind', 'legal', 'locale', 'tr', 'title', page.title, 'description', 'İlkOku Kullanım Şartları: üyelik, hesap güvenliği, eser ve kullanıcı içerikleri, fikrî haklar ve platform kullanım kuralları hakkında bilgi edinin.',
    'updatedLabel', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.updatedLabel')), ''),
    'body', JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.body')), 'status', 'published'),
  NULL, CURRENT_TIMESTAMP(3)
FROM ContentPage page
WHERE page.contentKey = 'legal:kullanim-sartlari'
  AND page.slug = '/yasal/kullanim-sartlari'
  AND page.status = 'published'
  AND JSON_VALID(page.bodyJson) = 1
  AND BINARY page.seoDescription = BINARY 'İlkOku platformunun kullanımına ilişkin temel koşullar.'
  AND BINARY JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.description')) = BINARY 'İlkOku platformunun kullanımına ilişkin temel koşullar.'
  AND CHAR_LENGTH(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.body')), ''))) > 0;

UPDATE ContentPage
SET seoDescription = 'İlkOku Kullanım Şartları: üyelik, hesap güvenliği, eser ve kullanıcı içerikleri, fikrî haklar ve platform kullanım kuralları hakkında bilgi edinin.',
    bodyJson = JSON_SET(bodyJson, '$.description', 'İlkOku Kullanım Şartları: üyelik, hesap güvenliği, eser ve kullanıcı içerikleri, fikrî haklar ve platform kullanım kuralları hakkında bilgi edinin.'),
    updatedAt = CURRENT_TIMESTAMP(3)
WHERE contentKey = 'legal:kullanim-sartlari'
  AND slug = '/yasal/kullanim-sartlari'
  AND status = 'published'
  AND JSON_VALID(bodyJson) = 1
  AND BINARY seoDescription = BINARY 'İlkOku platformunun kullanımına ilişkin temel koşullar.'
  AND BINARY JSON_UNQUOTE(JSON_EXTRACT(bodyJson, '$.description')) = BINARY 'İlkOku platformunun kullanımına ilişkin temel koşullar.'
  AND CHAR_LENGTH(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(bodyJson, '$.body')), ''))) > 0;

-- cerez-politikasi: snapshot the approved metadata-only revision, attributed to system deployment.
INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
SELECT UUID(), page.id,
  (SELECT COALESCE(MAX(revision.version), 0) + 1 FROM ContentRevision revision WHERE revision.pageId = page.id),
  JSON_OBJECT('kind', 'legal', 'locale', 'tr', 'title', page.title, 'description', 'İlkOku Çerez Politikası: oturum ve hesap güvenliğinde kullanılan zorunlu çerezleri, saklama sürelerini ve tarayıcıdan yönetim seçeneklerini inceleyin.',
    'updatedLabel', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.updatedLabel')), ''),
    'body', JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.body')), 'status', 'published'),
  NULL, CURRENT_TIMESTAMP(3)
FROM ContentPage page
WHERE page.contentKey = 'legal:cerez-politikasi'
  AND page.slug = '/yasal/cerez-politikasi'
  AND page.status = 'published'
  AND JSON_VALID(page.bodyJson) = 1
  AND BINARY page.seoDescription = BINARY 'İlkOku''nun zorunlu çerez kullanımına ilişkin açıklamalar.'
  AND BINARY JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.description')) = BINARY 'İlkOku''nun zorunlu çerez kullanımına ilişkin açıklamalar.'
  AND CHAR_LENGTH(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(page.bodyJson, '$.body')), ''))) > 0;

UPDATE ContentPage
SET seoDescription = 'İlkOku Çerez Politikası: oturum ve hesap güvenliğinde kullanılan zorunlu çerezleri, saklama sürelerini ve tarayıcıdan yönetim seçeneklerini inceleyin.',
    bodyJson = JSON_SET(bodyJson, '$.description', 'İlkOku Çerez Politikası: oturum ve hesap güvenliğinde kullanılan zorunlu çerezleri, saklama sürelerini ve tarayıcıdan yönetim seçeneklerini inceleyin.'),
    updatedAt = CURRENT_TIMESTAMP(3)
WHERE contentKey = 'legal:cerez-politikasi'
  AND slug = '/yasal/cerez-politikasi'
  AND status = 'published'
  AND JSON_VALID(bodyJson) = 1
  AND BINARY seoDescription = BINARY 'İlkOku''nun zorunlu çerez kullanımına ilişkin açıklamalar.'
  AND BINARY JSON_UNQUOTE(JSON_EXTRACT(bodyJson, '$.description')) = BINARY 'İlkOku''nun zorunlu çerez kullanımına ilişkin açıklamalar.'
  AND CHAR_LENGTH(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(bodyJson, '$.body')), ''))) > 0;

COMMIT;
