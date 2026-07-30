ALTER TABLE `Work`
  ADD COLUMN `editorReviewStatus` ENUM('not_requested', 'requested', 'completed') NOT NULL DEFAULT 'not_requested',
  ADD COLUMN `editorReviewRequestedAt` DATETIME(3) NULL,
  ADD COLUMN `editorReviewCompletedAt` DATETIME(3) NULL;

UPDATE `Work`
SET
  `editorReviewStatus` = 'requested',
  `editorReviewRequestedAt` = COALESCE(`updatedAt`, CURRENT_TIMESTAMP(3)),
  `status` = 'published',
  `visibility` = 'public',
  `publishedAt` = COALESCE(`publishedAt`, `updatedAt`, CURRENT_TIMESTAMP(3))
WHERE `status` = 'in_review';

CREATE INDEX `Work_editorReviewStatus_idx` ON `Work`(`editorReviewStatus`);
