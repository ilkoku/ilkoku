import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const route = fs.readFileSync("src/app/api/internal/seo-sitemap-inventory/route.ts", "utf8");
const workflow = fs.readFileSync(".github/workflows/seo-sitemap-data-parity.yml", "utf8");
const sitemapSource = fs.readFileSync("src/lib/seo/sitemap-data.ts", "utf8");
const auditScript = "scripts/seo-sitemap-data-parity.mjs";

test("Independent DB work eligibility tracks sitemap's production predicates", () => {
  for (const predicate of [
    "archivedAt: null", 'not: "adult_18"', "deletedAt: null",
    'status: "active"', "isActive: true", 'language: "tr"',
    "publishedAt:", 'status: "published"', 'visibility: "public"',
  ]) {
    assert.ok(route.includes(predicate), "Missing independent DB predicate: " + predicate);
    assert.ok(sitemapSource.includes(predicate), "Sitemap drifted from DB predicate: " + predicate);
  }
  assert.match(route, /isSearchIndexExcludedPublicWorkSlug/u);
  assert.match(route, /isSoftLaunchSearchExcludedPath/u);
  assert.match(route, /ContentPage/u);
  assert.match(route, /dataSource: "production-database"/u);
});

test("Production inventory endpoint is private, bounded and fails closed", () => {
  for (const fragment of [
    "createRemoteJWKSet", "jwtVerify", "payload.repository_id === repositoryId",
    "payload.workflow_ref === workflowRef", "status: 401", "status: 503",
    "INVENTORY_QUERY_LIMIT", "noindex, nofollow", "no-store",
  ]) assert.ok(route.includes(fragment), "Missing endpoint safety contract: " + fragment);
  assert.doesNotMatch(route, /process\.env\.DATABASE_URL|console\.log\(.+token/u);
});

test("Audit is read-only and only runs after a successful main-branch smoke", () => {
  for (const fragment of [
    "workflow_run:", "Production smoke", "id-token: write", "contents: read",
    "X-IlkOku-GitHub-OIDC", "Circuit breaker", "seo-sitemap-data-parity.mjs",
  ]) assert.ok(workflow.includes(fragment), "Missing audit workflow guard: " + fragment);
  assert.doesNotMatch(workflow, /schedule:|k6 |prisma migrate|git push|index:inspect/u);
});

function runCheck({ workUrls, cmsUrls, urls, dataSource = "production-database" }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ilkoku-sitemap-parity-"));
  try {
    const inventoryPath = path.join(dir, "inventory.json");
    const xmlPath = path.join(dir, "sitemap.xml");
    fs.writeFileSync(inventoryPath, JSON.stringify({
      ok: true, dataSource, observedAt: "2026-10-13T16:00:00Z",
      workUrls, cmsUrls, publishedTurkishCmsPageCount: cmsUrls.length,
    }));
    fs.writeFileSync(xmlPath,
      "<urlset>\n" + urls.map((url) => "<url><loc>" + url + "</loc></url>").join("\n") + "\n</urlset>");
    return spawnSync(process.execPath, [auditScript, inventoryPath, xmlPath], {
      encoding: "utf8", timeout: 10_000,
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const base = Array.from({ length: 128 }, (_, i) =>
  "https://ilkoku.com/public-" + i);
const workUrl = "https://ilkoku.com/kitap/yayimlanmis-eser";
const cmsUrl = "https://ilkoku.com/yardim";

test("Correct, independently verified DB parity passes", () => {
  const result = runCheck({
    workUrls: [workUrl], cmsUrls: [cmsUrl], urls: [...base, workUrl, cmsUrl],
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"missingWorkCount":0/u);
  assert.match(result.stdout, /"missingCmsCount":0/u);
});

test("Missing published work and missing public CMS page both fail", () => {
  for (const testCase of [
    { workUrls: [workUrl], cmsUrls: [], urls: base },
    { workUrls: [], cmsUrls: [cmsUrl], urls: base },
  ]) assert.equal(runCheck(testCase).status, 1);
});

test("Unexpected work or gated Book Index path fails", () => {
  for (const url of [
    "https://ilkoku.com/kitap/test-private",
    "https://ilkoku.com/en-cok-satanlar/turkiye",
  ]) {
    assert.equal(runCheck({
      workUrls: [], cmsUrls: [], urls: [...base, url],
    }).status, 1);
  }
});

test("Static fallback cannot pass independent production DB evidence", () => {
  assert.notEqual(runCheck({
    workUrls: [], cmsUrls: [], urls: base, dataSource: "static-fallback",
  }).status, 0);
});
