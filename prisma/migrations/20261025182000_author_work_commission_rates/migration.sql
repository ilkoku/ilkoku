-- No retroactive changes to historic prices, existing orders or payouts.
-- Append-only exception records; no effective update/delete endpoints.
CREATE TABLE `AuthorCommissionRateEvent` (
  `id` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `workId` CHAR(36) NULL,
  `actorId` CHAR(36) NOT NULL,
  `rateBps` SMALLINT UNSIGNED NOT NULL,
  `active` BOOLEAN NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AuthorCommissionRateEvent_authorId_createdAt_idx`(`authorId`,`createdAt`),
  INDEX `AuthorCommissionRateEvent_workId_createdAt_idx`(`workId`,`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `AuthorCommissionRateEvent`
  ADD CONSTRAINT `AuthorCommissionRateEvent_authorId_fkey`
    FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `AuthorCommissionRateEvent_workId_fkey`
    FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `AuthorCommissionRateEvent_actorId_fkey`
    FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `OrderCommissionRateSnapshot` (
  `id` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NOT NULL,
  `commissionRateBps` SMALLINT UNSIGNED NOT NULL,
  `serviceFeeRateBps` SMALLINT UNSIGNED NOT NULL DEFAULT 500,
  `source` VARCHAR(16) NOT NULL,
  `sourceEventId` CHAR(36) NULL,
  `calculationVersion` VARCHAR(32) NOT NULL DEFAULT 'rate-v1',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `OrderCommissionRateSnapshot_orderId_key`(`orderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `OrderCommissionRateSnapshot`
  ADD CONSTRAINT `OrderCommissionRateSnapshot_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
