import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = process.cwd();

function source(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

test("canonical homepage no longer depends on a live preview route", () => {
  const homepage = source("src/app/page.tsx");
  const history = source("src/features/homepage/history-670.tsx");
  const nextConfig = source("next.config.ts");

  assert.ok(homepage.includes('@/features/homepage/HomepageExperience'), "homepage must use the canonical homepage feature");
  assert.equal(existsSync(join(ROOT, "src/app/onizleme/ana-sayfa-yeni/page.tsx")), false, "retired preview page must not return");
  assert.ok(history.includes('/api/site-assets/home-history/'), "history artwork must use canonical site-asset endpoints");
  assert.ok(nextConfig.includes('source: "/onizleme/ana-sayfa-yeni"'), "legacy preview URL must keep compatibility redirect");
});

test("CI performs expensive structural preparation once", () => {
  const ci = source(".github/workflows/ci.yml");

  assert.ok(ci.includes("run: npm run audit:supply-chain"), "CI must keep the explicit supply-chain audit");
  assert.ok(ci.includes("run: node scripts/generate-system-map-runtime-manifest.mjs"), "CI must generate the system map once");
  assert.ok(ci.includes("run: npx eslint"), "CI lint must not re-enter npm lint preparation");
  assert.ok(ci.includes("npx prisma generate"), "CI build must generate Prisma client");
  assert.ok(ci.includes("npx next build"), "CI build must invoke Next directly");
  assert.equal(ci.includes("run: npm run lint"), false, "CI must not repeat system-map preparation through npm lint");
  assert.equal(ci.includes("npm run build:ci"), false, "CI must not repeat system-map preparation through build:ci");
});

test("IndexNow resolves changed public URLs before falling back to full sitemap", () => {
  const workflow = source(".github/workflows/indexnow-submit.yml");

  assert.ok(workflow.includes('git diff --name-only "$BEFORE_SHA" "$CURRENT_SHA"'), "IndexNow must inspect the push diff");
  assert.ok(workflow.includes('full_submit = "__FULL_SUBMIT__" in changed'), "IndexNow must support explicit full fallback");
  assert.ok(workflow.includes('candidates.add(f"{base}/")'), "homepage changes must map to the homepage URL");
  assert.ok(workflow.includes('urls = sitemap_urls if full_submit else sorted(candidates & sitemap_set)'), "IndexNow must submit only mapped sitemap URLs when safe");
  assert.ok(workflow.includes("No changed indexable public URLs; skipping IndexNow submission."), "private-only pushes must be skippable");
});
