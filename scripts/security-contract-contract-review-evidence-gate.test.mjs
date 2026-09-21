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
  contains(evidencePanel, "Admin Onayını kaydet", "admin approval form");
  contains(evidencePanel, "aktivasyon dayanağı sayılmaz", "historical legal review boundary");
  notContains(evidencePanel, 'value="legal_review"', "legal review write form removed");
  notContains(actions, '"legal_review"', "legal review cannot be submitted through the server action");
  contains(layout, 'import "./review-evidence.css"', "evidence styling");
});

test("new review evidence table is an acknowledged migration-only contract surface", () => {
  const contracts = JSON.parse(source("src/features/system-map/runtime-contracts.json"));
  assert.ok(
    contracts.acknowledgedMigrationOnlyTables.includes("ContractTemplateReviewEvidence"),
    "ContractTemplateReviewEvidence must be acknowledged by system-map runtime contracts",
  );
});
