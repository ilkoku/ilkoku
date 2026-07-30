CREATE TABLE `PublisherMembership` (
  `id` CHAR(36) NOT NULL,
  `publisherId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `role` ENUM('owner', 'manager', 'reviewer') NOT NULL DEFAULT 'reviewer',
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PublisherMembership_publisherId_userId_key`(`publisherId`, `userId`),
  INDEX `PublisherMembership_userId_active_idx`(`userId`, `active`),
  INDEX `PublisherMembership_publisherId_active_idx`(`publisherId`, `active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PublisherMembership`
  ADD CONSTRAINT `PublisherMembership_publisherId_fkey`
  FOREIGN KEY (`publisherId`) REFERENCES `Publisher`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PublisherMembership`
  ADD CONSTRAINT `PublisherMembership_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
