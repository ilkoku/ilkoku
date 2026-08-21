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

test("review readiness registry classifies every canonical LIB template without activating anything", () => {
  const registry = source("src/features/contracts/review-readiness.ts");

  for (const code of expectedCodes) contains(registry, `code: "${code}"`, `readiness ${code}`);
  assert.equal(
    expectedCodes.reduce((count, code) => count + (registry.includes(`code: "${code}"`) ? 1 : 0), 0),
    9,
    "all nine canonical LIB templates must be classified",
  );
  contains(registry, 'reviewState: "legal_review"', "legal review state");
  contains(registry, 'reviewState: "product_decision"', "product decision state");
  contains(registry, 'reviewState: "commercial_decision"', "commercial decision state");
  notContains(registry, "transitionContractTemplateLifecycle", "readiness registry must stay read-only");
  notContains(registry, "active: true", "readiness registry must not activate templates");
  notContains(registry, "approvedById", "readiness registry must not fabricate legal approval evidence");
});

test("review workbench separates owner decisions from legal review and keeps them non-blocking for engineering", () => {
  const page = source("src/app/sozlesme/inceleme/page.tsx");
  const navigation = source("src/features/contracts/ContractManagementNavigation.tsx");
  const layout = source("src/app/sozlesme/layout.tsx");

  contains(page, "Ürün sahibinden karar bekleyen maddeler", "separate owner decision queue");
  contains(page, "teknik geliştirmeyi durdurmaz", "owner decisions are non-blocking for engineering");
  contains(page, "listContractTemplateWorkbenchRecords", "live template inventory");
  contains(page, "getContractReviewReadiness", "canonical readiness registry");
  notContains(page, "transitionContractTemplate", "review page must not mutate lifecycle");
  notContains(page, "activate", "review page must not expose automatic activation action");
  contains(navigation, 'href: "/sozlesme/inceleme"', "review workbench navigation entry");
  contains(layout, 'import "./review-readiness.css"', "review workbench styling");
});

test("system map includes the contract review workbench and preserves intentional legal and human boundaries", () => {
  const map = source("src/app/harita/sozlesmeler/page.tsx");

  contains(map, 'routes: ["/sozlesme/inceleme"]', "review workbench route in contract map");
  contains(map, "hukuki inceleme, ürün kararı ve ticari model", "review categories in map");
  contains(map, "gerçek hukukçu kontrolü", "legal approval remains external boundary");
  contains(map, "nihai yayın hakları sözleşmesi", "final publishing rights boundary");
  contains(map, "Final Release UAT #263", "human UAT boundary");
});
