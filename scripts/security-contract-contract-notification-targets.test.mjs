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

test("contract notification targets require database ownership instead of trusting notification ids", () => {
  const helper = source("src/features/notifications/contract-targets.ts");

  contains(helper, "recipientUserId = ${input.userId}", "recipient ownership query");
  contains(helper, "id IN (${Prisma.join(contractIds)})", "bounded target id query");
  contains(helper, "slice(0, 100)", "bounded contract target set");
  contains(helper, "`/sozlesmelerim/${encodeURIComponent(contract.id)}`", "owner contract route");
  notContains(helper, "`/sozlesmelerim/${encodeURIComponent(input", "unverified input id must not become a link");
});

test("admin contract notification targets require live admin authority and sentBy ownership", () => {
  const helper = source("src/features/notifications/contract-targets.ts");

  contains(helper, "input.scope !== \"admin\"", "admin-specific branch");
  contains(helper, "role = 'admin'", "live admin role check");
  contains(helper, "status = 'active'", "live admin status check");
  contains(helper, "isBanned = 0", "admin ban check");
  contains(helper, "deletedAt IS NULL", "admin deletion check");
  contains(helper, "sentById = ${input.userId}", "sender ownership query");
  contains(helper, "`/sozlesme/${encodeURIComponent(contract.id)}`", "admin contract route");
});

test("central notification resolver recognizes user_contract for every role scope", () => {
  const targets = source("src/features/notifications/targets.ts");
  const actions = source("src/features/notifications/actions.ts");

  contains(targets, '| "admin"', "admin target scope");
  contains(targets, 'uniqueEntityIds(\n    input.notifications,\n    "user_contract"', "contract notification ids");
  contains(targets, "resolveContractNotificationHrefs({", "canonical contract target authorization");
  contains(targets, 'entityType === "user_contract"', "contract target mapping");
  contains(actions, 'user.role === "admin"', "admin action scope");
  contains(actions, 'user.role === "publisher"', "publisher action scope preservation");
  contains(actions, 'user.role === "editor"', "editor action scope preservation");
});

test("admin contract notification inbox is admin-only, owner-scoped and uses canonical resolver", () => {
  const page = source("src/app/sozlesme/bildirimler/page.tsx");
  const layout = source("src/app/sozlesme/layout.tsx");
  const navigation = source("src/features/contracts/ContractManagementNavigation.tsx");

  contains(layout, 'user.role !== "admin"', "contract layout admin gate");
  contains(page, 'admin.role !== "admin"', "page defense-in-depth admin gate");
  contains(page, 'relatedEntityType: "user_contract"', "contract-only notification filter");
  contains(page, "userId: admin.id", "admin-owned notification filter");
  contains(page, 'scope: "admin"', "admin target resolver scope");
  contains(page, 'returnPath="/sozlesme/bildirimler"', "safe admin return path");
  contains(navigation, 'href: "/sozlesme/bildirimler"', "persistent contract notification navigation");
});

test("notification read/open actions explicitly support the contract admin return path", () => {
  const actions = source("src/features/notifications/actions.ts");
  const item = source("src/features/notifications/components/NotificationListItem.tsx");

  contains(actions, '"/sozlesme/bildirimler"', "server return-path allowlist");
  contains(actions, 'revalidatePath("/sozlesme/bildirimler")', "admin inbox revalidation");
  contains(item, '| "/sozlesme/bildirimler"', "client return-path type");
  contains(actions, "id: notificationId,\n      userId: user.id", "notification ownership check");
});
