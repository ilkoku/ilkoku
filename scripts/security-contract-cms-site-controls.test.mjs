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

test("media library exposes real references without leaking form PII", () => {
  const references = source("src/lib/cms-media-references.ts");
  const page = source("src/app/icerik/medya/page.tsx");

  assertContains(references, "namespace NOT IN ('media', 'media_blob', 'form_submission', 'cms_draft')", "media reference PII exclusion");
  assertContains(references, "ContentPage", "media published page reference scan");
  assertContains(references, "row.valueJson.includes(url)", "media SiteContent reference detection");
  assertContains(references, "row.bodyJson.includes(url)", "media ContentPage reference detection");

  assertContains(page, "getCmsMediaReferenceMap", "media reference inventory load");
  assertContains(page, "Medya kullanım haritası doğrulanamadı", "media reference fail-closed warning");
  assertContains(page, "const safeToArchive = referencesAvailable && refs.length === 0", "media UI archive safety boundary");
  assertContains(page, 'name="q"', "media search control");
  assertContains(page, 'name="tur"', "media kind filter");
  assertContains(page, 'name="kullanim"', "media usage filter");
  assertContains(page, "ref.editHref", "media reference deep link");
});

test("media archive still re-checks published references server-side", () => {
  const actions = source("src/features/cms/media-actions.ts");

  assertContains(actions, 'requireCmsPublisher("/icerik/medya")', "media publish permission boundary");
  assertContains(actions, "isMediaReferencedByPublishedContent(asset.url)", "media server-side reference recheck");
  assertContains(actions, 'redirect("/icerik/medya?hata=kullanimda")', "media referenced archive blocker");
  assertContains(actions, "prisma.$transaction", "media metadata/blob archive transaction");
});
