ALTER TABLE `Work`
  ADD COLUMN `contentRating` ENUM('unrated', 'all_ages', 'teen_13', 'young_adult_16', 'adult_18') NOT NULL DEFAULT 'unrated',
  ADD COLUMN `contentWarnings` LONGTEXT NULL,
  ADD COLUMN `contentRatingConfirmedAt` DATETIME(3) NULL;
