CREATE TABLE `ContractTemplateReviewEvidence` (
  `id` CHAR(36) NOT NULL,
  `templateId` CHAR(36) NOT NULL,
  `templateVersion` INTEGER UNSIGNED NOT NULL,
  `evidenceType` ENUM('legal_review','product_owner_decision') NOT NULL,
  `reviewerLabel` VARCHAR(220) NOT NULL,
  `note` TEXT NOT NULL,
  `recordedById` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ContractTemplateReviewEvidence_version_type_key`(`templateId`,`templateVersion`,`evidenceType`),
  INDEX `ContractTemplateReviewEvidence_template_created_idx`(`templateId`,`createdAt`),
  INDEX `ContractTemplateReviewEvidence_recordedBy_created_idx`(`recordedById`,`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ContractTemplateReviewEvidence`
  ADD CONSTRAINT `ContractTemplateReviewEvidence_templateId_fkey`
  FOREIGN KEY (`templateId`) REFERENCES `ContractTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ContractTemplateReviewEvidence_recordedById_fkey`
  FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
