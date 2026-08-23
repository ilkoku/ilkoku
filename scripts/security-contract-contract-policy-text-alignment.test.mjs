import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

const migrationPath = "prisma/migrations/20260824013500_contract_product_policy_text_alignment/migration.sql";
const affectedCodes = [
  "LIB_GENERAL_NDA",
  "LIB_WRITER_EDITOR_REVIEW",
  "LIB_EDITOR_REVIEW_ETHICS",
  "LIB_EDITOR_CANDIDATE_NDA",
  "LIB_PUBLISHER_DISCOVERY_NDA",
  "LIB_PUBLISHER_TEAM_CONFIDENTIALITY",
  "LIB_PUBLICATION_INTENT_WRITER",
  "LIB_PUBLICATION_INTENT_PUBLISHER",
];

test("resolved product decisions are applied to the eight affected managed templates only", () => {
  const migration = source(migrationPath);
  for (const code of affectedCodes) contains(migration, `WHERE \`code\` = '${code}'`, `policy alignment ${code}`);
  contains(migration, "LIB_WRITER_PLATFORM_LICENSE ürün kararlarından etkilenmediği için v1 olarak bırakılır", "unaffected platform-license boundary");
  notContains(migration, "WHERE `code` = 'SOFT_", "soft source records must not be mutated");
  notContains(migration, "UPDATE `UserContract`", "immutable sent snapshots must not be updated");
  notContains(migration, "DELETE FROM `UserContract`", "immutable sent snapshots must not be deleted");
});

test("confidentiality, editor flow, offboarding and publication-intent decisions are explicit in working text", () => {
  const migration = source(migrationPath);
  contains(migration, "beş (5) yıl", "five-year ordinary confidentiality term");
  contains(migration, "sır niteliğini koruduğu sürece zaman sınırı olmaksızın", "indefinite secret/unpublished/security confidentiality");
  contains(migration, "ikinci editör kendi bağımsız değerlendirmesini tamamlayana kadar", "independent second-editor visibility boundary");
  contains(migration, "ikinci editör bağımsız incelemeye başlamadan önce", "writer withdrawal boundary");
  contains(migration, "yetki kontrollü yayınevi yönetici arşivindeki kurumsal kopya", "publisher manager archive retention");
  contains(migration, "otuz (30) gün", "thirty-day no-shop term");
  contains(migration, "altmış (60) gün", "sixty-day intent validity");
  contains(migration, "resmi yayın niyetini sistemde kayıt altına alır", "publisher formal intent record");
  contains(migration, "aynı süre politikasını kullanır", "writer/publisher matching intent policy");
});

test("policy-aligned templates remain passive draft and invalidate prior approval state", () => {
  const migration = source(migrationPath);
  assert.equal((migration.match(/`version` = 2/g) ?? []).length, affectedCodes.length, "all eight affected templates must move to v2");
  assert.equal((migration.match(/`active` = false/g) ?? []).length, affectedCodes.length, "all eight affected templates must remain inactive");
  assert.equal((migration.match(/`lifecycleStatus` = 'draft'/g) ?? []).length, affectedCodes.length, "all eight affected templates must return/stay draft");
  assert.equal((migration.match(/`approvedById` = NULL/g) ?? []).length, affectedCodes.length, "prior approver must be cleared");
  assert.equal((migration.match(/`approvedAt` = NULL/g) ?? []).length, affectedCodes.length, "prior approval timestamp must be cleared");
  assert.equal((migration.match(/`activatedAt` = NULL/g) ?? []).length, affectedCodes.length, "prior activation timestamp must be cleared");
  notContains(migration, "`active` = true", "policy alignment must never activate a template");
  notContains(migration, "`lifecycleStatus` = 'approved'", "policy alignment must never approve a template");
  notContains(migration, "`lifecycleStatus` = 'active'", "policy alignment must never activate lifecycle");
});

test("system map records exact text alignment before version-bound legal review", () => {
  const map = source("src/app/harita/sozlesmeler/page.tsx");
  contains(map, "Ürün kararlarının çalışma metinlerine yansıtılması", "contract map policy alignment stage");
  contains(map, "20260824013500_contract_product_policy_text_alignment", "migration evidence in map");
  contains(map, "8 etkilenen LIB şablonu", "affected-template count in map");
  contains(map, "aynı templateVersion", "legal review exact-version boundary retained");
});
