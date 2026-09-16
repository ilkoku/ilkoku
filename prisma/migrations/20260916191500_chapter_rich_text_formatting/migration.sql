CREATE TABLE `ChapterFormatting` (
  `chapterId` CHAR(36) NOT NULL,
  `formatting` LONGTEXT NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`chapterId`),
  CONSTRAINT `ChapterFormatting_chapterId_fkey`
    FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
