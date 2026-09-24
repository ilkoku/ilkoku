import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(".github/workflows/gsc-url-inspection.yml", "utf8");
const script = fs.readFileSync("scripts/gsc-url-inspection.mjs", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const docs = fs.readFileSync("docs/seo-sprint11-status.md", "utf8");

test("GSC URL Inspection diagnostic is manual and read-only", () => {
  assert.match(workflow, /workflow_dispatch:/u);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/u);
  assert.doesNotMatch(workflow, /\n\s+push:/u);
  assert.match(workflow, /RUN-GSC-URL-INSPECTION/u);
  assert.match(workflow, /secrets\.GSC_OAUTH_CLIENT_ID/u);
  assert.match(workflow, /secrets\.GSC_OAUTH_CLIENT_SECRET/u);
  assert.match(workflow, /secrets\.GSC_OAUTH_REFRESH_TOKEN/u);
});

test("inspection script only calls the Search Console inspection endpoint", () => {
  assert.match(script, /https:\/\/searchconsole\.googleapis\.com\/v1\/urlInspection\/index:inspect/u);
  assert.match(script, /https:\/\/oauth2\.googleapis\.com\/token/u);
  assert.doesNotMatch(script, /indexing\.googleapis\.com/u);
  assert.match(script, /sc-domain:ilkoku\.com/u);
  assert.match(script, /MAX_URLS = 10/u);
  assert.match(script, /Diagnostic only/u);
});

test("package and docs expose the official diagnostic path", () => {
  assert.equal(pkg.scripts["seo:gsc:inspect"], "node scripts/gsc-url-inspection.mjs");
  assert.match(docs, /GSC URL Inspection diagnostic/u);
  assert.match(docs, /webmasters\.readonly/u);
  assert.match(docs, /does not request indexing|dizine ekleme isteği göndermez/iu);
});
