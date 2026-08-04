CREATE TABLE `WeeklyDiscoverySummaryDelivery` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `weekStart` DATE NOT NULL,
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

  UNIQUE INDEX `WeeklyDiscoverySummaryDelivery_userId_weekStart_key`(`userId`, `weekStart`),
  INDEX `WeeklyDiscoverySummaryDelivery_status_weekStart_idx`(`status`, `weekStart`),
  INDEX `WeeklyDiscoverySummaryDelivery_emailDeliveryId_idx`(`emailDeliveryId`),
  INDEX `WeeklyDiscoverySummaryDelivery_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `WeeklyDiscoverySummaryDelivery_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `WeeklyDiscoverySummaryDelivery_emailDeliveryId_fkey`
    FOREIGN KEY (`emailDeliveryId`) REFERENCES `EmailDelivery`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
