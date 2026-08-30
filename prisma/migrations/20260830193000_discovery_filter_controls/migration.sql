-- Filtreleme Merkezi: yüzey bazlı filtre görünürlüğü yönetimi
CREATE TABLE `DiscoveryFilterOverride` (
  `id` CHAR(36) NOT NULL,
  `surfaceId` VARCHAR(96) NOT NULL,
  `filterId` VARCHAR(64) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `updatedById` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `DiscoveryFilterOverride_surfaceId_filterId_key` (`surfaceId`, `filterId`),
  INDEX `DiscoveryFilterOverride_surfaceId_idx` (`surfaceId`),
  INDEX `DiscoveryFilterOverride_updatedById_idx` (`updatedById`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
