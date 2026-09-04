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

test("Hakkımızda and the eight trust-role pages share one canonical CMS catalog", () => {
  const readiness = source("src/lib/cms-readiness.ts");
  const readinessPage = source("src/app/icerik/hazirlik/page.tsx");
  const pages = source("src/app/icerik/sayfalar/page.tsx");
  const catalog = source("src/lib/public-cms-page-catalog.ts");
  const starters = source("src/features/cms/starter-content-actions.ts");

  assertContains(readiness, "guides: 8", "eight trust-role CMS pages readiness target");
  assertContains(readiness, "total: 13", "Hakkımızda + eight public pages + four FAQs starter total");
  assertContains(readiness, "seo: 9", "Hakkımızda + eight public pages SEO target");
  assertContains(readinessPage, "Public Güven ve Rol Sayfaları", "readiness public page lane");
  assertContains(readinessPage, "Hakkımızda + 8 public sayfa", "readiness SEO coverage copy");
  assertContains(pages, "publicCmsPageCatalog", "CMS page manager consumes canonical catalog");
  assertContains(pages, "Hakkımızda dahil dokuz çekirdek public CMS sayfası", "CMS nine-page inventory copy");
  assertContains(pages, "expectedCorePages = publicCmsPageCatalog.length", "CMS inventory count follows catalog");

  for (const key of [
    "page:tr:hakkimizda",
    "page:tr:nasil-calisir",
    "page:tr:editoryal-standartlar",
    "page:tr:icerik-ve-yas-politikasi",
    "page:tr:topluluk-kurallari",
    "page:tr:telif-bildirimi",
    "page:tr:yazarlar-icin",
    "page:tr:editorler-icin",
    "page:tr:yayinevleri-icin",
  ]) {
    assertContains(catalog, key, `${key} canonical CMS page catalog`);
  }

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
  }
});

test("new CMS pages inherit the standard public template and cannot shadow code-owned public routes", () => {
  const editor = source("src/components/content/CmsPageEditor.tsx");
  const cmsPages = source("src/lib/cms-pages.ts");
  const seoRoutes = source("src/lib/public-seo-routes.ts");

  assertContains(editor, "isCorePublicCmsPage", "editor distinguishes core visual experiences from generic template pages");
  assertContains(editor, "İlkOku standart public sayfa şablonu aktif", "standard public template guidance");
  assertContains(editor, "ortak İlkOku header/footer yapısı", "shared public identity guidance");
  assertContains(editor, "slug tabanlı canonical", "automatic canonical guidance");
  assertContains(editor, "OG/Twitter sosyal görsel fallback", "automatic social metadata guidance");
  assertContains(editor, "/eserler, /yazarlar, /turler", "reserved public route guidance");

  assertContains(cmsPages, "publicCodeOwnedIndexRoutes", "CMS slug safety consumes code-owned public route inventory");
  assertContains(cmsPages, "codeOwnedPublicRoots", "CMS derives reserved roots from canonical public SEO catalog");
  assertContains(cmsPages, '"onizleme"', "preview namespace remains reserved");
  assertContains(cmsPages, '"opengraph-image"', "Open Graph metadata route remains reserved");
  assertContains(cmsPages, '"twitter-image"', "Twitter metadata route remains reserved");
  for (const route of ['"/eserler"', '"/yazarlar"', '"/turler"']) {
    assertContains(seoRoutes, route, `${route} code-owned SEO route`);
  }
});

test("CMS publication quality gate blocks weak public pages without discarding the draft", () => {
  const quality = source("src/lib/cms-page-quality.ts");
  const actions = source("src/features/cms/page-actions.ts");
  const editor = source("src/components/content/CmsPageEditor.tsx");
  const editorRoute = source("src/app/icerik/sayfalar/[id]/page.tsx");

  assertContains(quality, "MIN_SUMMARY_CHARACTERS = 40", "meaningful public summary threshold");
  assertContains(quality, "MIN_BODY_CHARACTERS = 250", "minimum public body character threshold");
  assertContains(quality, "MIN_BODY_WORDS = 45", "minimum public body word threshold");
  assertContains(quality, "MIN_SEO_DESCRIPTION_CHARACTERS = 70", "indexable description minimum");
  assertContains(quality, "MAX_SEO_DESCRIPTION_CHARACTERS = 180", "indexable description maximum");
  assertContains(quality, "if (!input.noIndex", "noindex pages do not inherit the search-description blocker");
  assertContains(quality, '/^\\/[a-z0-9]+(?:-[a-z0-9]+)*$/', "canonical path validation");

  assertContains(actions, "evaluateCmsPagePublishQuality", "server action consumes publication quality gate");
  assertContains(actions, 'const publishBlocked = requestedMode === "publish" && !publishQuality.ok;', "publish is blocked server-side");
  assertContains(actions, 'const mode = publishBlocked ? "draft" : requestedMode;', "blocked publication degrades safely to draft");
  assertContains(actions, 'publishBlocked ? "?hata=kalite" : "?taslak=1"', "published live page keeps a staged draft on quality failure");
  assertContains(actions, 'publishBlocked ? "?hata=kalite" : "?kayit=1"', "new or draft page preserves quality-failed work");

  assertContains(editor, "Yayın kalite kapısı geçilemedi.", "editor explains blocked publication");
  assertContains(editor, "Canlı sürüm değiştirilmedi; gönderdiğiniz çalışma taslak olarak korundu.", "editor promises fail-safe draft preservation");
  assertContains(editor, "Yayın kalite kapısı", "editor exposes readiness before publication");
  assertContains(editor, "OG/Twitter sosyal görseli", "system-provided social metadata remains explicit");
  assertContains(editorRoute, 'publishQualityBlocked={error === "kalite"}', "quality failure query reaches the editor");
});

test("CMS quality closure keeps fail-closed operational entry points visible", () => {
  const dashboard = source("src/app/icerik/page.tsx");
  const readiness = source("src/app/icerik/hazirlik/page.tsx");

  assertContains(dashboard, "OKUNAMADI", "dashboard fail-closed state");
  assertContains(dashboard, 'href="/icerik/saglik"', "dashboard health recovery route");
  assertContains(readiness, "İçerik hazırlık verileri okunamadı.", "readiness fail-closed state");
  assertContains(readiness, 'href="/icerik/saglik"', "readiness health recovery route");
});
