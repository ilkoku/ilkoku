-- One-time publication of the four EXISTING, user-approved Turkish starter FAQs.
-- This deliberately does not insert records or alter their question/answer JSON.
-- Only untouched draft rows with the approved question titles and nonempty answers qualify.
-- This migration is executed by the existing Hostinger prisma migrate deploy step.
UPDATE `SiteContent`
SET
  `status` = 'published',
  `publishedAt` = CURRENT_TIMESTAMP(3),
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `namespace` = 'faq'
  AND `status` = 'draft'
  AND `publishedAt` IS NULL
  AND JSON_VALID(`valueJson`) = 1
  AND CHAR_LENGTH(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`valueJson`, '$.answer')), ''))) > 0
  AND (
    (`contentKey` = 'item_starter_ilkoku_nedir'
      AND JSON_UNQUOTE(JSON_EXTRACT(`valueJson`, '$.question')) = 'İlkOku nedir?')
    OR (`contentKey` = 'item_starter_yazar_yayin'
      AND JSON_UNQUOTE(JSON_EXTRACT(`valueJson`, '$.question')) = 'Yazar eserini nasıl yayımlar?')
    OR (`contentKey` = 'item_starter_editor_inceleme'
      AND JSON_UNQUOTE(JSON_EXTRACT(`valueJson`, '$.question')) = 'Editör incelemesi nasıl çalışır?')
    OR (`contentKey` = 'item_starter_yayinevi_kesif'
      AND JSON_UNQUOTE(JSON_EXTRACT(`valueJson`, '$.question')) = 'Yayınevleri İlkOku\'da ne yapabilir?')
  );
