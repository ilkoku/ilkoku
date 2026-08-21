import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const contains = (text, fragment, label) => assert.ok(
  text.includes(fragment),
  `${label} must contain ${JSON.stringify(fragment)}`,
);
const notContains = (text, fragment, label) => assert.ok(
  !text.includes(fragment),
  `${label} must not contain ${JSON.stringify(fragment)}`,
);

test("contract tracking reminder activity is aggregated in one bounded read-only query", () => {
  const activity = source("src/features/contracts/tracking-activity.ts");

  contains(activity, 'import "server-only"', "server-only tracking collector");
  contains(activity, "MAX(event.createdAt) AS lastReminderAt", "last reminder aggregate");
  contains(activity, "COUNT(*) AS reminderCount", "reminder count aggregate");
  contains(activity, "event.eventType = 'reminder_requested'", "canonical reminder event source");
  contains(activity, "GROUP BY event.contractId", "per-contract aggregation");
  contains(activity, "Math.min(500", "bounded query limit");
  contains(activity, "MANDATORY_REGISTRATION_CONTRACT_CODE", "registration agreement exclusion");
  notContains(activity, "INSERT INTO", "tracking collector must remain read-only");
  notContains(activity, "UPDATE UserContract", "tracking collector must not mutate contracts");
});

test("tracking workbench loads contracts and reminder activity without per-row database calls", () => {
  const page = source("src/app/sozlesme/takip/page.tsx");

  contains(page, "Promise.all([", "parallel bounded workbench reads");
  contains(page, "listAdminUserContracts(500)", "bounded contract inventory");
  contains(page, "listContractReminderActivity(500)", "bounded reminder aggregate");
  contains(page, "new Map(reminderActivity.map", "in-memory reminder lookup");
  notContains(page, "listContractReminderActivity(contract.id", "no per-row reminder query");
});

test("tracking workbench exposes factual waiting, viewing and reminder evidence without inventing an SLA", () => {
  const page = source("src/app/sozlesme/takip/page.tsx");
  const lowerPage = page.toLocaleLowerCase("tr-TR");

  contains(page, "Bekleme", "waiting-age column");
  contains(page, "Görüntülenme", "view evidence column");
  contains(page, "Son hatırlatma", "reminder evidence column");
  contains(page, "Henüz açılmadı", "unopened factual state");
  contains(page, "Hatırlatma yapıldı", "reminder summary metric");
  contains(page, "waitingAge(contract.sentAt, contract.status, now)", "elapsed wait calculation");
  contains(page, "reminder.reminderCount", "reminder count display");
  notContains(lowerPage, "gecikti", "no invented overdue judgment");
  notContains(lowerPage, "gecikmiş", "no invented overdue judgment");
  notContains(lowerPage, "ihlal", "no invented breach judgment");
  notContains(page, "SLA", "no explicit SLA policy");
});

test("registration acceptances remain operationally separated from manual reminder activity", () => {
  const page = source("src/app/sozlesme/takip/page.tsx");
  const activity = source("src/features/contracts/tracking-activity.ts");

  contains(page, "MANDATORY_REGISTRATION_CONTRACT_CODE", "registration/manual split");
  contains(page, 'flow === "registration"', "registration filter");
  contains(activity, "template.code <> ?", "aggregate excludes registration template");
});
