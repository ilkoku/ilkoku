import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  const socialImagePrepare = source("scripts/prepare-social-images.mjs");
  const ogAlt = source("src/app/opengraph-image.alt.txt");
  const twitterAlt = source("src/app/twitter-image.alt.txt");
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

  assert.equal(
    existsSync(join(ROOT, "public/og/ilkoku-social-selected-2026.webp")),
    true,
    "selected source social image must exist",
  );
  assertContains(socialImagePrepare, "ilkoku-social-selected-2026.webp", "selected social image source");
  assertContains(socialImagePrepare, "opengraph-image.jpg", "static Open Graph output");
  assertContains(socialImagePrepare, "twitter-image.jpg", "static Twitter output");
  assertContains(socialImagePrepare, ".resize(1200, 630", "social image dimensions");
  assertContains(ogAlt, "İlkOku — Dijital Yazar Platformu", "Open Graph alt brand");
  assertContains(ogAlt, "İlk cümle, ilk adım.", "Open Graph alt slogan");
  assert.equal(twitterAlt, ogAlt, "Twitter and Open Graph image alt text stay aligned");
  assertContains(homepage, "const homeDescription = publicBrandDescription", "homepage keeps canonical metadata description");
  assertContains(layout, "description: publicBrandDescription", "global metadata keeps canonical brand description");
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


test("public auth entry pages stay crawlable noindex-follow while private workspaces stay protected", () => {
  const robots = source("src/app/robots.ts");
  const nextConfig = source("next.config.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const proxy = source("src/proxy.ts");

  assertContains(nextConfig, "const publicAuthNoindexRouteHeaders", "public auth noindex header inventory");
  assertContains(nextConfig, 'value: "noindex, follow, noarchive"', "public auth X-Robots noindex-follow");

  for (const [route, pagePath] of [
    ["/giris", "src/app/giris/page.tsx"],
    ["/kayit", "src/app/kayit/page.tsx"],
    ["/sifremi-unuttum", "src/app/sifremi-unuttum/page.tsx"],
    ["/sifre-yenile", "src/app/sifre-yenile/page.tsx"],
  ]) {
    const page = source(pagePath);
    assertContains(page, "robots: { index: false, follow: true }", `${route} metadata noindex-follow`);
    assertNotContains(robots, `          "${route}",`, `${route} must stay crawlable so noindex can be read`);
    assertNotContains(sitemap, `https://ilkoku.com${route}`, `${route} must stay out of sitemap`);
  }

  for (const route of [
    "/hesabim",
    "/editor",
    "/yazar",
    "/eserlerim",
    "/kutuphanem",
    "/yayinevi",
  ]) {
    assertContains(proxy, `"${route}/:path*"`, `${route} request-time auth matcher`);
    assertContains(nextConfig, `"${route}/:path*"`, `${route} private X-Robots coverage`);
    assertNotContains(sitemap, `https://ilkoku.com${route}`, `${route} private workspace sitemap exclusion`);
  }
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

test("CMS trust/legal defaults remain stable while sitemap applies route-level soft-launch filtering", () => {
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
  assertContains(sitemap, "hasPublishedEditorProfiles", "editor sitemap availability gate");
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

test("soft-launch search gate keeps every page live while focusing the indexable cohort", () => {
  const policy = source("src/lib/soft-launch-search-policy.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const robots = source("src/app/robots.ts");
  const metadata = source("src/lib/public-page-metadata.ts");
  const readerLesson = source("src/app/okurlar-icin/[slug]/page.tsx");
  const productionSmoke = source(".github/workflows/production-smoke.yml");

  for (const route of [
    "/nasil-calisir",
    "/hakkimizda",
    "/yazarlar-icin",
    "/okurlar-icin",
    "/editorler-icin",
    "/yayinevleri-icin",
    "/editoryal-standartlar",
    "/yazarlar-icin/kurgu",
    "/yazarlar-icin/edebiyat",
    "/yazarlar-icin/akademik",
    "/yazarlar-icin/bilgilendirici",
    "/yazarlar-icin/senaryo-ve-sahne",
    "/yazarlar-icin/cocuk-ve-genclik",
    "/yazarlar-icin/cizgi-anlati",
    "/yazarlar-icin/kurgu/roman",
    "/yazarlar-icin/kurgu/oyku",
    "/yazarlar-icin/kurgu/fantastik",
    "/yazarlar-icin/kurgu/bilim-kurgu",
    "/yazarlar-icin/kurgu/distopya",
    "/yazarlar-icin/edebiyat/siir",
    "/okurlar-icin/okumaya-baslama",
    "/editorler-icin/egitim/editorluge-baslama",
    "/editorler-icin/egitim/dil-ve-anlatim-editorlugu",
    "/editorler-icin/egitim/metin-degerlendirme",
  ]) {
    assertContains(policy, `"${route}"`, `${route} focused index cohort`);
  }

  for (const route of [
    "/yardim",
    "/iletisim",
    "/site-haritasi",
    "/topluluk-kurallari",
    "/icerik-ve-yas-politikasi",
    "/telif-bildirimi",
    "/yasal/kullanim-sartlari",
    "/yasal/gizlilik-politikasi",
    "/yasal/kvkk",
    "/yasal/cerez-politikasi",
    "/yasal/telif-hakki-politikasi",
    "/yeni-cikanlar",
  ]) {
    assertContains(policy, `"${route}"`, `${route} exact noindex route`);
    assertNotContains(robots, `"${route}"`, `${route} remains crawlable and available on site`);
  }

  for (const prefix of [
    "/en-cok-satanlar",
    "/yazarlar-icin",
    "/okurlar-icin",
    "/editorler-icin/egitim",
  ]) {
    assertContains(policy, `"${prefix}"`, `${prefix} focused noindex prefix`);
  }

  assertContains(policy, "SOFT_LAUNCH_INDEXABLE_EXACT_PATHS.has(path)", "explicit indexable routes override family noindex prefixes");
  assertContains(policy, "path.startsWith(`${prefix}/`)", "descendants inherit exclusion unless explicitly indexable");
  assertContains(policy, "filterSoftLaunchSitemapEntries", "central sitemap soft-launch filter");
  assertContains(sitemap, 'import { filterSoftLaunchSitemapEntries } from "@/lib/soft-launch-search-policy";', "sitemap imports soft-launch filter");
  assertContains(sitemap, "return applySearchCodeFreshness(filterSoftLaunchSitemapEntries([", "database-backed sitemap is filtered and freshness-aware");
  assertContains(sitemap, "return applySearchCodeFreshness(filterSoftLaunchSitemapEntries(staticFallbackEntries));", "fallback sitemap is filtered and freshness-aware");
  assertContains(metadata, "const effectiveNoIndex = noIndex || isSoftLaunchSearchExcludedPath(canonical);", "shared public metadata applies focused search policy");
  assertContains(readerLesson, "const noIndex = isSoftLaunchSearchExcludedPath(canonical);", "reader lesson metadata applies focused search policy");

  for (const pagePath of [
    "src/app/nasil-calisir/page.tsx",
    "src/app/yazarlar-icin/page.tsx",
    "src/app/editorler-icin/page.tsx",
    "src/app/yayinevleri-icin/page.tsx",
    "src/app/editoryal-standartlar/page.tsx",
  ]) {
    const page = source(pagePath);
    assertContains(page, "isSoftLaunchSearchExcludedPath", `${pagePath} soft-launch metadata gate`);
    assertContains(page, "const noIndex = page.noIndex || isSoftLaunchSearchExcludedPath(page.canonical);", `${pagePath} CMS plus soft-launch noindex`);
  }

  const legal = source("src/app/yasal/[slug]/page.tsx");
  assertContains(legal, "Boolean(cms?.noIndex) || isSoftLaunchSearchExcludedPath(canonical)", "legal pages combine CMS and soft-launch noindex");

  assertContains(productionSmoke, "check_soft_launch_sitemap", "production smoke uses the focused sitemap contract");
  assertContains(productionSmoke, "'<loc>https://ilkoku.com/nasil-calisir</loc>'", "production smoke requires how-it-works pillar");
  assertContains(productionSmoke, "'<loc>https://ilkoku.com/yazarlar-icin</loc>'", "production smoke requires writer pillar");
  assertContains(productionSmoke, "'<loc>https://ilkoku.com/editorler-icin</loc>'", "production smoke requires editor pillar");
  assertContains(productionSmoke, "'<loc>https://ilkoku.com/yayinevleri-icin</loc>'", "production smoke requires publisher pillar");
  assertContains(productionSmoke, "'<loc>https://ilkoku.com/yazarlar-icin/kurgu/gerilim</loc>'", "production smoke forbids non-cohort long-tail writing route");
  assertContains(productionSmoke, "'<loc>https://ilkoku.com/en-cok-satanlar'", "production smoke forbids the Book Index sitemap family");
  assertContains(productionSmoke, "'<loc>https://ilkoku.com/yasal/'", "production smoke forbids legal utility sitemap family");
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
  const editorData = source("src/features/editors/data.ts");
  assertContains(help, '"@type": "FAQPage"', "help FAQ structured data");
  assertContains(help, '"@type": "BreadcrumbList"', "help breadcrumb structured data");
  assertContains(editors, '"@type": "CollectionPage"', "editor directory structured data");
  assertContains(editors, '"@type": "BreadcrumbList"', "editor directory breadcrumb structured data");
  assertContains(editorData, "hasPublishedEditorProfiles = editors.length > 0", "editor directory truthful publication gate");
  assertContains(editors, "index: hasPublishedEditorProfiles", "empty editor directory noindex gate");
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

test("public HTML site map remains a crawlable noindex discovery graph", () => {
  const page = source("src/app/site-haritasi/page.tsx");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const indexNow = source(".github/workflows/indexnow-submit.yml");
  const smoke = source(".github/workflows/production-smoke.yml");

  assertContains(page, 'alternates: { canonical: "/site-haritasi" }', "site map self canonical");
  assertContains(page, "robots: { index: false, follow: true }", "site map noindex/follow");
  assertContains(page, "SITE_MAP_PAGES", "code-owned public route inventory");
  assertContains(page, "loadPublishedCmsSiteMapPages()", "published CMS discovery links");
  assertContains(page, "prisma.work.findMany", "published public work discovery links");
  assertContains(page, "isSearchIndexExcludedPublicWorkSlug", "public work search safety exclusion");
  assertContains(page, "publicLegalLinks", "legal discovery links");
  assertContains(page, 'page.indexable !== false', "all indexable code-owned public routes stay discoverable");
  assertNotContains(page, "getBookIndexPublicPageContext", "HTML site map does not hide stable Book Index routes behind transient data availability");
  assertContains(page, 'style={{ color: "#3f3657" }}', "site map links keep explicit readable foreground contrast");
  assertContains(page, "Kitap Endeksi", "site map copy names the current Book Index surface");
  assertNotContains(page, "public içerik yüzeyini", "site map avoids internal technical wording");
  assertContains(navigation, '{ href: "/site-haritasi", label: "Site Haritası" }', "site map footer/support link");
  assertContains(sitemap, "filterSoftLaunchSitemapEntries", "XML sitemap filters the noindex HTML site map");

  assertNotContains(indexNow, "https://ilkoku.com/site-haritasi", "IndexNow does not wait for soft-launch noindex site map");
  assertContains(smoke, "https://ilkoku.com/site-haritasi", "production smoke still verifies live noindex site map");

  for (const cohort of [
    "https://ilkoku.com/yazarlar-icin/kurgu/roman",
    "https://ilkoku.com/okurlar-icin/okumaya-baslama",
    "https://ilkoku.com/editorler-icin/egitim/editorluge-baslama",
  ]) {
    assertContains(indexNow, cohort, `IndexNow waits for live indexable cohort ${cohort}`);
    assertContains(smoke, cohort, `production smoke verifies live cohort ${cohort}`);
  }
});

test("dynamic public work route keeps canonical query noindex and structured-data contracts", () => {
  const book = source("src/app/kitap/[slug]/page.tsx");
  const safety = source("src/lib/public-content-safety.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");

  assertContains(book, "const canonical = `/kitap/${work.slug}`", "book self canonical");
  assertContains(book, "index: !query.from && !searchIndexExcluded", "book return-path and test-work noindex");
  assertContains(book, "follow: !searchIndexExcluded", "search-excluded test/demo works are nofollow");
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
    '"/iletisim"',
    '"/site-haritasi"',
  ]) {
    assertContains(routes, route, `canonical code-owned SEO route ${route}`);
  }
  assertContains(routes, 'hasPublishedEditorProfiles ? ["/editorler"]', "editor route follows real profile availability");

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
  assertContains(metadata, 'href="/site-haritasi"', "active structured-data collection link");
  assertContains(live, 'verifySchema("CollectionPage", "/site-haritasi"', "CollectionPage verification uses indexable site map");
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


test("significant Oct 6 search updates propagate truthful freshness to sitemap and Atom", () => {
  const freshness = source("src/lib/search-content-freshness.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const atom = source("src/app/recent-updates.atom/route.ts");

  for (const [route, timestamp] of [
    ["/yazarlar-icin/kurgu/roman", "2026-10-06T07:55:57Z"],
    ["/yazarlar-icin/kurgu/oyku", "2026-10-06T07:55:57Z"],
    ["/yazarlar-icin/kurgu/fantastik", "2026-10-06T07:55:57Z"],
    ["/yazarlar-icin/kurgu/bilim-kurgu", "2026-10-06T07:55:57Z"],
    ["/yazarlar-icin/kurgu/distopya", "2026-10-06T07:55:57Z"],
    ["/yazarlar-icin/edebiyat/siir", "2026-10-06T07:55:57Z"],
    ["/okurlar-icin/okumaya-baslama", "2026-10-06T08:04:59Z"],
    ["/yazarlar-icin/kurgu", "2026-10-06T08:33:10Z"],
    ["/yazarlar-icin/edebiyat", "2026-10-06T08:33:10Z"],
    ["/yazarlar-icin/akademik", "2026-10-06T08:33:10Z"],
    ["/yazarlar-icin/bilgilendirici", "2026-10-06T08:33:10Z"],
    ["/yazarlar-icin/senaryo-ve-sahne", "2026-10-06T08:33:10Z"],
    ["/yazarlar-icin/cocuk-ve-genclik", "2026-10-06T08:33:10Z"],
    ["/yazarlar-icin/cizgi-anlati", "2026-10-06T08:33:10Z"],
    ["/okurlar-icin", "2026-10-06T08:33:10Z"],
    ["/editorler-icin/egitim/editorluge-baslama", "2026-10-06T09:14:20Z"],
    ["/editorler-icin/egitim/dil-ve-anlatim-editorlugu", "2026-10-06T09:14:20Z"],
    ["/editorler-icin/egitim/metin-degerlendirme", "2026-10-06T09:14:20Z"],
  ]) {
    assertContains(freshness, `"${route}"`, `${route} route freshness`);
    assertContains(freshness, `new Date("${timestamp}")`, `${route} truthful update timestamp`);
  }

  assertNotContains(
    freshness,
    '["/hakkimizda",',
    "about social-image-only change must not falsify sitemap lastmod",
  );
  assertContains(sitemap, "getSearchCodeFreshness(entry.url)", "sitemap route-specific code freshness");
  assertContains(sitemap, "currentLastModified >= codeFreshness", "newer CMS/content freshness wins");
  assertContains(
    sitemap,
    "return applySearchCodeFreshness(filterSoftLaunchSitemapEntries([",
    "database sitemap applies freshness after indexability filtering",
  );
  assertContains(
    sitemap,
    "return applySearchCodeFreshness(filterSoftLaunchSitemapEntries(staticFallbackEntries));",
    "fallback sitemap applies the same freshness",
  );
  assertContains(atom, "const sitemap = await buildSitemap();", "Atom derives freshness from canonical sitemap inventory");
  assertContains(atom, "const updatedAt = normalizeLastModified(entry.lastModified);", "Atom uses sitemap lastmod as updated");
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


test("indexing diagnostics and GSC submission stay aligned with the focused live cohort", () => {
  const smoke = source(".github/workflows/seo-indexability-smoke.yml");
  const crawlerGuard = source(".github/workflows/full-public-googlebot-guard.yml");
  const inspection = source("scripts/gsc-url-inspection.mjs");
  const submit = source("scripts/gsc-sitemap-submit.mjs");
  const submitWorkflow = source(".github/workflows/gsc-sitemap-submit.yml");
  const census = source("scripts/gsc-full-index-census.mjs");

  assertContains(
    smoke,
    'local url="https://ilkoku.com${path}"',
    "noindex diagnostic must fetch the requested İlkOku path",
  );
  assertNotContains(
    smoke,
    "https://ilkoku.com.github/workflows/seo-indexability-smoke.yml",
    "broken workflow-file URL must never be used as a page target",
  );

  for (const route of [
    "https://ilkoku.com/nasil-calisir",
    "https://ilkoku.com/yazarlar-icin",
    "https://ilkoku.com/editorler-icin",
    "https://ilkoku.com/yayinevleri-icin",
    "https://ilkoku.com/editoryal-standartlar",
    "https://ilkoku.com/yazarlar-icin/kurgu/roman",
    "https://ilkoku.com/okurlar-icin/okumaya-baslama",
    "https://ilkoku.com/editorler-icin/egitim/editorluge-baslama",
  ]) {
    assertContains(smoke, route, route + " current smoke cohort");
    assertContains(submit, route, route + " GSC sitemap submit cohort");
  }

  for (const staleTarget of [
    '"https://ilkoku.com/en-cok-satanlar"',
    '"https://ilkoku.com/en-cok-satanlar/dunya"',
    '"https://ilkoku.com/yasal/kullanim-sartlari"',
  ]) {
    assertNotContains(submit, staleTarget, staleTarget + " stale GSC submit target");
  }

  assertContains(
    inspection,
    "/hakkimizda",
    "About page must be part of the current URL Inspection cohort",
  );
  assertContains(
    crawlerGuard,
    "mapfile -t sitemap_urls",
    "manual crawler guard must derive URLs from the live sitemap",
  );
  assertNotContains(
    crawlerGuard,
    "RUN-19-URL-CRAWLER-DIAGNOSTIC",
    "crawler confirmation must not freeze an obsolete URL count",
  );
  assertContains(
    submitWorkflow,
    "workflow_dispatch:",
    "GSC sitemap submit remains explicitly manual",
  );
  assertNotContains(
    submitWorkflow,
    "  push:",
    "GSC sitemap submit must not mutate Search Console on ordinary pushes",
  );
  assertContains(
    census,
    'robotsTxtState: countBy(results, "robotsTxtState")',
    "full GSC census must summarize robots state",
  );
});
