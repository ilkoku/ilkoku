ALTER TABLE `PublisherMembership`
  MODIFY `role` ENUM(
    'owner',
    'manager',
    'submissions_manager',
    'editorial',
    'contract_manager',
    'reviewer',
    'viewer'
  ) NOT NULL DEFAULT 'reviewer';

CREATE TABLE `PublisherFile` (
  `id` CHAR(36) NOT NULL,
  `submissionId` CHAR(36) NOT NULL,
  `uploadedById` CHAR(36) NULL,
  `category` ENUM('work_file','editor_report','author_attachment','contract','publication_plan') NOT NULL,
  `fileName` VARCHAR(255) NOT NULL,
  `mimeType` VARCHAR(160) NOT NULL,
  `sizeBytes` BIGINT UNSIGNED NOT NULL,
  `storageUrl` VARCHAR(1000) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `archivedAt` DATETIME(3) NULL,
  INDEX `PublisherFile_submissionId_category_createdAt_idx`(`submissionId`,`category`,`createdAt`),
  INDEX `PublisherFile_uploadedById_createdAt_idx`(`uploadedById`,`createdAt`),
  INDEX `PublisherFile_archivedAt_idx`(`archivedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PublisherFile`
  ADD CONSTRAINT `PublisherFile_submissionId_fkey`
  FOREIGN KEY (`submissionId`) REFERENCES `PublisherSubmission`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PublisherFile`
  ADD CONSTRAINT `PublisherFile_uploadedById_fkey`
  FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
