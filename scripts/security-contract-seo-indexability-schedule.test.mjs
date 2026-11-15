import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);

test("SEO indexability smoke runs weekly without weakening manual confirmation", () => {
  const workflow = source(".github/workflows/seo-indexability-smoke.yml");

  contains(workflow, 'cron: "15 6 * * 2"', "weekly Tuesday SEO smoke");
  contains(
    workflow,
    "if: github.event_name == 'workflow_dispatch'",
    "manual confirmation only applies to manual runs",
  );
  contains(
    workflow,
    'test "$CONFIRMATION" = "RUN-SEO-DIAGNOSTIC"',
    "manual confirmation remains explicit",
  );
  contains(
    workflow,
    "REQUEST_DELAY_SECONDS=5",
    "low-impact request pacing remains enabled",
  );
  contains(
    workflow,
    'if [[ "$code" == "403" || "$code" == "429" ]]',
    "crawler circuit breaker remains enabled",
  );
  contains(
    workflow,
    "check_noindex_page",
    "soft-launch crawlable noindex verification helper",
  );
  contains(
    workflow,
    "PASS: soft-launch index targets and crawlable noindex routes verified.",
    "scheduled smoke verifies the temporary search policy",
  );
  contains(
    workflow,
    "grep -Fq '<loc>https://ilkoku.com/en-cok-satanlar/dunya</loc>' \"$sitemap\"",
    "public global bestseller page is included in sitemap",
  );
});


test("robots permits all AI and search crawlers; Cloudflare prepend must be disabled separately", () => {
  const robots = source("src/app/robots.ts");
  contains(robots, 'userAgent: "*"', "one default user-agent policy");
  contains(robots, 'allow: "/"', "sitewide crawler permission");
  assert.equal(robots.includes("disallow:"), false, "no origin robots.txt deny rules");
  contains(robots, 'sitemap: `${baseUrl}/sitemap.xml`', "sitemap untouched");
  contains(robots, '"/",', "public pages remain crawlable");
  const smoke = source(".github/workflows/seo-indexability-smoke.yml");
  contains(smoke, "grep -Eqi '^[[:space:]]*(Disallow|Content-Signal)[[:space:]]*:' \"$robots\"", "live smoke catches all Disallow and managed Content-Signal directives");
  assert.equal(smoke.includes("Disallow: /(admin|icerik|api"), false, "legacy path-only restriction matcher must not come back");
});


test("robots smoke rejects global blocks, AI-specific denies and managed training restrictions", () => {
  const pattern = "^[[:space:]]*(Disallow|Content-Signal)[[:space:]]*:";
  const examples = [
    { body: "User-agent: *\\nAllow: /\\nDisallow: /\\n", blocked: true },
    { body: "User-agent: GPTBot\\nDisallow: /\\n", blocked: true },
    { body: "Content-Signal: search=yes,ai-train=no\\nUser-agent: *\\nAllow: /\\n", blocked: true },
    { body: "User-agent: *\\nAllow: /\\nSitemap: https://ilkoku.com/sitemap.xml\\n", blocked: false },
  ];
  for (const { body, blocked } of examples) {
    const result = spawnSync("grep", ["-Eqi", pattern], { input: body.replaceAll("\\\\n", "\\n"), encoding: "utf8" });
    assert.equal(result.error, undefined, "grep must be available to validate the live smoke pattern");
    assert.equal(result.status, blocked ? 0 : 1, `unexpected crawler rule match for ${JSON.stringify(body)}`);
  }
});
