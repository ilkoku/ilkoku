import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function contains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function notContains(text, fragment, label) {
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("History is a first-class homepage CMS section with staged publish semantics", () => {
  const store = source("src/lib/cms-homepage-store.ts");
  const actions = source("src/features/cms/actions.ts");
  const integrity = source("src/lib/cms-live-payload-integrity.ts");
  const api = source("src/app/api/site-content/homepage/route.ts");
  const health = source("src/lib/cms-health-integrity.ts");

  contains(store, '"history"', "homepage History allowlist");
  contains(actions, "saveHomepageHistoryAction", "History draft action");
  contains(actions, "publishHomepageHistoryAction", "History publish action");
  contains(actions, 'saveHomepageSection(user!.id, locale, "history", value)', "History staged draft namespace");
  contains(actions, 'publishHomepageSection(user!.id, localeFromForm(formData), "history")', "History isolated publish path");
  contains(integrity, 'contentKey === "history"', "History strict payload validation");
  contains(api, '"history"', "homepage public API History allowlist");
  contains(health, "'history'", "CMS health History integrity coverage");
});

test("History workbench exposes the complete 15-piece content puzzle without layout controls", () => {
  const pagePath = "src/app/icerik/ana-sayfa/history/page.tsx";
  assert.ok(existsSync(join(ROOT, pagePath)), `${pagePath} must exist`);
  const page = source(pagePath);

  for (const field of [
    "backgroundColor",
    "headerEyebrow",
    "headerTitleBefore",
    "headerTitleEmphasis",
    "headerTitleAfter",
    "headerDescriptionLine1",
    "headerDescriptionLine2",
    "card1Era", "card1Title", "card1Body", "card1Note", "card1Image", "card1ImageAlt",
    "card2Era", "card2Title", "card2Body", "card2Note", "card2Image", "card2ImageAlt",
    "card3Era", "card3Title", "card3Body", "card3Note", "card3Image", "card3ImageAlt",
    "card4Era", "card4Title", "card4Body", "card4Note", "card4Image", "card4ImageAlt",
    "leftVisual", "leftVisualAlt",
    "nowVisible", "nowBackground", "nowEyebrow", "nowTitleLine1", "nowTitleLine2",
    "nowStep1Image", "nowStep1Text", "nowStep2Image", "nowStep2Text",
    "nowStep3Image", "nowStep3Text", "nowStep4Image", "nowStep4Text",
    "nowQuestion", "nowTagline", "nowBrand", "nowSealImage", "nowSealAlt", "nowSealVisible",
  ]) {
    contains(page, field, `History CMS field ${field}`);
  }

  contains(page, 'href="/icerik/medya"', "History media library bridge");
  contains(page, "Kart ölçüleri, grid ve tipografi geometrisi kodda kilitlidir", "locked visual geometry contract");
  notContains(page, "widthControl", "no CMS width control");
  notContains(page, "topControl", "no CMS position control");
});

test("public History is assembled from independent semantic layers, never the legacy master image", () => {
  const component = source("src/features/landing/history-inspiration.tsx");
  const defaults = source("src/features/landing/history-content.ts");
  const css = source("src/app/landing-history.css");

  contains(component, "landing-history__cards", "independent History cards layer");
  contains(component, "landing-history__left-visual", "independent left decorative layer");
  contains(component, "landing-history-now__steps", "independent 2026 step layer");
  contains(component, "landing-history-now__seal", "independent seal layer");
  contains(component, 'getPublishedHomepageState("tr")', "published CMS History source");
  contains(defaults, "card1Image", "independent card 1 image source");
  contains(defaults, "card4Image", "independent card 4 image source");
  contains(defaults, "leftVisual", "independent left visual source");
  contains(defaults, "nowSealImage", "independent seal source");
  contains(css, "grid-template-columns: repeat(4", "locked four-card desktop grid");

  for (const legacy of ["history-journey-master.png", "history-journey-final.webp", "history-journey-locked.png"]) {
    notContains(component, legacy, `public History must not use ${legacy}`);
    notContains(defaults, legacy, `History defaults must not use ${legacy}`);
  }
});

test("History CMS route is visible to both CMS navigation and Harita source dependency discovery", () => {
  const modules = source("src/lib/cms-modules.ts");
  const generator = source("scripts/generate-system-map-runtime-manifest.mjs");
  const historyPage = source("src/app/icerik/ana-sayfa/history/page.tsx");

  contains(modules, 'href: "/icerik/ana-sayfa/history"', "CMS History navigation route");
  contains(generator, "sourceRouteFilePattern", "Harita route source discovery");
  contains(generator, "resolveImport", "Harita transitive import discovery");
  contains(historyPage, 'from "@/features/cms/actions"', "History route to server action dependency");
  contains(historyPage, 'from "@/lib/prisma"', "History route data dependency evidence");
});
