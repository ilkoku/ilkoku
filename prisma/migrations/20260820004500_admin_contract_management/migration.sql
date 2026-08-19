CREATE TABLE `ContractTemplate` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(120) NOT NULL,
  `title` VARCHAR(220) NOT NULL,
  `description` VARCHAR(500) NULL,
  `targetRole` VARCHAR(32) NOT NULL DEFAULT 'any',
  `body` LONGTEXT NOT NULL,
  `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdById` CHAR(36) NULL,
  `updatedById` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ContractTemplate_code_key`(`code`),
  INDEX `ContractTemplate_active_targetRole_idx`(`active`,`targetRole`),
  INDEX `ContractTemplate_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserContract` (
  `id` CHAR(36) NOT NULL,
  `templateId` CHAR(36) NOT NULL,
  `templateVersion` INTEGER UNSIGNED NOT NULL,
  `recipientUserId` CHAR(36) NOT NULL,
  `recipientRole` VARCHAR(32) NOT NULL,
  `status` ENUM('draft','sent','viewed','accepted','rejected','cancelled') NOT NULL DEFAULT 'sent',
  `titleSnapshot` VARCHAR(220) NOT NULL,
  `bodySnapshot` LONGTEXT NOT NULL,
  `adminNote` TEXT NULL,
  `responseNote` TEXT NULL,
  `relatedWorkId` CHAR(36) NULL,
  `sentById` CHAR(36) NULL,
  `activeKey` VARCHAR(190) NULL,
  `sentAt` DATETIME(3) NULL,
  `viewedAt` DATETIME(3) NULL,
  `respondedAt` DATETIME(3) NULL,
  `acceptedAt` DATETIME(3) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `UserContract_activeKey_key`(`activeKey`),
  INDEX `UserContract_recipient_status_updated_idx`(`recipientUserId`,`status`,`updatedAt`),
  INDEX `UserContract_status_sent_idx`(`status`,`sentAt`),
  INDEX `UserContract_template_idx`(`templateId`,`createdAt`),
  INDEX `UserContract_relatedWork_idx`(`relatedWorkId`,`createdAt`),
  INDEX `UserContract_sentBy_idx`(`sentById`,`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserContractEvent` (
  `id` CHAR(36) NOT NULL,
  `contractId` CHAR(36) NOT NULL,
  `actorId` CHAR(36) NULL,
  `eventType` VARCHAR(40) NOT NULL,
  `metadata` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `UserContractEvent_contract_created_idx`(`contractId`,`createdAt`),
  INDEX `UserContractEvent_actor_created_idx`(`actorId`,`createdAt`),
  INDEX `UserContractEvent_type_created_idx`(`eventType`,`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ContractTemplate`
  ADD CONSTRAINT `ContractTemplate_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ContractTemplate_updatedById_fkey`
  FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `UserContract`
  ADD CONSTRAINT `UserContract_templateId_fkey`
  FOREIGN KEY (`templateId`) REFERENCES `ContractTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `UserContract_recipientUserId_fkey`
  FOREIGN KEY (`recipientUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `UserContract_relatedWorkId_fkey`
  FOREIGN KEY (`relatedWorkId`) REFERENCES `Work`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `UserContract_sentById_fkey`
  FOREIGN KEY (`sentById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `UserContractEvent`
  ADD CONSTRAINT `UserContractEvent_contractId_fkey`
  FOREIGN KEY (`contractId`) REFERENCES `UserContract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `UserContractEvent_actorId_fkey`
  FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `ContractTemplate`
  (`id`,`code`,`title`,`description`,`targetRole`,`body`,`version`,`active`,`createdAt`,`updatedAt`)
VALUES
  (
    'c1000000-0000-4000-8000-000000000001',
    'WRITER_PLATFORM_STANDARD',
    'Yazar Platform Kullanım ve Eser Süreci Sözleşmesi',
    'Yazar rolündeki kullanıcılar için düzenlenebilir başlangıç şablonu.',
    'writer',
    'Taraf: {{ad_soyad}}\nE-posta: {{eposta}}\nRol: {{rol}}\nTarih: {{tarih}}\nİlgili eser: {{eser}}\n\nBu alan İlkOku sözleşme yönetim merkezi için örnek şablondur. Admin, gönderim öncesinde metni güncellemeli ve geçerli nihai metni burada oluşturmalıdır.',
    1,
    true,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    'EDITOR_SERVICE_STANDARD',
    'Editör Hizmet ve Çalışma Sözleşmesi',
    'Editör rolündeki kullanıcılar için düzenlenebilir başlangıç şablonu.',
    'editor',
    'Taraf: {{ad_soyad}}\nE-posta: {{eposta}}\nRol: {{rol}}\nTarih: {{tarih}}\nİlgili eser: {{eser}}\n\nBu alan İlkOku sözleşme yönetim merkezi için örnek şablondur. Admin, görev kapsamı, koşullar ve yürürlük hükümlerini gönderimden önce nihai metne dönüştürmelidir.',
    1,
    true,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c1000000-0000-4000-8000-000000000003',
    'PUBLISHER_COLLABORATION_STANDARD',
    'Yayınevi İş Birliği Sözleşmesi',
    'Yayınevi rolündeki kullanıcılar için düzenlenebilir başlangıç şablonu.',
    'publisher',
    'Taraf: {{ad_soyad}}\nE-posta: {{eposta}}\nRol: {{rol}}\nTarih: {{tarih}}\nİlgili eser: {{eser}}\n\nBu alan İlkOku sözleşme yönetim merkezi için örnek şablondur. Admin, iş birliği kapsamını ve taraf koşullarını gönderimden önce nihai metne dönüştürmelidir.',
    1,
    true,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c1000000-0000-4000-8000-000000000004',
    'READER_STANDARD',
    'Okuyucu Özel Süreç Sözleşmesi',
    'Okuyucu rolündeki kullanıcıya gerektiğinde gönderilebilecek düzenlenebilir başlangıç şablonu.',
    'reader',
    'Taraf: {{ad_soyad}}\nE-posta: {{eposta}}\nRol: {{rol}}\nTarih: {{tarih}}\nİlgili eser: {{eser}}\n\nBu alan İlkOku sözleşme yönetim merkezi için örnek şablondur. Admin, gerekli koşulları gönderimden önce nihai metne dönüştürmelidir.',
    1,
    true,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  ),
  (
    'c1000000-0000-4000-8000-000000000005',
    'GENERAL_USER_STANDARD',
    'Genel Kullanıcı Sözleşmesi',
    'Tüm kullanıcı rollerine gönderilebilen genel amaçlı düzenlenebilir başlangıç şablonu.',
    'any',
    'Taraf: {{ad_soyad}}\nE-posta: {{eposta}}\nRol: {{rol}}\nTarih: {{tarih}}\nİlgili eser: {{eser}}\n\nBu alan İlkOku sözleşme yönetim merkezi için genel örnek şablondur. Admin, gönderim öncesinde metni nihai hale getirmelidir.',
    1,
    true,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
  );
