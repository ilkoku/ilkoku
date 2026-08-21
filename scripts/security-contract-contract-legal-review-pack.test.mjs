import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("legal review packet is admin-scoped, read-only and backed by live template inventory", () => {
  const page = source("src/app/sozlesme/hukuk-inceleme/page.tsx");
  const navigation = source("src/features/contracts/ContractManagementNavigation.tsx");

  contains(page, "listContractTemplateWorkbenchRecords", "live template inventory");
  contains(page, 'record.code.startsWith("LIB_")', "canonical LIB scope");
  contains(page, "getContractReviewReadiness", "review readiness notes");
  contains(page, "template.body", "full working text included");
  contains(page, "Hukuki onay veya elektronik imza iddiası değildir", "legal boundary notice");
  notContains(page, "transitionContractTemplateLifecycle", "legal packet must not mutate lifecycle");
  notContains(page, "updateManagedContractTemplate", "legal packet must not edit templates");
  contains(navigation, 'href: "/sozlesme/hukuk-inceleme"', "legal packet navigation entry");
});

test("legal review packet is printable without weakening the admin-only contract shell", () => {
  const button = source("src/features/contracts/ContractLegalReviewPrintButton.tsx");
  const styles = source("src/app/sozlesme/review-readiness.css");
  const layout = source("src/app/sozlesme/layout.tsx");

  contains(button, '"use client"', "print control client boundary");
  contains(button, "window.print()", "browser print action");
  contains(styles, "@media print", "print stylesheet");
  contains(styles, ".contract-management-sidebar", "sidebar hidden only in print CSS");
  contains(layout, 'user.role !== "admin"', "admin server guard remains canonical");
});

test("system map records the legal review handoff while keeping real legal approval and Human UAT external", () => {
  const map = source("src/app/harita/sozlesmeler/page.tsx");

  contains(map, '"/sozlesme/inceleme", "/sozlesme/hukuk-inceleme"', "review handoff routes");
  contains(map, "yazdırılabilir/PDF teslim edilebilir", "lawyer handoff evidence");
  contains(map, "gerçek hukukçu kontrolü", "real legal review remains external");
  contains(map, "Final Release UAT #263", "human UAT remains external");
});
