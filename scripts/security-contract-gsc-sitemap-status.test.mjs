import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("scripts/gsc-sitemap-status.mjs", "utf8");

test("GSC sitemap status never publishes Google's deprecated indexed field", () => {
  assert.doesNotMatch(source, /indexed:\s*entry\.indexed\b/);
  assert.match(source, /submitted:\s*entry\.submitted/);
});

test("A missing sitemap in Google Search Console fails closed, including HTTP 404", () => {
  assert.match(source, /if \(!status\.found\) \{/);
  assert.match(source, /process\.exitCode = 1;/);
  assert.doesNotMatch(source, /!status\.found\s*&&\s*status\.httpStatus\s*!==\s*404/);
});
