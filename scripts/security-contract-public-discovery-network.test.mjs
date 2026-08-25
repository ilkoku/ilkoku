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
  notContains(library, "email: true", "private author email");
  notContains(library, "bio: true", "unreviewed author biography");
  contains(authorIndex, 'href={`/yazarlar/${author.publicId}`}', "author links");
  contains(authorDetail, "getPublicAuthorById", "author detail boundary");
  contains(genreIndex, 'href={`/turler/${genre.slug}`}', "genre links");
  contains(genreDetail, "getPublicGenreBySlug", "genre detail boundary");
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
  contains(stream, 'href={`/kitap/${work.slug}?from=/eserler`}', "work links");
  contains(stream, 'href={`/yazarlar/${work.author.publicId}`}', "author links");
  contains(stream, 'href={`/turler/${publicTaxonomySlug(', "genre links");
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
  contains(collector, '"/icerik/sayfalar", "/nasil-calisir"', "trust page CMS workflow map");
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
