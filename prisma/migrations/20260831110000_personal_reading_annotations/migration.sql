CREATE TABLE `PersonalAnnotation` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `chapterId` CHAR(36) NOT NULL,
  `type` ENUM(
    'highlight',
    'underline',
    'pin',
    'reading_position',
    'note',
    'drawing'
  ) NOT NULL,
  `paragraphIndex` INTEGER UNSIGNED NULL,
  `startOffset` INTEGER UNSIGNED NULL,
  `endOffset` INTEGER UNSIGNED NULL,
  `selectedText` TEXT NULL,
  `note` TEXT NULL,
  `pathData` LONGTEXT NULL,
  `anchorVersion` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX `PersonalAnnotation_userId_chapterId_createdAt_idx`(`userId`, `chapterId`, `createdAt`),
  INDEX `PersonalAnnotation_userId_workId_type_idx`(`userId`, `workId`, `type`),
  INDEX `PersonalAnnotation_chapterId_type_idx`(`chapterId`, `type`),
  PRIMARY KEY (`id`),

  CONSTRAINT `PersonalAnnotation_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PersonalAnnotation_workId_fkey`
    FOREIGN KEY (`workId`) REFERENCES `Work`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PersonalAnnotation_chapterId_fkey`
    FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
