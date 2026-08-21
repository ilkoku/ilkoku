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
