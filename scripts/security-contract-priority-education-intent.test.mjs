import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("priority reader and editor lessons expose distinct search-intent panels", () => {
  const panel = source("src/components/content/PriorityEducationIntentPanel.tsx");
  const reader = source("src/components/content/ReaderEducationPage.tsx");

  for (const slug of [
    "editorluge-baslama",
    "metin-degerlendirme",
    "dil-ve-anlatim-editorlugu",
    "okumaya-baslama",
  ]) {
    assert.ok(panel.includes(`"${slug}"`), `missing priority education intent for ${slug}`);
  }

  for (const path of [
    "src/app/editorler-icin/egitim/editorluge-baslama/page.tsx",
    "src/app/editorler-icin/egitim/metin-degerlendirme/page.tsx",
    "src/app/editorler-icin/egitim/dil-ve-anlatim-editorlugu/page.tsx",
  ]) {
    const page = source(path);
    assert.ok(page.includes("PriorityEducationIntentPanel"));
    assert.ok(page.includes('area="editing"'));
  }

  assert.ok(reader.includes("PriorityEducationIntentPanel"));
  assert.ok(reader.includes('area="reading" slug={category.slug}'));
  assert.ok(panel.includes("Bu eğitimi diğerlerinden ayıran şey"));
  assert.ok(panel.includes("Eğitim sonunda elinde"));
});


test("priority editor lessons expose structured data without changing visible content", () => {
  const structuredData = source("src/components/content/EditorEducationStructuredData.tsx");

  assert.ok(structuredData.includes('"@type": "Article"'));
  assert.ok(structuredData.includes('"@type": "BreadcrumbList"'));
  assert.ok(structuredData.includes('"@id": pageUrl'));
  assert.ok(structuredData.includes('name: "Editörler İçin"'));
  assert.ok(!structuredData.includes("datePublished"));
  assert.ok(!structuredData.includes("dateModified"));

  for (const path of [
    "src/app/editorler-icin/egitim/editorluge-baslama/page.tsx",
    "src/app/editorler-icin/egitim/metin-degerlendirme/page.tsx",
    "src/app/editorler-icin/egitim/dil-ve-anlatim-editorlugu/page.tsx",
  ]) {
    const page = source(path);
    assert.ok(page.includes("EditorEducationStructuredData"), `missing structured data on ${path}`);
  }
});

test("about page uses the selected İlkOku social image", () => {
  const about = source("src/app/hakkimizda/page.tsx");
  assert.ok(about.includes("/og/ilkoku-social-selected-2026.webp"));
  assert.ok(!about.includes('const socialImage = `${baseUrl}/opengraph-image`;'));
});
