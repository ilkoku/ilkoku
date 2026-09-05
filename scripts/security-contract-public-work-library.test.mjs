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

test("public work detail and related reads reject inactive author surfaces", () => {
  const repository = source(
    "src/features/works/repository.ts",
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
});

test("landing, sitemap and production smoke preserve paused public discovery inventory without exposing it", () => {
  const homepage = source("src/app/page.tsx");
  const homepageExperience = source(
    "src/app/onizleme/ana-sayfa-yeni/HomepageExperience.tsx",
  );
  const homepagePreview = source(
    "src/app/onizleme/ana-sayfa-yeni/page.tsx",
  );
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
    'import HomepageExperience from "./onizleme/ana-sayfa-yeni/HomepageExperience"',
    "live homepage neutral experience import",
  );
  notContains(
    homepage,
    'from "./onizleme/ana-sayfa-yeni/page"',
    "live homepage preview route coupling",
  );
  contains(
    homepage,
    "robots: { index: true, follow: true }",
    "live homepage explicit indexability",
  );
  contains(
    homepagePreview,
    "index: false",
    "preview route noindex",
  );
  contains(
    homepageExperience,
    '|| "/eserler"',
    "homepage discovery fallback",
  );
  contains(
    publicNavigation,
    "export const publicDiscoveryEnabled = false",
    "shared public discovery pause flag",
  );
  contains(
    publicNavigation,
    "export const publicDiscoveryNavigationEnabled = publicDiscoveryEnabled",
    "navigation consumes shared public discovery flag",
  );
  for (const route of ["/eserler", "/yazarlar", "/turler", "/nasil-calisir"]) {
    contains(
      publicNavigation,
      `href: "${route}"`,
      `reserved public discovery link ${route}`,
    );
  }
  contains(
    sitemap,
    'url: `${baseUrl}/eserler`',
    "catalog sitemap inventory entry",
  );
  contains(
    sitemap,
    "...(publicDiscoveryEnabled ? publicDiscoveryStaticEntries : [])",
    "paused discovery sitemap gate",
  );
  contains(
    sitemap,
    "isBlockedPublicWorkSlug(work.slug)",
    "blocked sitemap work filter",
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
    'return "/eserler"',
    "public book fallback inventory",
  );
  contains(
    showcase,
    'returnTo = "/eserler"',
    "public showcase fallback inventory",
  );
  notContains(
    nextConfig,
    '"/eserler/:path*"',
    "catalog private noindex header",
  );
});
