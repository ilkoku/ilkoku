CREATE TABLE `ContentManagerAccess` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `canPublish` BOOLEAN NOT NULL DEFAULT false,
  `grantedById` CHAR(36) NULL,
  `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ContentManagerAccess_userId_key`(`userId`),
  INDEX `ContentManagerAccess_active_idx`(`active`),
  INDEX `ContentManagerAccess_grantedById_idx`(`grantedById`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ContentManagerAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ContentManagerAccess_grantedById_fkey` FOREIGN KEY (`grantedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContentPage` (
  `id` CHAR(36) NOT NULL,
  `contentKey` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(260) NOT NULL,
  `title` VARCHAR(220) NOT NULL,
  `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  `bodyJson` LONGTEXT NOT NULL,
  `seoTitle` VARCHAR(220) NULL,
  `seoDescription` VARCHAR(500) NULL,
  `canonicalUrl` VARCHAR(500) NULL,
  `noIndex` BOOLEAN NOT NULL DEFAULT false,
  `publishedAt` DATETIME(3) NULL,
  `createdById` CHAR(36) NULL,
  `updatedById` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ContentPage_contentKey_key`(`contentKey`),
  UNIQUE INDEX `ContentPage_slug_key`(`slug`),
  INDEX `ContentPage_status_updatedAt_idx`(`status`, `updatedAt`),
  INDEX `ContentPage_updatedById_idx`(`updatedById`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ContentPage_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ContentPage_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContentRevision` (
  `id` CHAR(36) NOT NULL,
  `pageId` CHAR(36) NOT NULL,
  `version` INTEGER UNSIGNED NOT NULL,
  `snapshotJson` LONGTEXT NOT NULL,
  `createdById` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ContentRevision_pageId_version_key`(`pageId`, `version`),
  INDEX `ContentRevision_pageId_createdAt_idx`(`pageId`, `createdAt`),
  INDEX `ContentRevision_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ContentRevision_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `ContentPage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ContentRevision_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SiteContent` (
  `id` CHAR(36) NOT NULL,
  `namespace` VARCHAR(80) NOT NULL,
  `contentKey` VARCHAR(160) NOT NULL,
  `valueJson` LONGTEXT NOT NULL,
  `valueType` VARCHAR(40) NOT NULL DEFAULT 'json',
  `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  `publishedAt` DATETIME(3) NULL,
  `updatedById` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `SiteContent_namespace_contentKey_key`(`namespace`, `contentKey`),
  INDEX `SiteContent_namespace_status_idx`(`namespace`, `status`),
  INDEX `SiteContent_updatedById_idx`(`updatedById`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SiteContent_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
