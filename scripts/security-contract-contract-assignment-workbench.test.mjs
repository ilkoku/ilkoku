import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) =>
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("contract center separates the automatic registration agreement from manual dispatch", () => {
  const page = source("src/app/sozlesme/page.tsx");

  contains(page, "MANDATORY_REGISTRATION_CONTRACT_CODE", "registration template identifier");
  contains(page, "template.code !== MANDATORY_REGISTRATION_CONTRACT_CODE", "manual template exclusion");
  contains(page, "listActiveManualContractAssignments", "active assignment inventory");
  contains(page, "activeAssignments={activeAssignments}", "workbench duplicate inventory");
  contains(page, "Sistem / kayıt sırasında otomatik kabul", "registration template UI classification");
  contains(page, "Manuel gönderim şablonu", "manual metric wording");
});

test("manual dispatch service is fail closed at database boundaries", () => {
  const dispatch = source("src/features/contracts/manual-dispatch.ts");

  contains(dispatch, 'import "server-only"', "server-only dispatch service");
  contains(dispatch, "FOR UPDATE", "transaction row locks");
  contains(dispatch, 'actor.role === "admin"', "database-level admin authorization");
  contains(dispatch, 'recipient.status === "active"', "active recipient requirement");
  contains(dispatch, 'template.lifecycleStatus !== "active"', "lifecycle fail closed");
  contains(dispatch, "template.code === MANDATORY_REGISTRATION_CONTRACT_CODE", "registration template manual-send block");
  contains(dispatch, 'recipient.role === "writer" && work.authorId !== recipient.id', "writer work ownership check");
  contains(dispatch, "activeKey", "duplicate active key");
  contains(dispatch, "titleSnapshot", "immutable title snapshot");
  contains(dispatch, "bodySnapshot", "immutable body snapshot");
  contains(dispatch, 'source: "manual_admin"', "manual dispatch audit source");
  contains(dispatch, "transaction.notification.create", "recipient notification");
});

test("admin action requires explicit preview confirmation and uses only hardened manual dispatch", () => {
  const actions = source("src/features/contracts/actions.ts");

  contains(actions, 'formData.get("dispatchConfirmed") === "confirmed"', "server-side confirmation check");
  contains(actions, 'contractCenterResult("onay_gerekli")', "missing confirmation result");
  contains(actions, "sendManualAdminContract", "hardened dispatch service usage");
  notContains(actions, "sendAdminContract({", "legacy direct send path");
});

test("assignment workbench keeps selections controlled, previews snapshots, and blocks duplicates", () => {
  const workbench = source("src/features/contracts/ContractSendWorkbench.tsx");

  contains(workbench, 'name="recipientUserId"', "recipient field");
  contains(workbench, "value={recipientUserId}", "controlled recipient selection");
  contains(workbench, 'name="templateId"', "template field");
  contains(workbench, "value={templateId}", "controlled template selection");
  contains(workbench, "setRecipientUserId(\"\")", "role-change recipient reset");
  contains(workbench, "setTemplateId(\"\")", "role-change template reset");
  contains(workbench, "works.filter((work) => work.authorId === selectedRecipient.id)", "writer-owned work filtering");
  contains(workbench, "activeAssignments.find", "pre-submit duplicate detection");
  contains(workbench, "renderPreview", "snapshot preview rendering");
  contains(workbench, "Europe/Istanbul", "preview date timezone");
  contains(workbench, 'name="dispatchConfirmed"', "explicit dispatch confirmation");
  contains(workbench, "disabled={!canSubmit}", "submit fail closed");
  contains(workbench, "sunucu aktif şablonu", "server authority notice");
});

test("assignment workbench styling is loaded by the admin contract layout", () => {
  const layout = source("src/app/sozlesme/layout.tsx");
  const css = source("src/app/sozlesme/assignment-workbench.css");

  contains(layout, 'import "./assignment-workbench.css"', "workbench stylesheet import");
  contains(css, ".contract-assignment-grid", "assignment split layout");
  contains(css, ".contract-send-preview", "sticky preview card");
  contains(css, ".contract-duplicate-warning", "duplicate warning styling");
  contains(css, ".contract-dispatch-confirm", "confirmation styling");
});
