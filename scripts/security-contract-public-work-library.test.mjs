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

test("public work library is bounded by the canonical publication boundary", () => {
  const library = source(
    "src/features/public-discovery/library.ts",
  );

  contains(
    library,
    'import "server-only"',
    "public library server boundary",
  );
  contains(
    library,
    "export const PUBLIC_WORK_PAGE_SIZE = 18",
    "public library page size",
  );
  contains(
    library,
    'status: "published"',
    "published work filter",
  );
  contains(
    library,
    'visibility: "public"',
    "public visibility filter",
  );
  contains(
    library,
    "isActive: true",
    "active work filter",
  );
  contains(
    library,
    "publishedAt:",
    "publication timestamp filter",
  );
  contains(
    library,
    "archivedAt: null",
    "archive filter",
  );
  contains(
    library,
    'language: "tr"',
    "Turkish public scope",
  );
  contains(
    library,
    'status: "active"',
    "active author filter",
  );
  contains(
    library,
    "deletedAt: null",
    "deleted author filter",
  );
  contains(
    library,
    "notIn: [...BLOCKED_PUBLIC_WORK_SLUGS]",
    "blocked fixture filter",
  );
  contains(
    library,
    "await Promise.all",
    "bounded count and genre reads",
  );
  contains(
    library,
    "skip: (currentPage - 1) * PUBLIC_WORK_PAGE_SIZE",
    "bounded pagination offset",
  );
  contains(
    library,
    "take: PUBLIC_WORK_PAGE_SIZE",
    "bounded pagination limit",
  );
  notContains(
    library,
    "content: true",
    "unpublished chapter content",
  );
  notContains(
    library,
    "email: true",
    "author email",
  );
});

test("public work catalog exposes crawlable context-preserving book links and honest metadata", () => {
  const page = source("src/app/eserler/page.tsx");

  contains(
    page,
    'canonical: "/eserler"',
    "catalog canonical",
  );
  contains(
    page,
    "index: !filtered",
    "filtered duplicate noindex",
  );
  contains(
    page,
    "follow: true",
    "filtered link following",
  );
  contains(
    page,
    'action="/eserler"',
    "server search form",
  );
  contains(
    page,
    "currentPath = pageHref(filters, library.currentPage)",
    "catalog current discovery context",
  );
  contains(
    page,
    'const bookHref = `/kitap/${work.slug}?from=${encodeURIComponent(currentPath)}`',
    "context-preserving public book link",
  );
  contains(
    page,
    "href={bookHref}",
    "crawlable server-rendered book link",
  );
  contains(
    page,
    '"@type": "ItemList"',
    "structured item list",
  );
  contains(
    page,
    "Taslak, özel ve arşivlenmiş çalışmalar keşfe",
    "publication-boundary explanation",
  );
  contains(
    page,
    "bölüm metni okumak için oturum gerekir",
    "member reading boundary explanation",
  );
  notContains(
    page,
    '"use client"',
    "server-rendered discovery page",
  );
  notContains(
    page,
    "onClick=",
    "button-only work navigation",
  );
});

test("public work detail and related reads reject inactive author and work surfaces", () => {
  const repository = source(
    "src/features/works/repository.ts",
  );
  const memberPublic = source(
    "src/features/works/member-public-queries.ts",
  );
  const commonScope = source(
    "src/features/discovery/common-work-scope.ts",
  );

  contains(
    repository,
    'status: "active"',
    "public author status",
  );
  contains(
    repository,
    "deletedAt: null",
    "public author deletion state",
  );
  contains(
    repository,
    "archivedAt: null",
    "public work archive state",
  );
  contains(
    repository,
    "isActive: true",
    "public work active state",
  );
  contains(
    memberPublic,
    "isActive: true",
    "member public active state",
  );
  contains(
    commonScope,
    "isActive: true",
    "shared discovery active state",
  );
});

test("demo showcase works stay usable but are excluded from search indexing", () => {
  const safety = source("src/lib/public-content-safety.ts");
  const sitemap = source("src/app/sitemap.ts");
  const nextConfig = source("next.config.ts");

  contains(
    safety,
    'SEARCH_INDEX_EXCLUDED_PUBLIC_WORK_SLUG_PREFIXES = [\n  "demo-",',
    "demo work search exclusion namespace",
  );
  contains(
    safety,
    "isSearchIndexExcludedPublicWorkSlug",
    "shared public work search exclusion helper",
  );
  contains(
    sitemap,
    "!isSearchIndexExcludedPublicWorkSlug(work.slug)",
    "demo and blocked sitemap work filter",
  );
  contains(
    nextConfig,
    '"/kitap/(demo-.*)"',
    "demo work noindex route family",
  );
  contains(
    nextConfig,
    'value: "noindex, nofollow, noarchive"',
    "demo work robots exclusion header",
  );
  notContains(
    nextConfig,
    '"/kitap/:path*"',
    "real published works stay outside blanket noindex",
  );
});

test("landing, sitemap and production smoke keep retired public discovery closed", () => {
  const homepage = source("src/app/page.tsx");
  const homepageExperience = source(
    "src/features/homepage/HomepageExperience.tsx",
  );
  const nextConfig = source("next.config.ts");
  const publicNavigation = source("src/lib/public-site-navigation.ts");
  const sitemap = source("src/app/sitemap.ts");
  const smoke = source(
    ".github/workflows/production-smoke.yml",
  );
  const bookPage = source(
    "src/app/kitap/[slug]/page.tsx",
  );
  const showcase = source(
    "src/features/showcase/components/BookShowcase.tsx",
  );
  const nextConfig = source("next.config.ts");

  contains(
    homepage,
    'import HomepageExperience from "@/features/homepage/HomepageExperience"',
    "live homepage neutral experience import",
  );
  notContains(
    homepage,
    "onizleme/ana-sayfa-yeni",
    "live homepage preview namespace coupling",
  );
  contains(
    homepage,
    "robots: { index: true, follow: true }",
    "live homepage explicit indexability",
  );
  contains(
    nextConfig,
    "index: false",
    "preview route noindex",
  );
  contains(
    homepageExperience,
    '|| "/nasil-calisir"',
    "homepage safe public fallback",
  );
  notContains(
    homepageExperience,
    '|| "/eserler"',
    "paused discovery homepage fallback",
  );
  contains(
    publicNavigation,
    "export const publicDiscoveryEnabled = false",
    "shared public discovery pause flag",
  );
  for (const route of ["/eserler", "/yazarlar", "/turler"]) {
    notContains(
      publicNavigation,
      `href: "${route}"`,
      `retired public discovery link ${route}`,
    );
    notContains(
      sitemap,
      "url: `${baseUrl}" + route + "`",
      `retired sitemap route ${route}`,
    );
  }
  contains(
    publicNavigation,
    'href: "/nasil-calisir"',
    "active public navigation route",
  );
  contains(
    sitemap,
    "isSearchIndexExcludedPublicWorkSlug(work.slug)",
    "search-excluded sitemap work filter",
  );
  contains(
    sitemap,
    "isActive: true",
    "sitemap active work filter",
  );
  contains(
    sitemap,
    'status: "active"',
    "sitemap active author filter",
  );
  contains(
    sitemap,
    'language: "tr"',
    "sitemap Turkish scope",
  );
  notContains(
    sitemap,
    "const now = new Date()",
    "request-time static lastModified",
  );
  for (const route of [
    "https://ilkoku.com/eserler",
    "https://ilkoku.com/eserler/yeni",
    "https://ilkoku.com/eserler/guncellenen",
    "https://ilkoku.com/yazarlar",
    "https://ilkoku.com/turler",
  ]) {
    contains(
      smoke,
      `check_post_merge_public_route "${route}" "404"`,
      `paused production route check ${route}`,
    );
  }
  contains(
    smoke,
    'check_post_merge_public_route "https://ilkoku.com/eserler/rss.xml" "404"',
    "paused catalog RSS route check",
  );
  contains(
    smoke,
    'check_post_merge_body_excludes "https://ilkoku.com/sitemap.xml"',
    "paused discovery sitemap exclusion check",
  );
  notContains(
    smoke,
    'check_post_merge_public_route "https://ilkoku.com/eserler" "200"',
    "retired catalog production 200 expectation",
  );
  contains(
    bookPage,
    'return "/";',
    "public book safe fallback inventory",
  );
  notContains(
    bookPage,
    "publicDiscoveryEnabled",
    "retired book discovery gate",
  );
  contains(
    showcase,
    'returnTo = "/"',
    "public showcase safe fallback inventory",
  );
  notContains(
    showcase,
    "publicDiscoveryEnabled",
    "retired author link rendering gate",
  );
  for (const route of [
    '"/eserler/:path*"',
    '"/yazarlar/:path*"',
    '"/turler/:path*"',
    '"/yayinevleri/:path*"',
  ]) {
    contains(nextConfig, route, `paused discovery noindex ${route}`);
  }
  notContains(
    nextConfig,
    '"/kitap/:path*"',
    "published public work stays outside blanket noindex",
  );
});
