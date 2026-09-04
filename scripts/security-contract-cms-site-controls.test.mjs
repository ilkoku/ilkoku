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

test("footer workbench blocks unsafe, broken and duplicate targets before publish", () => {
  const validation = source("src/lib/cms-footer-validation.ts");
  const actions = source("src/features/cms/navigation-actions.ts");
  const page = source("src/app/icerik/menuler/page.tsx");

  assertContains(validation, "safeCmsInternalHref(rawHref)", "footer safe internal href boundary");
  assertContains(validation, "landingAnchors.has(safeHref)", "footer anchor validation");
  assertContains(validation, "contentPaths.has(pathname)", "footer published CMS route validation");
  assertContains(validation, 'status: "duplicate"', "footer duplicate target diagnostic");
  assertContains(validation, 'status: "broken"', "footer broken target diagnostic");
  assertContains(validation, 'status: "fallback"', "footer intentional fallback state");

  assertContains(actions, 'requireCmsAdmin("/icerik/menuler")', "footer admin-only boundary");
  assertContains(actions, "analyzeFooterNavigation(payload)", "footer publish diagnostics");
  assertContains(actions, "diagnostics.blocking.length > 0", "footer fail-closed publish blocker");
  assertContains(actions, 'redirect("/icerik/menuler?hata=linkler")', "footer blocker redirect");

  assertContains(page, "Hedef denetimi", "footer workbench diagnostics surface");
  assertContains(page, "const canPublish = hasSafeDraft && Boolean(linkAnalysis) && blockers === 0", "footer UI publish readiness");
});

test("media library is a focused operations workbench and exposes real references without leaking form PII", () => {
  const references = source("src/lib/cms-media-references.ts");
  const page = source("src/app/icerik/medya/page.tsx");
  const workbench = source("src/components/content/MediaLibraryWorkbench.tsx");

  assertContains(references, "namespace NOT IN ('media', 'media_blob', 'form_submission', 'cms_draft')", "media reference PII exclusion");
  assertContains(references, "ContentPage", "media published page reference scan");
  assertContains(references, "row.valueJson.includes(url)", "media SiteContent reference detection");
  assertContains(references, "row.bodyJson.includes(url)", "media ContentPage reference detection");

  assertContains(page, "getCmsMediaReferenceMap", "media reference inventory load");
  assertContains(page, "Medya kullanım haritası doğrulanamadı", "media reference fail-closed warning");
  assertContains(page, "MediaLibraryWorkbench", "media dedicated workbench handoff");
  assertNotContains(page, "repeat(auto-fit, minmax(280px, 1fr))", "legacy media card grid removed");

  assertContains(workbench, "Medya envanteri", "media inventory rail");
  assertContains(workbench, "Seçili medya", "media focused detail pane");
  assertContains(workbench, "Gerçek kullanım", "media reference side pane");
  assertContains(workbench, 'name="q"', "media search control");
  assertContains(workbench, 'name="tur"', "media kind filter");
  assertContains(workbench, 'name="kullanim"', "media usage filter");
  assertContains(workbench, "reference.editHref", "media reference deep link");
  assertContains(workbench, 'mode === "new"', "media explicit new-media mode");
  assertContains(workbench, "+ Yeni Medya", "media new mode control");
  assertContains(workbench, "canPublish && referencesAvailable && selected.references.length === 0", "media UI archive safety boundary");
  assertContains(workbench, "archiveMediaAssetAction", "media canonical archive action retained");
});

test("media archive still re-checks published references server-side", () => {
  const actions = source("src/features/cms/media-actions.ts");

  assertContains(actions, 'requireCmsPublisher("/icerik/medya")', "media publish permission boundary");
  assertContains(actions, "isMediaReferencedByPublishedContent(asset.url)", "media server-side reference recheck");
  assertContains(actions, 'redirect("/icerik/medya?hata=kullanimda")', "media referenced archive blocker");
  assertContains(actions, "prisma.$transaction", "media metadata/blob archive transaction boundary");
});

test("SEO center is a server-side issue workbench and keeps canonical editors as the write source", () => {
  const page = source("src/app/icerik/seo/page.tsx");

  assertContains(page, 'requireCmsManager("/icerik/seo")', "SEO manager boundary");
  assertContains(page, "loadSeoPages()", "SEO server-side inventory read");
  assertContains(page, "const selected = filtered.find", "SEO master-detail selection");
  assertContains(page, "criticalIssueCount", "SEO issue prioritization");
  assertContains(page, "href={editHref(selected)}", "SEO deep link to canonical editor");
  assertContains(page, "ikinci bir kopya", "SEO single-source guidance");
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
  assertContains(page, 'localeCoverage("tr")', "TR coverage baseline");
  assertContains(page, 'localeCoverage("en")', "EN coverage inventory");
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
    assertContains(page, "ops.workbench", `${label} shared workbench shell`);
    assertContains(page, "ops.rail", `${label} selection rail`);
    assertContains(page, "ops.detail", `${label} selected detail pane`);
  }

  assertContains(seo, "styles.queueLayout", "SEO queue-specific master-detail layout");
  for (const [label, page] of [["redirect", redirects], ["locale", locales]]) {
    assertContains(page, "ops.layout", `${label} master-detail layout`);
    assertContains(page, "ops.sidePane", `${label} operational side pane`);
  }
});

test("form requests use an authenticated triage workflow and keep PII scoped to the form workbench", () => {
  const page = source("src/app/icerik/formlar/page.tsx");
  const route = source("src/app/api/site-contact-manage/route.ts");
  const mediaReferences = source("src/lib/cms-media-references.ts");

  assertContains(page, 'requireCmsManager("/icerik/formlar")', "form workbench manager boundary");
  assertContains(page, "Yeni → İnceleniyor → Çözüldü → Arşiv", "form triage workflow language");
  assertContains(page, 'name="action" value={action}', "form triage action submission");
  assertContains(page, "PII sınırı", "form PII scope notice");
  assertContains(route, "getCmsAccess()", "form mutation access boundary");
  assertContains(route, 'new Set(["review", "resolve", "reopen", "archive"])', "form allowed workflow transitions");
  assertContains(route, "parseSubmission(row.valueJson)", "form payload validation before mutation");
  assertContains(route, "state: nextState", "form workflow state persisted in payload");
  assertContains(route, "namespace = 'form_submission'", "form mutation namespace boundary");
  assertContains(mediaReferences, "'form_submission'", "form PII excluded from global media reference scan");
  assertNotContains(route, "console.log", "form PII must not be logged");
});

test("revision center is a comparison workbench and restore remains on the canonical protected action", () => {
  const center = source("src/app/icerik/gecmis/page.tsx");
  const detail = source("src/app/icerik/gecmis/[revisionId]/page.tsx");
  const actions = source("src/features/cms/revision-actions.ts");

  assertContains(center, 'requireCmsManager("/icerik/gecmis")', "revision center manager boundary");
  assertContains(center, "const selectedGroup =", "revision content selection");
  assertContains(center, "const selectedRevision =", "revision version selection");
  assertContains(center, "diffCmsRevisionSnapshots", "revision workbench diff engine");
  assertContains(center, "Detaylı Karşılaştırma / Geri Yükleme", "revision canonical detail deep link");
  assertNotContains(center, "restoreCmsRevisionAction", "revision center must not create a second restore action");
  assertContains(detail, "restoreCmsRevisionAction", "canonical revision detail restore action retained");
  assertContains(actions, 'requireCmsPublisher("/icerik/gecmis")', "revision restore publisher boundary");
  assertContains(actions, 'action: "backup-before-restore"', "revision restore mandatory backup");
  assertContains(actions, "prisma.$transaction", "revision restore transaction boundary");
  assertContains(actions, "isCmsLocaleEnabled(locale)", "revision restore locale publish boundary");
});
