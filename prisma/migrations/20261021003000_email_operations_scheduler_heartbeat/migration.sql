-- Persistent scheduler heartbeat and a shared lease across Cloudflare and GitHub.
-- Contains aggregate execution metadata only: no credentials or recipients.
CREATE TABLE `EmailOperationsSchedulerState` (
  `id` VARCHAR(32) NOT NULL,
  `leaseToken` CHAR(36) NULL,
  `leaseUntil` DATETIME(3) NULL,
  `lastAttemptAt` DATETIME(3) NULL,
  `lastSuccessAt` DATETIME(3) NULL,
  `lastFailureAt` DATETIME(3) NULL,
  `lastAttemptSource` VARCHAR(24) NULL,
  `lastErrorCode` VARCHAR(80) NULL,
  `lastDurationMs` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `EmailOperationsSchedulerState_lastSuccessAt_idx` (`lastSuccessAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
