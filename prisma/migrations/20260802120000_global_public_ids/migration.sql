-- İlkOku global public identity system.
-- Existing UUID primary keys remain unchanged.

CREATE TABLE `IdentitySequence` (
    `id` CHAR(36) NOT NULL,
    `type` ENUM(
        'user',
        'work',
        'publisher',
        'comment'
    ) NOT NULL,
    `year` SMALLINT UNSIGNED NOT NULL,
    `lastNumber` INT UNSIGNED NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IdentitySequence_type_year_key`(`type`, `year`),
    INDEX `IdentitySequence_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `User`
    ADD COLUMN `publicId` VARCHAR(24) NULL;

ALTER TABLE `Work`
    ADD COLUMN `publicId` VARCHAR(24) NULL;

ALTER TABLE `Publisher`
    ADD COLUMN `publicId` VARCHAR(24) NULL;

ALTER TABLE `Comment`
    ADD COLUMN `publicId` VARCHAR(24) NULL;

CREATE TEMPORARY TABLE `_IdentityBackfill` (
    `entityId` CHAR(36) NOT NULL,
    `publicId` VARCHAR(24) NOT NULL,
    PRIMARY KEY (`entityId`),
    UNIQUE INDEX `_IdentityBackfill_publicId_key`(`publicId`)
);

INSERT INTO `_IdentityBackfill` (`entityId`, `publicId`)
SELECT
    ranked.`id`,
    CONCAT(
        'IKO-U-',
        ranked.`identityYear`,
        '-',
        CASE
            WHEN ranked.`identityNumber` < 1000000
                THEN LPAD(ranked.`identityNumber`, 6, '0')
            ELSE CAST(ranked.`identityNumber` AS CHAR)
        END
    )
FROM (
    SELECT
        `id`,
        YEAR(`createdAt`) AS `identityYear`,
        ROW_NUMBER() OVER (
            PARTITION BY YEAR(`createdAt`)
            ORDER BY `createdAt`, `id`
        ) AS `identityNumber`
    FROM `User`
) AS ranked;

UPDATE `User` AS entity
INNER JOIN `_IdentityBackfill` AS identityValue
    ON identityValue.`entityId` = entity.`id`
SET entity.`publicId` = identityValue.`publicId`;

TRUNCATE TABLE `_IdentityBackfill`;

INSERT INTO `_IdentityBackfill` (`entityId`, `publicId`)
SELECT
    ranked.`id`,
    CONCAT(
        'IKO-W-',
        ranked.`identityYear`,
        '-',
        CASE
            WHEN ranked.`identityNumber` < 1000000
                THEN LPAD(ranked.`identityNumber`, 6, '0')
            ELSE CAST(ranked.`identityNumber` AS CHAR)
        END
    )
FROM (
    SELECT
        `id`,
        YEAR(`createdAt`) AS `identityYear`,
        ROW_NUMBER() OVER (
            PARTITION BY YEAR(`createdAt`)
            ORDER BY `createdAt`, `id`
        ) AS `identityNumber`
    FROM `Work`
) AS ranked;

UPDATE `Work` AS entity
INNER JOIN `_IdentityBackfill` AS identityValue
    ON identityValue.`entityId` = entity.`id`
SET entity.`publicId` = identityValue.`publicId`;

TRUNCATE TABLE `_IdentityBackfill`;

INSERT INTO `_IdentityBackfill` (`entityId`, `publicId`)
SELECT
    ranked.`id`,
    CONCAT(
        'IKO-P-',
        ranked.`identityYear`,
        '-',
        CASE
            WHEN ranked.`identityNumber` < 1000000
                THEN LPAD(ranked.`identityNumber`, 6, '0')
            ELSE CAST(ranked.`identityNumber` AS CHAR)
        END
    )
FROM (
    SELECT
        `id`,
        YEAR(`createdAt`) AS `identityYear`,
        ROW_NUMBER() OVER (
            PARTITION BY YEAR(`createdAt`)
            ORDER BY `createdAt`, `id`
        ) AS `identityNumber`
    FROM `Publisher`
) AS ranked;

UPDATE `Publisher` AS entity
INNER JOIN `_IdentityBackfill` AS identityValue
    ON identityValue.`entityId` = entity.`id`
SET entity.`publicId` = identityValue.`publicId`;

TRUNCATE TABLE `_IdentityBackfill`;

INSERT INTO `_IdentityBackfill` (`entityId`, `publicId`)
SELECT
    ranked.`id`,
    CONCAT(
        'IKO-C-',
        ranked.`identityYear`,
        '-',
        CASE
            WHEN ranked.`identityNumber` < 1000000
                THEN LPAD(ranked.`identityNumber`, 6, '0')
            ELSE CAST(ranked.`identityNumber` AS CHAR)
        END
    )
FROM (
    SELECT
        `id`,
        YEAR(`createdAt`) AS `identityYear`,
        ROW_NUMBER() OVER (
            PARTITION BY YEAR(`createdAt`)
            ORDER BY `createdAt`, `id`
        ) AS `identityNumber`
    FROM `Comment`
) AS ranked;

UPDATE `Comment` AS entity
INNER JOIN `_IdentityBackfill` AS identityValue
    ON identityValue.`entityId` = entity.`id`
SET entity.`publicId` = identityValue.`publicId`;

DROP TEMPORARY TABLE `_IdentityBackfill`;

ALTER TABLE `User`
    MODIFY COLUMN `publicId` VARCHAR(24) NOT NULL,
    ADD UNIQUE INDEX `User_publicId_key`(`publicId`);

ALTER TABLE `Work`
    MODIFY COLUMN `publicId` VARCHAR(24) NOT NULL,
    ADD UNIQUE INDEX `Work_publicId_key`(`publicId`);

ALTER TABLE `Publisher`
    MODIFY COLUMN `publicId` VARCHAR(24) NOT NULL,
    ADD UNIQUE INDEX `Publisher_publicId_key`(`publicId`);

ALTER TABLE `Comment`
    MODIFY COLUMN `publicId` VARCHAR(24) NOT NULL,
    ADD UNIQUE INDEX `Comment_publicId_key`(`publicId`);

INSERT INTO `IdentitySequence` (
    `id`,
    `type`,
    `year`,
    `lastNumber`,
    `createdAt`,
    `updatedAt`
)
SELECT
    UUID(),
    'user',
    YEAR(`createdAt`),
    COUNT(*),
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `User`
GROUP BY YEAR(`createdAt`);

INSERT INTO `IdentitySequence` (
    `id`,
    `type`,
    `year`,
    `lastNumber`,
    `createdAt`,
    `updatedAt`
)
SELECT
    UUID(),
    'work',
    YEAR(`createdAt`),
    COUNT(*),
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `Work`
GROUP BY YEAR(`createdAt`);

INSERT INTO `IdentitySequence` (
    `id`,
    `type`,
    `year`,
    `lastNumber`,
    `createdAt`,
    `updatedAt`
)
SELECT
    UUID(),
    'publisher',
    YEAR(`createdAt`),
    COUNT(*),
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `Publisher`
GROUP BY YEAR(`createdAt`);

INSERT INTO `IdentitySequence` (
    `id`,
    `type`,
    `year`,
    `lastNumber`,
    `createdAt`,
    `updatedAt`
)
SELECT
    UUID(),
    'comment',
    YEAR(`createdAt`),
    COUNT(*),
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `Comment`
GROUP BY YEAR(`createdAt`);
