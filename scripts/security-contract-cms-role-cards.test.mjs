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

test("role card CMS keeps role identity and registration targets fixed", () => {
  const contract = source("src/lib/cms-role-cards.ts");
  const workbench = source("src/components/content/RoleCardsWorkbench.tsx");

  for (const [role, href] of [
    ["writer", "/kayit?rol=writer"],
    ["reader", "/kayit?rol=reader"],
    ["editor", "/kayit?rol=editor"],
    ["publisher", "/kayit?rol=publisher"],
  ]) {
    assertContains(contract, `${role}: { icon: "${role}"`, `${role} locked icon`);
    assertContains(contract, `fixedHref: "${href}"`, `${role} locked registration target`);
  }

  assertContains(workbench, "cmsRoleMeta[selected.key].fixedHref", "role card locked target display");
  assertNotContains(workbench, "CtaHref", "role card editable CTA target");
  assertNotContains(workbench, 'name={`${selected.key}Href`}', "role card editable registration target field");
});

test("role card workbench hides technical ordering mechanics from content managers", () => {
  const workbench = source("src/components/content/RoleCardsWorkbench.tsx");

  assertContains(workbench, "function moveSelected(direction: -1 | 1)", "role card direct reorder control");
  assertContains(workbench, "position: index + 1", "role card automatic normalized positions");
  assertContains(workbench, "↑ Yukarı", "role card move-up control");
  assertContains(workbench, "↓ Aşağı", "role card move-down control");
  assertNotContains(workbench, '<select name={`${role}Position`}', "legacy manual position selector");
  assertNotContains(workbench, "[1, 2, 3, 4].map((position)", "legacy manual ordering options");
});

test("role card hidden form payload cannot occupy workbench grid cells", () => {
  const workbench = source("src/components/content/RoleCardsWorkbench.tsx");

  assertContains(workbench, '<div key={`hidden-${card.key}`} style={{ display: "none" }} aria-hidden="true">', "hidden role-card payload wrapper");
  assertContains(workbench, 'name={`${card.key}Title`}', "hidden title payload remains submitted");
  assertContains(workbench, 'name={`${card.key}Position`}', "hidden ordering payload remains submitted");
  assertNotContains(workbench, '<div key={`hidden-${card.key}`}>', "layout-participating hidden payload wrapper");
});

test("role card side panes always move with the document while only the save bar may stay sticky", () => {
  const workbench = source("src/components/content/RoleCardsWorkbench.tsx");
  const styles = source("src/components/content/RoleCardsWorkbench.module.css");

  assertContains(workbench, 'const flowingPaneStyle = { position: "static" as const, maxHeight: "none", overflow: "visible" };', "forced normal-flow pane style");
  assertContains(workbench, '<aside className={styles.roleRail} style={flowingPaneStyle}', "role rail normal-flow override");
  assertContains(workbench, '<aside className={styles.previewPane} style={flowingPaneStyle}>', "preview pane normal-flow override");
  assertContains(styles, ".saveBar {\n  position: sticky;", "save bar remains sticky");
});

test("role card workbench provides focused editing, live preview and safe publish handoff", () => {
  const workbench = source("src/components/content/RoleCardsWorkbench.tsx");

  assertContains(workbench, "selectedKey", "single selected role editor");
  assertContains(workbench, "Anlık önizleme", "unsaved live preview");
  assertContains(workbench, "Kaydedilmemiş değişiklik var", "dirty state visibility");
  assertContains(workbench, "hasDraft && !dirty", "publish requires saved draft without local changes");
  assertContains(workbench, "Taslağı Kaydet", "explicit draft save");
  assertContains(workbench, "Publicte gösteriliyor", "human visibility control");
  assertContains(workbench, "Kaydedilmiş taslağı tam sayfada gör", "saved preview deep link");
});

test("role card draft and publish flow preserves CMS permission and locale boundaries", () => {
  const actions = source("src/features/cms/role-card-actions.ts");
  const integrity = source("src/lib/cms-live-payload-integrity.ts");

  assertContains(actions, 'requireCmsManager("/icerik/rol-kartlari")', "role card draft manager boundary");
  assertContains(actions, 'requireCmsPublisher("/icerik/rol-kartlari")', "role card publish boundary");
  assertContains(actions, "isCmsLocaleEnabled(locale)", "role card locale publish lock");
  assertContains(actions, "roleCardsDraftKey(locale)", "role card staged draft key");
  assertContains(actions, "deleteCmsDraft(draftKey)", "role card draft cleanup after publish");
  assertContains(integrity, 'contentKey.startsWith("role-cards:")', "role card staged payload integrity boundary");
  assertContains(integrity, "parseCmsRoleCardsPayloadStrict", "role card strict payload parser");
});

test("role card payload enforces complete cards and unique ordering", () => {
  const contract = source("src/lib/cms-role-cards.ts");

  assertContains(contract, '["Title", "Description", "CtaLabel", "Highlight1", "Highlight2"]', "role card required fields");
  assertContains(contract, 'visible !== "true" && visible !== "false"', "role card visibility enum");
  assertContains(contract, '!/^[1-4]$/.test(positionRaw)', "role card position range");
  assertContains(contract, "positions.has(position)", "role card duplicate position rejection");
  assertContains(contract, "positions.size !== cmsRoleKeys.length", "role card complete ordering requirement");
});

test("role cards are a dedicated CMS module with fail-safe public delivery", () => {
  const modules = source("src/lib/cms-modules.ts");
  const api = source("src/app/api/site-content/role-cards/route.ts");
  const hydrator = source("src/components/content/PublicCmsHydrator.tsx");
  const english = source("src/app/en/page.tsx");
  const queue = source("src/app/icerik/yayin-kuyrugu/page.tsx");

  assertContains(modules, 'href: "/icerik/rol-kartlari"', "role card CMS navigation");
  assertContains(api, "getPublishedRoleCardsState(locale)", "role card public published-state read");
  assertContains(api, 'status: 503', "role card corrupt/unavailable fail-safe response");
  assertContains(hydrator, 'fetch("/api/site-content/role-cards?dil=tr"', "TR public role card hydration");
  assertContains(hydrator, "if (cancelled || !payload?.published", "TR role card fallback boundary");
  assertContains(hydrator, "element.hidden = !card.visible", "TR role card visibility control");
  assertContains(hydrator, 'querySelector<HTMLElement>(".landing-role__number")', "TR role card order number synchronization");
  assertContains(english, 'getPublishedRoleCardsState("en")', "EN published role card read");
  assertContains(english, 'roleCardsDefaults("en")', "EN safe role card fallback");
  assertContains(queue, 'type: "role-cards"', "role card central publish queue type");
  assertContains(queue, "parseCmsRoleCardsPayloadStrict(row.valueJson)", "role card queue strict validation");
  assertContains(queue, "publishRoleCardsAction", "role card queue canonical publish action");
  assertContains(queue, 'editHref: `/icerik/rol-kartlari?dil=${locale}`', "role card queue editor deep link");
});
