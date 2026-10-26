-- Writer's self-declared invoice status, separate from verified tax reviews.
-- Does not create seller authorizations, orders, payments or ledger entries.
CREATE TABLE `AuthorBillingProfile` (
  `id` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `invoiceStatus` ENUM('invoicing','non_invoicing') NOT NULL DEFAULT 'non_invoicing',
  `billingName` VARCHAR(240) NULL,
  `taxIdentifier` VARCHAR(32) NULL,
  `taxOffice` VARCHAR(160) NULL,
  `billingAddress` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `AuthorBillingProfile_authorId_key`(`authorId`),
  INDEX `AuthorBillingProfile_invoiceStatus_idx`(`invoiceStatus`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuthorBillingProfile`
  ADD CONSTRAINT `AuthorBillingProfile_authorId_fkey`
    FOREIGN KEY (`authorId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
