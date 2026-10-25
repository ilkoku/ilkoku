-- Author tax document review is append-only; no bank, ID or tax number
-- is collected or stored in this model.
CREATE TABLE `AuthorTaxReviewEvent` (
  `id` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `reviewerId` CHAR(36) NOT NULL,
  `documentKind` ENUM('commercial_invoice','self_employed_receipt','gvk18_expense_receipt') NOT NULL,
  `decision` ENUM('verified','needs_revision','revoked') NOT NULL,
  `evidenceReference` VARCHAR(64) NULL,
  `validUntil` DATETIME(3) NULL,
  `reviewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AuthorTaxReviewEvent_authorId_reviewedAt_idx`(`authorId`,`reviewedAt`),
  INDEX `AuthorTaxReviewEvent_reviewerId_reviewedAt_idx`(`reviewerId`,`reviewedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuthorTaxReviewEvent`
  ADD CONSTRAINT `AuthorTaxReviewEvent_authorId_fkey`
    FOREIGN KEY (`authorId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `AuthorTaxReviewEvent_reviewerId_fkey`
    FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
