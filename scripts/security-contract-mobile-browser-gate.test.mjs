import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = process.cwd();

function source(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

test("mobile browser gate covers canonical phone and tablet widths across public and auth surfaces", () => {
  const smoke = source("scripts/mobile-browser-smoke.mjs");
  const ci = source(".github/workflows/ci.yml");

  for (const width of ["390", "430", "768"]) {
    assert.ok(smoke.includes(`width: ${width}`), `mobile browser smoke must keep ${width}px viewport`);
  }

  for (const route of ["/", "/hakkimizda", "/nasil-calisir", "/yardim", "/giris", "/kayit"]) {
    assert.ok(smoke.includes(`path: "${route}"`), `mobile browser smoke must cover ${route}`);
  }

  assert.ok(smoke.includes("horizontal overflow"), "mobile gate must fail on horizontal overflow");
  assert.ok(smoke.includes("undersized controls"), "mobile gate must inspect touch controls");
  assert.ok(ci.includes("Run mobile browser smoke"), "CI must execute the mobile browser gate");
  assert.ok(ci.includes("Upload mobile browser screenshots"), "CI must preserve browser evidence");
});
