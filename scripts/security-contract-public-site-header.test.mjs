import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const headerPath = "src/components/layout/PublicSiteHeader.tsx";
const framePath = "src/components/layout/PublicSiteFrame.tsx";
const rootLayoutPath = "src/app/layout.tsx";
const expectedNavigation = [
  ["/eserler", "Eserler"],
  ["/yazarlar", "Yazarlar"],
  ["/turler", "Türler"],
  ["/editorler", "Editörler"],
  ["/nasil-calisir", "Nasıl Çalışır"],
  ["/yardim", "Yardım"],
];

const publicLayoutPaths = [
  "src/app/eserler/layout.tsx",
  "src/app/yazarlar/layout.tsx",
  "src/app/turler/layout.tsx",
  "src/app/editorler/layout.tsx",
  "src/app/yardim/layout.tsx",
  "src/app/nasil-calisir/layout.tsx",
  "src/app/editoryal-standartlar/layout.tsx",
  "src/app/icerik-ve-yas-politikasi/layout.tsx",
  "src/app/topluluk-kurallari/layout.tsx",
  "src/app/telif-bildirimi/layout.tsx",
  "src/app/yazarlar-icin/layout.tsx",
  "src/app/editorler-icin/layout.tsx",
  "src/app/yayinevleri-icin/layout.tsx",
];

test("canonical public header exposes only working public destinations", () => {
  const header = read(headerPath);

  for (const [href, label] of expectedNavigation) {
    assert.match(header, new RegExp(`href: \\"${href.replaceAll("/", "\\/")}\\"`));
    assert.match(header, new RegExp(`label: \\"${label}\\"`));
  }

  assert.doesNotMatch(header, /href:\s*"\/rehber"/);
  assert.doesNotMatch(header, /href:\s*"\/yayinevleri"/);
  assert.match(header, /href="\/giris"/);
  assert.match(header, /href="\/kayit"/);
  assert.match(header, /href="\/hesabim"/);
  assert.match(header, /navigation\.workspaceHref/);
});

test("working public route families mount the shared header without touching root layout", () => {
  const frame = read(framePath);
  assert.match(frame, /<PublicSiteHeader\s*\/>/);

  for (const path of publicLayoutPaths) {
    assert.match(read(path), /<PublicSiteFrame>/, `${path} must mount PublicSiteFrame`);
  }

  assert.doesNotMatch(read(rootLayoutPath), /PublicSiteHeader|PublicSiteFrame/);
});

test("legacy public headers are hidden only inside the explicit public frame", () => {
  const css = read("src/components/layout/public-site-header.css");
  for (const selector of [".how-header", ".public-library__header", ".public-hub__nav", ".editors-topbar"]) {
    assert.ok(css.includes(`.public-site-frame ${selector}`), `${selector} must be scoped to public-site-frame`);
  }
});
