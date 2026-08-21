import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("contract center uses one persistent admin-only navigation shell", () => {
  const layout = source("src/app/sozlesme/layout.tsx");
  const navigation = source("src/features/contracts/ContractManagementNavigation.tsx");

  contains(layout, "ContractManagementNavigation", "contract layout navigation");
  contains(layout, 'user.role !== "admin"', "contract admin guard");
  contains(layout, "contract-management-shell", "contract shell");
  contains(navigation, 'href: "/sozlesme/taslaklar"', "soft draft navigation");
  contains(navigation, 'href: "/sozlesme/sablonlar"', "template library navigation");
  contains(navigation, 'href: "/harita"', "system map navigation");
  contains(navigation, "Hukuki inceleme tamamlanmadan", "draft activation warning");
});

test("soft draft workbench is read-first and keeps drafts out of sendable templates by default", () => {
  const page = source("src/app/sozlesme/taslaklar/page.tsx");
  const catalog = source("src/features/contracts/soft-draft-catalog.ts");
  const migration = source("prisma/migrations/20260821113000_contract_soft_draft_library/migration.sql");

  contains(page, "listContractTemplates({ includeInactive: true })", "draft workbench reads inactive templates");
  contains(page, "nihai hukuki görüş veya imzaya hazır sözleşme değildir", "soft draft legal boundary");
  contains(page, "royalty", "missing commercial terms warning");
  contains(catalog, "SOFT_WRITER_PLATFORM_LICENSE", "writer platform draft catalog");
  contains(catalog, "SOFT_EDITOR_REVIEW_ETHICS", "editor ethics draft catalog");
  contains(catalog, "SOFT_PUBLISHER_DISCOVERY_NDA", "publisher discovery draft catalog");
  contains(catalog, "SOFT_PUBLICATION_INTENT_WRITER", "writer publication intent draft catalog");
  contains(catalog, "SOFT_PUBLICATION_INTENT_PUBLISHER", "publisher publication intent draft catalog");

  const codes = [
    "SOFT_GENERAL_NDA",
    "SOFT_WRITER_PLATFORM_LICENSE",
    "SOFT_WRITER_EDITOR_REVIEW",
    "SOFT_EDITOR_REVIEW_ETHICS",
    "SOFT_EDITOR_CANDIDATE_NDA",
    "SOFT_PUBLISHER_DISCOVERY_NDA",
    "SOFT_PUBLISHER_TEAM_CONFIDENTIALITY",
    "SOFT_PUBLICATION_INTENT_WRITER",
    "SOFT_PUBLICATION_INTENT_PUBLISHER",
  ];
  for (const code of codes) contains(migration, `'${code}'`, `seeded ${code}`);
  assert.equal(migration.split("CURRENT_TIMESTAMP(3)\n  );").length - 1, 9, "migration must seed exactly nine soft drafts");
  assert.ok(migration.split("    false,").length - 1 >= 9, "all seeded soft drafts must start inactive");
  notContains(migration, "UPDATE `ContractTemplate`", "soft draft migration must not overwrite existing templates");
});

test("contract soft drafts do not pretend to be final publishing-rights agreements", () => {
  const migration = source("prisma/migrations/20260821113000_contract_soft_draft_library/migration.sql");
  const publisherCenter = source("src/features/publisher-workspace/components/PublisherContractCenter.tsx");

  contains(migration, "BAĞLAYICI NİHAİ YAYIN SÖZLEŞMESİ DEĞİLDİR", "publication intent boundary");
  contains(migration, "nitelikli elektronik imza", "e-signature accuracy boundary");
  contains(publisherCenter, "Yeni sözleşme oluşturma ve kullanıcıya gönderme yetkisi", "central contract authority");
  notContains(publisherCenter, "saveSecurePublisherContractAction", "publisher direct contract send path remains retired");
});

test("contract center navigation and soft draft routes exist", () => {
  for (const relativePath of [
    "src/app/sozlesme/taslaklar/page.tsx",
    "src/app/sozlesme/sablonlar/page.tsx",
    "src/app/sozlesme/navigation.css",
    "src/features/contracts/ContractManagementNavigation.tsx",
    "src/features/contracts/soft-draft-catalog.ts",
    "prisma/migrations/20260821113000_contract_soft_draft_library/migration.sql",
  ]) {
    assert.ok(existsSync(join(ROOT, relativePath)), `${relativePath} must exist`);
  }
});
