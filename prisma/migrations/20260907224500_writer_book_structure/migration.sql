CREATE TABLE `BookStructureItem` (
  `id` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `chapterId` CHAR(36) NULL,
  `kind` VARCHAR(32) NOT NULL,
  `title` VARCHAR(220) NULL,
  `content` LONGTEXT NULL,
  `position` INTEGER NOT NULL,
  `isAutomatic` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `BookStructureItem_workId_position_key`(`workId`, `position`),
  UNIQUE INDEX `BookStructureItem_chapterId_key`(`chapterId`),
  INDEX `BookStructureItem_workId_idx`(`workId`),
  INDEX `BookStructureItem_authorId_idx`(`authorId`),
  INDEX `BookStructureItem_kind_idx`(`kind`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BookStructureItem`
  ADD CONSTRAINT `BookStructureItem_workId_fkey`
  FOREIGN KEY (`workId`) REFERENCES `Work`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BookStructureItem`
  ADD CONSTRAINT `BookStructureItem_authorId_fkey`
  FOREIGN KEY (`authorId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BookStructureItem`
  ADD CONSTRAINT `BookStructureItem_chapterId_fkey`
  FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `BookStructureItem` (
  `id`,
  `workId`,
  `authorId`,
  `chapterId`,
  `kind`,
  `title`,
  `content`,
  `position`,
  `isAutomatic`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  chapter.`workId`,
  chapter.`authorId`,
  chapter.`id`,
  'chapter',
  NULL,
  NULL,
  chapter.`position`,
  false,
  chapter.`createdAt`,
  chapter.`updatedAt`
FROM `Chapter` AS chapter
WHERE chapter.`archivedAt` IS NULL;
