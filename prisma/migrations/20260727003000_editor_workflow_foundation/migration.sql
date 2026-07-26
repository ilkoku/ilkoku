-- İlkOku v1.0 locked two-editor workflow foundation
-- Writer only publishes. Editor assignment starts from the general pool.

CREATE TABLE `EditorialReviewCase` (
  `id` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `status` ENUM('pool','first_editor_in_progress','waiting_second_editor','second_editor_in_progress','result_pending','completed','cancelled') NOT NULL DEFAULT 'pool',
  `poolOpenedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `firstEditorCompletedAt` DATETIME(3) NULL,
  `secondEditorCompletedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `EditorialReviewCase_workId_key`(`workId`),
  INDEX `EditorialReviewCase_status_poolOpenedAt_idx`(`status`, `poolOpenedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EditorialAssignment` (
  `id` CHAR(36) NOT NULL,
  `reviewCaseId` CHAR(36) NOT NULL,
  `editorId` CHAR(36) NULL,
  `stage` ENUM('first','second') NOT NULL,
  `source` ENUM('general_pool','platform_selected','external_invite') NOT NULL,
  `status` ENUM('pending','accepted','in_progress','completed','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `claimedAt` DATETIME(3) NULL,
  `acceptedAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `EditorialAssignment_reviewCaseId_stage_key`(`reviewCaseId`, `stage`),
  INDEX `EditorialAssignment_editorId_stage_status_idx`(`editorId`, `stage`, `status`),
  INDEX `EditorialAssignment_reviewCaseId_status_idx`(`reviewCaseId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EditorialReport` (
  `id` CHAR(36) NOT NULL,
  `assignmentId` CHAR(36) NOT NULL,
  `editorId` CHAR(36) NOT NULL,
  `stage` ENUM('first','second') NOT NULL,
  `status` ENUM('draft','completed','locked') NOT NULL DEFAULT 'draft',
  `summary` TEXT NULL,
  `strengths` LONGTEXT NULL,
  `improvements` LONGTEXT NULL,
  `notes` LONGTEXT NULL,
  `score` TINYINT UNSIGNED NULL,
  `completedAt` DATETIME(3) NULL,
  `lockedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `EditorialReport_assignmentId_key`(`assignmentId`),
  INDEX `EditorialReport_editorId_stage_status_idx`(`editorId`, `stage`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EditorialInvite` (
  `id` CHAR(36) NOT NULL,
  `reviewCaseId` CHAR(36) NOT NULL,
  `assignmentId` CHAR(36) NOT NULL,
  `invitedByEditorId` CHAR(36) NOT NULL,
  `invitedEmail` VARCHAR(320) NOT NULL,
  `invitedUserId` CHAR(36) NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `status` ENUM('sent','opened','account_created','accepted','in_progress','completed','rejected','cancelled','expired') NOT NULL DEFAULT 'sent',
  `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `openedAt` DATETIME(3) NULL,
  `accountCreatedAt` DATETIME(3) NULL,
  `acceptedAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `EditorialInvite_tokenHash_key`(`tokenHash`),
  UNIQUE INDEX `EditorialInvite_assignmentId_key`(`assignmentId`),
  INDEX `EditorialInvite_invitedEmail_status_idx`(`invitedEmail`, `status`),
  INDEX `EditorialInvite_invitedUserId_status_idx`(`invitedUserId`, `status`),
  INDEX `EditorialInvite_expiresAt_status_idx`(`expiresAt`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EditorialInviteEvent` (
  `id` CHAR(36) NOT NULL,
  `inviteId` CHAR(36) NOT NULL,
  `type` ENUM('sent','opened','account_created','accepted','started','progressed','completed','rejected','cancelled','expired','resent') NOT NULL,
  `metadata` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `EditorialInviteEvent_inviteId_createdAt_idx`(`inviteId`, `createdAt`),
  INDEX `EditorialInviteEvent_type_createdAt_idx`(`type`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EditorialResult` (
  `id` CHAR(36) NOT NULL,
  `reviewCaseId` CHAR(36) NOT NULL,
  `status` ENUM('pending','generated','delivered') NOT NULL DEFAULT 'pending',
  `summary` LONGTEXT NULL,
  `generatedAt` DATETIME(3) NULL,
  `deliveredAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `EditorialResult_reviewCaseId_key`(`reviewCaseId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EditorialReviewCase`
  ADD CONSTRAINT `EditorialReviewCase_workId_fkey`
  FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EditorialAssignment`
  ADD CONSTRAINT `EditorialAssignment_reviewCaseId_fkey`
  FOREIGN KEY (`reviewCaseId`) REFERENCES `EditorialReviewCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EditorialAssignment_editorId_fkey`
  FOREIGN KEY (`editorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EditorialReport`
  ADD CONSTRAINT `EditorialReport_assignmentId_fkey`
  FOREIGN KEY (`assignmentId`) REFERENCES `EditorialAssignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EditorialReport_editorId_fkey`
  FOREIGN KEY (`editorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `EditorialInvite`
  ADD CONSTRAINT `EditorialInvite_reviewCaseId_fkey`
  FOREIGN KEY (`reviewCaseId`) REFERENCES `EditorialReviewCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EditorialInvite_assignmentId_fkey`
  FOREIGN KEY (`assignmentId`) REFERENCES `EditorialAssignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EditorialInvite_invitedByEditorId_fkey`
  FOREIGN KEY (`invitedByEditorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `EditorialInvite_invitedUserId_fkey`
  FOREIGN KEY (`invitedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EditorialInviteEvent`
  ADD CONSTRAINT `EditorialInviteEvent_inviteId_fkey`
  FOREIGN KEY (`inviteId`) REFERENCES `EditorialInvite`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EditorialResult`
  ADD CONSTRAINT `EditorialResult_reviewCaseId_fkey`
  FOREIGN KEY (`reviewCaseId`) REFERENCES `EditorialReviewCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
