CREATE TABLE `PublishingContract` (
  `id` CHAR(36) NOT NULL,
  `submissionId` CHAR(36) NOT NULL,
  `createdById` CHAR(36) NOT NULL,
  `status` ENUM('draft','sent','accepted','rejected') NOT NULL DEFAULT 'draft',
  `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,
  `royaltyPercentage` DECIMAL(5,2) NOT NULL,
  `advanceAmount` DECIMAL(12,2) NULL,
  `rightsPeriodMonths` SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  `territory` VARCHAR(180) NOT NULL DEFAULT 'Türkiye',
  `notes` TEXT NULL,
  `sentAt` DATETIME(3) NULL,
  `acceptedAt` DATETIME(3) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PublishingContract_submissionId_key`(`submissionId`),
  INDEX `PublishingContract_status_updatedAt_idx`(`status`,`updatedAt`),
  INDEX `PublishingContract_createdById_createdAt_idx`(`createdById`,`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PublicationPlan` (
  `id` CHAR(36) NOT NULL,
  `submissionId` CHAR(36) NOT NULL,
  `status` ENUM('planning','preproduction','production','distribution','published') NOT NULL DEFAULT 'planning',
  `targetPublicationDate` DATETIME(3) NULL,
  `isbn` VARCHAR(32) NULL,
  `coverStatus` ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
  `layoutStatus` ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
  `printRun` INTEGER UNSIGNED NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PublicationPlan_submissionId_key`(`submissionId`),
  INDEX `PublicationPlan_status_targetPublicationDate_idx`(`status`,`targetPublicationDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PublishingContract` ADD CONSTRAINT `PublishingContract_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `PublisherSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PublishingContract` ADD CONSTRAINT `PublishingContract_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PublicationPlan` ADD CONSTRAINT `PublicationPlan_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `PublisherSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
