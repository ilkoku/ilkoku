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

test("landing, sitemap and production smoke form one public discovery graph", () => {
  const homepage = source("src/app/page.tsx");
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
    '|| "/eserler"',
    "homepage discovery fallback",
  );
  contains(
    homepage,
    '<Link href="/eserler">Eserler</Link>',
    "homepage footer discovery link",
  );
  contains(
    sitemap,
    'url: `${baseUrl}/eserler`',
    "catalog sitemap entry",
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
  contains(
    smoke,
    'check_post_merge_public_route "https://ilkoku.com/eserler" "200"',
    "catalog production route check",
  );
  contains(
    smoke,
    '"https://ilkoku.com/eserler"',
    "catalog sitemap production check",
  );
  contains(
    bookPage,
    'return "/eserler"',
    "public book fallback",
  );
  contains(
    showcase,
    'returnTo = "/eserler"',
    "public showcase fallback",
  );
  notContains(
    nextConfig,
    '"/eserler/:path*"',
    "catalog private noindex header",
  );
});
