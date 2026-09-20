CREATE TABLE `AuthorAgreement` (
  `id` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `agreementType` ENUM('author_publication_access') NOT NULL DEFAULT 'author_publication_access',
  `agreementVersion` VARCHAR(40) NOT NULL,
  `documentHash` CHAR(64) NOT NULL,
  `status` ENUM('accepted','revoked','superseded') NOT NULL DEFAULT 'accepted',
  `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revokedAt` DATETIME(3) NULL,
  `ipAddress` VARCHAR(45) NULL,
  `userAgent` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `AuthorAgreement_authorId_agreementType_agreementVersion_key`(`authorId`, `agreementType`, `agreementVersion`),
  INDEX `AuthorAgreement_authorId_status_acceptedAt_idx`(`authorId`, `status`, `acceptedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `AuthorAgreement_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WorkPublicationConsent` (
  `id` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `publicationModel` ENUM('free','paid') NOT NULL,
  `priceAmount` BIGINT UNSIGNED NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'TRY',
  `accessPlanSnapshot` JSON NOT NULL,
  `agreementVersion` VARCHAR(40) NOT NULL,
  `confirmedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `WorkPublicationConsent_workId_confirmedAt_idx`(`workId`, `confirmedAt`),
  INDEX `WorkPublicationConsent_authorId_confirmedAt_idx`(`authorId`, `confirmedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `WorkPublicationConsent_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `WorkPublicationConsent_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WorkSaleConfiguration` (
  `id` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `saleModel` ENUM('free','paid') NOT NULL DEFAULT 'free',
  `priceAmount` BIGINT UNSIGNED NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'TRY',
  `status` ENUM('draft','ready','active','paused') NOT NULL DEFAULT 'draft',
  `agreementVersion` VARCHAR(40) NULL,
  `confirmedAt` DATETIME(3) NULL,
  `activatedAt` DATETIME(3) NULL,
  `pausedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `WorkSaleConfiguration_workId_key`(`workId`),
  INDEX `WorkSaleConfiguration_authorId_status_idx`(`authorId`, `status`),
  INDEX `WorkSaleConfiguration_saleModel_status_idx`(`saleModel`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `WorkSaleConfiguration_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `WorkSaleConfiguration_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ChapterAccess` (
  `id` CHAR(36) NOT NULL,
  `chapterId` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `accessType` ENUM('preview','locked') NOT NULL DEFAULT 'preview',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ChapterAccess_chapterId_key`(`chapterId`),
  INDEX `ChapterAccess_workId_accessType_idx`(`workId`, `accessType`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ChapterAccess_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ChapterAccess_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WorkPriceHistory` (
  `id` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `oldPrice` BIGINT UNSIGNED NULL,
  `newPrice` BIGINT UNSIGNED NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'TRY',
  `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `WorkPriceHistory_workId_changedAt_idx`(`workId`, `changedAt`),
  INDEX `WorkPriceHistory_authorId_changedAt_idx`(`authorId`, `changedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `WorkPriceHistory_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `WorkPriceHistory_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Coupon` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `owner` ENUM('author','platform') NOT NULL,
  `authorId` CHAR(36) NULL,
  `creatorId` CHAR(36) NULL,
  `discountType` ENUM('percent','fixed') NOT NULL,
  `discountValue` BIGINT UNSIGNED NOT NULL,
  `scope` ENUM('selected_works','all_paid_works','selected_authors') NOT NULL,
  `status` ENUM('draft','active','paused','expired') NOT NULL DEFAULT 'draft',
  `startsAt` DATETIME(3) NULL,
  `endsAt` DATETIME(3) NULL,
  `totalUsageLimit` INTEGER UNSIGNED NULL,
  `perUserUsageLimit` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `usageCount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Coupon_code_key`(`code`),
  INDEX `Coupon_owner_status_idx`(`owner`, `status`),
  INDEX `Coupon_authorId_status_idx`(`authorId`, `status`),
  INDEX `Coupon_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Coupon_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Coupon_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CouponWorkScope` (
  `id` CHAR(36) NOT NULL,
  `couponId` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CouponWorkScope_couponId_workId_key`(`couponId`, `workId`),
  INDEX `CouponWorkScope_workId_idx`(`workId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `CouponWorkScope_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CouponWorkScope_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CouponAuthorScope` (
  `id` CHAR(36) NOT NULL,
  `couponId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CouponAuthorScope_couponId_authorId_key`(`couponId`, `authorId`),
  INDEX `CouponAuthorScope_authorId_idx`(`authorId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `CouponAuthorScope_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CouponAuthorScope_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Order` (
  `id` CHAR(36) NOT NULL,
  `orderNo` VARCHAR(40) NOT NULL,
  `readerId` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `couponId` CHAR(36) NULL,
  `originalAmount` BIGINT UNSIGNED NOT NULL,
  `discountAmount` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `finalAmount` BIGINT UNSIGNED NOT NULL,
  `authorEarningBaseAmount` BIGINT UNSIGNED NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'TRY',
  `couponCodeSnapshot` VARCHAR(64) NULL,
  `couponOwnerSnapshot` ENUM('author','platform') NULL,
  `discountTypeSnapshot` ENUM('percent','fixed') NULL,
  `discountValueSnapshot` BIGINT UNSIGNED NULL,
  `status` ENUM('draft','pending_payment','paid','failed','cancelled','refunded') NOT NULL DEFAULT 'draft',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `paidAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `refundedAt` DATETIME(3) NULL,
  UNIQUE INDEX `Order_orderNo_key`(`orderNo`),
  INDEX `Order_readerId_createdAt_idx`(`readerId`, `createdAt`),
  INDEX `Order_authorId_createdAt_idx`(`authorId`, `createdAt`),
  INDEX `Order_workId_createdAt_idx`(`workId`, `createdAt`),
  INDEX `Order_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `Order_couponId_createdAt_idx`(`couponId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Order_readerId_fkey` FOREIGN KEY (`readerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Order_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Order_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Order_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CouponRedemption` (
  `id` CHAR(36) NOT NULL,
  `couponId` CHAR(36) NOT NULL,
  `readerId` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NOT NULL,
  `discountAmount` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('reserved','used','released','refunded') NOT NULL DEFAULT 'reserved',
  `reservedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `redeemedAt` DATETIME(3) NULL,
  `releasedAt` DATETIME(3) NULL,
  UNIQUE INDEX `CouponRedemption_orderId_key`(`orderId`),
  INDEX `CouponRedemption_couponId_status_reservedAt_idx`(`couponId`, `status`, `reservedAt`),
  INDEX `CouponRedemption_readerId_status_reservedAt_idx`(`readerId`, `status`, `reservedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `CouponRedemption_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `CouponRedemption_readerId_fkey` FOREIGN KEY (`readerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CouponRedemption_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Payment` (
  `id` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NOT NULL,
  `method` ENUM('test','card','carrier') NOT NULL,
  `provider` VARCHAR(80) NOT NULL,
  `providerTransactionId` VARCHAR(160) NULL,
  `amount` BIGINT UNSIGNED NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'TRY',
  `status` ENUM('pending','succeeded','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `failureCode` VARCHAR(80) NULL,
  `failureMessage` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  INDEX `Payment_orderId_createdAt_idx`(`orderId`, `createdAt`),
  UNIQUE INDEX `Payment_provider_providerTransactionId_key`(`provider`, `providerTransactionId`),
  INDEX `Payment_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WorkEntitlement` (
  `id` CHAR(36) NOT NULL,
  `readerId` CHAR(36) NOT NULL,
  `workId` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NULL,
  `source` ENUM('purchase','coupon','admin','promotion') NOT NULL,
  `status` ENUM('active','revoked','refunded') NOT NULL DEFAULT 'active',
  `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `WorkEntitlement_orderId_key`(`orderId`),
  UNIQUE INDEX `WorkEntitlement_readerId_workId_key`(`readerId`, `workId`),
  INDEX `WorkEntitlement_workId_status_idx`(`workId`, `status`),
  INDEX `WorkEntitlement_readerId_status_idx`(`readerId`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `WorkEntitlement_readerId_fkey` FOREIGN KEY (`readerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `WorkEntitlement_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `WorkEntitlement_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuthorBalance` (
  `id` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'TRY',
  `pendingAmount` BIGINT NOT NULL DEFAULT 0,
  `availableAmount` BIGINT NOT NULL DEFAULT 0,
  `processingAmount` BIGINT NOT NULL DEFAULT 0,
  `paidAmount` BIGINT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `AuthorBalance_authorId_currency_key`(`authorId`, `currency`),
  INDEX `AuthorBalance_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `AuthorBalance_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Payout` (
  `id` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `amount` BIGINT UNSIGNED NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'TRY',
  `status` ENUM('pending','processing','paid','failed','held') NOT NULL DEFAULT 'pending',
  `periodStart` DATETIME(3) NULL,
  `periodEnd` DATETIME(3) NULL,
  `method` VARCHAR(80) NULL,
  `reference` VARCHAR(160) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `paidAt` DATETIME(3) NULL,
  INDEX `Payout_authorId_status_createdAt_idx`(`authorId`, `status`, `createdAt`),
  INDEX `Payout_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Payout_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FinancialLedger` (
  `id` CHAR(36) NOT NULL,
  `idempotencyKey` VARCHAR(120) NOT NULL,
  `entryType` ENUM(
    'sale_gross',
    'author_coupon_discount',
    'platform_coupon_discount',
    'payment_provider_fee',
    'platform_commission',
    'author_earning',
    'refund',
    'tax_withholding',
    'adjustment',
    'payout'
  ) NOT NULL,
  `amount` BIGINT NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'TRY',
  `orderId` CHAR(36) NULL,
  `workId` CHAR(36) NULL,
  `authorId` CHAR(36) NULL,
  `couponId` CHAR(36) NULL,
  `payoutId` CHAR(36) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `FinancialLedger_idempotencyKey_key`(`idempotencyKey`),
  INDEX `FinancialLedger_entryType_createdAt_idx`(`entryType`, `createdAt`),
  INDEX `FinancialLedger_orderId_createdAt_idx`(`orderId`, `createdAt`),
  INDEX `FinancialLedger_authorId_createdAt_idx`(`authorId`, `createdAt`),
  INDEX `FinancialLedger_workId_createdAt_idx`(`workId`, `createdAt`),
  INDEX `FinancialLedger_payoutId_createdAt_idx`(`payoutId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FinancialLedger_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FinancialLedger_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FinancialLedger_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FinancialLedger_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FinancialLedger_payoutId_fkey` FOREIGN KEY (`payoutId`) REFERENCES `Payout`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Refund` (
  `id` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NOT NULL,
  `paymentId` CHAR(36) NULL,
  `amount` BIGINT UNSIGNED NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'TRY',
  `status` ENUM('requested','approved','rejected','processing','processed') NOT NULL DEFAULT 'requested',
  `reason` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  INDEX `Refund_orderId_createdAt_idx`(`orderId`, `createdAt`),
  INDEX `Refund_paymentId_createdAt_idx`(`paymentId`, `createdAt`),
  INDEX `Refund_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Refund_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Refund_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


CREATE TABLE `OrderConsent` (
  `id` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NOT NULL,
  `readerId` CHAR(36) NOT NULL,
  `consentType` ENUM('digital_content_purchase') NOT NULL DEFAULT 'digital_content_purchase',
  `documentVersion` VARCHAR(40) NOT NULL,
  `documentHash` CHAR(64) NOT NULL,
  `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ipAddress` VARCHAR(45) NULL,
  `userAgent` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `OrderConsent_orderId_key`(`orderId`),
  INDEX `OrderConsent_readerId_acceptedAt_idx`(`readerId`, `acceptedAt`),
  INDEX `OrderConsent_consentType_acceptedAt_idx`(`consentType`, `acceptedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `OrderConsent_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `OrderConsent_readerId_fkey` FOREIGN KEY (`readerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Commerce-specific writer agreement starts as a draft. Existing contract
-- lifecycle controls must review/approve/activate it before writers can accept.
INSERT INTO `ContractTemplate` (
  `id`, `code`, `title`, `description`, `targetRole`, `body`,
  `version`, `active`, `lifecycleStatus`,
  `sourceTemplateId`, `approvedById`, `approvedAt`, `activatedAt`,
  `createdById`, `updatedById`, `createdAt`, `updatedAt`
) VALUES (
  'c5000000-0000-4000-8000-000000000001',
  'ILKOKU_AUTHOR_PUBLICATION_ACCESS',
  'İlkOku Yazar Yayın ve Erişim Sözleşmesi',
  'Ücretsiz ve ücretli eserlerin İlkOku üzerinde yayın, erişim ve satış hazırlığı için kullanılan yazar sözleşmesi.',
  'writer',
  'ÇALIŞMA TASLAĞI — Hukuki inceleme ve ürün sahibi onayı tamamlanmadan aktive edilmemelidir.\n\nBu şablon; taraflar, sözleşmenin konusu, eser üzerindeki haklar, İlkOku’ya verilen sınırlı yayın/erişim yetkisi, ücretsiz/ücretli yayın modeli, fiyatlandırma ve kampanya ilkeleri, yazar hakedişi, ödeme kuruluşu maliyetleri, iadeler, vergi/mali yükümlülükler, eserin yayından kaldırılması, telif ve üçüncü taraf hakları, yasak içerik, hesap/süreç güvenliği, elektronik onay ve kayıtlar, fesih, uyuşmazlık ve yürürlük başlıkları için nihai metin hazırlanacak çalışma alanıdır.',
  1,
  false,
  'draft',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);


-- Reader checkout terms also start as draft and must be legally reviewed and
-- activated before any checkout, including a zero-total coupon order.
INSERT INTO `ContractTemplate` (
  `id`, `code`, `title`, `description`, `targetRole`, `body`,
  `version`, `active`, `lifecycleStatus`,
  `sourceTemplateId`, `approvedById`, `approvedAt`, `activatedAt`,
  `createdById`, `updatedById`, `createdAt`, `updatedAt`
) VALUES (
  'c5000000-0000-4000-8000-000000000002',
  'ILKOKU_READER_DIGITAL_CONTENT_PURCHASE',
  'İlkOku Dijital İçerik Satın Alma Koşulları',
  'Okurun ücretli dijital esere erişim edinirken verdiği satın alma ve dijital içerik onayının sürümlü metni.',
  'reader',
  'ÇALIŞMA TASLAĞI — Hukuki inceleme ve ürün sahibi onayı tamamlanmadan aktive edilmemelidir.\n\nBu metin; dijital içerik erişimi, ücret/indirim/toplam tutar, ödeme veya 0 TL kampanya siparişi, erişimin ne zaman açıldığı, iade/iptal koşulları, tüketici bilgilendirmeleri, elektronik onay ve kayıtlar başlıkları için nihai hukuki metnin hazırlanacağı çalışma alanıdır.',
  1,
  false,
  'draft',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);
