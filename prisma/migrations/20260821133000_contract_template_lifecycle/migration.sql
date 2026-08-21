ALTER TABLE `ContractTemplate`
  ADD COLUMN `lifecycleStatus` VARCHAR(24) NOT NULL DEFAULT 'draft' AFTER `active`,
  ADD COLUMN `sourceTemplateId` CHAR(36) NULL AFTER `lifecycleStatus`,
  ADD COLUMN `approvedById` CHAR(36) NULL AFTER `sourceTemplateId`,
  ADD COLUMN `approvedAt` DATETIME(3) NULL AFTER `approvedById`,
  ADD COLUMN `activatedAt` DATETIME(3) NULL AFTER `approvedAt`,
  ADD UNIQUE INDEX `ContractTemplate_sourceTemplateId_key`(`sourceTemplateId`),
  ADD INDEX `ContractTemplate_lifecycle_targetRole_idx`(`lifecycleStatus`,`targetRole`),
  ADD INDEX `ContractTemplate_approvedBy_idx`(`approvedById`,`approvedAt`);

ALTER TABLE `ContractTemplate`
  ADD CONSTRAINT `ContractTemplate_sourceTemplateId_fkey`
  FOREIGN KEY (`sourceTemplateId`) REFERENCES `ContractTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ContractTemplate_approvedById_fkey`
  FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE `ContractTemplate`
SET
  `active` = false,
  `lifecycleStatus` = 'soft',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL
WHERE `code` LIKE 'SOFT\\_%';

-- Lifecycle öncesinde active=true olmak açık bir hukuki onay kanıtı değildi.
-- Bu nedenle eski operasyon şablonları güvenli biçimde yeniden incelemeye alınır.
UPDATE `ContractTemplate`
SET
  `lifecycleStatus` = CASE WHEN `active` = true THEN 'review' ELSE 'draft' END,
  `active` = false,
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL
WHERE `code` NOT LIKE 'SOFT\\_%';

-- İlk kurulumdaki örnek placeholder şablonlar ayrıca Taslak olarak sınıflanır.
-- Yalnız hiç düzenlenmemiş v1 kayıtların çalışma durumu geri çekilir.
UPDATE `ContractTemplate`
SET
  `active` = false,
  `lifecycleStatus` = 'draft',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `code` IN (
  'WRITER_PLATFORM_STANDARD',
  'EDITOR_SERVICE_STANDARD',
  'PUBLISHER_COLLABORATION_STANDARD',
  'READER_STANDARD',
  'GENERAL_USER_STANDARD'
)
  AND `version` = 1;

-- Mevcut 9 olgun soft kaynağın her biri için ayrı operasyon Taslağı oluşturulur.
-- Kaynak soft kayıt değişmez; sourceTemplateId tekil olduğu için işlem idempotenttir.
INSERT INTO `ContractTemplate` (
  `id`, `code`, `title`, `description`, `targetRole`, `body`, `version`, `active`,
  `lifecycleStatus`, `sourceTemplateId`, `approvedById`, `approvedAt`, `activatedAt`,
  `createdById`, `updatedById`, `createdAt`, `updatedAt`
)
SELECT
  CASE source.`code`
    WHEN 'SOFT_GENERAL_NDA' THEN 'c3000000-0000-4000-8000-000000000001'
    WHEN 'SOFT_WRITER_PLATFORM_LICENSE' THEN 'c3000000-0000-4000-8000-000000000002'
    WHEN 'SOFT_WRITER_EDITOR_REVIEW' THEN 'c3000000-0000-4000-8000-000000000003'
    WHEN 'SOFT_EDITOR_REVIEW_ETHICS' THEN 'c3000000-0000-4000-8000-000000000004'
    WHEN 'SOFT_EDITOR_CANDIDATE_NDA' THEN 'c3000000-0000-4000-8000-000000000005'
    WHEN 'SOFT_PUBLISHER_DISCOVERY_NDA' THEN 'c3000000-0000-4000-8000-000000000006'
    WHEN 'SOFT_PUBLISHER_TEAM_CONFIDENTIALITY' THEN 'c3000000-0000-4000-8000-000000000007'
    WHEN 'SOFT_PUBLICATION_INTENT_WRITER' THEN 'c3000000-0000-4000-8000-000000000008'
    WHEN 'SOFT_PUBLICATION_INTENT_PUBLISHER' THEN 'c3000000-0000-4000-8000-000000000009'
  END,
  CONCAT('LIB_', SUBSTRING(source.`code`, 6)),
  REPLACE(source.`title`, ' Taslağı', ''),
  CONCAT('Soft Taslaklar kaynağındaki ', source.`code`, ' üzerinden oluşturulan çalışma şablonu. Hukuki ve ticari inceleme tamamlanmadan aktif edilemez.'),
  source.`targetRole`,
  source.`body`,
  1,
  false,
  'draft',
  source.`id`,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `ContractTemplate` source
WHERE source.`code` IN (
  'SOFT_GENERAL_NDA',
  'SOFT_WRITER_PLATFORM_LICENSE',
  'SOFT_WRITER_EDITOR_REVIEW',
  'SOFT_EDITOR_REVIEW_ETHICS',
  'SOFT_EDITOR_CANDIDATE_NDA',
  'SOFT_PUBLISHER_DISCOVERY_NDA',
  'SOFT_PUBLISHER_TEAM_CONFIDENTIALITY',
  'SOFT_PUBLICATION_INTENT_WRITER',
  'SOFT_PUBLICATION_INTENT_PUBLISHER'
)
  AND source.`lifecycleStatus` = 'soft'
  AND NOT EXISTS (
    SELECT 1 FROM `ContractTemplate` existing
    WHERE existing.`sourceTemplateId` = source.`id`
  )
  AND NOT EXISTS (
    SELECT 1 FROM `ContractTemplate` existingCode
    WHERE existingCode.`code` = CONCAT('LIB_', SUBSTRING(source.`code`, 6))
  );

-- DB katmanı da fail-closed: yalnız lifecycle=active olan gerçek şablonlar
-- active=true olabilir; SOFT_ kayıtları hiçbir koşulda gönderilebilir olamaz.
ALTER TABLE `ContractTemplate`
  ADD CONSTRAINT `ContractTemplate_lifecycleStatus_chk`
  CHECK (`lifecycleStatus` IN ('soft','draft','review','approved','active')),
  ADD CONSTRAINT `ContractTemplate_active_lifecycle_chk`
  CHECK (
    `active` = false OR
    (`lifecycleStatus` = 'active' AND LEFT(`code`, 5) <> 'SOFT_')
  );
