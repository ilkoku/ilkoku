ALTER TABLE `RoleRequest`
  ADD COLUMN `pendingKey` VARCHAR(96) NULL;

CREATE UNIQUE INDEX `RoleRequest_pendingKey_key`
  ON `RoleRequest`(`pendingKey`);

UPDATE `RoleRequest` AS request
INNER JOIN (
  SELECT `userId`, `requestedRole`, MIN(`createdAt`) AS `createdAt`
  FROM `RoleRequest`
  WHERE `status` = 'pending'
  GROUP BY `userId`, `requestedRole`
  HAVING COUNT(*) = 1
) AS unique_pending
  ON unique_pending.`userId` = request.`userId`
  AND unique_pending.`requestedRole` = request.`requestedRole`
  AND unique_pending.`createdAt` = request.`createdAt`
SET request.`pendingKey` = CONCAT(request.`userId`, ':', request.`requestedRole`)
WHERE request.`status` = 'pending';
