-- Tüm yönetilen sözleşme şablonlarında hukukçu incelemesine alternatif,
-- açıkça ayrı tutulan sürüm-bağlı Admin Onayı kanıtını destekler.
-- Admin Onayı hukukçu incelemesi veya hukuki görüş olarak etiketlenmez.

ALTER TABLE `ContractTemplateReviewEvidence`
  MODIFY `evidenceType` ENUM('legal_review','product_owner_decision','admin_approval') NOT NULL;
