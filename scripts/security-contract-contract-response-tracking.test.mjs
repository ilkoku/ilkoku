import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("user contract terminal decisions require explicit confirmation on client and server", () => {
  const page = source("src/app/sozlesmelerim/[contractId]/page.tsx");
  const actions = source("src/features/contracts/guarded-response-actions.ts");

  contains(page, "respondToContractWithConfirmationAction", "guarded response action");
  contains(page, 'name="responseConfirmed" required', "required response confirmation checkbox");
  contains(page, "kalıcı işlem kaydı oluşturacağını anlıyorum", "decision consequence copy");
  notContains(page, "respondToContractAction", "unguarded legacy response action");

  contains(actions, 'formData.get("responseConfirmed") === "confirmed"', "server response confirmation");
  contains(actions, "if (!responseConfirmed)", "fail-closed response confirmation");
  contains(actions, "respondToUserContract", "canonical owner-scoped repository response");
  contains(actions, 'decision !== "accepted" && decision !== "rejected"', "decision allowlist");
});

test("admin cancellation requires explicit confirmation and preserves canonical cancellation repository checks", () => {
  const page = source("src/app/sozlesme/[contractId]/page.tsx");
  const actions = source("src/features/contracts/guarded-response-actions.ts");

  contains(page, "cancelContractWithConfirmationAction", "guarded cancel action");
  contains(page, 'name="cancelConfirmed" required', "required cancellation confirmation checkbox");
  notContains(page, "cancelContractFromAdminAction", "unguarded legacy cancel action");

  contains(actions, 'admin.role !== "admin"', "admin role guard");
  contains(actions, 'formData.get("cancelConfirmed") === "confirmed"', "server cancel confirmation");
  contains(actions, "if (!cancelConfirmed)", "fail-closed cancellation confirmation");
  contains(actions, "cancelAdminContract", "canonical DB-level cancellation path");
});

test("tracking center separates registration acceptance from manual operational contracts", () => {
  const tracking = source("src/app/sozlesme/takip/page.tsx");
  const navigation = source("src/features/contracts/ContractManagementNavigation.tsx");

  contains(tracking, "MANDATORY_REGISTRATION_CONTRACT_CODE", "stable registration contract boundary");
  contains(tracking, "const registration = contracts.filter", "registration acceptance queue");
  contains(tracking, "const manual = contracts.filter", "manual operational queue");
  contains(tracking, 'value="waiting"', "waiting filter");
  contains(tracking, 'value="accepted"', "accepted filter");
  contains(tracking, 'value="rejected"', "rejected filter");
  contains(tracking, 'value="cancelled"', "cancelled filter");
  contains(tracking, 'value="registration"', "registration filter");
  contains(tracking, "recipientEmail", "recipient search surface");
  contains(tracking, "relatedWorkTitle", "work search surface");
  contains(navigation, 'href: "/sozlesme/takip"', "tracking navigation entry");
});

test("admin detail exposes useful audit context without using metadata as authorization", () => {
  const page = source("src/app/sozlesme/[contractId]/page.tsx");

  contains(page, "parseMetadata", "safe audit metadata parser");
  contains(page, 'metadata?.source === "registration"', "registration event label");
  contains(page, "Gerekçe:", "cancellation reason surface");
  contains(page, "Kaynak:", "event source surface");
  contains(page, "Şablon:", "event template/version surface");
  contains(page, "getAdminContract", "canonical admin detail read");
  contains(page, "listContractEvents", "append-only event history read");
});
