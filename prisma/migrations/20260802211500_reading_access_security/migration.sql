ALTER TABLE `AuditLog`
  MODIFY `action` ENUM(
    'register',
    'login',
    'logout',
    'password_changed',
    'password_reset_requested',
    'email_test_sent',
    'email_verified',
    'profile_updated',
    'role_requested',
    'role_request_reviewed',
    'work_created',
    'work_published',
    'ownership_stamp_created',
    'user_status_changed',
    'work_status_changed',
    'publisher_status_changed',
    'comment_status_changed',
    'reading_access_flagged'
  ) NOT NULL;

CREATE TABLE `ReadingAccess` (
  `id` CHAR(36) NOT NULL,
  `dedupeKey` CHAR(64) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `sessionId` CHAR(36) NULL,
  `workId` CHAR(36) NOT NULL,
  `chapterId` CHAR(36) NOT NULL,
  `ipHash` CHAR(64) NULL,
  `userAgentHash` CHAR(64) NULL,
  `deviceClass` ENUM('mobile', 'tablet', 'desktop', 'bot', 'unknown') NOT NULL DEFAULT 'unknown',
  `riskLevel` ENUM('normal', 'watch') NOT NULL DEFAULT 'normal',
  `riskScore` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `riskFlags` VARCHAR(500) NULL,
  `ruleVersion` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `viewCount` INT UNSIGNED NOT NULL DEFAULT 1,
  `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ReadingAccess_dedupeKey_key`(`dedupeKey`),
  INDEX `ReadingAccess_userId_lastSeenAt_idx`(`userId`, `lastSeenAt`),
  INDEX `ReadingAccess_workId_lastSeenAt_idx`(`workId`, `lastSeenAt`),
  INDEX `ReadingAccess_chapterId_lastSeenAt_idx`(`chapterId`, `lastSeenAt`),
  INDEX `ReadingAccess_sessionId_lastSeenAt_idx`(`sessionId`, `lastSeenAt`),
  INDEX `ReadingAccess_riskLevel_lastSeenAt_idx`(`riskLevel`, `lastSeenAt`),
  INDEX `ReadingAccess_ipHash_lastSeenAt_idx`(`ipHash`, `lastSeenAt`),
  INDEX `ReadingAccess_userAgentHash_lastSeenAt_idx`(`userAgentHash`, `lastSeenAt`),
  INDEX `ReadingAccess_lastSeenAt_idx`(`lastSeenAt`),
  PRIMARY KEY (`id`),

  CONSTRAINT `ReadingAccess_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ReadingAccess_sessionId_fkey`
    FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ReadingAccess_workId_fkey`
    FOREIGN KEY (`workId`) REFERENCES `Work`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ReadingAccess_chapterId_fkey`
    FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
