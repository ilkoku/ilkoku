import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const headerPath = "src/components/layout/PublicSiteHeader.tsx";
const framePath = "src/components/layout/PublicSiteFrame.tsx";
const backPath = "src/components/layout/PublicBackNavigation.tsx";
const rootLayoutPath = "src/app/layout.tsx";
const retiredTopNavigation = [
  "/eserler",
  "/yazarlar",
  "/turler",
  "/editorler",
  "/nasil-calisir",
  "/yardim",
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

const trustLayoutPaths = [
  "src/app/nasil-calisir/layout.tsx",
  "src/app/editoryal-standartlar/layout.tsx",
  "src/app/icerik-ve-yas-politikasi/layout.tsx",
  "src/app/topluluk-kurallari/layout.tsx",
  "src/app/telif-bildirimi/layout.tsx",
  "src/app/yazarlar-icin/layout.tsx",
  "src/app/editorler-icin/layout.tsx",
  "src/app/yayinevleri-icin/layout.tsx",
];

const trustRoutes = [
  "/nasil-calisir",
  "/editoryal-standartlar",
  "/icerik-ve-yas-politikasi",
  "/topluluk-kurallari",
  "/telif-bildirimi",
  "/yazarlar-icin",
  "/editorler-icin",
  "/yayinevleri-icin",
];

test("public header matches the homepage model without a top navigation list", () => {
  const header = read(headerPath);

  assert.doesNotMatch(header, /publicSiteNavigation|NavigationLinks/);
  assert.doesNotMatch(header, /public-site-header__nav/);
  assert.doesNotMatch(header, /public-site-header__mobile/);

  for (const href of retiredTopNavigation) {
    assert.doesNotMatch(
      header,
      new RegExp(`href=["']${href.replaceAll("/", "\\/")}["']`),
      `${href} must not appear in the top header`,
    );
  }

  assert.match(header, /Dijital edebiyat platformu/);
  assert.match(header, /public-site-header__account/);
  assert.match(header, /href="\/giris"/);
  assert.match(header, /href="\/kayit"/);
  assert.match(header, /href="\/hesabim"/);
  assert.match(header, /navigation\.workspaceHref/);
  assert.match(header, /logoutAction/);
});

test("all eight public trust routes mount the same shared homepage-style header", () => {
  const frame = read(framePath);
  assert.match(frame, /<PublicSiteHeader\s*\/>/);

  for (const path of trustLayoutPaths) {
    assert.match(read(path), /<PublicSiteFrame>/, `${path} must mount PublicSiteFrame`);
  }
});

test("public trust pages, editor discovery and help expose one context-aware back path", () => {
  const frame = read(framePath);
  const back = read(backPath);

  assert.match(frame, /<PublicBackNavigation\s*\/>/);
  assert.match(back, /ilkoku:public:last-path/);
  assert.match(back, /sessionStorage/);
  assert.match(back, /isSafeInternalPath/);
  assert.match(back, /pathname\.startsWith\("\/editorler\/"\)/);
  assert.match(back, /return "\/editorler"/);
  assert.match(back, /router\.push\(destination\)/);

  for (const route of [...trustRoutes, "/editorler", "/yardim"]) {
    assert.ok(back.includes(`"${route}"`), `${route} must expose the shared back control`);
  }

  for (const route of ["/eserler", "/yazarlar", "/turler"]) {
    assert.ok(!back.includes(`"${route}"`), `${route} must keep its existing discovery navigation without a duplicate back bar`);
  }
});

test("existing public route frames remain isolated from root layout and workspaces", () => {
  for (const path of publicLayoutPaths) {
    assert.match(read(path), /<PublicSiteFrame>/, `${path} must mount PublicSiteFrame`);
  }

  assert.doesNotMatch(read(rootLayoutPath), /PublicSiteHeader|PublicSiteFrame/);
});

test("editor directory and help center stay connected to the same public footer and real destinations", () => {
  const editorLayout = read("src/app/editorler/layout.tsx");
  const editorDirectory = read("src/features/editors/components/EditorDirectory.tsx");
  const editorData = read("src/features/editors/data.ts");
  const helpLayout = read("src/app/yardim/layout.tsx");
  const helpPage = read("src/app/yardim/page.tsx");

  assert.match(editorLayout, /<PublicTrustFooter\s*\/>/);
  assert.match(editorLayout, /public-editors\.css/);
  assert.match(editorDirectory, /href="\/editorler-icin"/);
  assert.match(editorDirectory, /href="\/editoryal-standartlar"/);
  assert.match(editorDirectory, /href="\/kayit\?rol=editor"/);
  assert.match(editorDirectory, /href="\/nasil-calisir"/);
  assert.doesNotMatch(editorDirectory, /<Field|editors-filter-grid/);
  assert.match(editorData, /export const editors: readonly HumanEditor\[\] = \[\]/);

  assert.match(helpLayout, /<PublicTrustFooter\s*\/>/);
  assert.match(helpLayout, /help\.css/);
  for (const href of [
    "/eserler",
    "/yazarlar-icin",
    "/editorler-icin",
    "/yayinevleri-icin",
    "/nasil-calisir",
    "/editoryal-standartlar",
    "/icerik-ve-yas-politikasi",
    "/topluluk-kurallari",
    "/telif-bildirimi",
    "/editorler",
  ]) {
    assert.ok(helpPage.includes(`href: "${href}"`), `${href} must remain reachable from help`);
  }
  assert.match(helpPage, /mailto:destek@ilkoku\.com/);
  assert.match(helpPage, /namespace = 'faq' AND status = 'published'/);
  assert.match(helpPage, /"@type": "FAQPage"/);
  assert.match(helpPage, /Henüz yayınlanmış SSS kaydı yok/);
});

test("legacy public headers are hidden only inside the explicit public frame", () => {
  const css = read("src/components/layout/public-site-header.css");
  for (const selector of [".how-header", ".public-library__header", ".public-hub__nav", ".editors-topbar"]) {
    assert.ok(css.includes(`.public-site-frame ${selector}`), `${selector} must be scoped to public-site-frame`);
  }
});
