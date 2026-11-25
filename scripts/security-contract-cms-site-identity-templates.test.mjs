import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.equal(text.includes(fragment), false, `${label} must not contain ${JSON.stringify(fragment)}`);

test("site identity is admin-only, fail-safe and restricted to published CMS media logos", () => {
  const page = source("src/app/icerik/site-kimligi/page.tsx");
  const actions = source("src/features/cms/site-identity-actions.ts");
  const identity = source("src/lib/site-identity.ts");
  const header = source("src/components/layout/PublicSiteHeader.tsx");
  const footer = source("src/components/content/PublicTrustFooter.tsx");

  contains(page, 'requireCmsAdmin("/icerik/site-kimligi")', "site identity admin page boundary");
  contains(actions, 'requireCmsAdmin("/icerik/site-kimligi")', "site identity mutation boundary");
  contains(actions, "logoIsPublishedCmsImage", "site identity logo revalidation");
  contains(actions, "namespace = 'media'", "site identity published media lookup");
  contains(actions, "value.kind === \"image\"", "site identity image-kind boundary");
  contains(actions, "'site_identity', 'global'", "site identity canonical storage key");
  contains(identity, "parseSiteIdentityStrict", "site identity strict parser");
  contains(identity, "return defaultSiteIdentity", "public identity safe fallback");
  contains(header, "getPublicSiteIdentity()", "public header identity consumer");
  contains(footer, "getPublicSiteIdentity()", "trust footer centralized site identity source");
  notContains(actions, "http://", "site identity must not accept arbitrary remote logo source");
  notContains(actions, "https://", "site identity must not accept arbitrary remote logo source");
});

test("visual page builder reuses canonical CMS authority and validates structured blocks", () => {
  const page = source("src/app/icerik/sayfalar/sablonlar/page.tsx");
  const builder = source("src/components/content/CmsVisualPageBuilder.tsx");
  const blocks = source("src/lib/cms-page-blocks.ts");
  const actions = source("src/features/cms/page-actions.ts");
  const publicRoute = source("src/app/[...path]/page.tsx");
  const visualRoute = source("src/app/icerik/sayfalar/[id]/tasarla/page.tsx");
  const templates = source("src/lib/cms-page-templates.ts");
  const modules = source("src/lib/cms-modules.ts");

  contains(page, 'requireCmsManager("/icerik/sayfalar/sablonlar")', "visual builder manager boundary");
  contains(visualRoute, 'requireCmsManager(`/icerik/sayfalar/${id}/tasarla`)', "existing visual page manager boundary");
  contains(builder, "action={saveCmsPageAction}", "canonical page save action reuse");
  contains(builder, 'name="blocksJson"', "structured block payload");
  contains(builder, 'name="mode"', "canonical save mode control");
  contains(builder, "canPublish ?", "client publish button is capability-gated");
  contains(actions, 'requestedMode === "publish"', "server publish mode detection");
  contains(actions, 'requireCmsPublisher("/icerik/sayfalar")', "server publisher authority");
  contains(actions, "parseCmsPageBlocksJson", "server structured block parsing");
  contains(actions, "requirePublishedBlockMedia", "server block media revalidation");
  contains(actions, "cmsPageBlocksToPlainText", "quality-gate text derivation from blocks");
  contains(blocks, "normalizeCmsPageBlocks", "block allow-list normalizer");
  contains(blocks, "^\\/api\\/media\\/", "block media local CMS restriction");
  notContains(blocks, "dangerouslySetInnerHTML", "visual blocks must not inject arbitrary HTML");
  contains(publicRoute, "<PublicCmsPageBlocks", "public visual block renderer");
  contains(templates, 'key: "kurumsal"', "corporate template");
  contains(templates, 'key: "surec"', "process template");
  contains(templates, 'key: "rol"', "role template");
  contains(templates, 'key: "bilgi"', "information template");
  for (const type of ["hero", "text", "image", "split", "cards", "cta", "steps", "stats", "quote", "faq", "gallery", "table", "divider"]) {
    contains(blocks, `| \"${type}\"`, `${type} block contract`);
  }
  contains(modules, 'href: "/icerik/site-kimligi"', "site identity CMS navigation");
  contains(modules, 'href: "/icerik/sayfalar/sablonlar"', "visual page builder CMS navigation");
});

test("writer motivation series is user-day idempotent, CMS-managed and consistent across real writer surfaces", () => {
  const migration = source("prisma/migrations/20260907130000_writer_active_days/migration.sql");
  const engagement = source("src/lib/writer-engagement.ts");
  const config = source("src/lib/writer-motivation-config.ts");
  const action = source("src/features/writer-engagement/actions.ts");
  const tracker = source("src/features/dashboard/components/WriterActiveDayTracker.tsx");
  const dashboard = source("src/features/dashboard/components/WriterDashboard.tsx");
  const dashboardContent = source("src/content/dashboard.ts");
  const writerContent = source("src/content/writer.ts");
  const writerPage = source("src/app/yazar/page.tsx");
  const continueWritingPage = source("src/app/yazmaya-devam/page.tsx");
  const density = source("src/features/writer/writer-editor-density.css");
  const writerLayout = source("src/app/yazar/layout.tsx");
  const continueWritingLayout = source("src/app/yazmaya-devam/layout.tsx");
  const cmsPage = source("src/app/icerik/motivasyon/page.tsx");
  const cmsAction = source("src/features/cms/writer-motivation-actions.ts");
  const cmsEditor = source("src/components/content/CmsWriterMotivationEditor.tsx");
  const modules = source("src/lib/cms-modules.ts");

  contains(migration, "UNIQUE INDEX `WriterActiveDay_userId_dayKey_key`", "same-user same-day uniqueness");
  contains(migration, "FOREIGN KEY (`userId`) REFERENCES `User` (`id`)", "writer active-day user boundary");
  contains(engagement, 'timeZone: "Europe/Istanbul"', "Istanbul day boundary");
  contains(engagement, "summary.todayRecorded", "same-day preview detection");
  contains(engagement, "summary.activeDayCount + 1", "next distinct active-day projection");
  contains(engagement, "ON DUPLICATE KEY UPDATE userId = VALUES(userId)", "idempotent active-day write");
  contains(action, 'user.role !== "writer"', "writer-only active-day mutation");
  contains(tracker, "recordWriterActiveDayAction()", "client-mounted real-visit tracking");
  contains(tracker, 'document.querySelectorAll<HTMLElement>(".writer-streak")', "editor active-day surface sync");
  contains(tracker, "new MutationObserver", "portal-safe editor active-day sync");
  contains(writerPage, "getWriterEngagementPreview(profile.id)", "writer dashboard engagement loader");
  contains(dashboard, "<WriterActiveDayTracker", "real dashboard mount tracker");
  contains(dashboard, "activeDayCount={engagement.activeDayCount}", "dashboard active-day tracker value");
  contains(dashboard, "engagement.motivation", "dynamic motivation rendering");
  contains(dashboard, "engagement.activeDayCount", "dynamic active-day rendering");
  contains(continueWritingPage, "getWriterEngagementPreview(profile.id)", "continue-writing engagement loader");
  contains(continueWritingPage, "<WriterActiveDayTracker", "continue-writing real-visit tracker");
  contains(continueWritingPage, "activeDayCount={engagement.activeDayCount}", "continue-writing active-day value");
  notContains(dashboardContent, 'streak: "8 Gün"', "static fake dashboard streak removal");
  notContains(dashboardContent, 'motivation: "Küçük bir bölüm de ilerlemedir."', "static dashboard motivation removal");
  notContains(writerContent, 'streak: "🔥 8 gün"', "static fake editor streak removal");
  notContains(writerContent, 'streakLabel: "Yazma serisi 8 gün"', "static fake editor streak label removal");
  contains(density, "minmax(11.5rem, 13.5rem)", "compact writer side rails");
  contains(density, "width: 4.4rem", "compact writer editor brand");
  contains(density, 'grid-template-areas: "label bar remaining"', "single-row daily goal density");
  contains(density, ".writer-screen.writer-screen--focus .writer-chapters", "focus mode chapter rail removal");
  contains(density, ".writer-screen.writer-screen--focus .writer-editor-layout > .writer-footer", "focus mode statistics rail removal");
  contains(density, ".writer-screen.writer-screen--focus .writer-goal", "focus mode daily goal removal");
  contains(density, "grid-template-columns: minmax(0, 1fr) !important;", "focus mode single manuscript column");
  contains(density, "width: min(100%, 58rem) !important;", "focus mode centered manuscript width");
  contains(writerLayout, 'writer-editor-density.css', "writer route density layer");
  contains(continueWritingLayout, 'writer-editor-density.css', "continue-writing density layer");
  contains(config, "WRITER_MOTIVATION_MINIMUM = 30", "30-day baseline contract");
  contains(config, "WRITER_MOTIVATION_MAXIMUM = 365", "CMS extension ceiling");
  contains(cmsPage, 'requireCmsManager("/icerik/motivasyon")', "motivation CMS read boundary");
  contains(cmsAction, 'requireCmsPublisher("/icerik/motivasyon")', "motivation CMS publish boundary");
  contains(cmsAction, 'formData.getAll("motivation")', "ordered motivation payload");
  contains(cmsEditor, "+ Yeni motivasyon ekle", "CMS motivation extension control");
  contains(modules, 'href: "/icerik/motivasyon"', "motivation CMS navigation");
});


test("generic public CMS route shares one request lookup and separates missing rows from query failure", async () => {
  const route = source("src/app/[...path]/page.tsx");
  contains(route, 'import { cache } from "react"', "request-scoped React memoization");
  contains(route, "const loadPublicPage = cache(", "shared CMS lookup");
  assert.equal((route.match(/await loadPublicPage\(source\)/gu) || []).length, 2);
  assert.equal((route.match(/status = 'published'/gu) || []).length, 2);
  const ts = await import("typescript");
  const js = ts.transpileModule(route, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    fileName: "page.tsx",
  }).outputText;
  const missing = new Error("test notFound");
  const redirect = new Error("test redirect");
  const unavailable = new Error("test database unavailable");
  const row = { slug: "/cms-example", title: "Example", bodyJson: "{}", noIndex: false };
  const props = { params: Promise.resolve({ path: ["cms-example"] }) };

  function loadRoute(pageResult, redirectResult) {
    const calls = [];
    const exports = {};
    const requireMock = (id) => {
      if (id === "react") return { cache: (fn) => {
        // A fresh map for each simulated request, not a persistent data cache.
        const memo = new Map();
        return (key) => {
          if (!memo.has(key)) memo.set(key, fn(key));
          return memo.get(key);
        };
      } };
      if (id === "next/navigation") return {
        notFound() { throw missing; },
        permanentRedirect(target) { assert.equal(target, "/nasil-calisir"); throw redirect; },
      };
      if (id === "react/jsx-runtime") return { jsx: () => ({}), jsxs: () => ({}) };
      if (id === "@/lib/prisma") return { prisma: {
        async $queryRaw(strings) {
          const sql = strings.join("?");
          const pageLookup = sql.includes("FROM ContentPage");
          calls.push(pageLookup ? "page" : "redirect");
          const value = pageLookup ? pageResult : redirectResult;
          if (value instanceof Error) throw value;
          return value;
        },
      } };
      if (id === "@/lib/cms-pages") return { parseCmsPageBody: () => ({ summary: "Summary", blocks: [], body: "Body" }) };
      if (id === "@/lib/public-page-metadata") return { createPublicPageMetadata: (input) => input };
      if (id === "@/lib/cms-redirects") return {
        normalizeCmsRedirectPath: (value) => value,
        parseCmsRedirectValue: JSON.parse,
      };
      if (id === "@/lib/site-identity") return { getPublicSiteIdentity: async () => ({ defaultEyebrow: "First" }) };
      if (id.startsWith("@/components/")) return {};
      throw new Error("Unexpected route dependency: " + id);
    };
    new Function("require", "exports", js)(requireMock, exports);
    return { route: exports, calls };
  }

  const published = loadRoute([row], []);
  assert.equal((await published.route.generateMetadata(props)).canonical, "/cms-example");
  await published.route.default(props);
  assert.deepEqual(published.calls, ["page"]);

  const absent = loadRoute([], []);
  await assert.rejects(absent.route.default(props), (error) => error === missing);
  assert.deepEqual(absent.calls, ["page", "redirect"]);

  const redirected = loadRoute([], [{ valueJson: '{"source":"/cms-example","target":"/nasil-calisir","code":308}' }]);
  await assert.rejects(redirected.route.default(props), (error) => error === redirect);

  const pageFailure = loadRoute(unavailable, []);
  await assert.rejects(pageFailure.route.generateMetadata(props), (error) => error === unavailable);
  await assert.rejects(pageFailure.route.default(props), (error) => error === unavailable);
  assert.deepEqual(pageFailure.calls, ["page"]);

  const redirectFailure = loadRoute([], unavailable);
  await assert.rejects(redirectFailure.route.default(props), (error) => error === unavailable);
  assert.deepEqual(redirectFailure.calls, ["page", "redirect"]);
});
