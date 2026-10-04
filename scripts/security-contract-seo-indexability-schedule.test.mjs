import assert from "node:assert/strict";
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
    "! grep -Fq '<loc>https://ilkoku.com/en-cok-satanlar' \"$sitemap\"",
    "Book Index stays excluded from sitemap during soft launch",
  );
});
