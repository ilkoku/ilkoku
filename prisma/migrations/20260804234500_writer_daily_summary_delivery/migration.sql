CREATE TABLE `WriterDailySummaryDelivery` (
  `id` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `summaryDate` DATE NOT NULL,
  `periodStart` DATETIME(3) NOT NULL,
  `periodEnd` DATETIME(3) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'pending',
  `attemptCount` INTEGER NOT NULL DEFAULT 1,
  `emailDeliveryId` CHAR(36) NULL,
  `metrics` LONGTEXT NULL,
  `failureMessage` VARCHAR(1000) NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `WriterDailySummaryDelivery_authorId_summaryDate_key`(`authorId`, `summaryDate`),
  INDEX `WriterDailySummaryDelivery_status_summaryDate_idx`(`status`, `summaryDate`),
  INDEX `WriterDailySummaryDelivery_emailDeliveryId_idx`(`emailDeliveryId`),
  INDEX `WriterDailySummaryDelivery_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `WriterDailySummaryDelivery_authorId_fkey`
    FOREIGN KEY (`authorId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `WriterDailySummaryDelivery_emailDeliveryId_fkey`
    FOREIGN KEY (`emailDeliveryId`) REFERENCES `EmailDelivery`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
