-- Existing works and orders retain their prior (VAT-inclusive/undetermined)
-- interpretation. New explicitly tagged works may use net price + sales VAT.
ALTER TABLE `WorkPublicationConsent`
  ADD COLUMN `priceTaxTreatment` VARCHAR(24) NOT NULL DEFAULT 'legacy_inclusive';

ALTER TABLE `WorkSaleConfiguration`
  ADD COLUMN `priceTaxTreatment` VARCHAR(24) NOT NULL DEFAULT 'legacy_inclusive';

CREATE TABLE `OrderPriceQuoteSnapshot` (
  `id` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NOT NULL,
  `taxTreatment` VARCHAR(24) NOT NULL,
  `calculationVersion` VARCHAR(32) NOT NULL DEFAULT 'quote-v1',
  `vatRateBasisPoints` SMALLINT UNSIGNED NOT NULL,
  `listNetAmount` BIGINT UNSIGNED NOT NULL,
  `listVatAmount` BIGINT UNSIGNED NOT NULL,
  `listGrossAmount` BIGINT UNSIGNED NOT NULL,
  `discountGrossAmount` BIGINT UNSIGNED NOT NULL,
  `payableGrossAmount` BIGINT UNSIGNED NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `OrderPriceQuoteSnapshot_orderId_key`(`orderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OrderPriceQuoteSnapshot`
  ADD CONSTRAINT `OrderPriceQuoteSnapshot_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
