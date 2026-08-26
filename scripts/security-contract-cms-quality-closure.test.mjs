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

test("every active CMS module has an explicit operations mode", () => {
  const modules = source("src/lib/cms-modules.ts");
  const activeRows = modules.split("\n").filter((line) => line.includes('enabled: true'));

  assert.equal(activeRows.length, 21, "CMS active module inventory must remain explicit");
  for (const row of activeRows) {
    assert.match(row, /mode: "(controlled-write|read-only-audit|admin-control)"/, `missing CMS mode: ${row.trim()}`);
  }

  const adminRows = activeRows.filter((line) => line.includes("adminOnly: true"));
  for (const row of adminRows) {
    assertContains(row, 'mode: "admin-control"', "admin-only CMS module classification");
  }

  assertContains(modules, 'export type CmsModuleMode = "controlled-write" | "read-only-audit" | "admin-control";', "CMS operation mode type");
  assertContains(modules, 'href: "/icerik/seo"', "SEO inventory");
  assertContains(modules, 'mode: "read-only-audit"', "read-only audit inventory mode");
});

test("CMS operational copy does not expose historical sprint labels", () => {
  const dashboard = source("src/app/icerik/page.tsx");
  const readiness = source("src/app/icerik/hazirlik/page.tsx");
  const modules = source("src/lib/cms-modules.ts");

  for (const [label, text] of [["dashboard", dashboard], ["readiness", readiness], ["module catalog", modules]]) {
    assertNotContains(text, "Sprint 3", `${label} historical sprint label`);
  }

  assertContains(readiness, "CMS · Canlı İçerik", "current readiness heading");
  assertContains(readiness, "CMS Yayın Akışı", "current readiness flow language");
  assertContains(modules, "CMS canlı içerik hazırlığı ve kabul kontrolü", "current readiness module description");
});

test("public trust and role pages are one CMS readiness inventory", () => {
  const readiness = source("src/lib/cms-readiness.ts");
  const readinessPage = source("src/app/icerik/hazirlik/page.tsx");
  const pages = source("src/app/icerik/sayfalar/page.tsx");
  const starters = source("src/features/cms/starter-content-actions.ts");

  assertContains(readiness, "guides: 8", "eight public CMS pages readiness target");
  assertContains(readiness, "total: 13", "Hakkımızda + eight public pages + four FAQs starter total");
  assertContains(readiness, "seo: 9", "Hakkımızda + eight public pages SEO target");
  assertContains(readinessPage, "Public Güven ve Rol Sayfaları", "readiness public page lane");
  assertContains(readinessPage, "Hakkımızda + 8 public sayfa", "readiness SEO coverage copy");
  assertContains(pages, "Yeni public sayfaların CMS ve SEO kapsamı", "CMS public page inventory panel");

  for (const key of [
    "page:tr:nasil-calisir",
    "page:tr:editoryal-standartlar",
    "page:tr:icerik-ve-yas-politikasi",
    "page:tr:topluluk-kurallari",
    "page:tr:telif-bildirimi",
    "page:tr:yazarlar-icin",
    "page:tr:editorler-icin",
    "page:tr:yayinevleri-icin",
  ]) {
    assertContains(readiness, key, `${key} readiness inventory`);
    assertContains(starters, key, `${key} starter seed`);
    assertContains(pages, key, `${key} CMS management inventory`);
  }
});

test("CMS quality closure keeps fail-closed operational entry points visible", () => {
  const dashboard = source("src/app/icerik/page.tsx");
  const readiness = source("src/app/icerik/hazirlik/page.tsx");

  assertContains(dashboard, "OKUNAMADI", "dashboard fail-closed state");
  assertContains(dashboard, 'href="/icerik/saglik"', "dashboard health recovery route");
  assertContains(readiness, "İçerik hazırlık verileri okunamadı.", "readiness fail-closed state");
  assertContains(readiness, 'href="/icerik/saglik"', "readiness health recovery route");
});
