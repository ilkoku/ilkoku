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

test("editor education keeps eight professional routes, shared shell and sitemap coverage", () => {
  const inventory = source("src/lib/editor-education.ts");
  const publicRoute = source("src/app/editorler-icin/egitim/[slug]/page.tsx");
  const indexRoute = source("src/app/editorler-icin/egitim/page.tsx");
  const renderer = source("src/components/content/EditorEducationPage.tsx");
  const shell = source("src/components/content/EditorEducationShell.tsx");
  const gateway = source("src/components/content/ForEditorsExperience.tsx");
  const sitemap = source("src/app/sitemap.ts");

  const categorySlugs = [...inventory.matchAll(/\n    slug: "([^"]+)",\n    title:/g)].map((match) => match[1]);
  assert.equal(categorySlugs.length, 8, "editor education inventory must stay at 8 main categories");
  assert.equal(new Set(categorySlugs).size, 8, "editor education category slugs must be unique");

  for (const slug of [
    "editorluge-baslama",
    "metin-degerlendirme",
    "yapisal-editorluk",
    "dil-ve-anlatim-editorlugu",
    "tur-editorlugu",
    "editor-notu-ve-geri-bildirim",
    "yazarla-calismak",
    "yayincilik-ve-profesyonel-editorluk",
  ]) {
    assert.ok(categorySlugs.includes(slug), `missing editor education category ${slug}`);
  }

  assertContains(publicRoute, "robots: { index: true, follow: true }", "editor education index/follow");
  assertContains(publicRoute, "editorEducationPublicPath(category)", "editor education self canonical source");
  assertContains(publicRoute, "notFound()", "invalid editor education slug 404");
  assertContains(indexRoute, "redirect(editorEducationPublicPath(EDITOR_EDUCATION_CATEGORIES[0]))", "editor education index redirect");

  assertContains(shell, "EDITOR_EDUCATION_CATEGORIES.map", "editor left menu contains all eight categories");
  assertContains(shell, 'import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader"', "editor education uses original public site header");
  assertContains(shell, "<PublicSiteHeader />", "editor education renders original public site header");
  assertContains(shell, "<LiveHomepageFooter", "editor education uses original footer");
  assertContains(renderer, '<EditorEducationShell activeCategory={category}>', "editor education shell wrapper");
  assertContains(renderer, "Öğrenme yolu", "editor education learning path");
  assertContains(renderer, "Örnek vaka", "editor education example section");
  assertContains(renderer, "Kendin dene", "editor education practice section");
  assertContains(renderer, "İlkOku’da uygula", "editor education application section");

  assertContains(gateway, 'import { EDITOR_EDUCATION_CATEGORIES, editorEducationPublicPath } from "@/lib/editor-education"', "editor gateway uses shared inventory");
  assertContains(gateway, "EDITOR_EDUCATION_CATEGORIES.map", "editor gateway generates eight cards from inventory");
  assertContains(gateway, "href={editorEducationPublicPath(category)}", "editor gateway cards link to education pages");
  assert.equal(gateway.includes("const editorEducationCategories = ["), false, "editor gateway must not duplicate the curriculum inventory");

  assertContains(sitemap, 'import { EDITOR_EDUCATION_CATEGORIES, editorEducationPublicPath } from "@/lib/editor-education"', "editor sitemap inventory source");
  assertContains(sitemap, "const editorEducationHrefs = EDITOR_EDUCATION_CATEGORIES.map", "editor sitemap href generation");
  assertContains(sitemap, "...editorEducationEntries", "editor education static sitemap inclusion");
  assertContains(sitemap, "...editorEducationHrefs", "editor education CMS duplicate guard");
});
