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

UPDATE `ContractTemplate`
SET
  `lifecycleStatus` = CASE WHEN `active` = true THEN 'active' ELSE 'draft' END,
  `activatedAt` = CASE WHEN `active` = true THEN `updatedAt` ELSE NULL END
WHERE `code` NOT LIKE 'SOFT\\_%';

-- İlk kurulumdaki örnek placeholder şablonlar hukuki/iş modeli incelemesi olmadan
-- gönderilebilir kalmamalı. Yalnız hiç düzenlenmemiş v1 kayıtlar pasife alınır.
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
  AND `version` = 1
  AND `active` = true;
