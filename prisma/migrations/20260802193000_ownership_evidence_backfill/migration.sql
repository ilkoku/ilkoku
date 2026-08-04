-- Sprint 012A-2
-- Mevcut eserleri geriye dönük sahiplik kanıt zincirine alır.
-- Geçmişe dönük sahte damga tarihi oluşturmaz.

INSERT INTO `WorkVersion` (
  `id`,
  `workId`,
  `chapterId`,
  `versionNumber`,
  `title`,
  `subtitle`,
  `description`,
  `content`,
  `contentHash`,
  `createdAt`
)
SELECT
  UUID(),
  work.`id`,
  NULL,
  COALESCE(
    (
      SELECT MAX(existingVersion.`versionNumber`) + 1
      FROM `WorkVersion` existingVersion
      WHERE existingVersion.`workId` = work.`id`
    ),
    1
  ),
  work.`title`,
  work.`subtitle`,
  work.`description`,
  NULL,
  LOWER(
    SHA2(
      CONCAT(
        'ilkoku-work-evidence-v1|',
        CHAR_LENGTH(COALESCE(work.`title`, '')),
        ':',
        COALESCE(work.`title`, ''),
        '|',
        CHAR_LENGTH(COALESCE(work.`subtitle`, '')),
        ':',
        COALESCE(work.`subtitle`, ''),
        '|',
        CHAR_LENGTH(COALESCE(work.`description`, '')),
        ':',
        COALESCE(work.`description`, ''),
        '|',
        CHAR_LENGTH(COALESCE(work.`genre`, '')),
        ':',
        COALESCE(work.`genre`, ''),
        '|',
        COALESCE(work.`language`, 'tr')
      ),
      256
    )
  ),
  CURRENT_TIMESTAMP(3)
FROM `Work` work
WHERE NOT EXISTS (
  SELECT 1
  FROM `WorkVersion` metadataVersion
  WHERE metadataVersion.`workId` = work.`id`
    AND metadataVersion.`chapterId` IS NULL
);

INSERT INTO `OwnershipStamp` (
  `id`,
  `workId`,
  `authorId`,
  `stampCode`,
  `contentHash`,
  `version`,
  `status`,
  `stampedAt`,
  `revokedAt`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  work.`id`,
  work.`authorId`,
  CONCAT('ILKOKU-LEGACY-', work.`publicId`),
  metadataVersion.`contentHash`,
  metadataVersion.`versionNumber`,
  'active',
  CURRENT_TIMESTAMP(3),
  NULL,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `Work` work
INNER JOIN `WorkVersion` metadataVersion
  ON metadataVersion.`id` = (
    SELECT selectedVersion.`id`
    FROM `WorkVersion` selectedVersion
    WHERE selectedVersion.`workId` = work.`id`
      AND selectedVersion.`chapterId` IS NULL
    ORDER BY selectedVersion.`versionNumber` ASC
    LIMIT 1
  )
WHERE NOT EXISTS (
  SELECT 1
  FROM `OwnershipStamp` existingStamp
  WHERE existingStamp.`workId` = work.`id`
);

INSERT INTO `AuditLog` (
  `id`,
  `actorId`,
  `action`,
  `entityType`,
  `entityId`,
  `metadata`,
  `createdAt`
)
SELECT
  UUID(),
  stamp.`authorId`,
  'ownership_stamp_created',
  'OwnershipStamp',
  stamp.`id`,
  JSON_OBJECT(
    'backfilled', TRUE,
    'evidenceRecordedAt', DATE_FORMAT(
      stamp.`stampedAt`,
      '%Y-%m-%dT%H:%i:%s.%fZ'
    ),
    'legacyWorkCreatedAt', DATE_FORMAT(
      work.`createdAt`,
      '%Y-%m-%dT%H:%i:%s.%fZ'
    ),
    'stampCode', stamp.`stampCode`,
    'workId', work.`id`,
    'workPublicId', work.`publicId`
  ),
  CURRENT_TIMESTAMP(3)
FROM `OwnershipStamp` stamp
INNER JOIN `Work` work
  ON work.`id` = stamp.`workId`
WHERE NOT EXISTS (
  SELECT 1
  FROM `AuditLog` existingAudit
  WHERE existingAudit.`action` = 'ownership_stamp_created'
    AND existingAudit.`entityType` = 'OwnershipStamp'
    AND existingAudit.`entityId` = stamp.`id`
);
