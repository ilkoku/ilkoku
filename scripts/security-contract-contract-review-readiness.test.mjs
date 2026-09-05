import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

const expectedCodes = [
  "LIB_GENERAL_NDA",
  "LIB_WRITER_PLATFORM_LICENSE",
  "LIB_WRITER_EDITOR_REVIEW",
  "LIB_EDITOR_REVIEW_ETHICS",
  "LIB_EDITOR_CANDIDATE_NDA",
  "LIB_PUBLISHER_DISCOVERY_NDA",
  "LIB_PUBLISHER_TEAM_CONFIDENTIALITY",
  "LIB_PUBLICATION_INTENT_WRITER",
  "LIB_PUBLICATION_INTENT_PUBLISHER",
];

const policyAlignmentMigrationPath =
  "prisma/migrations/20260905053500_contract_product_policy_text_alignment/migration.sql";
const policyAlignedCodes = [
  "LIB_GENERAL_NDA",
  "LIB_WRITER_EDITOR_REVIEW",
  "LIB_EDITOR_REVIEW_ETHICS",
  "LIB_EDITOR_CANDIDATE_NDA",
  "LIB_PUBLISHER_DISCOVERY_NDA",
  "LIB_PUBLISHER_TEAM_CONFIDENTIALITY",
  "LIB_PUBLICATION_INTENT_WRITER",
  "LIB_PUBLICATION_INTENT_PUBLISHER",
];

test("review readiness registry classifies every canonical LIB template and resolves owner decisions without activating anything", () => {
  const registry = source("src/features/contracts/review-readiness.ts");

  for (const code of expectedCodes) contains(registry, `code: "${code}"`, `readiness ${code}`);
  assert.equal(
    expectedCodes.reduce((count, code) => count + (registry.includes(`code: "${code}"`) ? 1 : 0), 0),
    9,
    "all nine canonical LIB templates must be classified",
  );
  contains(registry, "pendingOwnerDecisionItems", "explicit pending decision field");
  contains(registry, "sır niteliğini koruduğu sürece süresiz", "confidentiality policy");
  contains(registry, "ikinci editör değerlendirmesi tamamlandıktan sonra", "second-editor visibility policy");
  contains(registry, "ikinci editör incelemesi başlamadan önce geri çekebilir", "writer withdrawal policy");
  contains(registry, "yayınevi yönetici arşivinde", "publisher archive policy");
  contains(registry, "30 gündür", "no-shop policy");
  contains(registry, "60 gündür", "publication-intent validity policy");
  contains(registry, "şimdilik pasif kalır", "publication-intent passive policy");
  notContains(registry, 'reviewState: "product_decision"', "no unresolved product-decision state");
  notContains(registry, 'reviewState: "commercial_decision"', "no unresolved commercial-decision state");
  notContains(registry, "transitionContractTemplateLifecycle", "readiness registry must stay read-only");
  notContains(registry, "active: true", "readiness registry must not activate templates");
  notContains(registry, "approvedById", "readiness registry must not fabricate legal approval evidence");
});

test("review workbench shows recorded owner policy separately from legal evidence and keeps zero open decisions", () => {
  const page = source("src/app/sozlesme/inceleme/page.tsx");
  const navigation = source("src/features/contracts/ContractManagementNavigation.tsx");
  const layout = source("src/app/sozlesme/layout.tsx");

  contains(page, "Ürün sahibi kararları · kaydedildi", "resolved owner decision queue");
  contains(page, "pendingOwnerDecisionCount", "explicit open decision counter");
  contains(page, "Kararın çözülmüş olması hukuki onay anlamına gelmez", "product/legal separation");
  contains(page, "listContractTemplateWorkbenchRecords", "live template inventory");
  contains(page, "getContractReviewReadiness", "canonical readiness registry");
  notContains(page, "transitionContractTemplate", "review page must not mutate lifecycle");
  contains(navigation, 'href: "/sozlesme/inceleme"', "review workbench navigation entry");
  contains(layout, 'import "./review-readiness.css"', "review workbench styling");
});

test("system map includes review readiness and legal handoff while preserving intentional legal and human boundaries", () => {
  const map = source("src/app/harita/sozlesmeler/page.tsx");

  contains(map, '"/sozlesme/inceleme", "/sozlesme/hukuk-inceleme"', "review and legal handoff routes in contract map");
  contains(map, "gerçek hukukçu kontrolü", "legal approval remains external boundary");
  contains(map, "nihai yayın hakları sözleşmesi", "final publishing rights boundary");
  contains(map, "Final Release UAT #263", "human UAT boundary");
});

test("resolved owner decisions are applied to the eight affected managed template texts only", () => {
  const migration = source(policyAlignmentMigrationPath);

  for (const code of policyAlignedCodes) {
    contains(migration, `WHERE \`code\` = '${code}'`, `policy alignment ${code}`);
  }
  contains(
    migration,
    "LIB_WRITER_PLATFORM_LICENSE ürün kararlarından etkilenmediği için v1 olarak bırakılır",
    "unaffected platform-license boundary",
  );
  notContains(migration, "WHERE `code` = 'SOFT_", "soft source records must not be mutated");
  notContains(migration, "UPDATE `UserContract`", "immutable sent snapshots must not be updated");
  notContains(migration, "DELETE FROM `UserContract`", "immutable sent snapshots must not be deleted");

  contains(migration, "beş (5) yıl", "five-year ordinary confidentiality term");
  contains(migration, "sır niteliğini koruduğu sürece zaman sınırı olmaksızın", "indefinite protected-information term");
  contains(migration, "ikinci editör kendi bağımsız değerlendirmesini tamamlayana kadar", "independent second-editor visibility boundary");
  contains(migration, "ikinci editör bağımsız incelemeye başlamadan önce", "writer withdrawal boundary");
  contains(migration, "yetki kontrollü yönetici arşivinde bulunan kurumsal kopya", "publisher manager archive retention");
  contains(migration, "otuz (30) gün", "thirty-day no-shop term");
  contains(migration, "altmış (60) gün", "sixty-day intent validity");
  contains(migration, "resmi yayın niyetini sistemde kayıt altına alır", "publisher formal intent record");
  contains(migration, "aynı süre politikasını kullanır", "writer/publisher matching intent policy");

  assert.equal((migration.match(/`version` = 2/g) ?? []).length, policyAlignedCodes.length);
  assert.equal((migration.match(/`active` = false/g) ?? []).length, policyAlignedCodes.length);
  assert.equal((migration.match(/`lifecycleStatus` = 'draft'/g) ?? []).length, policyAlignedCodes.length);
  assert.equal((migration.match(/`approvedById` = NULL/g) ?? []).length, policyAlignedCodes.length);
  assert.equal((migration.match(/`approvedAt` = NULL/g) ?? []).length, policyAlignedCodes.length);
  assert.equal((migration.match(/`activatedAt` = NULL/g) ?? []).length, policyAlignedCodes.length);
  notContains(migration, "`active` = true", "policy alignment must never activate a template");
  notContains(migration, "`lifecycleStatus` = 'approved'", "policy alignment must never approve a template");
  notContains(migration, "`lifecycleStatus` = 'active'", "policy alignment must never activate lifecycle");
});

test("fresh recovery validates exact policy-aligned template state before build", () => {
  const validator = source("scripts/validate-contract-policy-text-alignment.mjs");
  const ci = source(".github/workflows/ci.yml");
  const map = source("src/app/harita/sozlesmeler/page.tsx");

  contains(validator, "LIB_GENERAL_NDA", "validator canonical template inventory");
  contains(validator, "LIB_PUBLICATION_INTENT_PUBLISHER", "validator publication-intent coverage");
  contains(validator, "expectedMarkers", "validator body marker checks");
  contains(validator, "Number(row.version) !== expected.version", "validator version check");
  contains(validator, "row.lifecycleStatus !== expected.lifecycleStatus", "validator lifecycle check");
  contains(validator, "active !== expected.active", "validator active-state check");
  contains(ci, "Validate contract policy text on recovered database", "post-recovery CI validation step");
  contains(ci, "node scripts/validate-contract-policy-text-alignment.mjs", "post-recovery validator command");

  contains(map, "Ürün kararlarının çalışma metinlerine yansıtılması", "contract map policy alignment stage");
  contains(map, "20260905053500_contract_product_policy_text_alignment", "migration evidence in map");
  contains(map, "8 etkilenen LIB şablonu", "affected-template count in map");
  contains(map, "aynı templateVersion", "legal review exact-version boundary retained");
});