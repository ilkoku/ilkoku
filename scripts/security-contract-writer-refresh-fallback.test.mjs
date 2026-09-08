import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(ROOT, "src/styles/light-purple-route-fallback.css"), "utf8");

test("writer hard-refresh fallback matches the light manuscript canvas", () => {
  assert.ok(css.includes('html:has(.app-shell[data-role="writer"])'));
  assert.ok(css.includes('body:has(.app-shell[data-role="writer"])'));
  assert.ok(css.includes("background: #efede7 !important;"));
  assert.ok(css.includes("color-scheme: light;"));

  const writerRule = css.slice(css.indexOf('html:has(.app-shell[data-role="writer"])'));
  assert.ok(!writerRule.includes("#0b0d10"), "writer refresh fallback must not return to black");
  assert.ok(!writerRule.includes("color-scheme: dark"), "writer refresh fallback must stay light");
});
