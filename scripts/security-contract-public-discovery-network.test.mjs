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

test("foundational guides keep the public editorial hub useful without CMS rows", () => {
  const guides = source("src/content/public-guides.ts");
  const index = source("src/app/rehber/page.tsx");
  const detail = source("src/app/rehber/[slug]/page.tsx");

  for (const slug of [
    "ilk-eseri-yayinlama-rehberi",
    "eser-tanitim-metni-nasil-yazilir",
    "okur-geri-bildirimi-rehberi",
    "editor-incelemesi-nasil-calisir",
    "yayinevi-eser-kesfi-rehberi",
    "eser-pasaportu-nedir",
  ]) {
    contains(guides, `slug: "${slug}"`, `guide ${slug}`);
  }

  contains(index, "foundationalGuides", "guide fallback index");
  contains(index, "AND noIndex = false", "CMS guide indexability");
  contains(detail, "getFoundationalGuide", "guide fallback detail");
  contains(detail, '"@type": "Article"', "guide article schema");
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

  for (const route of [
    "/eserler/yeni",
    "/eserler/guncellenen",
    "/yazarlar",
    "/turler",
  ]) {
    contains(sitemap, `\${baseUrl}${route}`, `sitemap route ${route}`);
  }

  contains(sitemap, "foundationalGuides", "stable guide sitemap entries");
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
});

test("public discovery does not silently change chapter access policy", () => {
  const chapter = source(
    "src/app/oku/[slug]/[chapterSlug]/page.tsx",
  );

  contains(chapter, "index: false", "chapter noindex policy");
  contains(chapter, "follow: false", "chapter nofollow policy");
  contains(chapter, "requirePageUser", "chapter authentication gate");
});
