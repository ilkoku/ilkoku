-- Cross-trigger lease for Book Index scheduler delivery recovery.
CREATE TABLE `BookIndexSchedulerLease` (
    `leaseKey` VARCHAR(80) NOT NULL,
    `token` CHAR(36) NOT NULL,
    `lockedUntil` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `BookIndexSchedulerLease_lockedUntil_idx`(`lockedUntil`),
    PRIMARY KEY (`leaseKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
