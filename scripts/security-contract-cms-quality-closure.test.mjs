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
  const moduleRows = modules.split("\n").filter((line) => line.includes('{ href: "/icerik'));
  const activeRows = moduleRows.filter((line) => line.includes("enabled: true"));

  assert.ok(moduleRows.length > 0, "CMS module inventory must remain explicit");
  for (const row of moduleRows) {
    assert.match(row, /enabled: (true|false)/, `missing explicit CMS enabled state: ${row.trim()}`);
  }
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
  assertContains(editor, "Yönetim, ürün ve kod tarafından ayrılmış rota kökleri", "reserved route guidance");

  assertContains(cmsPages, "publicCodeOwnedIndexRoutes", "CMS slug safety consumes code-owned public route inventory");
  assertContains(cmsPages, "codeOwnedPublicRoots", "CMS derives reserved roots from canonical public SEO catalog");
  assertContains(cmsPages, '"onizleme"', "preview namespace remains reserved");
  assertContains(cmsPages, '"opengraph-image"', "Open Graph metadata route remains reserved");
  assertContains(cmsPages, '"twitter-image"', "Twitter metadata route remains reserved");
  for (const route of ['"/eserler"', '"/yazarlar"', '"/turler"']) {
    assertNotContains(seoRoutes, route, `${route} retired SEO route`);
  }
  for (const root of ['"eserler"', '"yazarlar"', '"turler"']) {
    assertContains(cmsPages, root, `${root} retired filesystem root reservation`);
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

test("CMS page inventory audits existing content quality without auto-unpublishing live pages", () => {
  const pages = source("src/app/icerik/sayfalar/page.tsx");

  assertContains(pages, "evaluateCmsPagePublishQuality", "existing page audit reuses publication quality engine");
  assertContains(pages, "parseCmsPageBody", "existing page audit reads summary and body from stored CMS payload");
  assertContains(pages, "status, bodyJson, seoTitle", "CMS inventory query includes body payload for quality audit");
  assertContains(pages, "canonicalMatchesSlug", "legacy canonical drift is audited");
  assertContains(pages, "Canonical adresi sayfanın gerçek public URL'siyle aynı olmalı.", "canonical mismatch explanation");
  assertContains(pages, "CMS kayıt kalitesi denetimi", "audit is explicitly scoped to persistent CMS records");
  assertContains(pages, "Bu tarama mevcut canlı sayfaları otomatik olarak yayından kaldırmaz.", "audit never silently unpublishes existing content");
  assertContains(pages, "geçici bundled köprü", "legacy bridge distinction remains visible");
  assertContains(pages, "Kalite hazır", "core quality readiness metric");
  assertContains(pages, "KALİTE EKSİĞİ", "per-page quality debt visibility");
  assertContains(pages, "publicQualityDebt", "published core quality debt summary");
});

test("CMS quality closure keeps fail-closed operational entry points visible", () => {
  const dashboard = source("src/app/icerik/page.tsx");
  const readiness = source("src/app/icerik/hazirlik/page.tsx");

  assertContains(dashboard, "OKUNAMADI", "dashboard fail-closed state");
  assertContains(dashboard, 'href="/icerik/saglik"', "dashboard health recovery route");
  assertContains(readiness, "İçerik hazırlık verileri okunamadı.", "readiness fail-closed state");
  assertContains(readiness, 'href="/icerik/saglik"', "readiness health recovery route");
});


test("nine core public CMS pages compare with exactly their live code source without publishing", () => {
  const catalog = source("src/lib/public-cms-page-catalog.ts");
  const copy = source("src/lib/core-public-code-copy.ts");
  const pages = source("src/app/icerik/sayfalar/page.tsx");
  const starters = source("src/features/cms/starter-content-actions.ts");
  const sourceKeys = [...catalog.matchAll(/contentKey: "(page:tr:[a-z-]+)", label:/g)].map((match) => match[1]);

  assert.equal(sourceKeys.length, 9, "exactly nine canonical public route records");
  for (const key of sourceKeys) {
    assertContains(copy, '"' + key + '"', key + " has the exact bundled code source");
  }
  assertContains(copy, 'import "server-only"', "comparison source is not shipped to browsers");
  assertContains(copy, "compareCorePageToCode", "draft-to-public diff is read-only");
  for (const field of ["Başlık", "Kısa özet", "Sayfa metni", "SEO başlığı", "SEO açıklaması", "Canonical", "URL", "Noindex"]) {
    assertContains(copy, field, "comparison includes " + field);
  }
  for (const key of ["slug: aboutPageContent.canonical", "title: aboutPageContent.title", "summary: aboutPageContent.summary", "body: aboutPageContent.body", "seoTitle: aboutPageContent.seoTitle", "seoDescription: aboutPageContent.seoDescription"]) {
    assertContains(starters, key, "Hakkımızda starter uses current public source " + key);
  }
  assertNotContains(starters, "İlkOku, yazarların eserlerini geliştirebildiği, okuyucularla buluşturabildiği", "old Hakkımızda starter copy must not be used");
  assertContains(pages, "corePublicCodeCopies[item.contentKey]", "per-row canonical public copy");
  assertContains(pages, "compareCorePageToCode(page, codeCopy)", "stored CMS copy comparison");
  assertContains(pages, "CMS KAYDI YOK", "missing CMS record is not a missing public route");
  assertContains(pages, "CANLI: KOD SÜRÜMÜ", "explicit public fallback origin");
  assertContains(pages, '<Link href={item.slug} target="_blank">Canlı ↗</Link>', "live navigation remains available with no CMS publication");
  assertContains(pages, "salt okunurdur; hiçbir taslağı değiştirmez veya kendiliğinden yayımlamaz", "no automatic content mutation");
  assertNotContains(pages, "saveCmsPageAction", "inventory remains read only");
  assertNotContains(copy, "prisma", "canonical comparison must not access or mutate database");
});


test("approved Hakkımızda content can be saved only through an explicit draft action", () => {
  const approvedSource = source("src/content/approved-hakkimizda-cms-draft.ts");
  const editor = source("src/components/content/CmsPageEditor.tsx");
  const publicCopy = source("src/content/about.ts");
  const match = approvedSource.match(/export const approvedHakkimizdaCmsDraft = (\{[\s\S]*\}) as const;/);
  assert.ok(match, "approved CMS source must be a plain deterministic data object");
  const approved = JSON.parse(match[1]);

  assert.equal(approved.contentKey, "page:tr:hakkimizda");
  assert.equal(approved.canonical, "/hakkimizda");
  assert.equal(approved.title, "Hakkımızda");
  assert.equal(approved.seoTitle, "Hakkımızda | İlkOku Dijital Yazar Platformu");
  assertContains(approved.summary, "edebiyatın farklı seslerini aynı hikâyede buluşturur", "approved literary summary");
  assertContains(approved.seoDescription, "İlkOku’nun neden var olduğunu", "approved SEO description");
  assertNotContains(approved.body, "ekosistem", "approved body avoids rejected terminology");
  assertNotContains(approved.summary, "ekosistem", "approved summary avoids rejected terminology");
  assertContains(approved.body, "İlkOku, yazarların eserlerini geliştirebildiği", "existing CMS intro preserved");
  assertContains(approved.body, "Yazar editör incelemesi talep ettiğinde eser Genel Editör Havuzu'na girer", "two-stage editor process preserved");
  assertContains(approved.body, "otomatik sözleşme, basım veya yayın taahhüdü oluşturmaz", "publisher noncommitment preserved");
  for (const heading of [
    "Yazarın çalışma alanı", "Okurun katkısı", "İki aşamalı editör incelemesi",
    "Yayınevi keşfi", "Bir eseri yalnızca son hâliyle görmüyoruz",
    "Güvenin temeli: herkesin rolü belli", "Nereye gidiyoruz?",
  ]) {
    assertContains(approved.body, "## " + heading, "approved heading " + heading);
  }
  assert.equal(approved.body.match(/^## /gm)?.length, 7, "exactly the seven approved headings");
  assertNotContains(approved.body, "## Yazar gelişir, okur keşfeder", "repetitive role recap must remain excluded");
  assertContains(editor, 'page?.id === "51e2eb80-7192-4cec-ba69-6bf622c569a4"', "only the approved CMS record");
  assertContains(editor, 'page.contentKey === approvedHakkimizdaCmsDraft.contentKey', "strict content key guard");
  assertContains(editor, 'page.status !== "archived" && !corruptDraft', "published record can stage safe draft; archived record excluded");
  const saveAction = source("src/features/cms/page-actions.ts");
  assertContains(saveAction, 'if (existing?.status === "published" && mode !== "publish")', "published page drafts use staged path");
  assertContains(saveAction, 'await saveCmsDraft(user.id, pageDraftKey(existing.id), snapshot)', "published page keeps current live row when staging a draft");
  assertContains(saveAction, 'status: mode === "publish" ? "published" : "draft"', "draft snapshot records its safe status");
  assertContains(editor, '<form action={saveApprovedHakkimizdaDraftAction}>', "approved import uses dedicated authoritative server action");
  assertContains(editor, "Onaylanan metin bekleyen CMS taslağıyla birebir eşleşiyor", "editor gives exact parity confirmation");
  assertContains(editor, "Bekleyen taslak onaylanan metinle henüz eşleşmiyor", "editor rejects mismatched drafts");
  const actions = source("src/features/cms/page-actions.ts");
  assertContains(actions, "export async function saveApprovedHakkimizdaDraftAction()", "server-only approved importer");
  assertContains(actions, 'data.set("mode", "draft")', "approved import cannot publish");
  for (const prop of ["title", "summary", "body", "seoTitle", "seoDescription"]) {
    assertContains(actions, `data.set("${prop}", approved.${prop})`, "server-authored approved " + prop);
  }
  assertContains(actions, 'if (page.noIndex) data.set("noIndex", "on")', "original noindex flag preserved");
  assertContains(actions, 'await saveCmsPageAction(data)', "approved action goes through existing authenticated CMS save");
  assertContains(editor, "Onaylı Hakkımızda metnini taslağa aktar", "action label makes draft staging clear");
  assertNotContains(editor, '<input type="hidden" name="body" value={approvedHakkimizdaCmsDraft.body}', "approved content never sent from browser hidden input");
  assertNotContains(publicCopy, "edebiyatın farklı seslerini aynı hikâyede buluşturur", "approved draft must not silently replace live code");
  assertNotContains(approvedSource, "prisma", "approved data source cannot mutate the database");
});


test("approved Hakkımızda has a complete public renderer without silently falling back to legacy copy", () => {
  const page = source("src/app/hakkimizda/page.tsx");
  const experience = source("src/components/content/AboutExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const approvedSource = source("src/content/approved-hakkimizda-cms-draft.ts");
  const match = approvedSource.match(/export const approvedHakkimizdaCmsDraft = (\{[\s\S]*\}) as const;/);
  assert.ok(match, "approved source must remain readable for structural checks");
  const approved = JSON.parse(match[1]);

  for (const heading of [
    "Yazarın çalışma alanı", "Okurun katkısı", "İki aşamalı editör incelemesi",
    "Yayınevi keşfi", "Bir eseri yalnızca son hâliyle görmüyoruz",
    "Güvenin temeli: herkesin rolü belli", "Nereye gidiyoruz?",
  ]) {
    assertContains(approved.body, "## " + heading, "approved CMS has " + heading);
    assertContains(page, '"## ' + heading + '"', "public gate accepts " + heading);
  }

  assertContains(page, "function hasApprovedAboutStructure(body: string)", "approved gate is distinct from legacy gate");
  assertContains(page, "|| hasApprovedAboutStructure(body)", "public page accepts the approved seven-heading structure");
  assertContains(page, "hasApprovedAboutStructure(state.page.body)", "approved SEO is taken from its CMS record");
  assertContains(experience, "const hasApprovedRoleSections = roleMeta.every", "role cards recognize the approved individual sections");
  assertContains(experience, "const showRoleGrid = Boolean(roles) || hasApprovedRoleSections", "four-card layout supports both content formats");

  for (const title of ["Yazarın çalışma alanı", "Okurun katkısı", "İki aşamalı editör incelemesi", "Yayınevi keşfi"]) {
    assertContains(experience, '"' + title + '"', title + " appears in role mapping");
  }
  assertContains(experience, '<h3>{approved?.title ?? role.title}</h3>', "render exact approved role card heading");
  assertContains(experience, 'const content = approved ?? legacy;', "render exact approved role body");
  assertContains(preview, 'page.contentKey === "page:tr:hakkimizda"', "CMS About draft gets special preview");
  assertContains(preview, '<AboutExperience title={title} summary={summary} body={body} updatedAt={page.updatedAt} />', "preview reuses public visual experience");
  assertContains(preview, "<PublicTrustFooter />", "preview contains shared public footer");
  assertContains(preview, 'const draft = state.state === "valid" ? state.record.payload : undefined', "preview uses draft, never published body when present");
  assertContains(preview, "robots: { index: false, follow: false }", "staged preview is noindex");
  assertNotContains(page, "approvedHakkimizdaCmsDraft", "public route must never read the draft source as a live replacement");
});
