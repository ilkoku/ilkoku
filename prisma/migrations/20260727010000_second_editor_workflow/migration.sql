-- İlkOku: iki aşamalı editör inceleme altyapısı
ALTER TABLE `Work`
  MODIFY `editorReviewStatus` ENUM(
    'not_requested',
    'requested',
    'in_progress',
    'awaiting_second_editor',
    'second_in_progress',
    'completed'
  ) NOT NULL DEFAULT 'not_requested';

CREATE TABLE `EditorReviewAssignment` (
  `id` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `editorId` CHAR(36) NULL,
  `stage` ENUM('first', 'second') NOT NULL,
  `source` ENUM('pool', 'specific_editor', 'external_invite') NOT NULL,
  `status` ENUM('waiting', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired') NOT NULL DEFAULT 'waiting',
  `invitedEmail` VARCHAR(320) NULL,
  `assignedAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `EditorReviewAssignment_workId_stage_key`(`workId`, `stage`),
  INDEX `EditorReviewAssignment_editorId_status_idx`(`editorId`, `status`),
  INDEX `EditorReviewAssignment_stage_status_createdAt_idx`(`stage`, `status`, `createdAt`),
  INDEX `EditorReviewAssignment_invitedEmail_status_idx`(`invitedEmail`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `EditorReviewAssignment_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `EditorReviewAssignment_editorId_fkey` FOREIGN KEY (`editorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EditorFeedback`
  ADD COLUMN `assignmentId` CHAR(36) NULL,
  ADD INDEX `EditorFeedback_assignmentId_idx`(`assignmentId`),
  ADD CONSTRAINT `EditorFeedback_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `EditorReviewAssignment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
