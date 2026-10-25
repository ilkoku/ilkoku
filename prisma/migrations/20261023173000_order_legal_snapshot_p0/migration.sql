-- Additive P0-04 immutability: no backfill and no modification of historic orders.
-- Real transactions must snapshot a verified seller in the same DB transaction.
CREATE TABLE `OrderLegalSnapshot` (
  `id` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NOT NULL,
  `legalPartyId` CHAR(36) NOT NULL,
  `sellerAssignmentId` CHAR(36) NOT NULL,
  `authorizationId` CHAR(36) NOT NULL,
  `sellerMode` ENUM('platform_direct','third_party') NOT NULL,
  `sellerName` VARCHAR(240) NOT NULL,
  `sellerTaxIdentifier` VARCHAR(32) NOT NULL,
  `sellerAddress` TEXT NOT NULL,
  `sellerEmail` VARCHAR(320) NOT NULL,
  `sellerPhone` VARCHAR(32) NULL,
  `rightsDocumentHash` CHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `OrderLegalSnapshot_orderId_key` (`orderId`),
  INDEX `OrderLegalSnapshot_legalPartyId_createdAt_idx` (`legalPartyId`,`createdAt`),
  INDEX `OrderLegalSnapshot_sellerAssignmentId_idx` (`sellerAssignmentId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `OrderLegalSnapshot_orderId_fkey` FOREIGN KEY (`orderId`)
    REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
