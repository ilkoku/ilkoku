import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");

function includes(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

test("writer sidebar keeps book add menu readable and classification contained", () => {
  const css = source("src/features/writer/writer-sidebar-regressions.css");

  includes(css, ".writer-screen .writer-book-structure__add-menu > button", "book add menu button override");
  includes(css, "height: auto", "legacy fixed button height override");
  includes(css, "min-height: 3rem", "readable add-menu rows");
  includes(css, "visibility: visible", "add-menu content visibility");
  includes(css, ".writer-screen .writer-chapters__header:has(> .writer-book-structure__header)", "book menu header containing block");
  includes(css, "position: relative", "header anchors the desktop book menu");
  includes(css, ".writer-screen .writer-book-structure__add {", "book add positioning override");
  includes(css, "position: static", "add control no longer clips wide menu from its tiny box");
  includes(css, "left: 0", "book menu stays inside left sidebar edge");
  includes(css, "right: 0", "book menu stays inside right sidebar edge");
  includes(css, "width: auto", "book menu follows full sidebar header width");
  includes(css, ".writer-screen .writer-chapters .writer-classification-panel", "classification panel containment");
  includes(css, "overflow-x: hidden", "classification horizontal overflow guard");
  includes(css, ".writer-screen .writer-chapters .work-classification__rating select", "classification select containment");
  includes(css, "max-width: 100%", "sidebar max-width guard");
  includes(css, "overflow-wrap: anywhere", "long classification copy wrapping");
});

test("writer sidebar regression layer is loaded last on every writing route", () => {
  for (const path of [
    "src/app/yazar/layout.tsx",
    "src/app/eserlerim/layout.tsx",
    "src/app/yazmaya-devam/layout.tsx",
  ]) {
    const layout = source(path);
    const bookIndex = layout.indexOf("writer-book-structure.css");
    const regressionIndex = layout.indexOf("writer-sidebar-regressions.css");

    assert.ok(bookIndex >= 0, `${path} must load book structure CSS`);
    assert.ok(regressionIndex > bookIndex, `${path} must load writer sidebar regression CSS after book structure CSS`);
  }
});
