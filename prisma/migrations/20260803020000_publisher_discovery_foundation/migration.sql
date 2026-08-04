ALTER TABLE `Notification`
  MODIFY `type` ENUM(
    'system',
    'editor_review',
    'editor_recommendation',
    'reader_comment_reply',
    'reader_work_editor_review_started',
    'reader_work_editor_review_completed',
    'reader_favorite_work_completed',
    'publisher_followed_author_published',
    'publisher_discovery_shared'
  ) NOT NULL;

ALTER TABLE `AuditLog`
  MODIFY `action` ENUM(
    'register',
    'login',
    'logout',
    'password_changed',
    'password_reset_requested',
    'email_test_sent',
    'email_verified',
    'profile_updated',
    'role_requested',
    'role_request_reviewed',
    'work_created',
    'work_published',
    'ownership_stamp_created',
    'user_status_changed',
    'work_status_changed',
    'publisher_status_changed',
    'comment_status_changed',
    'reading_access_flagged',
    'admin_role_view_changed',
    'publisher_permission_requested',
    'publisher_permission_reviewed',
    'publisher_work_liked',
    'publisher_work_favorited',
    'publisher_author_favorited',
    'publisher_author_followed',
    'publisher_discovery_shared'
  ) NOT NULL;

CREATE TABLE `PublisherWorkLike` (
  `id` CHAR(36) NOT NULL,
  `publisherId` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `createdById` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PublisherWorkLike_publisherId_workId_key`
    (`publisherId`, `workId`),
  INDEX `PublisherWorkLike_publisherId_createdAt_idx`
    (`publisherId`, `createdAt`),
  INDEX `PublisherWorkLike_workId_createdAt_idx`
    (`workId`, `createdAt`),
  INDEX `PublisherWorkLike_createdById_createdAt_idx`
    (`createdById`, `createdAt`),
  PRIMARY KEY (`id`),

  CONSTRAINT `PublisherWorkLike_publisherId_fkey`
    FOREIGN KEY (`publisherId`) REFERENCES `Publisher` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherWorkLike_workId_fkey`
    FOREIGN KEY (`workId`) REFERENCES `Work` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherWorkLike_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PublisherWorkFavorite` (
  `id` CHAR(36) NOT NULL,
  `publisherId` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `createdById` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PublisherWorkFavorite_publisherId_workId_key`
    (`publisherId`, `workId`),
  INDEX `PublisherWorkFavorite_publisherId_createdAt_idx`
    (`publisherId`, `createdAt`),
  INDEX `PublisherWorkFavorite_workId_createdAt_idx`
    (`workId`, `createdAt`),
  INDEX `PublisherWorkFavorite_createdById_createdAt_idx`
    (`createdById`, `createdAt`),
  PRIMARY KEY (`id`),

  CONSTRAINT `PublisherWorkFavorite_publisherId_fkey`
    FOREIGN KEY (`publisherId`) REFERENCES `Publisher` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherWorkFavorite_workId_fkey`
    FOREIGN KEY (`workId`) REFERENCES `Work` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherWorkFavorite_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PublisherAuthorFavorite` (
  `id` CHAR(36) NOT NULL,
  `publisherId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `createdById` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PublisherAuthorFavorite_publisherId_authorId_key`
    (`publisherId`, `authorId`),
  INDEX `PublisherAuthorFavorite_publisherId_createdAt_idx`
    (`publisherId`, `createdAt`),
  INDEX `PublisherAuthorFavorite_authorId_createdAt_idx`
    (`authorId`, `createdAt`),
  INDEX `PublisherAuthorFavorite_createdById_createdAt_idx`
    (`createdById`, `createdAt`),
  PRIMARY KEY (`id`),

  CONSTRAINT `PublisherAuthorFavorite_publisherId_fkey`
    FOREIGN KEY (`publisherId`) REFERENCES `Publisher` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherAuthorFavorite_authorId_fkey`
    FOREIGN KEY (`authorId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherAuthorFavorite_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PublisherAuthorFollow` (
  `id` CHAR(36) NOT NULL,
  `publisherId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `createdById` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PublisherAuthorFollow_publisherId_authorId_key`
    (`publisherId`, `authorId`),
  INDEX `PublisherAuthorFollow_publisherId_createdAt_idx`
    (`publisherId`, `createdAt`),
  INDEX `PublisherAuthorFollow_authorId_createdAt_idx`
    (`authorId`, `createdAt`),
  INDEX `PublisherAuthorFollow_createdById_createdAt_idx`
    (`createdById`, `createdAt`),
  PRIMARY KEY (`id`),

  CONSTRAINT `PublisherAuthorFollow_publisherId_fkey`
    FOREIGN KEY (`publisherId`) REFERENCES `Publisher` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherAuthorFollow_authorId_fkey`
    FOREIGN KEY (`authorId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherAuthorFollow_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PublisherDiscoveryShare` (
  `id` CHAR(36) NOT NULL,
  `publisherId` CHAR(36) NOT NULL,
  `workId` CHAR(36) NULL,
  `authorId` CHAR(36) NULL,
  `createdById` CHAR(36) NULL,
  `channel` ENUM('team', 'email') NOT NULL,
  `recipientEmail` VARCHAR(320) NULL,
  `note` VARCHAR(1000) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `PublisherDiscoveryShare_publisherId_createdAt_idx`
    (`publisherId`, `createdAt`),
  INDEX `PublisherDiscoveryShare_workId_createdAt_idx`
    (`workId`, `createdAt`),
  INDEX `PublisherDiscoveryShare_authorId_createdAt_idx`
    (`authorId`, `createdAt`),
  INDEX `PublisherDiscoveryShare_createdById_createdAt_idx`
    (`createdById`, `createdAt`),
  INDEX `PublisherDiscoveryShare_channel_createdAt_idx`
    (`channel`, `createdAt`),
  PRIMARY KEY (`id`),


  CONSTRAINT `PublisherDiscoveryShare_publisherId_fkey`
    FOREIGN KEY (`publisherId`) REFERENCES `Publisher` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherDiscoveryShare_workId_fkey`
    FOREIGN KEY (`workId`) REFERENCES `Work` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherDiscoveryShare_authorId_fkey`
    FOREIGN KEY (`authorId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherDiscoveryShare_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PublisherDiscoveryShareRecipient` (
  `id` CHAR(36) NOT NULL,
  `shareId` CHAR(36) NOT NULL,
  `membershipId` CHAR(36) NOT NULL,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PublisherDiscoveryShareRecipient_shareId_membershipId_key`
    (`shareId`, `membershipId`),
  INDEX `PDSRecipient_membership_read_created_idx`
    (`membershipId`, `readAt`, `createdAt`),
  PRIMARY KEY (`id`),

  CONSTRAINT `PublisherDiscoveryShareRecipient_shareId_fkey`
    FOREIGN KEY (`shareId`) REFERENCES `PublisherDiscoveryShare` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherDiscoveryShareRecipient_membershipId_fkey`
    FOREIGN KEY (`membershipId`) REFERENCES `PublisherMembership` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
