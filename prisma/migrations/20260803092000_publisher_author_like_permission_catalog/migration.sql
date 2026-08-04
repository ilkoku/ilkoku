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
  'publisher_author_liked',
  'publisher_work_favorited',
  'publisher_author_favorited',
  'publisher_author_followed',
  'publisher_discovery_shared'
) NOT NULL;

CREATE TABLE `PublisherAuthorLike` (
  `id` CHAR(36) NOT NULL,
  `publisherId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `createdById` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),

  UNIQUE INDEX `PublisherAuthorLike_publisherId_authorId_key`
    (`publisherId`, `authorId`),

  INDEX `PublisherAuthorLike_publisherId_createdAt_idx`
    (`publisherId`, `createdAt`),

  INDEX `PublisherAuthorLike_authorId_createdAt_idx`
    (`authorId`, `createdAt`),

  INDEX `PublisherAuthorLike_createdById_createdAt_idx`
    (`createdById`, `createdAt`),

  CONSTRAINT `PublisherAuthorLike_publisherId_fkey`
    FOREIGN KEY (`publisherId`)
    REFERENCES `Publisher` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `PublisherAuthorLike_authorId_fkey`
    FOREIGN KEY (`authorId`)
    REFERENCES `User` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `PublisherAuthorLike_createdById_fkey`
    FOREIGN KEY (`createdById`)
    REFERENCES `User` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
