import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const source = readFileSync(join(process.cwd(), "src/app/[...path]/page.tsx"), "utf8");

test("CMS page database failures are not disguised as missing pages", () => {
  const loadPage = source.split("async function loadPublicPage(source: string) {")[1]?.split("\nexport async function generateMetadata")[0];
  assert.ok(loadPage, "CMS page lookup must exist");
  assert.match(loadPage, /await prisma\.\$queryRaw<PublicPageRow\[\]>/);
  assert.doesNotMatch(loadPage, /catch\s*\{/);
  assert.match(loadPage, /return rows\[0\] \?\? null/);
});

test("CMS redirect database failures are not disguised as 404s", () => {
  const renderPage = source.split("export default async function CmsPageOrRedirectFallback")[1];
  assert.ok(renderPage, "fallback route must exist");
  assert.match(renderPage, /const rows = await prisma\.\$queryRaw<RedirectRow\[\]>/);
  assert.doesNotMatch(renderPage, /catch\s*\{\s*notFound\(\);\s*\}\s*const value/);
  assert.match(renderPage, /if \(!value \|\| value\.source !== normalizedSource\) notFound\(\)/);
});
