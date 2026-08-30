CREATE TABLE `ReaderAuthorFavorite` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ReaderAuthorFavorite_userId_authorId_key`
    (`userId`, `authorId`),
  INDEX `ReaderAuthorFavorite_userId_createdAt_idx`
    (`userId`, `createdAt`),
  INDEX `ReaderAuthorFavorite_authorId_createdAt_idx`
    (`authorId`, `createdAt`),
  PRIMARY KEY (`id`),

  CONSTRAINT `ReaderAuthorFavorite_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ReaderAuthorFavorite_authorId_fkey`
    FOREIGN KEY (`authorId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
