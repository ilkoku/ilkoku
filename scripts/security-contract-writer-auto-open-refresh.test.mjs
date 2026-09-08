import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");

test("auto-open writer route hides the management scaffold until the editor owns the viewport", () => {
  const page = source("src/app/yazmaya-devam/page.tsx");
  const guard = source("src/features/writer/components/WriterAutoOpenRefreshGuard.tsx");
  const css = source("src/app/yazmaya-devam/auto-open-refresh-guard.css");

  assert.ok(page.includes("WriterAutoOpenRefreshGuard"));
  assert.ok(page.includes("continue-writing--auto-open"));
  assert.ok(page.includes("autoOpen"));

  assert.ok(guard.includes('flowOpenClass = "writer-flow-open"'));
  assert.ok(guard.includes('hydratedClass = "writer-auto-open-hydrated"'));
  assert.ok(guard.includes("MutationObserver"));

  assert.ok(css.includes("body:has(.continue-writing--auto-open):not(.writer-auto-open-hydrated)"));
  assert.ok(css.includes("body.writer-flow-open:has(.continue-writing--auto-open)"));
  assert.ok(css.includes("visibility: hidden"));
});
