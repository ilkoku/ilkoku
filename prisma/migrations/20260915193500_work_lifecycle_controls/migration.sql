-- Author-controlled active/passive switch and recoverable trash state.
ALTER TABLE `Work`
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `deletedAt` DATETIME(3) NULL;

CREATE INDEX `Work_isActive_idx` ON `Work`(`isActive`);
CREATE INDEX `Work_deletedAt_idx` ON `Work`(`deletedAt`);
