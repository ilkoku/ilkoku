CREATE TABLE `EmailDeliveryDedupe` (
  `id` CHAR(36) NOT NULL,
  `dedupeKey` CHAR(64) NOT NULL,
  `deliveryId` CHAR(36) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `EmailDeliveryDedupe_dedupeKey_key`(`dedupeKey`),
  INDEX `EmailDeliveryDedupe_deliveryId_idx`(`deliveryId`),
  INDEX `EmailDeliveryDedupe_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `EmailDeliveryDedupe_deliveryId_fkey`
    FOREIGN KEY (`deliveryId`) REFERENCES `EmailDelivery`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EmailDeliveryRetry` (
  `id` CHAR(36) NOT NULL,
  `sourceDeliveryId` CHAR(36) NOT NULL,
  `retryDeliveryId` CHAR(36) NULL,
  `actorId` CHAR(36) NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'pending',
  `failureMessage` VARCHAR(1000) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `EmailDeliveryRetry_retryDeliveryId_key`(`retryDeliveryId`),
  INDEX `EmailDeliveryRetry_sourceDeliveryId_createdAt_idx`(`sourceDeliveryId`, `createdAt`),
  INDEX `EmailDeliveryRetry_actorId_createdAt_idx`(`actorId`, `createdAt`),
  INDEX `EmailDeliveryRetry_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `EmailDeliveryRetry_sourceDeliveryId_fkey`
    FOREIGN KEY (`sourceDeliveryId`) REFERENCES `EmailDelivery`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `EmailDeliveryRetry_retryDeliveryId_fkey`
    FOREIGN KEY (`retryDeliveryId`) REFERENCES `EmailDelivery`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `EmailDeliveryRetry_actorId_fkey`
    FOREIGN KEY (`actorId`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
