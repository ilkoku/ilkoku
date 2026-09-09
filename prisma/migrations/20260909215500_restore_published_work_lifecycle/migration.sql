-- Publication is a durable lifecycle state: once a work has a real
-- work_published audit event, ordinary writer edits must not make it private.
-- Archive remains an explicit removal boundary.
UPDATE `Work` AS work
INNER JOIN (
  SELECT
    `entityId` AS workId,
    MAX(`createdAt`) AS lastPublishedAt
  FROM `AuditLog`
  WHERE `action` = 'work_published'
    AND `entityType` = 'Work'
    AND `entityId` IS NOT NULL
  GROUP BY `entityId`
) AS publication
  ON publication.workId = work.id
SET
  work.`status` = 'published',
  work.`visibility` = 'public',
  work.`publishedAt` = COALESCE(work.`publishedAt`, publication.lastPublishedAt)
WHERE work.`archivedAt` IS NULL
  AND (
    work.`status` <> 'published'
    OR work.`visibility` <> 'public'
    OR work.`publishedAt` IS NULL
  );
