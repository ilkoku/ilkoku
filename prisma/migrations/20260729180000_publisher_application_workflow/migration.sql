-- AlterTable
ALTER TABLE `Publisher`
    MODIFY COLUMN `companyName` VARCHAR(220) NOT NULL,
    ADD COLUMN `legalCompanyName` VARCHAR(240) NULL,
    ADD COLUMN `companyType` VARCHAR(80) NULL,
    ADD COLUMN `establishmentYear` SMALLINT UNSIGNED NULL,
    ADD COLUMN `taxOffice` VARCHAR(160) NULL,
    ADD COLUMN `taxNumber` VARCHAR(32) NULL,
    ADD COLUMN `registryNumber` VARCHAR(64) NULL,
    ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `city` VARCHAR(120) NULL,
    ADD COLUMN `district` VARCHAR(120) NULL,
    ADD COLUMN `corporatePhone` VARCHAR(32) NULL,
    ADD COLUMN `corporateEmail` VARCHAR(320) NULL,
    ADD COLUMN `publicationCategories` LONGTEXT NULL;

-- CreateTable
CREATE TABLE `PublisherApplication` (
    `id` CHAR(36) NOT NULL,
    `roleRequestId` CHAR(36) NOT NULL,
    `applicantUserId` CHAR(36) NOT NULL,
    `publisherId` CHAR(36) NULL,
    `publisherName` VARCHAR(220) NOT NULL,
    `legalCompanyName` VARCHAR(240) NOT NULL,
    `companyType` VARCHAR(80) NOT NULL,
    `establishmentYear` SMALLINT UNSIGNED NOT NULL,
    `taxOffice` VARCHAR(160) NOT NULL,
    `taxNumber` VARCHAR(32) NOT NULL,
    `mersisOrRegistryNumber` VARCHAR(64) NOT NULL,
    `address` TEXT NOT NULL,
    `city` VARCHAR(120) NOT NULL,
    `district` VARCHAR(120) NOT NULL,
    `corporatePhone` VARCHAR(32) NOT NULL,
    `corporateEmail` VARCHAR(320) NOT NULL,
    `websiteUrl` VARCHAR(500) NULL,
    `authorizedPersonFirstName` VARCHAR(100) NOT NULL,
    `authorizedPersonLastName` VARCHAR(100) NOT NULL,
    `authorizedPersonTitle` VARCHAR(160) NOT NULL,
    `authorizedPersonPhone` VARCHAR(32) NOT NULL,
    `authorizedPersonEmail` VARCHAR(320) NOT NULL,
    `logoUrl` VARCHAR(500) NULL,
    `description` TEXT NOT NULL,
    `publicationCategories` LONGTEXT NOT NULL,
    `acceptsSubmissions` BOOLEAN NOT NULL DEFAULT true,
    `verificationDocumentUrls` LONGTEXT NOT NULL,
    `verificationStatus` ENUM(
        'draft',
        'submitted',
        'changes_requested',
        'approved',
        'rejected'
    ) NOT NULL DEFAULT 'submitted',
    `correctionNote` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PublisherApplication_roleRequestId_key`(`roleRequestId`),
    INDEX `PublisherApplication_applicantUserId_verificationStatus_idx`(
        `applicantUserId`,
        `verificationStatus`
    ),
    INDEX `PublisherApplication_publisherId_idx`(`publisherId`),
    INDEX `PublisherApplication_verificationStatus_submittedAt_idx`(
        `verificationStatus`,
        `submittedAt`
    ),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PublisherApplication`
    ADD CONSTRAINT `PublisherApplication_roleRequestId_fkey`
    FOREIGN KEY (`roleRequestId`) REFERENCES `RoleRequest`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `PublisherApplication_applicantUserId_fkey`
    FOREIGN KEY (`applicantUserId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `PublisherApplication_publisherId_fkey`
    FOREIGN KEY (`publisherId`) REFERENCES `Publisher`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
