ALTER TABLE `Work`
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX `Work_isActive_idx` ON `Work`(`isActive`);
