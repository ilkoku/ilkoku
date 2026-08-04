-- Existing editor and publisher roles were assigned before
-- route-level approval enforcement existed.
-- Preserve those accounts by recording a system baseline approval.

INSERT INTO `RoleRequest` (
  `id`,
  `userId`,
  `requestedRole`,
  `status`,
  `pendingKey`,
  `reviewedById`,
  `reviewedAt`,
  `reviewNote`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  user.`id`,
  user.`role`,
  'approved',
  NULL,
  NULL,
  COALESCE(user.`updatedAt`, user.`createdAt`),
  'Mevcut onaylı rol için sistem geçiş kaydı.',
  user.`createdAt`,
  COALESCE(user.`updatedAt`, user.`createdAt`)
FROM `User` AS user
WHERE user.`role` IN ('editor', 'publisher')
  AND NOT EXISTS (
    SELECT 1
    FROM `RoleRequest` AS request
    WHERE request.`userId` = user.`id`
      AND request.`requestedRole` = user.`role`
      AND request.`status` = 'approved'
  );
