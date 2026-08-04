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
    'publisher_permission_reviewed'
  ) NOT NULL;

CREATE TABLE `PublisherPermissionRequest` (
  `id` CHAR(36) NOT NULL,
  `publisherId` CHAR(36) NOT NULL,
  `membershipId` CHAR(36) NOT NULL,
  `requestedById` CHAR(36) NOT NULL,
  `permission` VARCHAR(64) NOT NULL,
  `status` ENUM(
    'pending',
    'approved',
    'rejected',
    'cancelled'
  ) NOT NULL DEFAULT 'pending',
  `pendingKey` VARCHAR(140) NULL,
  `requestNote` VARCHAR(500) NULL,
  `reviewNote` VARCHAR(500) NULL,
  `reviewedById` CHAR(36) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PublisherPermissionRequest_pendingKey_key`
    (`pendingKey`),

  INDEX `PublisherPermissionRequest_publisherId_status_createdAt_idx`
    (`publisherId`, `status`, `createdAt`),

  INDEX `PublisherPermissionRequest_membershipId_status_createdAt_idx`
    (`membershipId`, `status`, `createdAt`),

  INDEX `PublisherPermissionRequest_requestedById_createdAt_idx`
    (`requestedById`, `createdAt`),

  INDEX `PublisherPermissionRequest_reviewedById_reviewedAt_idx`
    (`reviewedById`, `reviewedAt`),

  INDEX `PublisherPermissionRequest_permission_status_idx`
    (`permission`, `status`),

  PRIMARY KEY (`id`),

  CONSTRAINT `PublisherPermissionRequest_publisherId_fkey`
    FOREIGN KEY (`publisherId`)
    REFERENCES `Publisher` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `PublisherPermissionRequest_membershipId_fkey`
    FOREIGN KEY (`membershipId`)
    REFERENCES `PublisherMembership` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `PublisherPermissionRequest_requestedById_fkey`
    FOREIGN KEY (`requestedById`)
    REFERENCES `User` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `PublisherPermissionRequest_reviewedById_fkey`
    FOREIGN KEY (`reviewedById`)
    REFERENCES `User` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
