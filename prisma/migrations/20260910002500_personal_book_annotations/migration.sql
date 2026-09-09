CREATE TABLE `PersonalBookAnnotation` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `publicationItemId` CHAR(36) NOT NULL,
  `type` ENUM(
    'highlight',
    'underline',
    'pin',
    'reading_position',
    'note'
  ) NOT NULL,
  `startOffset` INTEGER UNSIGNED NULL,
  `endOffset` INTEGER UNSIGNED NULL,
  `selectedText` TEXT NULL,
  `note` TEXT NULL,
  `pathData` LONGTEXT NULL,
  `anchorVersion` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX `PersonalBookAnnotation_userId_item_createdAt_idx`(`userId`, `publicationItemId`, `createdAt`),
  INDEX `PersonalBookAnnotation_userId_workId_type_idx`(`userId`, `workId`, `type`),
  INDEX `PersonalBookAnnotation_workId_item_idx`(`workId`, `publicationItemId`),
  PRIMARY KEY (`id`),

  CONSTRAINT `PersonalBookAnnotation_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PersonalBookAnnotation_workId_fkey`
    FOREIGN KEY (`workId`) REFERENCES `Work`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
