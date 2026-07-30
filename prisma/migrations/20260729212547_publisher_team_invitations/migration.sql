-- CreateTable
CREATE TABLE `PublisherInvitation` (
    `id` CHAR(36) NOT NULL,
    `publisherId` CHAR(36) NOT NULL,
    `invitedById` CHAR(36) NOT NULL,
    `invitedEmail` VARCHAR(320) NOT NULL,
    `role` ENUM('owner', 'manager', 'submissions_manager', 'editorial', 'contract_manager', 'reviewer', 'viewer') NOT NULL DEFAULT 'reviewer',
    `tokenHash` CHAR(64) NOT NULL,
    `status` ENUM('pending', 'accepted', 'declined', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `declinedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `acceptedById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PublisherInvitation_tokenHash_key`(`tokenHash`),
    INDEX `PublisherInvitation_publisherId_status_createdAt_idx`(`publisherId`, `status`, `createdAt`),
    INDEX `PublisherInvitation_publisherId_invitedEmail_status_idx`(`publisherId`, `invitedEmail`, `status`),
    INDEX `PublisherInvitation_invitedEmail_status_idx`(`invitedEmail`, `status`),
    INDEX `PublisherInvitation_invitedById_createdAt_idx`(`invitedById`, `createdAt`),
    INDEX `PublisherInvitation_expiresAt_status_idx`(`expiresAt`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PublisherInvitation` ADD CONSTRAINT `PublisherInvitation_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `Publisher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublisherInvitation` ADD CONSTRAINT `PublisherInvitation_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublisherInvitation` ADD CONSTRAINT `PublisherInvitation_acceptedById_fkey` FOREIGN KEY (`acceptedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
