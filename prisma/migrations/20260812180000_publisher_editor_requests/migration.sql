CREATE TABLE `PublisherEditorRequest` (
  `id` CHAR(36) NOT NULL,
  `publisherId` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `requestedById` CHAR(36) NOT NULL,
  `assignedEditorId` CHAR(36) NULL,
  `requestNote` VARCHAR(1000) NOT NULL,
  `status` ENUM('waiting', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'waiting',
  `activeKey` VARCHAR(80) NULL,
  `compensationEligible` BOOLEAN NOT NULL DEFAULT false,
  `claimedAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PublisherEditorRequest_activeKey_key` (`activeKey`),
  INDEX `PublisherEditorRequest_publisherId_status_createdAt_idx` (`publisherId`, `status`, `createdAt`),
  INDEX `PublisherEditorRequest_workId_status_createdAt_idx` (`workId`, `status`, `createdAt`),
  INDEX `PublisherEditorRequest_requestedById_createdAt_idx` (`requestedById`, `createdAt`),
  INDEX `PublisherEditorRequest_assignedEditorId_status_updatedAt_idx` (`assignedEditorId`, `status`, `updatedAt`),
  INDEX `PublisherEditorRequest_status_createdAt_idx` (`status`, `createdAt`),
  PRIMARY KEY (`id`),

  CONSTRAINT `PublisherEditorRequest_publisherId_fkey`
    FOREIGN KEY (`publisherId`) REFERENCES `Publisher` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherEditorRequest_workId_fkey`
    FOREIGN KEY (`workId`) REFERENCES `Work` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherEditorRequest_requestedById_fkey`
    FOREIGN KEY (`requestedById`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `PublisherEditorRequest_assignedEditorId_fkey`
    FOREIGN KEY (`assignedEditorId`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PublisherEditorReview` (
  `id` CHAR(36) NOT NULL,
  `requestId` CHAR(36) NOT NULL,
  `editorId` CHAR(36) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `category` VARCHAR(60) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `status` ENUM('draft', 'completed') NOT NULL DEFAULT 'draft',
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PublisherEditorReview_requestId_key` (`requestId`),
  INDEX `PublisherEditorReview_editorId_status_updatedAt_idx` (`editorId`, `status`, `updatedAt`),
  INDEX `PublisherEditorReview_status_updatedAt_idx` (`status`, `updatedAt`),
  PRIMARY KEY (`id`),

  CONSTRAINT `PublisherEditorReview_requestId_fkey`
    FOREIGN KEY (`requestId`) REFERENCES `PublisherEditorRequest` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PublisherEditorReview_editorId_fkey`
    FOREIGN KEY (`editorId`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;