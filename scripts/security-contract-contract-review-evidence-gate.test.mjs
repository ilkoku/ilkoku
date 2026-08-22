import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("review evidence migration binds immutable evidence to one template version and type", () => {
  const migration = source("prisma/migrations/20260822134500_contract_template_review_evidence/migration.sql");

  contains(migration, "CREATE TABLE `ContractTemplateReviewEvidence`", "review evidence table");
  contains(migration, "`templateVersion` INTEGER UNSIGNED NOT NULL", "version binding");
  contains(migration, "ENUM('legal_review','product_owner_decision')", "bounded evidence type");
  contains(migration, "UNIQUE INDEX `ContractTemplateReviewEvidence_version_type_key`(`templateId`,`templateVersion`,`evidenceType`)", "version/type dedupe");
  contains(migration, "FOREIGN KEY (`templateId`) REFERENCES `ContractTemplate`(`id`)", "template FK");
  contains(migration, "FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`)", "actor FK");
});

test("review evidence writes re-authorize admin and lock the live current template version", () => {
  const repository = source("src/features/contracts/review-evidence.ts");

  contains(repository, 'import "server-only"', "server-only evidence repository");
  contains(repository, "FOR UPDATE", "row locking");
  contains(repository, 'actor.role === "admin"', "live admin role check");
  contains(repository, 'actor.status === "active"', "live admin status check");
  contains(repository, 'template.lifecycleStatus !== "review"', "review-state-only evidence write");
  contains(repository, "templateVersion = ${template.version}", "current version dedupe");
  contains(repository, "already_recorded", "idempotent evidence record");
  notContains(repository, "UPDATE ContractTemplateReviewEvidence", "review evidence must be append-only");
  notContains(repository, "DELETE FROM ContractTemplateReviewEvidence", "review evidence must not be deleted");
});

test("template approval is fail-closed without current-version legal review evidence", () => {
  const lifecycle = source("src/features/contracts/template-lifecycle.ts");

  contains(lifecycle, 'input.transition === "approve"', "approval branch");
  contains(lifecycle, "FROM ContractTemplateReviewEvidence", "evidence query in approval transaction");
  contains(lifecycle, "templateVersion = ${template.version}", "same-version approval proof");
  contains(lifecycle, "evidenceType = 'legal_review'", "legal evidence requirement");
  contains(lifecycle, "review_evidence_required", "fail-closed missing evidence result");
  contains(lifecycle, "approval_evidence_missing", "activation approval metadata guard");
  contains(lifecycle, "template.approvedById", "approval metadata preservation");
  contains(lifecycle, "template.approvedAt", "approval timestamp preservation");
});

test("template workbench exposes review proof while hiding approval until proof exists", () => {
  const page = source("src/app/sozlesme/sablonlar/[templateId]/page.tsx");
  const lifecyclePanel = source("src/features/contracts/ContractTemplateLifecyclePanel.tsx");
  const evidencePanel = source("src/features/contracts/ContractTemplateReviewEvidencePanel.tsx");
  const actions = source("src/features/contracts/actions.ts");
  const layout = source("src/app/sozlesme/layout.tsx");

  contains(page, "listContractTemplateReviewEvidence", "evidence loaded with template");
  contains(page, "hasCurrentLegalEvidence", "current version proof projection");
  contains(lifecyclePanel, "Onay için önce mevcut sürüm hukukçu kanıtını kaydet", "approval UI lock");
  contains(lifecyclePanel, "hasCurrentLegalEvidence ?", "proof-gated approval control");
  contains(evidencePanel, "Hukukçu inceleme kanıtını kaydet", "evidence form");
  contains(evidencePanel, "item.templateVersion === template.version", "current version UI proof");
  contains(actions, "recordContractTemplateReviewEvidence", "canonical evidence action");
  contains(layout, 'import "./review-evidence.css"', "evidence styling");
});

test("new review evidence table is an acknowledged migration-only contract surface", () => {
  const contracts = JSON.parse(source("src/features/system-map/runtime-contracts.json"));
  assert.ok(
    contracts.acknowledgedMigrationOnlyTables.includes("ContractTemplateReviewEvidence"),
    "ContractTemplateReviewEvidence must be acknowledged by system-map runtime contracts",
  );
});
