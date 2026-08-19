import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function contains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function notContains(text, fragment, label) {
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("system map and central contract routes are private at request, server and crawler layers", () => {
  const policy = source("src/lib/route-security.ts");
  const proxy = source("src/proxy.ts");
  const nextConfig = source("next.config.ts");
  const robots = source("src/app/robots.ts");
  const mapLayout = source("src/app/harita/layout.tsx");
  const contractLayout = source("src/app/sozlesme/layout.tsx");
  const inboxLayout = source("src/app/sozlesmelerim/layout.tsx");

  for (const route of ["/harita", "/sozlesme"]) {
    contains(policy, route, "central route policy");
    contains(nextConfig, route, "private response headers");
    contains(robots, route, "robots private route policy");
  }
  contains(policy, 'contractInboxPath = "/sozlesmelerim"', "contract inbox policy");
  contains(proxy, "isAdminOnlyPath(pathname)", "proxy admin enforcement");
  contains(proxy, "isProtectedPath(pathname)", "proxy protected route enforcement");
  contains(mapLayout, 'user.role !== "admin"', "map server guard");
  contains(contractLayout, 'user.role !== "admin"', "contract server guard");
  contains(inboxLayout, "getCurrentUser()", "inbox authentication guard");
  contains(mapLayout, "index: false", "map noindex metadata");
  contains(contractLayout, "index: false", "contract noindex metadata");
});

test("system map is generated from live application sources with build fallback and shared security policy", () => {
  const collector = source("src/features/system-map/collector.ts");
  const page = source("src/app/harita/page.tsx");
  const workbench = source("src/features/system-map/SystemMapWorkbench.tsx");

  contains(collector, 'path.join(ROOT, "src", "app")', "source route scan");
  contains(collector, "app-paths-manifest.json", "build route fallback");
  contains(collector, 'from "@/lib/route-security"', "shared route security policy");
  contains(collector, "editorNavigationContent", "role menu inventory");
  contains(collector, "adminNavigation", "admin menu inventory");
  contains(collector, "inbound", "inbound link inventory");
  contains(collector, "outbound", "outbound link inventory");
  contains(collector, "orphanCandidate", "orphan route detection");
  contains(page, "getSystemMapSnapshot", "map live snapshot");
  contains(workbench, "Bu sayfaya nasıl gelinir?", "inbound workbench detail");
  contains(workbench, "Buradan nereye gidilir?", "outbound workbench detail");
});

test("central contract migration stores templates, immutable snapshots and append-only events", () => {
  const migration = source("prisma/migrations/20260820004500_admin_contract_management/migration.sql");

  for (const table of ["ContractTemplate", "UserContract", "UserContractEvent"]) {
    contains(migration, `CREATE TABLE \`${table}\``, "contract migration");
  }
  contains(migration, "titleSnapshot", "immutable contract title snapshot");
  contains(migration, "bodySnapshot", "immutable contract body snapshot");
  contains(migration, "templateVersion", "template version snapshot");
  contains(migration, "activeKey", "active duplicate guard");
  contains(migration, "UserContract_recipientUserId_fkey", "recipient foreign key");
  contains(migration, "UserContractEvent_contractId_fkey", "event foreign key");
  assert.ok(
    migration.split("INSERT INTO `ContractTemplate`").length - 1 >= 1,
    "migration must seed contract examples",
  );
  for (const role of ["writer", "editor", "publisher", "reader", "any"]) {
    contains(migration, `'${role}'`, `seeded ${role} template`);
  }
});

test("central contract writes re-authorize and lock live database state", () => {
  const repository = source("src/features/contracts/repository.ts");
  const actions = source("src/features/contracts/actions.ts");

  contains(repository, "prisma.$transaction", "contract repository transaction");
  assert.ok(
    repository.split("FOR UPDATE").length - 1 >= 5,
    "contract writes must lock admin, recipient, template, contract and duplicate state",
  );
  contains(repository, 'actor.role === "admin"', "database-level admin authorization");
  contains(repository, "contract.recipientUserId !== recipient.id", "recipient ownership authorization");
  contains(repository, "templateRole !== recipient.role", "template role validation");
  contains(repository, "activeKey", "active duplicate validation");
  contains(repository, "bodySnapshot", "immutable sent body");
  contains(repository, "UserContractEvent", "contract event audit");
  contains(repository, "notification.create", "contract notifications");
  contains(actions, "requireAdmin()", "admin server action authorization");
  contains(actions, "recipientUserId: user.id", "recipient action authorization");
});

test("all role menus expose one shared contract inbox while admin uses the central workbench", () => {
  const navigation = source("src/content/navigation.ts");
  const adminNavigation = source("src/lib/admin-navigation.ts");

  assert.ok(
    navigation.split('{ label: "Sözleşme Yönetimi", href: "/sozlesmelerim" }').length - 1 >= 2,
    "writer and reader menus must expose contract inbox",
  );
  assert.ok(
    navigation.split('{ type: "item", label: "Sözleşme Yönetimi", href: "/sozlesmelerim" }').length - 1 >= 2,
    "editor and publisher menus must expose contract inbox",
  );
  contains(adminNavigation, '{ href: "/sozlesme", label: "Sözleşme Yönetimi"', "admin contract center nav");
  contains(adminNavigation, '{ href: "/harita", label: "Sistem Haritası"', "admin system map nav");
});

test("user contract inbox is owner-scoped and does not become an electronic-signature claim", () => {
  const listPage = source("src/app/sozlesmelerim/page.tsx");
  const detailPage = source("src/app/sozlesmelerim/[contractId]/page.tsx");

  contains(listPage, "ignoreAdminRoleView: true", "actual-user contract inbox");
  contains(listPage, "listUserContracts(profile.id)", "owner-scoped contract list");
  contains(detailPage, "getUserContract(contractId, profile.id)", "owner-scoped contract detail");
  contains(detailPage, "markUserContractViewed", "view event");
  contains(detailPage, "respondToContractAction", "contract response action");
  contains(detailPage, "nitelikli elektronik imza işlemi değildir", "signature accuracy notice");
});

test("publisher contract send path is retired in favor of admin central management while publication planning remains", () => {
  const component = source("src/features/publisher-workspace/components/PublisherContractCenter.tsx");
  const actions = source("src/features/publisher-contracts/actions.ts");

  notContains(component, "saveSecurePublisherContractAction", "publisher contract UI");
  contains(component, "saveSecurePublicationPlanAction", "publisher publication plan UI");
  contains(component, "Yeni sözleşme oluşturma ve kullanıcıya gönderme yetkisi", "publisher centralization notice");
  contains(actions, "Yeni sözleşmeler yalnız İlkOku merkezi Sözleşme Yönetimi", "legacy publisher write guard");
  notContains(actions, "savePublisherContractLifecycle", "retired publisher contract write path");
});

test("required system map and contract workbench files exist", () => {
  for (const relativePath of [
    "src/app/harita/page.tsx",
    "src/app/sozlesme/page.tsx",
    "src/app/sozlesmelerim/page.tsx",
    "src/features/system-map/collector.ts",
    "src/features/contracts/repository.ts",
  ]) {
    assert.ok(existsSync(join(ROOT, relativePath)), `${relativePath} must exist`);
  }
});
