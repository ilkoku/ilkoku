CREATE TABLE `PublisherSubmissionEvent` (
  `id` CHAR(36) NOT NULL,
  `submissionId` CHAR(36) NOT NULL,
  `actorId` CHAR(36) NULL,
  `type` ENUM('submitted', 'review_started', 'decision_changed', 'internal_note', 'contract_requested') NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `detail` TEXT NULL,
  `metadata` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `PublisherSubmissionEvent_submissionId_createdAt_idx`(`submissionId`, `createdAt`),
  INDEX `PublisherSubmissionEvent_actorId_createdAt_idx`(`actorId`, `createdAt`),
  INDEX `PublisherSubmissionEvent_type_createdAt_idx`(`type`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PublisherSubmissionEvent`
  ADD CONSTRAINT `PublisherSubmissionEvent_submissionId_fkey`
  FOREIGN KEY (`submissionId`) REFERENCES `PublisherSubmission`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PublisherSubmissionEvent`
  ADD CONSTRAINT `PublisherSubmissionEvent_actorId_fkey`
  FOREIGN KEY (`actorId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
