import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function assertNotContains(text, fragment, label) {
  assert.equal(text.includes(fragment), false, `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("SEO center is a server-side issue workbench and keeps canonical editors as the write source", () => {
  const page = source("src/app/icerik/seo/page.tsx");

  assertContains(page, 'requireCmsManager("/icerik/seo")', "SEO manager boundary");
  assertContains(page, "loadSeoPages()", "SEO server-side inventory read");
  assertContains(page, "const selected = filtered.find", "SEO master-detail selection");
  assertContains(page, "criticalIssueCount", "SEO issue prioritization");
  assertContains(page, "SEO Alanlarını Düzenle", "SEO deep link to canonical editor");
  assertContains(page, "İkinci bir kopya", "SEO single-source guidance");
  assertNotContains(page, "saveSeo", "SEO must not create a second write action");
  assertNotContains(page, 'fetch("/api/cms-seo-audit"', "SEO no longer depends on client audit fetch");
});

test("redirect workbench exposes graph diagnostics while retaining admin/cycle/path protections", () => {
  const page = source("src/app/icerik/yonlendirmeler/page.tsx");
  const actions = source("src/features/cms/redirect-actions.ts");

  assertContains(page, 'requireCmsAdmin("/icerik/yonlendirmeler")', "redirect admin boundary");
  assertContains(page, "chainFor", "redirect chain diagnostics");
  assertContains(page, "activeMap", "redirect active graph map");
  assertContains(page, "Hedefi güncelle", "redirect selected-rule update workbench");
  assertContains(page, "invalidActive > 0", "redirect corrupt-active fail-closed UI");
  assertContains(page, "saveCmsRedirectAction", "redirect canonical mutation retained");
  assertContains(actions, "normalizeCmsRedirectPath", "redirect path normalization retained");
  assertContains(actions, "createsCmsRedirectCycle", "redirect cycle protection retained");
  assertContains(actions, 'requireCmsAdmin("/icerik/yonlendirmeler")', "redirect mutation admin boundary");
});

test("locale workbench compares TR and EN including role cards without changing locale authority rules", () => {
  const page = source("src/app/icerik/diller/page.tsx");
  const actions = source("src/features/cms/locale-actions.ts");

  assertContains(page, 'requireCmsAdmin("/icerik/diller")', "locale admin boundary");
  assertContains(page, 'cmsLocaleNamespace("role_cards", locale)', "role card locale coverage");
  assertContains(page, "localeCoverage(\"tr\")", "TR coverage baseline");
  assertContains(page, "localeCoverage(\"en\")", "EN coverage inventory");
  assertContains(page, "Kapsam yüzdesi eşleştirme değildir", "locale coverage inference disclaimer");
  assertContains(page, "updateCmsLocaleAction", "canonical locale toggle retained");
  assertContains(actions, 'requireCmsAdmin("/icerik/diller")', "locale mutation admin boundary");
  assertContains(actions, 'if (locale === "tr") return', "TR cannot be disabled");
  assertContains(actions, "normalizeCmsLocale", "locale normalization retained");
});

test("growth workbenches share operational master-detail language", () => {
  const seo = source("src/app/icerik/seo/page.tsx");
  const redirects = source("src/app/icerik/yonlendirmeler/page.tsx");
  const locales = source("src/app/icerik/diller/page.tsx");

  for (const [label, page] of [["SEO", seo], ["redirect", redirects], ["locale", locales]]) {
    assertContains(page, "PublishingOperationsWorkbench.module.css", `${label} shared workbench layout`);
    assertContains(page, "GrowthOperationsWorkbench.module.css", `${label} growth-specific workbench styling`);
    assertContains(page, "ops.layout", `${label} master-detail layout`);
    assertContains(page, "ops.rail", `${label} selection rail`);
    assertContains(page, "ops.detail", `${label} selected detail pane`);
    assertContains(page, "ops.sidePane", `${label} operational side pane`);
  }
});
