import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("TR-only SEO scope has no English sitemap, public routes or role-card audit work", () => {
  const sitemap = source("src/app/sitemap.ts");
  const seo = source("src/app/icerik/seo/page.tsx");
  const roleCards = source("src/app/icerik/seo/SeoRoleCardsAudit.tsx");
  const localeState = source("src/lib/cms-locale-state.ts");

  assert.equal(sitemap.includes("/en"), false, "sitemap must not publish EN URLs");
  assert.equal(seo.includes("TR + EN"), false, "SEO workbench must not advertise bilingual scope");
  assert.equal(roleCards.includes('getPublishedRoleCardsState("en")'), false, "role-card audit must not read EN state");
  assert.equal(roleCards.includes("TR / EN"), false, "role-card audit must not run parity checks");
  assert.equal(existsSync(join(ROOT, "src/app/en/page.tsx")), false, "unused EN homepage route must stay removed");
  assert.equal(existsSync(join(ROOT, "src/app/en/yardim/page.tsx")), false, "unused EN help route must stay removed");
  assert.ok(localeState.includes('disabledPublicLocales = new Set<CmsLocaleCode>(["en"])'), "EN must remain hard-disabled in public locale state");
});
