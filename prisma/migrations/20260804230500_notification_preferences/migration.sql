CREATE TABLE `NotificationPreference` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `socialEmail` BOOLEAN NOT NULL DEFAULT true,
  `followedContentEmail` BOOLEAN NOT NULL DEFAULT true,
  `editorWorkflowEmail` BOOLEAN NOT NULL DEFAULT true,
  `publisherWorkflowEmail` BOOLEAN NOT NULL DEFAULT true,
  `dailySummaryEmail` BOOLEAN NOT NULL DEFAULT false,
  `weeklySummaryEmail` BOOLEAN NOT NULL DEFAULT false,
  `productUpdatesEmail` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `NotificationPreference_userId_key`(`userId`),
  INDEX `NotificationPreference_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `NotificationPreference`
  ADD CONSTRAINT `NotificationPreference_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
