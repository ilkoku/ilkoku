ALTER TABLE `PublisherMembership`
  ADD COLUMN `permissionOverrides` JSON NULL AFTER `active`;

ALTER TABLE `PublisherInvitation`
  ADD COLUMN `permissionOverrides` JSON NULL AFTER `role`;
