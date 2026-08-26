import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

function source(relativePath) {
  return readFileSync(
    join(ROOT, relativePath),
    "utf8",
  );
}

function binary(relativePath) {
  return readFileSync(join(ROOT, relativePath));
}

function contains(text, fragment, label) {
  assert.ok(
    text.includes(fragment),
    `${label} must contain ${JSON.stringify(fragment)}`,
  );
}

function notContains(text, fragment, label) {
  assert.ok(
    !text.includes(fragment),
    `${label} must not contain ${JSON.stringify(fragment)}`,
  );
}

test("how-it-works trust page stays truthful without CMS rows and retires guides", () => {
  const content = source("src/content/how-it-works.ts");
  const page = source("src/app/nasil-calisir/page.tsx");
  const experience = source("src/components/content/HowItWorksExperience.tsx");
  const experienceStyles = source("src/app/nasil-calisir/how-it-works.css");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const cmsStore = source("src/lib/cms-public-page-store.ts");
  const guideIndex = source("src/app/rehber/page.tsx");
  const guideDetail = source("src/app/rehber/[slug]/page.tsx");

  contains(content, "Eser İlkOku'da nasıl ilerler?", "work journey");
  contains(content, "Kim neyi görebilir?", "visibility matrix");
  contains(content, "Eser Pasaportu; eserin İlkOku'da", "passport evidence boundary");
  contains(content, "Henüz etkin değil", "truthful feature status");
  contains(page, 'getPublishedCmsPublicPageState("nasil-calisir")', "CMS-owned public page");
  contains(page, "HowItWorksExperience", "branded how-it-works experience");
  contains(experience, 'src="/how-it-works/journey.webp"', "brand-matched journey visual");
  contains(experience, "EditorialBody body={part.body}", "CMS journey content in cards");
  contains(experienceStyles, ".how-step--passport > h3 { grid-column: 2;", "passport title grid boundary");
  contains(experienceStyles, ".how-footer .how-logo { width: 4.4rem; aspect-ratio: 1; filter: none;", "footer logo color boundary");
  contains(experienceStyles, ".how-start { padding: clamp(5rem, 9vw, 8rem) 0", "start-to-discovery spacing boundary");
  contains(preview, 'page.contentKey === "page:tr:nasil-calisir"', "visual CMS preview boundary");
  contains(page, '"@type": "WebPage"', "WebPage schema");
  contains(cmsStore, "status = 'published'", "published CMS boundary");
  contains(guideIndex, 'permanentRedirect("/nasil-calisir")', "retired guide index redirect");
  contains(guideDetail, "legacyGuideTargets", "legacy guide detail redirects");
});

test("public trust visual library is complete and deployment-safe", () => {
  const registry = source("src/content/public-trust-page-visuals.ts");
  const visualPairs = [
    ["/nasil-calisir", "public/how-it-works/journey.webp"],
    ["/editoryal-standartlar", "public/trust-pages/editorial-standards.webp"],
    ["/icerik-ve-yas-politikasi", "public/trust-pages/content-age-policy.webp"],
    ["/topluluk-kurallari", "public/trust-pages/community-rules.webp"],
    ["/telif-bildirimi", "public/trust-pages/copyright-notice.webp"],
    ["/yazarlar-icin", "public/trust-pages/for-writers.webp"],
    ["/editorler-icin", "public/trust-pages/for-editors.webp"],
    ["/yayinevleri-icin", "public/trust-pages/for-publishers.webp"],
  ];

  for (const [route, assetPath] of visualPairs) {
    const publicPath = assetPath.replace(/^public/, "");
    const asset = binary(assetPath);

    contains(registry, `\"${route}\"`, `visual route ${route}`);
    contains(registry, `src: \"${publicPath}\"`, `visual asset ${publicPath}`);
    assert.equal(asset.subarray(0, 4).toString("ascii"), "RIFF", `${assetPath} RIFF header`);
    assert.equal(asset.subarray(8, 12).toString("ascii"), "WEBP", `${assetPath} WebP header`);
    assert.ok(asset.length > 50_000, `${assetPath} must not be an empty placeholder`);
    assert.ok(asset.length < 250_000, `${assetPath} must stay inside the hero image budget`);
  }

  contains(registry, "satisfies Record<PublicTrustPagePath, PublicTrustPageVisual>", "exhaustive visual registry");
  contains(registry, "focalPoint", "responsive crop focal point");
});

test("editorial standards stay CMS-owned and independent review access stays fail-closed", () => {
  const content = source("src/content/editorial-standards.ts");
  const page = source("src/app/editoryal-standartlar/page.tsx");
  const experience = source("src/components/content/EditorialStandardsExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const starterContent = source("src/features/cms/starter-content-actions.ts");
  const sitemap = source("src/app/sitemap.ts");
  const collector = source("src/features/system-map/collector.ts");
  const howItWorks = source("src/components/content/HowItWorksExperience.tsx");
  const queries = source("src/features/editor-workspace/queries.ts");
  const completedReviewPage = source("src/app/editor/incelemeler/[workId]/page.tsx");
  const detailQuery = queries.slice(queries.indexOf("export async function getEditorReviewDetail"));

  contains(content, "Editör görüş bildirir; eserin yaratıcı yönü hakkındaki nihai karar yazarda kalır.", "writer decision boundary");
  contains(content, "İkinci editöre ise birinci rapor açılmaz.", "one-way comparison boundary");
  contains(content, "açıkça yetkilendirilmemiş yapay zekâ", "unauthorized third-party AI boundary");
  contains(page, 'getPublishedCmsPublicPageState("editoryal-standartlar")', "CMS-owned editorial standards page");
  contains(page, "EditorialStandardsExperience", "branded editorial standards experience");
  contains(experience, 'getPublicTrustPageVisual("/editoryal-standartlar")', "prepared editorial visual");
  contains(experience, "criteria.sections.map", "CMS criteria cards");
  contains(preview, 'page.contentKey === "page:tr:editoryal-standartlar"', "visual CMS preview boundary");
  contains(starterContent, 'contentKey: "page:tr:editoryal-standartlar"', "CMS starter draft");
  contains(sitemap, "${baseUrl}/editoryal-standartlar", "editorial standards sitemap route");
  contains(collector, '"/nasil-calisir | /editoryal-standartlar | /icerik-ve-yas-politikasi"', "public trust system map");
  contains(howItWorks, 'href="/editoryal-standartlar"', "public inbound editorial standards link");

  contains(detailQuery, 'editorReviewStatus: "completed"', "completed work access boundary");
  contains(detailQuery, "work: {\n                is: {\n                  assignedEditorId: editorId", "first editor data-minimization boundary");
  contains(detailQuery, 'stage: "second"', "second assignment report boundary");
  contains(detailQuery, 'status: "completed"', "completed second assignment boundary");
  notContains(detailQuery, "take: 1", "single-report truncation");
  contains(completedReviewPage, "work.assignedEditorId === profile.id", "first editor comparison boundary");
  contains(completedReviewPage, "report.editorId !== profile.id", "independent report selection");
  contains(completedReviewPage, "Bağımsız değerlendirme tamamlandıktan sonra açıldı", "post-completion disclosure label");
});

test("content and age policy is enforced from work creation to the public reading boundary", () => {
  const content = source("src/content/content-age-policy.ts");
  const page = source("src/app/icerik-ve-yas-politikasi/page.tsx");
  const experience = source("src/components/content/ContentAgePolicyExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const starterContent = source("src/features/cms/starter-content-actions.ts");
  const sitemap = source("src/app/sitemap.ts");
  const collector = source("src/features/system-map/collector.ts");
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20260825150000_work_content_classification/migration.sql");
  const validators = source("src/features/works/validators.ts");
  const actions = source("src/features/works/actions.ts");
  const writerFlow = source("src/features/writer/components/NewWorkFlow.tsx");
  const publish = source("src/features/works/publish-work-event.ts");
  const showcase = source("src/features/showcase/components/BookShowcase.tsx");
  const library = source("src/features/public-discovery/library.ts");
  const publicStream = source("src/features/public-discovery/PublicWorkStream.tsx");

  contains(content, "eserin tamamındaki en yoğun içeriğe göre", "highest-intensity rule");
  contains(content, "18+ olarak beyan edilen eser taslakta saklanabilir ancak herkese açık yayımlanamaz", "truthful adult publication boundary");
  contains(content, "her eseri yayın öncesinde insan eliyle okumaz", "no fabricated pre-publication review");
  contains(content, "otomatik içerik taraması yapıldığına dair bir taahhüt vermez", "no fabricated automated scanner");
  contains(content, "Sınıflandırılmadı", "legacy unrated boundary");
  contains(page, 'getPublishedCmsPublicPageState("icerik-ve-yas-politikasi")', "CMS-owned content-age page");
  contains(experience, 'getPublicTrustPageVisual("/icerik-ve-yas-politikasi")', "prepared policy visual");
  contains(preview, 'page.contentKey === "page:tr:icerik-ve-yas-politikasi"', "visual CMS preview boundary");
  contains(starterContent, 'contentKey: "page:tr:icerik-ve-yas-politikasi"', "CMS starter draft");
  contains(sitemap, "${baseUrl}/icerik-ve-yas-politikasi", "content-age sitemap route");
  contains(collector, "/eserlerim · NewWorkFlow içerik sınıfı/bölüm/yayın çalışma alanı", "classification system map workflow");

  contains(schema, "contentRating           WorkContentRating", "work rating field");
  contains(schema, "contentWarnings         String?", "work warnings field");
  contains(schema, "contentRatingConfirmedAt DateTime?", "classification confirmation field");
  contains(schema, "@default(unrated)", "legacy work safe default");
  contains(migration, "DEFAULT 'unrated'", "migration safe default");
  contains(validators, "contentClassificationConfirmed: z.literal(true", "required author confirmation");
  contains(validators, 'value.contentRating !== "all_ages" && value.contentWarnings.length === 0', "warning required above all-ages");
  contains(actions, 'formData.getAll("contentWarnings")', "multi-value warning parsing");
  contains(writerFlow, "ClassificationFields", "classification before work creation");
  contains(writerFlow, 'href="/icerik-ve-yas-politikasi"', "writer policy link");

  const lockIndex = publish.indexOf("FOR UPDATE");
  const unratedIndex = publish.indexOf('locked[0].contentRating === "unrated"');
  const adultIndex = publish.indexOf('locked[0].contentRating === "adult_18"');
  const publicUpdateIndex = publish.indexOf('visibility: "public"');
  assert.ok(lockIndex >= 0 && lockIndex < unratedIndex, "classification gate must run after canonical row lock");
  assert.ok(unratedIndex < adultIndex && adultIndex < publicUpdateIndex, "classification gates must run before public mutation");

  contains(showcase, 'aria-labelledby="icerik-sinifi"', "reading-before-rating disclosure");
  contains(showcase, "parseWorkContentWarnings", "public warning normalization");
  assert.ok(showcase.indexOf("showcase-content-rating") < showcase.indexOf("showcase-cta"), "rating must be rendered before reading CTA");
  contains(library, "contentRating: true", "public discovery rating projection");
  contains(library, 'not: "adult_18"', "adult discovery defense in depth");
  contains(publicStream, "workContentRatingDetails[work.contentRating].shortLabel", "public discovery rating label");
  notContains(source("src/features/works/repository.ts"), "async publishWork(", "legacy publication bypass");
  notContains(source("src/features/works/repository.ts"), "async publishChapter(", "legacy chapter publication bypass");
});

test("public authors and genres are derived only from the publication boundary", () => {
  const library = source(
    "src/features/public-discovery/library.ts",
  );
  const authorIndex = source("src/app/yazarlar/page.tsx");
  const authorDetail = source(
    "src/app/yazarlar/[publicId]/page.tsx",
  );
  const genreIndex = source("src/app/turler/page.tsx");
  const genreDetail = source(
    "src/app/turler/[slug]/page.tsx",
  );

  contains(
    library,
    "publicWorkPublicationWhere",
    "shared publication boundary",
  );
  contains(
    library,
    "works: {\n        some: publicWorkPublicationWhere",
    "author existence boundary",
  );
  contains(
    library,
    "genresBySlug",
    "normalized genre deduplication",
  );
  contains(library, "prisma.work.groupBy", "genre work counts from publication rows");
  contains(library, "getPublicAuthors(search?: string)", "author search boundary");
  notContains(library, "email: true", "private author email");
  notContains(library, "bio: true", "unreviewed author biography");
  contains(authorIndex, "getPublicAuthors(search)", "live author filtering");
  contains(authorIndex, "encodeURIComponent(returnPath)", "author discovery return context");
  contains(authorDetail, "getPublicAuthorById", "author detail boundary");
  contains(authorDetail, "Geldiğin keşfe dön", "author return path");
  contains(genreIndex, "getPublicGenres(search)", "live genre filtering");
  contains(genreIndex, "genre.count", "genre work counts");
  contains(genreIndex, "encodeURIComponent(returnPath)", "genre discovery return context");
  contains(genreDetail, "getPublicGenreBySlug", "genre detail boundary");
  contains(genreDetail, "Geldiğin tür keşfine dön", "genre return path");
});

test("discovery feeds and RSS expose links but never chapter content", () => {
  const feedPage = source(
    "src/features/public-discovery/PublicWorkFeedPage.tsx",
  );
  const stream = source(
    "src/features/public-discovery/PublicWorkStream.tsx",
  );
  const rss = source("src/app/eserler/rss.xml/route.ts");
  const library = source(
    "src/features/public-discovery/library.ts",
  );

  contains(feedPage, '"@type": "ItemList"', "feed item list");
  contains(feedPage, "PUBLIC_WORK_PAGE_SIZE", "feed pagination");
  contains(feedPage, 'className="public-hub__filters"', "feed live filter surface");
  contains(feedPage, "{ genre, search, sort }", "feed filters reach publication query");
  contains(feedPage, "returnPath={currentPath}", "feed keeps filtered return context");
  contains(stream, "withReturnPath", "context-preserving public links");
  contains(stream, "encodeURIComponent(returnPath)", "safe nested return parameter");
  contains(stream, "bookHref", "work links preserve origin");
  contains(stream, "authorHref", "author links preserve origin");
  contains(stream, "genreHref", "genre links preserve origin");
  contains(rss, "application/rss+xml; charset=utf-8", "RSS content type");
  contains(rss, "getPublicWorkFeed", "RSS publication query");
  contains(rss, "<guid isPermaLink", "RSS stable GUID");
  notContains(library, "content: true", "chapter content projection");
  notContains(rss, "chapter.content", "chapter content in RSS");
});

test("sitemap, homepage and book pages form a truthful public graph", () => {
  const sitemap = source("src/app/sitemap.ts");
  const homepage = source("src/app/page.tsx");
  const book = source("src/app/kitap/[slug]/page.tsx");
  const showcase = source(
    "src/features/showcase/components/BookShowcase.tsx",
  );
  const retiredMap = source("src/app/harita/kesif/page.tsx");
  const collector = source("src/features/system-map/collector.ts");

  for (const route of [
    "/eserler/yeni",
    "/eserler/guncellenen",
    "/yazarlar",
    "/turler",
    "/nasil-calisir",
  ]) {
    contains(sitemap, `\${baseUrl}${route}`, `sitemap route ${route}`);
  }

  notContains(sitemap, "foundationalGuides", "retired guide sitemap source");
  notContains(sitemap, "contentKey LIKE 'guide:%'", "retired CMS guide sitemap inventory");
  contains(sitemap, "getPublicAuthors()", "dynamic author sitemap");
  contains(sitemap, "getPublicGenres()", "dynamic genre sitemap");
  contains(homepage, "getPublicWorkLibrary", "homepage real publication query");
  contains(homepage, 'href="/yazarlar"', "homepage author route");
  contains(homepage, 'href="/turler"', "homepage genre route");
  notContains(homepage, "2.847+", "fabricated writer count");
  notContains(homepage, "18.592+", "fabricated reader count");
  contains(book, "work.authorPublicId", "book author schema URL");
  contains(book, '"@type": "BreadcrumbList"', "book breadcrumbs");
  contains(showcase, '/yazarlar/${work.authorPublicId}', "book author link");
  contains(showcase, '/turler/${publicTaxonomySlug(work.genre)}', "book genre link");
  contains(retiredMap, 'permanentRedirect("/harita")', "retired discovery map redirect");
  contains(collector, '"/icerik/sayfalar", "/icerik/onizleme/sayfa/[id]"', "trust page CMS workflow map");
  contains(collector, 'id: "public-trust"', "visual trust workflow map");
});

test("public discovery does not silently change chapter access policy", () => {
  const chapter = source(
    "src/app/oku/[slug]/[chapterSlug]/page.tsx",
  );

  contains(chapter, "index: false", "chapter noindex policy");
  contains(chapter, "follow: false", "chapter nofollow policy");
  contains(
    chapter,
    "getCurrentSessionContext",
    "chapter session lookup",
  );
  contains(
    chapter,
    'redirect(`/giris?sonraki=${encodeURIComponent(returnPath)}`)',
    "chapter authentication redirect",
  );
});
