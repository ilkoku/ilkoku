CREATE TABLE `WriterActiveDay` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `dayKey` CHAR(10) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `WriterActiveDay_userId_dayKey_key`
    (`userId`, `dayKey`),
  INDEX `WriterActiveDay_userId_createdAt_idx`
    (`userId`, `createdAt`),
  INDEX `WriterActiveDay_dayKey_idx`
    (`dayKey`),
  PRIMARY KEY (`id`),

  CONSTRAINT `WriterActiveDay_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
