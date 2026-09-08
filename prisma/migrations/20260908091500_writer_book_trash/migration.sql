CREATE TABLE `BookTrashItem` (
  `id` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `structureItemId` CHAR(36) NOT NULL,
  `chapterId` CHAR(36) NULL,
  `kind` VARCHAR(32) NOT NULL,
  `title` VARCHAR(220) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `originalPosition` INTEGER NOT NULL,
  `isAutomatic` BOOLEAN NOT NULL DEFAULT false,
  `trashedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `BookTrashItem_structureItemId_key`(`structureItemId`),
  UNIQUE INDEX `BookTrashItem_chapterId_key`(`chapterId`),
  INDEX `BookTrashItem_workId_trashedAt_idx`(`workId`, `trashedAt`),
  INDEX `BookTrashItem_authorId_idx`(`authorId`),
  INDEX `BookTrashItem_kind_idx`(`kind`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BookTrashItem`
  ADD CONSTRAINT `BookTrashItem_workId_fkey`
  FOREIGN KEY (`workId`) REFERENCES `Work`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BookTrashItem`
  ADD CONSTRAINT `BookTrashItem_authorId_fkey`
  FOREIGN KEY (`authorId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BookTrashItem`
  ADD CONSTRAINT `BookTrashItem_chapterId_fkey`
  FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
