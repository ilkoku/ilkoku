import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("priority writing links strengthen the focused cohort without hiding the full genre catalog", () => {
  const category = source("src/components/content/WritingCategoryLandingPage.tsx");

  assert.match(category, /isSoftLaunchSearchExcludedPath/u);
  assert.match(category, /priorityGenres = genres\.filter/u);
  assert.match(category, /Öne çıkan başlangıç rehberleri/u);
  assert.match(category, /Önce bu rehberlerle güçlü bir temel kur\./u);
  assert.match(category, /\{genres\.map\(\(genre\) => \(/u);
  assert.match(category, /\{priorityGenres\.map\(\(genre\) => \(/u);
});

test("writer header features every focused genre needed for sitewide discovery", () => {
  const navigation = source("src/lib/cms-header-navigation.ts");

  for (const slug of [
    "roman",
    "oyku",
    "fantastik",
    "bilim-kurgu",
    "distopya",
    "siir",
  ]) {
    assert.match(navigation, new RegExp(`writer-genre:${slug}`, "u"));
  }
});

test("editor hub points directly to the three focused editor education routes", () => {
  const editors = source("src/app/editorler-icin/page.tsx");

  for (const href of [
    "/editorler-icin/egitim/editorluge-baslama",
    "/editorler-icin/egitim/metin-degerlendirme",
    "/editorler-icin/egitim/dil-ve-anlatim-editorlugu",
  ]) {
    assert.match(editors, new RegExp(href.replaceAll("/", "\\/"), "u"));
  }

  assert.match(editors, /Editörlük Okulu · başlangıç rotası/u);
  assert.match(editors, /Editörlüğü üç temel beceriyle kur\./u);
});
