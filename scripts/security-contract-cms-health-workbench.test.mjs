import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function assertNotContains(text, fragment, label) {
  assert.equal(text.includes(fragment), false, `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("CMS health keeps the existing integrity engine behind the manager boundary", () => {
  const page = source("src/app/icerik/saglik/page.tsx");

  assertContains(page, 'requireCmsManager("/icerik/saglik")', "health manager boundary");
  assertContains(page, "getCmsOperationalIntegrity()", "health operational integrity engine");
  assertContains(page, "getCmsLocaleStates()", "health locale integrity source");
  assertContains(page, "HealthMetricCards", "health metric summary retained");
  assertContains(page, "HealthOperationsWorkbench", "health intervention workbench handoff");
  assertNotContains(page, "content-list-row", "legacy grouped health report removed");
  assertNotContains(page, "levelStyle(check.level)", "legacy inline health row renderer removed");
});

test("CMS health workbench prioritizes diagnosis and delegates fixes to canonical modules", () => {
  const workbench = source("src/app/icerik/saglik/HealthOperationsWorkbench.tsx");

  assertContains(workbench, "Kontrol kuyruğu", "health prioritized queue");
  assertContains(workbench, "Seçili kontrol", "health selected detail");
  assertContains(workbench, "Teşhis", "health diagnosis section");
  assertContains(workbench, "Etki", "health impact section");
  assertContains(workbench, "Sonraki adım", "health next step section");
  assertContains(workbench, "priority[a.level] - priority[b.level]", "health severity ordering");
  assertContains(workbench, "selected.href", "health canonical deep link source");
  assertContains(workbench, "canonical CMS modülünde", "health no-duplicate-write guidance");
  assertContains(workbench, "BLOCKER", "health blocker visibility");
  assertContains(workbench, "WARN", "health warning visibility");
  assertNotContains(workbench, "saveCms", "health must not create CMS write action");
  assertNotContains(workbench, "publish", "health must not create publish mutation");
});
