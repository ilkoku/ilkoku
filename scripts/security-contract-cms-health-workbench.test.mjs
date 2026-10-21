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

test("CMS overview promotes health integrity signals without duplicating the health engine", () => {
  const dashboard = source("src/app/icerik/page.tsx");
  const adapter = source("src/lib/cms-dashboard-integrity.ts");

  assertContains(dashboard, "getCmsOperationalIntegrity()", "dashboard reads canonical integrity engine");
  assertContains(dashboard, "getCmsDashboardIntegritySignals(data.integrity)", "dashboard integrity adapter");
  assertContains(dashboard, 'href: "/icerik/saglik?durum=blocker#kontroller"', "dashboard blocker deep link");
  assertContains(dashboard, 'href: "/icerik/saglik?durum=warn#kontroller"', "dashboard warning deep link");
  assertContains(dashboard, "Bütünlük blokajı", "dashboard integrity blocker metric");
  assertContains(dashboard, "Bütünlük uyarısı", "dashboard integrity warning metric");
  assertContains(adapter, "integrity.invalidPublishedHomepage", "dashboard published-homepage blocker signal");
  assertContains(adapter, "integrity.invalidPublishedFaqs", "dashboard published-faq blocker signal");
  assertContains(adapter, "integrity.invalidPublishedPages", "dashboard published-page blocker signal");
  assertContains(adapter, "integrity.brokenDatabaseMedia", "dashboard media-service blocker signal");
  assertNotContains(adapter, "invalidForms", "dashboard does not promote form PII integrity detail globally");
  assertNotContains(adapter, "prisma", "dashboard adapter does not create a second integrity query engine");
});

test("public FAQ API reports read failures without pretending there are no published FAQs", () => {
  const route = source("src/app/api/content-faq/route.ts");

  assertContains(route, "WHERE namespace = ${namespace}", "locale-specific FAQ namespace");
  assertContains(route, "status = 'published'", "only published FAQ records are public");
  assertContains(route, "return NextResponse.json({ locale, enabled: true, items });", "successful empty or populated reads retain normal API shape");
  assertContains(route, 'error: "faq_read_failed"', "safe public read error code");
  assertContains(route, "status: 503", "database read failure is not HTTP 200");
  assertContains(route, '"Cache-Control": "no-store"', "failed reads must not be cached");
  assertContains(route, "console.error", "server-side diagnostic is retained");
  assertNotContains(route, "catch {\n    return NextResponse.json({ locale, enabled: true, items: [] });", "silently masking query failures");
});

test("approved Turkish starter FAQ publication migration is scoped, one-shot and text-preserving", () => {
  const sql = source("prisma/migrations/20261021134000_publish_approved_starter_faqs/migration.sql");
  const approved = [
    "item_starter_ilkoku_nedir",
    "item_starter_yazar_yayin",
    "item_starter_editor_inceleme",
    "item_starter_yayinevi_kesif",
  ];

  assertContains(sql, "UPDATE `SiteContent`", "updates existing FAQ records instead of inserting");
  assertContains(sql, "`namespace` = 'faq'", "only default Turkish FAQ namespace");
  assertContains(sql, "`status` = 'draft'", "only previously-unpublished FAQ drafts");
  assertContains(sql, "`publishedAt` IS NULL", "only unpublished records");
  assertContains(sql, "JSON_VALID(`valueJson`)", "invalid payloads remain unpublished");
  assertContains(sql, "'$.answer'", "publishes only FAQ records with an answer");
  assertContains(sql, "'$.question'", "checks approved question titles");
  assertContains(sql, "`status` = 'published'", "publication changes only status and timestamps");
  assertContains(sql, "CURRENT_TIMESTAMP(3)", "published timestamp is set");
  for (const key of approved) {
    const matches = sql.match(new RegExp(key, "g")) ?? [];
    assert.equal(matches.length, 1, `exactly one guarded entry for ${key}`);
  }
  assert.equal((sql.match(/\`contentKey\` =/g) ?? []).length, approved.length, "no extra FAQ keys");
  assertNotContains(sql, "INSERT INTO", "does not generate new content");
  assertNotContains(sql, "DELETE FROM", "does not delete existing content");
  assertNotContains(sql, "`valueJson` =", "does not rewrite approved texts");
  assertNotContains(sql, "`updatedById` =", "preserves the original editor identity");
});
