import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("review evidence migration keeps historical evidence version-bound and immutable", () => {
  const migration = source("prisma/migrations/20260822134500_contract_template_review_evidence/migration.sql");

  contains(migration, "CREATE TABLE `ContractTemplateReviewEvidence`", "review evidence table");
  contains(migration, "`templateVersion` INTEGER UNSIGNED NOT NULL", "version binding");
  contains(migration, "ENUM('legal_review','product_owner_decision')", "historical evidence types");
  contains(migration, "UNIQUE INDEX `ContractTemplateReviewEvidence_version_type_key`(`templateId`,`templateVersion`,`evidenceType`)", "version/type dedupe");
  contains(migration, "FOREIGN KEY (`templateId`) REFERENCES `ContractTemplate`(`id`)", "template FK");
  contains(migration, "FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`)", "actor FK");
});

test("admin approval remains a distinct evidence type with explicit authenticated responsibility", () => {
  const migration = source("prisma/migrations/20260921121000_contract_admin_approval_evidence/migration.sql");
  const repository = source("src/features/contracts/review-evidence.ts");
  const actions = source("src/features/contracts/actions.ts");

  contains(migration, "'admin_approval'", "database admin approval evidence type");
  contains(repository, '"admin_approval"', "repository evidence type");
  contains(actions, 'evidenceType === "admin_approval"', "admin approval action branch");
  contains(actions, "adminApprovalConfirmed", "explicit admin responsibility confirmation");
  contains(actions, "`İlkOku Admin · ${admin.email}`", "authenticated admin label");
  notContains(actions, '"legal_review", "product_owner_decision"', "legal review no longer accepted by write action");
});

test("review evidence writes re-authorize admin and lock the live current template version", () => {
  const repository = source("src/features/contracts/review-evidence.ts");

  contains(repository, 'import "server-only"', "server-only evidence repository");
  contains(repository, "FOR UPDATE", "row locking");
  contains(repository, 'actor.role === "admin"', "live admin role check");
  contains(repository, 'actor.status === "active"', "live admin status check");
  contains(repository, 'template.lifecycleStatus !== "review"', "review-state-only evidence write");
  contains(repository, "templateVersion = ${template.version}", "current version dedupe");
  contains(repository, 'Exclude<ContractTemplateReviewEvidenceType, "legal_review">', "new legal evidence writes disabled by type");
  contains(repository, "already_recorded", "idempotent evidence record");
  notContains(repository, "UPDATE ContractTemplateReviewEvidence", "review evidence must be append-only");
  notContains(repository, "DELETE FROM ContractTemplateReviewEvidence", "review evidence must not be deleted");
});

test("template approval is fail-closed without current-version admin approval", () => {
  const lifecycle = source("src/features/contracts/template-lifecycle.ts");

  contains(lifecycle, 'input.transition === "approve"', "approval branch");
  contains(lifecycle, "FROM ContractTemplateReviewEvidence", "evidence query in approval transaction");
  contains(lifecycle, "templateVersion = ${template.version}", "same-version approval proof");
  contains(lifecycle, "evidenceType = 'admin_approval'", "admin-only approval requirement");
  notContains(lifecycle, "evidenceType IN ('legal_review','admin_approval')", "legal review must not unlock approval");
  contains(lifecycle, "review_evidence_required", "fail-closed missing evidence result");
  contains(lifecycle, "approval_evidence_missing", "activation approval metadata guard");
  contains(lifecycle, "template.approvedById", "approval metadata preservation");
  contains(lifecycle, "template.approvedAt", "approval timestamp preservation");
});

test("template workbench exposes only admin approval as the activation control", () => {
  const page = source("src/app/sozlesme/sablonlar/[templateId]/page.tsx");
  const lifecyclePanel = source("src/features/contracts/ContractTemplateLifecyclePanel.tsx");
  const evidencePanel = source("src/features/contracts/ContractTemplateReviewEvidencePanel.tsx");
  const actions = source("src/features/contracts/actions.ts");
  const layout = source("src/app/sozlesme/layout.tsx");

  contains(page, "hasCurrentAdminApproval", "current version admin approval projection");
  contains(page, 'item.evidenceType === "admin_approval"', "page ignores legal review for activation");
  contains(lifecyclePanel, "Onay için mevcut sürüme Admin Onayı kaydet", "admin-only approval UI lock");
  contains(lifecyclePanel, "hasCurrentAdminApproval ?", "admin proof-gated approval control");
  contains(evidencePanel, "Admin Onayını ver ve Onaylı yap", "admin approval form");
  contains(evidencePanel, "aktivasyon dayanağı sayılmaz", "historical legal review boundary");
  notContains(evidencePanel, 'value="legal_review"', "legal review write form removed");
  notContains(actions, '"legal_review"', "legal review cannot be submitted through the server action");
  contains(actions, 'transition: "approve"', "admin approval immediately advances lifecycle");
  contains(actions, '"admin_approved"', "admin approval redirect status");
  contains(layout, 'import "./review-evidence.css"', "evidence styling");
});

test("existing waiting admin approvals are promoted by migration without touching soft drafts", () => {
  const migration = source("prisma/migrations/20260921132000_contract_admin_approval_auto_approve/migration.sql");

  contains(migration, "evidence.evidenceType = 'admin_approval'", "admin approval evidence backfill");
  contains(migration, "template.lifecycleStatus = 'approved'", "waiting template promotion");
  contains(migration, "template.lifecycleStatus = 'review'", "only waiting review templates");
  contains(migration, "evidence.templateVersion = template.version", "current-version binding");
  contains(migration, "template.code NOT LIKE 'SOFT\\_%'", "soft draft exclusion");
});

test("new review evidence table is an acknowledged migration-only contract surface", () => {
  const contracts = JSON.parse(source("src/features/system-map/runtime-contracts.json"));
  assert.ok(
    contracts.acknowledgedMigrationOnlyTables.includes("ContractTemplateReviewEvidence"),
    "ContractTemplateReviewEvidence must be acknowledged by system-map runtime contracts",
  );
});


test("reader purchase approval reports placeholder refusal and never stores draft approval evidence", () => {
  const repo = source("src/features/contracts/review-evidence.ts");
  const page = source("src/app/sozlesme/sablonlar/[templateId]/page.tsx");
  const panel = source("src/features/contracts/ContractTemplateReviewEvidencePanel.tsx");
  const lifecycle = source("src/features/contracts/ContractTemplateLifecyclePanel.tsx");

  contains(repo, 'input.evidenceType === "admin_approval"', "admin-only placeholder rejection");
  contains(repo, "isReaderPurchaseTermsPlaceholder(template.body)", "placeholder checked before approval evidence write");
  assert.ok(
    repo.indexOf("isReaderPurchaseTermsPlaceholder(template.body)") <
      repo.indexOf("INSERT INTO ContractTemplateReviewEvidence"),
    "placeholder rejection must happen before recording admin approval",
  );
  contains(repo, "templateVersion: Number(row.templateVersion)", "SQL evidence version normalized for UI");
  contains(page, 'reason === "purchase_terms_placeholder"', "visible placeholder-specific redirect feedback");
  contains(page, 'role="alert"', "rejected approval must not silently look successful");
  contains(panel, "template.lifecycleStatus === \"review\" && purchaseTermsPlaceholder", "draft cannot show approval form");
  contains(lifecycle, "Nihai satın alma koşulları yazılmadan onay verilemez.", "review lifecycle tells user what blocks approval");
});

test("one-time 0 TL reader terms import is review-only and guarded against overwrites", () => {
  const sql = source("prisma/migrations/20261026144500_reader_0tl_review_text_import/migration.sql");
  const reader = source("src/features/commerce/checkout-terms.ts");
  contains(sql, "UPDATE `ContractTemplate`", "existing template update");
  contains(sql, "`version` = `version` + 1", "new version");
  contains(sql, "`lifecycleStatus` = 'review'", "review-only lifecycle");
  contains(sql, "`active` = false", "no accidental activation");
  contains(sql, "`approvedById` = NULL", "old approvals cleared");
  contains(sql, "`approvedAt` = NULL", "old approval date cleared");
  contains(sql, "`activatedAt` = NULL", "no activation");
  contains(sql, "`version` = 3", "optimistic version guard");
  contains(sql, "`body` LIKE '%nihai hukuki metnin hazırlanacağı çalışma alanıdır%'", "unchanged seed guard");
  contains(sql, "GERÇEK SATICI, TAM ADRES", "visible incomplete legal party warning");
  contains(reader, 'normalized.startsWith("çalışma taslağı")', "reader checkout still refuses review draft");
  notContains(sql, "INSERT INTO `ContractTemplateReviewEvidence`", "no fabricated admin evidence");
  notContains(sql, "`lifecycleStatus` = 'active'", "no auto publish");
});

test("0 TL terms v6 replace only matching v5 review draft and expose human admin approval without auto-activation", () => {
  const migration = source("prisma/migrations/20261026153000_reader_0tl_admin_review_v6/migration.sql");
  const doc = source("docs/COMMERCE_0TL_READER_TERMS_ADMIN_APPROVAL_V6_2026-10-26.md");
  const panel = source("src/features/contracts/ContractTemplateReviewEvidencePanel.tsx");
  const checkout = source("src/features/commerce/checkout-terms.ts");

  contains(migration, "WHERE `id` = 'c5000000-0000-4000-8000-000000000002'", "only reader template");
  contains(migration, "`version` = 5", "live v5 compare-and-swap");
  contains(migration, "`version` = `version` + 1", "new v6 version");
  contains(migration, "`body` LIKE 'ÇALIŞMA TASLAĞI — 0 TL DİJİTAL ESER EDİNİMİ%'", "old body identity guard");
  contains(migration, "`lifecycleStatus` = 'review'", "remain in review");
  contains(migration, "`active` = false", "do not auto-activate");
  contains(migration, "`approvedById` = NULL", "do not forge approval actor");
  contains(migration, "`approvedAt` = NULL", "do not forge approval time");
  contains(migration, "`activatedAt` = NULL", "do not forge activation");
  contains(doc, "ilkoku.com", "user-supplied platform label");
  contains(doc, "İstanbul, Türkiye", "user-supplied location");
  contains(doc, "doğrulanmış satıcı/yetki", "seller remains verified separately");
  contains(doc, "0,00 TL", "zero TL scope");
  contains(doc, "destek@ilkoku.com", "public support email");
  assert.ok(!doc.trimStart().toLocaleLowerCase("tr-TR").startsWith("çalışma taslağı"), "body is no longer placeholder");
  notContains(migration, "INSERT INTO `ContractTemplateReviewEvidence`", "do not invent admin confirmation");
  notContains(migration, "'active',", "do not set active status");
  contains(panel, "Admin Onayını ver ve Onaylı yap", "admin action remains only authenticated UI");
  contains(checkout, "row.lifecycleStatus !== \"active\"", "checkout rejects non-active terms");
});
