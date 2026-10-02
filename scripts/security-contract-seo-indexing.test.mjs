import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseSitemapUrls, selectIndexNowUrls } from "./prepare-indexnow-payload.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function assertNotContains(text, fragment, label) {
  assert.equal(text.includes(fragment), false, `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("global public routes share one canonical SEO and social brand identity", () => {
  const brand = source("src/lib/public-brand.ts");
  const homepage = source("src/app/page.tsx");
  const layout = source("src/app/layout.tsx");
  const openGraph = source("src/app/opengraph-image.tsx");
  const twitter = source("src/app/twitter-image.tsx");
  const exactTitle = "İlkOku | Dijital Yazar Platformu – İlk cümle, ilk adım";

  assertContains(brand, `publicBrandTitle = "${exactTitle}"`, "canonical homepage/social title");
  assertContains(brand, 'publicBrandPositioning = "Dijital Yazar Platformu"', "brand positioning");
  assertContains(brand, 'publicBrandShortSlogan = "İlk cümle, ilk adım"', "short social slogan");
  assertContains(brand, 'publicBrandEditorialSlogan = "İlk cümle, ilk okurun, ilk adımın."', "editorial slogan remains distinct");

  assertContains(homepage, "const homeTitle = publicBrandTitle", "homepage title consumes canonical brand title");
  assertContains(homepage, "const homeSocialImage = publicBrandSocialImage", "homepage social artwork consumes canonical brand image");
  assertContains(homepage, "title: homeTitle", "homepage Open Graph/Twitter title source");
  assertContains(layout, "title: publicBrandTitle", "global metadata default title");
  assertContains(layout, "title: publicBrandTitle", "global Open Graph/Twitter title source");
  assertContains(layout, "images: [{ url: publicBrandSocialImage", "global Open Graph image");
  assertContains(layout, "images: [publicBrandSocialImage]", "global Twitter image");
  assertContains(layout, '"max-image-preview": "large"', "global large Google image previews");
  assertContains(layout, '"max-snippet": -1', "global unlimited Google snippet preview");
  assertContains(layout, '"max-video-preview": -1', "global unlimited Google video preview");

  assertContains(openGraph, 'import { ImageResponse } from "next/og"', "Open Graph image response");
  assertContains(openGraph, "width: 1200", "Open Graph width");
  assertContains(openGraph, "height: 630", "Open Graph height");
  assertContains(openGraph, 'contentType = "image/png"', "Open Graph content type");
  assertContains(openGraph, "publicBrandPositioning", "Open Graph positioning");
  assertContains(openGraph, "publicBrandShortSlogan", "Open Graph short slogan");
  assertContains(openGraph, "publicBrandDescription", "Open Graph description");
  assertContains(twitter, 'from "./opengraph-image"', "Twitter reuses canonical social artwork");
});

test("robots isolates private content management without blocking the public content policy route", () => {
  const robots = source("src/app/robots.ts");
  const liveSmoke = source(".github/workflows/seo-indexability-smoke.yml");

  assertNotContains(robots, '          "/icerik",', "broad private content robots prefix");
  assertContains(robots, '          "/icerik$",', "exact private content root robots rule");
  assertContains(robots, '          "/icerik/",', "private content descendant robots rule");
  assertContains(robots, '"/api/media/"', "published public CMS media crawl allowance");
  assertContains(robots, '"/api/site-assets/"', "published public site asset crawl allowance");
  assertContains(robots, '"/api/site-content/footer-navigation"', "published footer render API crawl allowance");
  assertContains(robots, '"/api/public-announcements"', "published announcement render API crawl allowance");
  const footerApi = source("src/app/api/site-content/footer-navigation/route.ts");
  const announcementApi = source("src/app/api/public-announcements/route.ts");
  assertContains(footerApi, '"X-Robots-Tag": "noindex, noarchive"', "footer render API search exclusion");
  assertContains(announcementApi, '"X-Robots-Tag": "noindex, noarchive"', "announcement render API search exclusion");
  assertContains(robots, '          "/api",', "private API robots boundary remains blocked");
  assertContains(robots, '          "/1q6z",', "Google Tag Gateway measurement path crawl block");
  assertContains(liveSmoke, "Disallow: /icerik$", "live exact private content robots guard");
  assertContains(liveSmoke, "Disallow: /icerik/", "live private content descendant robots guard");
  assertContains(liveSmoke, "broad /icerik robots prefix blocks public content policy", "live broad prefix regression message");
});

test("robots mirrors private and protected route inventories without shadowing public prefixes", () => {
  const robots = source("src/app/robots.ts");
  const nextConfig = source("next.config.ts");
  const proxy = source("src/proxy.ts");
  const privateInventory = nextConfig.match(/const privateRouteHeaders = \[([\s\S]*?)\];/u)?.[1];
  const protectedInventory = proxy.match(/matcher:\s*\[([\s\S]*?)\]/u)?.[1];

  assert.ok(privateInventory, "next.config privateRouteHeaders inventory must be readable");
  assert.ok(protectedInventory, "proxy protected matcher inventory must be readable");

  const privateRoutes = [...privateInventory.matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
  const protectedRoutes = [...protectedInventory.matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
  const privateRoots = [...new Set(
    [...privateRoutes, ...protectedRoutes].map((route) => route.replace(/\/:path\*$/u, "")),
  )];

  const exactPrefixRoots = new Set([
    "/icerik",
    "/editor",
    "/yazar",
    "/yayinevi",
    "/yayinevleri",
  ]);

  for (const route of privateRoots) {
    if (exactPrefixRoots.has(route)) {
      assertContains(robots, `"${route}$"`, `exact private crawl boundary ${route}`);
      assertContains(robots, `"${route}/"`, `private descendants crawl boundary ${route}`);
      assertNotContains(robots, `          "${route}",`, `broad private prefix ${route}`);
      continue;
    }

    assertContains(robots, `"${route}"`, `private crawl boundary ${route}`);
  }
});

test("sitemap keeps public trust and legal routes always indexable while preserving CMS noindex elsewhere", () => {
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const publicStore = source("src/lib/cms-public-page-store.ts");
  const legalStore = source("src/lib/cms-legal-public-store.ts");

  for (const route of [
    "/hakkimizda",
    "/nasil-calisir",
    "/editoryal-standartlar",
    "/icerik-ve-yas-politikasi",
    "/topluluk-kurallari",
    "/telif-bildirimi",
    "/yazarlar-icin",
    "/editorler-icin",
    "/yayinevleri-icin",
    "/yardim",
    "/iletisim",
    "/site-haritasi",
  ]) {
    assertContains(sitemap, route, `${route} sitemap route`);
  }

  for (const slug of [
    "hakkimizda",
    "nasil-calisir",
    "yazarlar-icin",
    "editorler-icin",
    "yayinevleri-icin",
    "editoryal-standartlar",
    "icerik-ve-yas-politikasi",
    "topluluk-kurallari",
    "telif-bildirimi",
  ]) {
    assertContains(publicStore, `"${slug}"`, `${slug} always-index public trust policy`);
  }

  for (const slug of [
    "kullanim-sartlari",
    "gizlilik-politikasi",
    "kvkk",
    "cerez-politikasi",
    "telif-hakki-politikasi",
  ]) {
    assertContains(sitemap, `"${slug}"`, `${slug} legal sitemap inventory`);
    assertContains(legalStore, `"${slug}"`, `${slug} always-index legal policy`);
  }

  assertContains(sitemap, 'url: `${baseUrl}/yasal/${slug}`', "legal sitemap URL template");
  assertContains(publicStore, "const noIndex = alwaysIndexPublicTrustSlugs.has(slugPart) ? false : row.noIndex", "public trust CMS noindex override");
  assertContains(legalStore, 'locale === "tr" && alwaysIndexTurkishLegalSlugs.has(definition.slug)', "Turkish legal CMS noindex override");
  assertNotContains(sitemap, "if (row?.noIndex)", "code-owned public trust and legal sitemap exclusion");
  assertNotContains(sitemap, "contentKey LIKE 'guide:%'", "retired guide sitemap inventory");
  assertNotContains(sitemap, "foundationalGuides", "retired foundational guide sitemap source");
  assertContains(sitemap, "contentKey LIKE 'page:tr:%'", "TR generic page sitemap coverage");
  assertContains(sitemap, "SELECT slug, noIndex, updatedAt", "CMS sitemap reads indexability and freshness together");
  assertContains(sitemap, "lastModified: row?.updatedAt ?? new Date(page.updatedAt)", "CMS update time overrides bundled public freshness");
  assertContains(sitemap, ".filter((page) => !page.noIndex && !staticCmsPageSlugs.has(page.slug))", "dynamic CMS noindex exclusion");
  assertContains(sitemap, "status = 'published'", "published-only CMS sitemap boundary");
  assertNotContains(sitemap, '`${baseUrl}/en`', "no EN static sitemap URL");
  assertContains(sitemap, "contentKey NOT LIKE 'legal:en:%'", "EN legal sitemap exclusion");
  assertNotContains(sitemap, "page:en:%", "no EN generic sitemap inventory");
  assertNotContains(sitemap, 'url: \`${baseUrl}/eserler\`', "retired work directory sitemap route");
  assertNotContains(sitemap, 'url: \`${baseUrl}/yazarlar\`', "retired author directory sitemap route");
  assertNotContains(sitemap, 'url: \`${baseUrl}/turler\`', "retired genre directory sitemap route");
});

test("public discovery links do not spend crawl signals on robots-excluded actions", () => {
  const policy = source("src/lib/search-link-policy.ts");
  const homepage = source("src/features/homepage/HomepageExperience.tsx");
  const footer = source("src/features/homepage/live-footer.tsx");
  const header = source("src/components/layout/PublicSiteHeader.tsx");
  const megaMenu = source("src/components/layout/PublicHeaderNavigation.tsx");
  const cmsBlocks = source("src/components/content/PublicCmsPageBlocks.tsx");
  const help = source("src/app/yardim/page.tsx");
  const editorDirectory = source("src/features/editors/components/EditorDirectory.tsx");
  const trustFooter = source("src/components/content/PublicTrustFooter.tsx");
  const writersExperience = source("src/components/content/ForWritersExperience.tsx");
  const editorsExperience = source("src/components/content/ForEditorsExperience.tsx");
  const publishersExperience = source("src/components/content/ForPublishersExperience.tsx");

  for (const route of ["/kayit", "/giris", "/hesabim", "/sifremi-unuttum", "/yazar", "/editor", "/yayinevi"]) {
    assertContains(policy, `"${route}"`, `${route} private-link nofollow policy`);
  }

  for (const [text, label] of [
    [homepage, "homepage private actions"],
    [footer, "footer private account actions"],
    [megaMenu, "public mega-menu private actions"],
    [cmsBlocks, "public CMS private CTAs"],
  ]) {
    assertContains(text, "shouldNofollowSearchExcludedHref", `${label} consume shared nofollow policy`);
    assertContains(text, '"nofollow"', `${label} emit nofollow`);
  }

  assertContains(header, 'href="/hesabim" rel="nofollow"', "header account nofollow");
  assertContains(header, 'href="/giris" rel="nofollow"', "header login nofollow");
  assertContains(header, 'href="/kayit" rel="nofollow"', "header registration nofollow");

  for (const [text, label] of [
    [help, "help center"],
    [editorDirectory, "editor directory"],
    [trustFooter, "shared public trust footer"],
    [writersExperience, "writers public landing"],
    [editorsExperience, "editors public landing"],
    [publishersExperience, "publishers public landing"],
  ]) {
    assertContains(text, "shouldNofollowSearchExcludedHref", `${label} consumes private-action nofollow policy`);
    assertContains(text, '"nofollow"', `${label} emits nofollow for private actions`);
  }
});

test("active public help surfaces expose canonical social metadata", () => {
  for (const [path, canonical] of [
    ["src/app/yardim/page.tsx", "/yardim"],
    ["src/app/editorler/page.tsx", "/editorler"],
  ]) {
    const page = source(path);
    assertContains(page, `canonical: "${canonical}"`, `${canonical} canonical`);
    assertContains(page, "openGraph:", `${canonical} Open Graph metadata`);
    assertContains(page, "twitter:", `${canonical} Twitter metadata`);
    assertContains(page, 'const socialImage = "/opengraph-image"', `${canonical} social image fallback`);
  }

  const help = source("src/app/yardim/page.tsx");
  const editors = source("src/app/editorler/page.tsx");
  assertContains(help, '"@type": "FAQPage"', "help FAQ structured data");
  assertContains(help, '"@type": "BreadcrumbList"', "help breadcrumb structured data");
  assertContains(editors, '"@type": "CollectionPage"', "editor directory structured data");
  assertContains(editors, '"@type": "BreadcrumbList"', "editor directory breadcrumb structured data");
});
test("legal pages inherit canonical OG Twitter and language-alternate metadata", () => {
  const legal = source("src/app/yasal/[slug]/page.tsx");
  const helper = source("src/lib/public-page-metadata.ts");

  assertContains(legal, 'createPublicPageMetadata({', "legal shared public metadata helper");
  assertContains(legal, '"tr-TR": `/yasal/${slug}`', "legal TR alternate");
  assertContains(legal, '"x-default": `/yasal/${slug}`', "legal x-default alternate");
  assertContains(helper, "languages?: Record<string, string> | null", "public metadata language alternate contract");
  assertContains(helper, "images: [{ url: socialImage }]", "public Open Graph image fallback");
  assertContains(helper, "twitter:", "public Twitter metadata");
  assertContains(helper, 'card: "summary_large_image"', "public Twitter large image card");
  assertContains(helper, "images: [socialImage]", "public Twitter image fallback");
  assertContains(helper, '"max-image-preview": "large"', "large Google image previews");
  assertContains(helper, '"max-snippet": -1', "unlimited Google text snippet preview");
  assertContains(helper, '"max-video-preview": -1', "unlimited Google video preview");
  assertContains(helper, "index: false", "noindex pages remain blocked");
  assertContains(helper, "follow: true", "noindex pages may still follow links");
});

test("IndexNow selects narrow public routes and keeps conservative full-batch fallbacks", () => {
  const sitemapUrls = [
    "https://ilkoku.com/",
    "https://ilkoku.com/nasil-calisir",
    "https://ilkoku.com/hakkimizda",
    "https://ilkoku.com/kitap/ornek-bir",
    "https://ilkoku.com/kitap/ornek-iki",
    "https://ilkoku.com/yasal/kvkk",
  ];

  const parsed = parseSitemapUrls(
    `<?xml version="1.0"?><urlset>
      <url><loc>https://ilkoku.com/</loc></url>
      <url><loc>https://ilkoku.com/nasil-calisir</loc></url>
      <url><loc>https://example.com/disarida</loc></url>
    </urlset>`,
  );
  assert.deepEqual(parsed, [
    "https://ilkoku.com/",
    "https://ilkoku.com/nasil-calisir",
  ]);

  const staticPage = selectIndexNowUrls({
    sitemapUrls,
    changedFiles: ["src/app/nasil-calisir/page.tsx"],
    repoRoot: ROOT,
  });
  assert.equal(staticPage.mode, "diff");
  assert.deepEqual(staticPage.urls, ["https://ilkoku.com/nasil-calisir"]);

  const contentPage = selectIndexNowUrls({
    sitemapUrls,
    changedFiles: ["src/content/how-it-works.ts"],
    repoRoot: ROOT,
  });
  assert.equal(contentPage.mode, "diff");
  assert.deepEqual(contentPage.urls, ["https://ilkoku.com/nasil-calisir"]);

  const homepage = selectIndexNowUrls({
    sitemapUrls,
    changedFiles: ["src/features/homepage/HomepageExperience.tsx"],
    repoRoot: ROOT,
  });
  assert.equal(homepage.mode, "diff");
  assert.deepEqual(homepage.urls, ["https://ilkoku.com/"]);

  const dynamicFamily = selectIndexNowUrls({
    sitemapUrls,
    changedFiles: ["src/app/kitap/[slug]/page.tsx"],
    repoRoot: ROOT,
  });
  assert.equal(dynamicFamily.mode, "diff");
  assert.deepEqual(dynamicFamily.urls, [
    "https://ilkoku.com/kitap/ornek-bir",
    "https://ilkoku.com/kitap/ornek-iki",
  ]);

  for (const changedFile of [
    "src/app/sitemap.xml/route.ts",
    "src/lib/seo/sitemap-data.ts",
    "src/app/landing-footer-tight.css",
    "src/lib/public-site-navigation.ts",
    "src/components/content/PublicCmsHydrator.tsx",
    "public/trust-pages/editorial-standards.webp",
  ]) {
    const selection = selectIndexNowUrls({
      sitemapUrls,
      changedFiles: [changedFile],
      repoRoot: ROOT,
    });
    assert.equal(selection.mode, "full", `${changedFile} must keep conservative full IndexNow coverage`);
    assert.deepEqual(selection.urls, sitemapUrls);
  }

  const unrelated = selectIndexNowUrls({
    sitemapUrls,
    changedFiles: ["src/features/contracts/repository.ts"],
    repoRoot: ROOT,
  });
  assert.equal(unrelated.mode, "diff");
  assert.deepEqual(unrelated.urls, []);

  const workflow = source(".github/workflows/indexnow-submit.yml");
  assertContains(workflow, "uses: actions/checkout@v6", "IndexNow repository checkout");
  assertContains(workflow, "fetch-depth: 0", "IndexNow complete push diff");
  assertContains(workflow, 'git diff --name-only "$BEFORE_SHA" "$AFTER_SHA"', "IndexNow changed-file inventory");
  assertContains(workflow, 'echo "__FULL__" > /tmp/indexnow-changed-files.txt', "IndexNow manual/fallback full marker");
  assertContains(workflow, "node scripts/prepare-indexnow-payload.mjs", "IndexNow diff-aware payload selector");
  assertContains(workflow, '"src/features/homepage/**"', "homepage feature IndexNow trigger");
  assertContains(workflow, '"src/lib/public-site-navigation.ts"', "global navigation IndexNow trigger");
  assertContains(workflow, '"src/components/content/PublicCmsHydrator.tsx"', "shared public layout IndexNow trigger");
  assertContains(workflow, 'if [[ "$URL_COUNT" == "0" ]]', "IndexNow empty public diff no-op");
});

test("public HTML site map exposes the live indexable crawl discovery graph", () => {
  const page = source("src/app/site-haritasi/page.tsx");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const indexNow = source(".github/workflows/indexnow-submit.yml");
  const smoke = source(".github/workflows/production-smoke.yml");

  assertContains(page, 'alternates: { canonical: "/site-haritasi" }', "site map self canonical");
  assertContains(page, "robots: { index: true, follow: true }", "site map index/follow");
  assertContains(page, "SITE_MAP_PAGES", "code-owned public route inventory");
  assertContains(page, "loadPublishedCmsSiteMapPages()", "published CMS discovery links");
  assertContains(page, "prisma.work.findMany", "published public work discovery links");
  assertContains(page, "isSearchIndexExcludedPublicWorkSlug", "public work search safety exclusion");
  assertContains(page, "publicLegalLinks", "legal discovery links");
  assertContains(page, 'page.indexable !== false', "all indexable code-owned public routes stay discoverable");
  assertContains(page, "getBookIndexPublicPageContext(30)", "HTML site map aligns gated Book Index links with indexed publication");
  assertContains(page, 'style={{ color: "#3f3657" }}', "site map links keep explicit readable foreground contrast");
  assertContains(page, "Kitap Endeksi", "site map copy names the current Book Index surface");
  assertNotContains(page, "public içerik yüzeyini", "site map avoids internal technical wording");
  assertContains(navigation, '{ href: "/site-haritasi", label: "Site Haritası" }', "site map footer/support link");
  assertContains(sitemap, 'url: `${baseUrl}/site-haritasi`', "XML sitemap includes HTML site map");

  for (const cohort of [
    "https://ilkoku.com/site-haritasi",
    "https://ilkoku.com/yazarlar-icin/kurgu/roman",
    "https://ilkoku.com/okurlar-icin/okumaya-baslama",
    "https://ilkoku.com/editorler-icin/egitim/editorluge-baslama",
  ]) {
    assertContains(indexNow, cohort, `IndexNow waits for live cohort ${cohort}`);
    assertContains(smoke, cohort, `production smoke verifies live cohort ${cohort}`);
  }
});

test("dynamic public work route keeps canonical query noindex and structured-data contracts", () => {
  const book = source("src/app/kitap/[slug]/page.tsx");
  const safety = source("src/lib/public-content-safety.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");

  assertContains(book, "const canonical = `/kitap/${work.slug}`", "book self canonical");
  assertContains(book, "index: !query.from && !isSearchIndexExcludedPublicWorkSlug(slug)", "book return-path and test-work noindex");
  assertContains(safety, '"yeni-test209-30820c6a"', "Reader UAT work exact search exclusion");
  assertContains(safety, '"test2-7b0fbe47"', "secondary test work exact search exclusion");
  assertContains(safety, "searchIndexExcludedPublicWorkSlugs.has(normalizedSlug)", "exact work search exclusion");
  assertContains(sitemap, "isSearchIndexExcludedPublicWorkSlug(work.slug)", "sitemap search exclusion contract");
  assertContains(book, "twitter:", "book Twitter metadata");
  assertContains(book, '"@type": "Book"', "book schema");
  assertContains(book, '"@type": "BreadcrumbList"', "book breadcrumb schema");
  assertContains(book, 'name: "Ana Sayfa"', "book public breadcrumb root");
  assertNotContains(book, "/eserler", "retired work directory route");
  assertNotContains(book, "/yazarlar/", "retired public author route");
});
test("SEO center uses one core route catalog and verifies exact live coverage", () => {
  const technical = source("src/app/icerik/seo/SeoTechnicalAudit.tsx");
  const metadata = source("src/app/icerik/seo/SeoMetadataQualityAudit.tsx");
  const routes = source("src/lib/public-seo-routes.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const live = source("src/lib/seo-live-verification.ts");

  for (const route of [
    '"/yardim"',
    '"/editorler"',
    '"/iletisim"',
    '"/site-haritasi"',
  ]) {
    assertContains(routes, route, `canonical code-owned SEO route ${route}`);
  }

  assertContains(routes, "publicPlatformLinks", "platform routes feed SEO catalog");
  assertContains(routes, "publicTrustLinks", "trust routes feed SEO catalog");
  assertContains(routes, "publicLegalLinks", "legal routes feed SEO catalog");
  assertContains(navigation, 'href: "/hakkimizda"', "about route in canonical public navigation");
  assertContains(navigation, 'href: "/yasal/kullanim-sartlari"', "legal routes in canonical public navigation");
  assertContains(technical, "publicCodeOwnedIndexRoutes", "technical SEO consumes canonical code-owned routes");
  assertContains(technical, 'not: "adult_18"', "technical SEO adult work exclusion");
  assertContains(technical, 'visibility: "public"', "technical SEO discovery visibility boundary");
  assertContains(technical, "isBlockedPublicWorkSlug", "technical SEO blocked work slug exclusion");

  assertContains(live, "publicDefaultCoreSeoRoutes", "live social audit consumes complete core route catalog");
  assertContains(live, "coreSitemapExpectation", "live sitemap uses CMS-aware expected routes");
  assertContains(live, "missingCoreRoutes", "live sitemap verifies required route presence");
  assertContains(live, "zorunlu çekirdek rota eksik", "live sitemap reports missing required routes");
  assertContains(live, "published CMS noindex envanteri okunamadığı için", "live sitemap fails closed when CMS indexability is unreadable");
  assertNotContains(live, "minimumCoreSitemapUrls", "live sitemap must not pass on a magic URL count alone");

  for (const schemaType of ["CollectionPage", "ProfilePage", "FAQPage", "BreadcrumbList"]) {
    assertContains(metadata, schemaType, `structured-data inventory ${schemaType}`);
  }
  assertContains(metadata, 'href="/editorler"', "active structured-data collection link");
  assertNotContains(metadata, 'href="/kesfet"', "member discovery route is not a public SEO action");
  for (const retired of ['"/eserler"', '"/yazarlar"', '"/turler"']) {
    assertNotContains(routes, retired, `retired public SEO route ${retired}`);
    assertNotContains(navigation, retired, `retired public navigation route ${retired}`);
  }
});

test("SEO center and audit API stay Turkish-only", () => {
  const page = source("src/app/icerik/seo/page.tsx");
  const route = source("src/app/api/cms-seo-audit/route.ts");
  const roleCards = source("src/app/icerik/seo/SeoRoleCardsAudit.tsx");

  assertContains(page, 'toLocaleLowerCase("tr-TR")', "SEO Turkish search normalization");
  assertContains(page, "contentKey NOT LIKE 'legal:en:%'", "SEO excludes EN legal");
  assertContains(page, "contentKey NOT LIKE 'guide:en:%'", "SEO excludes EN guides");
  assertContains(page, "contentKey NOT LIKE 'page:en:%'", "SEO excludes EN generic pages");
  assertContains(route, "contentKey NOT LIKE 'legal:en:%'", "audit API excludes EN legal");
  assertContains(route, "contentKey NOT LIKE 'guide:en:%'", "audit API excludes EN guides");
  assertContains(route, "contentKey NOT LIKE 'page:en:%'", "audit API excludes EN generic pages");
  assertContains(route, "WHERE status = 'published'", "audit API published-only boundary");
  assertContains(roleCards, 'getPublishedRoleCardsState("tr")', "role card SEO reads TR state");
  assertNotContains(roleCards, 'getPublishedRoleCardsState("en")', "role card SEO ignores EN state");
  assertNotContains(roleCards, "TR / EN", "role card SEO has no language parity work");
});


test("sitemap XML route exposes stable HTTP validators", () => {
  const route = source("src/app/sitemap.xml/route.ts");

  assertContains(route, 'buildSitemap()', "sitemap route reuses canonical discovery inventory");
  assertContains(route, 'createHash("sha256")', "sitemap response uses content-derived ETag");
  assertContains(route, '"Last-Modified"', "sitemap response exposes Last-Modified");
  assertContains(route, 'request.headers.get("if-none-match")', "sitemap handles If-None-Match");
  assertContains(route, 'replace(/^W\\//i, "")', "sitemap normalizes weak ETags");
  assertContains(route, 'ifNoneMatch.split(",")', "sitemap accepts ETag lists");
  assertContains(route, 'value === "*"', "sitemap honors wildcard If-None-Match");
  assertContains(route, 'request.headers.get("if-modified-since")', "sitemap handles If-Modified-Since");
  assertContains(route, 'status: 304', "sitemap returns 304 for matching validators");
  assertContains(route, '"Content-Type": "application/xml; charset=utf-8"', "sitemap keeps XML content type");
});


test("SEO smoke reports public HTML payload sizes without impersonating Googlebot", () => {
  const smoke = source(".github/workflows/seo-indexability-smoke.yml");

  assertContains(smoke, 'USER_AGENT="IlkOku-SEO-Indexability/1.0 (+https://ilkoku.com)"', "dedicated SEO diagnostic user agent");
  assertNotContains(smoke, "Googlebot/2.1", "diagnostic must not impersonate Googlebot");
  assertContains(smoke, 'raw_bytes="$(wc -c < "$body" | tr -d', "raw HTML payload measurement");
  assertContains(smoke, 'gzip_bytes="$(gzip -c "$body" | wc -c', "gzip HTML payload measurement");
  assertContains(
    smoke,
    'echo "PAYLOAD path=$path raw_bytes=$raw_bytes gzip_bytes=$gzip_bytes"',
    "payload diagnostic log",
  );
});
