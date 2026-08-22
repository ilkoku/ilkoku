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
