import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const headerPath = "src/components/layout/PublicSiteHeader.tsx";
const headerNavigationClientPath = "src/components/layout/PublicHeaderNavigation.tsx";
const headerMegaCssPath = "src/components/layout/public-site-mega-menu.css";
const headerConfigPath = "src/lib/cms-header-navigation.ts";
const headerServerPath = "src/lib/cms-header-navigation-server.ts";
const headerWorkbenchPath = "src/components/content/HeaderNavigationWorkbench.tsx";
const navigationActionsPath = "src/features/cms/navigation-actions.ts";
const menuCmsPath = "src/app/icerik/menuler/page.tsx";
const identityPath = "src/lib/site-identity.ts";
const framePath = "src/components/layout/PublicSiteFrame.tsx";
const frameCssPath = "src/components/layout/public-site-frame.css";
const publicPageTemplatePath = "src/components/layout/PublicPageTemplate.tsx";
const bookIndexLayoutPath = "src/app/en-cok-satanlar/layout.tsx";
const cmsFallbackPath = "src/app/[...path]/page.tsx";
const metadataHelperPath = "src/lib/public-page-metadata.ts";
const backPath = "src/components/layout/PublicBackNavigation.tsx";
const historyPath = "src/components/layout/PublicNavigationHistory.tsx";
const rootLayoutPath = "src/app/layout.tsx";
const pausedDiscoveryRoutes = [
  "/eserler",
  "/yazarlar",
  "/turler",
];

const publicLayoutPaths = [
  "src/app/eserler/layout.tsx",
  "src/app/yazarlar/layout.tsx",
  "src/app/turler/layout.tsx",
  "src/app/editorler/layout.tsx",
  "src/app/yardim/layout.tsx",
  "src/app/iletisim/layout.tsx",
  "src/app/site-haritasi/layout.tsx",
  "src/app/hakkimizda/layout.tsx",
  "src/app/nasil-calisir/layout.tsx",
  "src/app/editoryal-standartlar/layout.tsx",
  "src/app/icerik-ve-yas-politikasi/layout.tsx",
  "src/app/topluluk-kurallari/layout.tsx",
  "src/app/telif-bildirimi/layout.tsx",
  "src/app/yazarlar-icin/layout.tsx",
  "src/app/editorler-icin/layout.tsx",
  "src/app/yayinevleri-icin/layout.tsx",
  "src/app/en-cok-satanlar/layout.tsx",
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

test("public header exposes one canonical CMS-backed single-active mega navigation with a fail-safe code default", () => {
  const header = read(headerPath);
  const navigationClient = read(headerNavigationClientPath);
  const megaCss = read(headerMegaCssPath);
  const config = read(headerConfigPath);
  const server = read(headerServerPath);
  const identity = read(identityPath);

  assert.match(header, /<PublicHeaderNavigation menus=\{publicMenus\}/);
  assert.match(navigationClient, /public-site-header__navigation/);
  assert.match(navigationClient, /public-site-header__mobile-menu/);
  assert.match(navigationClient, /public-site-header__mega/);
  assert.match(navigationClient, /menus\.map\(\(menu\) => \{/);
  assert.match(navigationClient, /aria-hidden=\{!isActive\}/);
  assert.match(navigationClient, /data-active=\{isActive \? "true" : undefined\}/);
  assert.match(megaCss, /\.public-site-header__mega\[data-active="true"\]/);
  assert.match(navigationClient, /const \[activeId, setActiveId\] = useState<string \| null>\(null\)/);
  assert.match(navigationClient, /onMouseEnter=\{\(\) => activate\(menu\.id\)\}/);
  assert.match(navigationClient, /CLOSE_DELAY_MS = 140/);
  assert.match(navigationClient, /public-site-header__mobile-track/);
  assert.match(navigationClient, /public-site-header__mobile-back/);
  assert.doesNotMatch(navigationClient, /<details className="public-site-header__menu-item"/);
  assert.match(megaCss, /backdrop-filter:\s*blur\(20px\) saturate\(138%\)/);
  assert.match(megaCss, /\.public-site-header__mobile-track\[data-detail="true"\]/);
  assert.match(header, /getPublishedHeaderNavigation\(\)/);
  assert.match(header, /resolveHeaderNavigation\(navigation\.payload,\s*navigation\.pages\)/);
  assert.match(config, /SITE_MAP_PAGES/);
  assert.match(config, /defaultHeaderNavigation/);
  assert.match(config, /WRITING_CATEGORY_HUBS/);
  assert.match(config, /READER_EDUCATION_CATEGORIES/);
  assert.match(config, /EDITOR_EDUCATION_CATEGORIES/);
  assert.match(config, /GENRES/);
  assert.match(config, /createCmsSiteMapPages/);
  assert.match(server, /ContentPage/);
  assert.match(server, /status = 'published'/);
  assert.match(server, /status !== "published"/);
  assert.match(server, /parseHeaderNavigation\(row\.valueJson,\s*pages\) \?\? defaultHeaderNavigation/);
  assert.match(server, /catch\s*\{[\s\S]*payload:\s*defaultHeaderNavigation/);

  for (const label of ["Yazar", "Okur", "Editör", "Yayınevi", "İlkOku", "Destek"]) {
    assert.ok(config.includes(`label: "${label}"`), `${label} must remain in the safe default public navigation`);
  }

  for (const href of [
    "/yazarlar-icin",
    "/editorler-icin",
    "/yayinevleri-icin",
    "/editorler",
    "/hakkimizda",
    "/nasil-calisir",
    "/editoryal-standartlar",
    "/site-haritasi",
    "/kayit?rol=writer",
    "/kayit?rol=reader",
    "/kayit?rol=editor",
    "/kayit?rol=publisher",
  ]) {
    assert.ok(config.includes(`href: "${href}"`), `${href} must remain represented by a real site-map page id`);
  }

  for (const href of pausedDiscoveryRoutes) {
    assert.doesNotMatch(
      config,
      new RegExp(`href:\\s*["']${href.replaceAll("/", "\\/")}["']`),
      `${href} must not be selectable in the public header catalog`,
    );
  }

  assert.match(header, /getBookIndexPublicPageContext\(100\)\.catch\(\(\) => null\)/);
  assert.match(header, /withBookIndexMenu/);
  assert.match(header, /label: "En Çok Satanlar"/);
  assert.match(header, /directHref: "\/en-cok-satanlar"/);
  assert.match(header, /menu\.id === "support"/);
  assert.match(config, /id: "book-index"/);
  assert.match(config, /href: "\/en-cok-satanlar"/);
  assert.match(navigationClient, /directHref\?: string/);
  assert.match(navigationClient, /data-direct="true"/);
  assert.match(navigationClient, /href=\{menu\.directHref\}/);
  assert.match(header, /getPublicSiteIdentity\(\)/);
  assert.match(identity, /headerKicker:\s*"Dijital yazar platformu"/);
  assert.match(identity, /normalizeLegacyHeaderKicker/);
  assert.match(identity, /dijital edebiyat platformu/);
  assert.match(header, /public-site-header__account/);
  assert.match(header, /href="\/giris"/);
  assert.match(header, /href="\/kayit"/);
  assert.match(header, /href="\/hesabim"/);
  assert.match(megaCss, /\.homepage-live \.nx-header\s*\{[\s\S]*display:\s*none\s*!important/);
  assert.doesNotMatch(header, /getCurrentProfile|navigation\.workspaceHref|logoutAction/);
});

test("CMS menu management stores page ids in a safe draft before publishing to the shared header", () => {
  const config = read(headerConfigPath);
  const server = read(headerServerPath);
  const workbench = read(headerWorkbenchPath);
  const actions = read(navigationActionsPath);
  const page = read(menuCmsPath);

  assert.match(config, /HEADER_NAV_LIVE_KEY = "header_navigation"/);
  assert.match(config, /HEADER_NAV_DRAFT_KEY = "header_navigation_draft"/);
  assert.match(config, /pageId:/);
  assert.match(config, /getSiteMapPage\(pageId,\s*pages\)/);
  assert.match(config, /parseHeaderNavigation/);
  assert.match(config, /validateHeaderNavigation/);
  assert.match(config, /indexable\?: boolean/);
  assert.match(server, /loadPublishedCmsSiteMapPages/);
  assert.match(server, /createCmsSiteMapPages/);
  assert.doesNotMatch(workbench, /name="href"|name="url"/);
  assert.match(workbench, /Seçilileri Menüye Ekle/);
  assert.match(workbench, /name="headerNavigationJson"/);
  assert.match(workbench, /Noindex/);
  assert.match(actions, /saveHeaderNavigationAction/);
  assert.match(actions, /publishHeaderNavigationAction/);
  assert.match(actions, /completeSiteMapPages/);
  assert.match(actions, /parseHeaderNavigation\(raw,\s*pages\)/);
  assert.match(actions, /parseHeaderNavigation\(draft\.valueJson,\s*pages\)/);
  assert.match(actions, /contentKey = \$\{HEADER_NAV_DRAFT_KEY\}/);
  assert.match(actions, /\$\{HEADER_NAV_LIVE_KEY\}/);
  assert.match(actions, /revalidatePath\("\/", "layout"\)/);
  assert.match(page, /Site Haritası & Menü Yönetimi/);
  assert.match(page, /loadPublishedCmsSiteMapPages/);
  assert.match(page, /siteMapPages/);
  assert.match(page, /<HeaderNavigationWorkbench/);
  assert.match(page, /<FooterNavigationWorkbench/);
});

test("all eight public trust routes mount the same shared homepage-style header", () => {
  const frame = read(framePath);
  assert.match(frame, /<PublicSiteHeader\s*\/>/);

  for (const path of trustLayoutPaths) {
    assert.match(read(path), /<PublicSiteFrame>/, `${path} must mount PublicSiteFrame`);
  }
});

test("future CMS public pages inherit one canonical frame, footer and SEO contract", () => {
  const template = read(publicPageTemplatePath);
  const fallback = read(cmsFallbackPath);
  const metadata = read(metadataHelperPath);

  assert.match(template, /<PublicSiteFrame>/);
  assert.match(template, /<PublicTrustFooter\s*\/>/);
  assert.match(template, /public-trust-footer\.css/);

  assert.match(fallback, /<PublicPageTemplate>/);
  assert.match(fallback, /createPublicPageMetadata/);
  assert.match(fallback, /status = 'published'/);
  assert.doesNotMatch(fallback, /<PublicSiteHeader/);

  assert.match(metadata, /alternates:\s*\{[\s\S]*canonical:\s*canonicalUrl/);
  assert.match(metadata, /languageAlternates/);
  assert.match(metadata, /robots:/);
  assert.match(metadata, /openGraph:/);
  assert.match(metadata, /twitter:/);
  assert.match(metadata, /summary_large_image/);
  assert.match(metadata, /siteName: "İlkOku"/);
});

test("public frame owns a light fallback surface instead of exposing the dark app body", () => {
  const frame = read(framePath);
  const frameCss = read(frameCssPath);

  assert.match(frame, /public-site-frame\.css/);
  assert.match(frameCss, /\.public-site-frame\s*\{/);
  assert.match(frameCss, /min-height:\s*100vh/);
  assert.match(frameCss, /color-scheme:\s*light/);
  assert.match(frameCss, /background:\s*linear-gradient/);
  assert.doesNotMatch(frameCss, /var\(--color-background\)/);
});

test("public back navigation preserves the actual tab-local internal source path", () => {
  const frame = read(framePath);
  const back = read(backPath);
  const history = read(historyPath);
  const rootLayout = read(rootLayoutPath);

  assert.match(frame, /<PublicBackNavigation\s*\/>/);
  assert.match(rootLayout, /<PublicNavigationHistory\s*\/>/);
  assert.match(history, /ilkoku:public:navigation-stack/);
  assert.match(history, /sessionStorage/);
  assert.match(history, /window\.location\.pathname/);
  assert.match(history, /window\.location\.search/);
  assert.match(history, /window\.location\.hash/);
  assert.match(history, /destination\.origin !== window\.location\.origin/);
  assert.match(history, /document\.addEventListener\("click"/);
  assert.match(history, /window\.addEventListener\("popstate"/);
  assert.match(history, /consumePublicNavigationBackTarget/);
  assert.doesNotMatch(history, /ilkoku:public:last-path/);

  assert.match(back, /consumePublicNavigationBackTarget\(currentLocationPath\(\)\)/);
  assert.match(back, /pathname\.startsWith\("\/editorler\/"\)/);
  assert.match(back, /return "\/editorler"/);
  assert.match(back, /router\.push\(destination\)/);
  assert.match(back, /aria-label="Geldiğin sayfaya dön"/);

  for (const route of [...trustRoutes, "/hakkimizda", "/editorler", "/yardim"]) {
    assert.ok(back.includes(`"${route}"`), `${route} must expose the shared back control`);
  }

  for (const route of ["/eserler", "/yazarlar", "/turler"]) {
    assert.ok(!back.includes(`"${route}"`), `${route} must keep its existing discovery navigation without a duplicate back control`);
  }
});

test("existing public route frames remain isolated from root layout and workspaces", () => {
  for (const path of publicLayoutPaths) {
    assert.match(read(path), /<PublicSiteFrame>/, `${path} must mount PublicSiteFrame`);
  }

  const bookIndexLayout = read(bookIndexLayoutPath);
  assert.match(bookIndexLayout, /<PublicSiteFrame>/);
  assert.match(bookIndexLayout, /<PublicTrustFooter\s*\/>/);

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
    "/kayit?rol=reader",
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
  assert.ok(!helpPage.includes('href: "/eserler"'), "/eserler must not be linked from help while discovery is paused");
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
