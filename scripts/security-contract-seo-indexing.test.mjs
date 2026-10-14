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



test("robots limits private reading rules without blocking public Okurluk Okulu", () => {
  const robots = source("src/app/robots.ts");
  const readingRules = [...robots.matchAll(/^\s+"(\/oku(?:\$|\/)?)",?$/gmu)].map((match) => match[1]);

  assert.deepEqual(readingRules, ["/oku$", "/oku/"], "private reader crawl rules remain narrowly scoped");

  const blocksReading = (route) => readingRules.some((rule) =>
    rule.endsWith("$") ? route === rule.slice(0, -1) : route.startsWith(rule),
  );

  for (const publicRoute of ["/okurlar-icin", "/okurlar-icin/okumaya-baslama"]) {
    assert.equal(blocksReading(publicRoute), false, `public reading education must be crawlable: ${publicRoute}`);
  }

  for (const privateRoute of ["/oku", "/oku/", "/oku/bolum-1"]) {
    assert.equal(blocksReading(privateRoute), true, `private reading must remain blocked: ${privateRoute}`);
  }
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
    "/oku",
    "/yazar",
    "/yayinevi",
    "/yayinevleri",
  ]);
  const crawlableRedirectRoots = new Set([
    "/editörler",
  ]);

  for (const route of privateRoots) {
    if (crawlableRedirectRoots.has(route)) {
      assertNotContains(
        robots,
        `"${route}"`,
        `legacy redirect ${route} must stay crawlable so crawlers can observe its canonical redirect`,
      );
      continue;
    }

    if (exactPrefixRoots.has(route)) {
      assertContains(robots, `"${route}$"`, `exact private crawl boundary ${route}`);
      assertContains(robots, `"${route}/"`, `private descendants crawl boundary ${route}`);
      assertNotContains(robots, `          "${route}",`, `broad private prefix ${route}`);
      continue;
    }

    assertContains(robots, `"${route}"`, `private crawl boundary ${route}`);
  }
});

test("public trust pages are indexable after explicit full-public policy expansion", () => {
  const policy = source("src/lib/soft-launch-search-policy.ts");
  const publicStore = source("src/lib/cms-public-page-store.ts");
  const alwaysIndexBlock = publicStore.split("const alwaysIndexPublicTrustSlugs = new Set([")[1]?.split("]);", 1)[0] ?? "";
  const noindexBlock = policy.split("const SOFT_LAUNCH_NOINDEX_EXACT_PATHS")[1]?.split("]);", 1)[0] ?? "";
  for (const route of ["icerik-ve-yas-politikasi", "topluluk-kurallari", "telif-bildirimi"]) {
    const canonical = `/${route}`;
    const page = source(`src/app/${route}/page.tsx`);
    assertNotContains(noindexBlock, `"${canonical}"`, `${route} no longer soft-launch excluded`);
    assertContains(alwaysIndexBlock, `"${route}"`, `${route} cannot be held noindex by old CMS flag`);
    assertContains(page, `robots: page.noIndex || isSoftLaunchSearchExcludedPath("${canonical}")`, `${route} CMS plus policy metadata`);
    assertContains(page, "follow: true", `${route} keeps public links crawlable`);
    assertContains(page, "alternates: { canonical: page.canonical }", `${route} self canonical intact`);
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

test("how-it-works headline, actionable onboarding and truthful update date remain visible", () => {
  const experience = source("src/components/content/HowItWorksExperience.tsx");
  const page = source("src/app/nasil-calisir/page.tsx");
  const freshness = source("src/lib/search-content-freshness.ts");

  assertContains(experience, 'return <><span>{match[1]}{" "}</span><span>{match[2]}</span></>;', "readable split H1 spacing");
  assertContains(experience, "İlkOku&apos;ya nasıl başlanır?", "first-time visitor quick-start instructions");
  assertContains(experience, "Genel eser ve yazar katalogları henüz", "honest catalogue availability");
  for (const role of ["writer", "reader", "editor", "publisher"]) {
    assertContains(experience, `href="/kayit?rol=${role}"`, `direct role-specific onboarding for ${role}`);
  }
  assertContains(freshness, '["/nasil-calisir", HOW_IT_WORKS_QUICK_START_UPDATED_AT]', "route-only content freshness");
  assertContains(page, 'getSearchCodeFreshness("/nasil-calisir")', "structured data uses actual route freshness");
  assertContains(page, "dateModified: updatedAt.toISOString()", "WebPage dateModified matches visible content update");
  assertContains(page, "updatedAt={updatedAt}", "visible last-updated label matches changed content");
});

test("public pillar split hero headings keep semantic spaces without changing line-break design", () => {
  const standards = source("src/components/content/EditorialStandardsExperience.tsx");
  const publishers = source("src/components/content/ForPublishersExperience.tsx");
  assertContains(standards, '{index > 0 ? " " : null}{word}</span>', "editorial standards heading inserts text separation");
  assertContains(publishers, '{index > 0 ? " " : null}{word}</span>', "publisher heading inserts text separation");
  assertNotContains(standards, '<span key={word}>{word}</span>', "standards heading avoids concatenated words");
  assertNotContains(publishers, '<span key={`${word}-${index}`}>{word}</span>', "publisher heading avoids concatenated words");
});

test("HTML sitemap links to the published indexable registration agreement", () => {
  const htmlSiteMap = source("src/app/site-haritasi/page.tsx");
  const registrationAgreement = source("src/app/uyelik-sozlesmesi/page.tsx");
  const sitemapData = source("src/lib/seo/sitemap-data.ts");
  assertContains(htmlSiteMap, '{ href: "/uyelik-sozlesmesi", label: "Üyelik Sözleşmesi" }', "HTML legal sitemap links public registration agreement");
  assertContains(htmlSiteMap, "...siteMapLegalLinks.map((link) => link.href)", "CMS sitemap deduplication includes the registration agreement");
  assertContains(htmlSiteMap, "{siteMapLegalLinks.map((link) => (", "HTML legal section renders the added link");
  assertContains(registrationAgreement, 'robots: { index: true, follow: true }', "registration agreement remains indexable");
  assertContains(registrationAgreement, 'alternates: { canonical: "/uyelik-sozlesmesi" }', "registration agreement self-canonical");
  assertContains(sitemapData, 'url: `${baseUrl}/uyelik-sozlesmesi`', "XML sitemap retains registration agreement");
});

test("public trust hero headings preserve semantic word boundaries", () => {
  for (const file of [
    "src/components/content/ContentAgePolicyExperience.tsx",
    "src/components/content/CommunityRulesExperience.tsx",
    "src/components/content/CopyrightNoticeExperience.tsx",
  ]) {
    const component = source(file);
    assertContains(component, '{index > 0 ? " " : null}{word}', file + " must separate H1 words in SSR HTML");
    assertNotContains(component, '<span key={word}>{word}</span>', file + " must not join words");
    assertNotContains(component, '<span key={`${word}-${index}`}>{word}</span>', file + " must not join words");
  }
});

test("writer and editor split hero titles retain accessible word boundaries", () => {
  for (const page of ["ForWritersExperience", "ForEditorsExperience"]) {
    const experience = source(`src/components/content/${page}.tsx`);
    assertContains(experience, '{index > 0 ? " " : null}{word}</span>', `${page} adds semantic text spacing`);
    assertNotContains(experience, '<span key={`${word}-${index}`}>{word}</span>', `${page} must not concatenate words`);
  }
});

test("SEO content-depth phase 9 adds seven useful category examples and a reader choice guide", () => {
  const hubs = source("src/lib/writing-category-hubs.ts");
  const landing = source("src/components/content/WritingCategoryLandingPage.tsx");
  const readers = source("src/app/okurlar-icin/page.tsx");
  const freshness = source("src/lib/search-content-freshness.ts");

  const caseHeadings = [...hubs.matchAll(/workedExample: \{\s+heading: "([^"]+)"/g)].map((match) => match[1]);
  assert.equal(caseHeadings.length, 7, "each of seven public writing category hubs has a distinct practical case");
  assert.equal(new Set(caseHeadings).size, 7, "avoid repetitive SEO filler disguised as distinct lessons");
  for (const key of ["scenario", "comparison", "assignment"]) {
    assertContains(landing, `hub.workedExample.${key}`, `worked case renders ${key} accessibly`);
  }
  assertContains(landing, 'Uygulamalı tür karşılaştırması', "real genre comparison shown to visitors");
  assertContains(landing, 'Kendi taslağında dene', "visitors get an actual task");
  assertContains(readers, 'id="okur-ihtiyacini-belirle"', "reading school provides a search-intent-led selector");
  assertContains(readers, 'Kitaplara başlayıp yarım bırakıyorum.', "reading habit decision path");
  assertContains(readers, 'Okuyorum ama ayrıntıları unutuyorum.', "active reading decision path");
  assertContains(readers, 'Beğendim diyorum, nedenini açıklayamıyorum.', "literary reading decision path");
  assertContains(readers, 'On beş dakikalık okuma kararı', "realistic quick start case");

  for (const route of [
    "/okurlar-icin",
    "/yazarlar-icin/kurgu",
    "/yazarlar-icin/edebiyat",
    "/yazarlar-icin/akademik",
    "/yazarlar-icin/bilgilendirici",
    "/yazarlar-icin/senaryo-ve-sahne",
    "/yazarlar-icin/cocuk-ve-genclik",
    "/yazarlar-icin/cizgi-anlati",
  ]) {
    assertContains(freshness, `["${route}", PUBLIC_EDUCATION_WORKED_EXAMPLES_UPDATED_AT]`, `material update is tracked for ${route}`);
  }
  assertContains(freshness, '["/nasil-calisir", HOW_IT_WORKS_QUICK_START_UPDATED_AT]', "unrelated flagship freshness remains unchanged");
});

test("SEO internal-links phase 11 gives three indexable editor lessons contextual onward learning", () => {
  const shell = source("src/components/content/EditorEducationShell.tsx");
  const freshness = source("src/lib/search-content-freshness.ts");
  const livePolicy = source("src/lib/soft-launch-search-policy.ts");
  for (const slug of ["editorluge-baslama", "metin-degerlendirme", "dil-ve-anlatim-editorlugu"]) {
    assertContains(shell, `"${slug}": {`, `contextual education step exists for ${slug}`);
    assertContains(freshness, `["/editorler-icin/egitim/${slug}", EDITOR_CONTEXTUAL_LEARNING_UPDATED_AT]`, `route-specific lastmod for ${slug}`);
    assertContains(livePolicy, `"/editorler-icin/egitim/${slug}"`, `destination remains in intended indexable cohort ${slug}`);
  }
  assertContains(shell, 'aria-label="İlgili editörlük eğitimi"', "accessible contextual learning nav");
  assertContains(shell, "href={contextualStep.href}", "actual href-based crawlable Next Link");
  assertContains(shell, "contextualStep.reason", "natural-language reason before link");
  assertContains(shell, "!previewMode ? EDITOR_EDUCATION_CONTEXTUAL_STEPS[activeCategory.slug] : null", "non-published preview doesn't show contextual navigation");
  assertContains(shell, 'href: "/editorler-icin/egitim/metin-degerlendirme"', "path to evaluation lesson");
  assertContains(shell, 'href: "/editorler-icin/egitim/dil-ve-anlatim-editorlugu"', "path to line edit lesson");
  const targets = [...shell.matchAll(/href: "(\/editorler-icin\/egitim\/[^"]+)"/g)].map((match) => match[1]);
  assert.equal(targets.length, 3, "exactly three useful lesson handoffs, not a sitewide SEO link cloud");
});

test("public footer signup resolves to homepage role section from nested routes", () => {
  const footer = source("src/features/homepage/live-footer.tsx");
  const homepage = source("src/features/homepage/HomepageExperience.tsx");
  assertContains(footer, '<Link prefetch={false} href="/#roller">Üye Ol</Link>', "footer signup stays crawlable without eager prefetch on nested routes");
  assertNotContains(footer, '<a href="#roller">Üye Ol</a>', "nested pages must not link to missing local section");
  assertContains(homepage, 'id="roller"', "homepage role selector is a real target");
});

test("contextual writing guide handoffs favor indexable siblings", () => {
  const shell = source("src/components/content/WritingGuideShell.tsx");
  assertContains(shell, 'import { isSoftLaunchSearchPriorityPath } from "@/lib/soft-launch-search-policy";', "reuse search-cohort policy");
  assertContains(shell, "...genres.map((_, index) => index)", "find relevant siblings beyond adjacent genres");
  assertContains(shell, "const relatedGenreCandidates =", "include available genre link candidates");
  assertContains(shell, 'isSoftLaunchSearchPriorityPath(LIVE_WRITING_GUIDE_HREFS[genre.slug] ?? "")', "prioritize indexable links");
  assertContains(shell, '!isSoftLaunchSearchPriorityPath(LIVE_WRITING_GUIDE_HREFS[genre.slug] ?? "")', "preserve unindexed-genre fallback");
  assertContains(shell, "].slice(0, 3);", "keep contextual links limited");
  assertContains(shell, 'aria-label="İlgili yazarlık eğitimleri"', "maintain related link navigation");
});

test("Article structured data uses the real public Open Graph image on reader and editor lessons", () => {
  const reader = source("src/app/okurlar-icin/[slug]/page.tsx");
  const editor = source("src/components/content/EditorEducationStructuredData.tsx");
  const brand = source("src/lib/public-brand.ts");
  assertContains(brand, 'publicBrandSocialImage = "/og/ilkoku-social-selected-2026.webp"', "published canonical image path");
  assertContains(reader, 'image: "https://ilkoku.com/og/ilkoku-social-selected-2026.webp"', "reader article image is actually published");
  assertContains(reader, 'images: [{ url: socialImage }]', "reader OG image matches Article image");
  assertContains(editor, 'import { publicBrandSocialImage } from "@/lib/public-brand";', "editor uses the same canonical art");
  assertContains(editor, 'image: `${siteUrl}${publicBrandSocialImage}`', "editor Article image resolves to an absolute HTTPS URL");
  const readerShell = source("src/components/content/ReaderEducationShell.tsx");
  assertNotContains(reader, '"@type": "BreadcrumbList"', "reader lesson route avoids duplicate breadcrumb schema");
  assertContains(readerShell, '"@type": "BreadcrumbList"', "reader lesson shell retains one breadcrumb schema");
  assertContains(readerShell, 'item: new URL(item.url, BASE_URL).toString()', "breadcrumb items retain absolute canonical URLs");
  assertContains(editor, '"@type": "BreadcrumbList"', "editor breadcrumb markup remains in place");
});

test("Madde 12 priority writing-guide Article schemas use the published brand image", () => {
  const brand = source("src/lib/public-brand.ts");
  assertContains(brand, 'publicBrandSocialImage = "/og/ilkoku-social-selected-2026.webp"', "real public artwork is shared");

  for (const path of [
    "src/components/content/WritingGuideStructuredData.tsx",
    "src/app/yazarlar-icin/kurgu/oyku/page.tsx",
    "src/components/content/BatchedEducationGuidePage.tsx",
  ]) {
    const page = source(path);
    assertContains(page, 'import { publicBrandSocialImage } from "@/lib/public-brand";', `${path} uses the existing asset`);
    assertContains(page, 'image: `https://ilkoku.com${publicBrandSocialImage}`', `${path} emits an absolute HTTPS Article image`);
    assertContains(page, 'author: { "@id": "https://ilkoku.com/#organization" }', `${path} reuses one complete global author entity`);
    assertContains(page, 'publisher: { "@id": "https://ilkoku.com/#organization" }', `${path} reuses one complete global publisher entity`);
    assertContains(page, '"@type": "Article"', `${path} retains the Article schema`);
    assertContains(page, '"@type": "BreadcrumbList"', `${path} retains its existing breadcrumb schema`);
  }

  const roman = source("src/app/yazarlar-icin/kurgu/roman/page.tsx");
  assertContains(roman, 'image: `https://ilkoku.com${romanVisuals.hero}`', "already-valid Roman page keeps its own image");
});

test("full public sitemap policy indexes education and trust but preserves private and Book Index gates", () => {
  const policy = source("src/lib/soft-launch-search-policy.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const metadata = source("src/lib/public-page-metadata.ts");
  const productionSmoke = source(".github/workflows/production-smoke.yml");
  const noindexBlock = policy.split("const SOFT_LAUNCH_NOINDEX_EXACT_PATHS")[1]?.split("]);", 1)[0] ?? "";
  const prefixBlock = policy.split("const SOFT_LAUNCH_NOINDEX_PREFIXES")[1]?.split("] as const", 1)[0] ?? "";
  for (const route of [
    "/yardim", "/iletisim", "/site-haritasi",
    "/topluluk-kurallari", "/icerik-ve-yas-politikasi", "/telif-bildirimi",
    "/yasal/kullanim-sartlari", "/yasal/gizlilik-politikasi", "/yasal/kvkk",
    "/yasal/cerez-politikasi", "/yasal/telif-hakki-politikasi",
  ]) {
    assertNotContains(noindexBlock, `"${route}"`, `${route} public information no longer soft-launch excluded`);
  }
  for (const path of [
    "src/app/yardim/page.tsx",
    "src/app/iletisim/page.tsx",
    "src/app/site-haritasi/page.tsx",
  ]) {
    assertContains(source(path), "robots: { index: true, follow: true }", `${path} public utility metadata`);
  }
  for (const route of ["/yazarlar-icin", "/okurlar-icin", "/editorler-icin/egitim"]) {
    assertNotContains(prefixBlock, `"${route}"`, `${route} education family opens`);
  }
  assertContains(prefixBlock, '"/en-cok-satanlar"', "Book Index remains gate protected");
  assertContains(noindexBlock, '"/yeni-cikanlar"', "new releases stays gated");
  assertContains(policy, "filterSoftLaunchSitemapEntries", "same central policy filters XML");
  assertContains(sitemap, "return applySearchCodeFreshness(filterSoftLaunchSitemapEntries([", "DB-backed sitemap still filtered and freshness-aware");
  assertContains(sitemap, "return applySearchCodeFreshness(filterSoftLaunchSitemapEntries(staticFallbackEntries));", "fallback sitemap stays safe");
  assertContains(sitemap, 'url: `${baseUrl}/uyelik-sozlesmesi`', "active public registration agreement included");
  assertContains(metadata, "const effectiveNoIndex = noIndex || isSoftLaunchSearchExcludedPath(canonical);", "metadata and XML use same policy");
  assertContains(productionSmoke, "'<loc>https://ilkoku.com/yazarlar-icin/kurgu/gerilim</loc>'", "long-tail guide required by live sitemap smoke");
  assertContains(productionSmoke, "'<loc>https://ilkoku.com/yasal/kvkk</loc>'", "public legal included by smoke");
  assertContains(productionSmoke, "'<loc>https://ilkoku.com/en-cok-satanlar'", "Book Index remains excluded until ready");
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

test("public HTML site map remains a canonical indexable discovery graph", () => {
  const page = source("src/app/site-haritasi/page.tsx");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const navigation = source("src/lib/public-site-navigation.ts");
  const indexNow = source(".github/workflows/indexnow-submit.yml");
  const smoke = source(".github/workflows/production-smoke.yml");

  assertContains(page, 'alternates: { canonical: "/site-haritasi" }', "site map self canonical");
  assertContains(page, "robots: { index: true, follow: true }", "public site map index/follow");
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
  assertContains(sitemap, "filterSoftLaunchSitemapEntries", "XML sitemap still filters paused product routes");

  assertNotContains(indexNow, "https://ilkoku.com/site-haritasi", "IndexNow changed-file selection remains independent of sitemap inclusion");
  assertContains(smoke, "https://ilkoku.com/site-haritasi", "production smoke verifies live indexable site map");

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

  for (const route of [
    "https://ilkoku.com/",
    "https://ilkoku.com/nasil-calisir",
    "https://ilkoku.com/hakkimizda",
    "https://ilkoku.com/yazarlar-icin",
    "https://ilkoku.com/okurlar-icin",
    "https://ilkoku.com/editorler-icin",
    "https://ilkoku.com/yayinevleri-icin",
    "https://ilkoku.com/editoryal-standartlar",
    "https://ilkoku.com/yazarlar-icin/kurgu",
    "https://ilkoku.com/yazarlar-icin/edebiyat",
    "https://ilkoku.com/yazarlar-icin/akademik",
    "https://ilkoku.com/yazarlar-icin/bilgilendirici",
    "https://ilkoku.com/yazarlar-icin/senaryo-ve-sahne",
    "https://ilkoku.com/yazarlar-icin/cocuk-ve-genclik",
    "https://ilkoku.com/yazarlar-icin/cizgi-anlati",
    "https://ilkoku.com/yazarlar-icin/kurgu/roman",
    "https://ilkoku.com/yazarlar-icin/kurgu/oyku",
    "https://ilkoku.com/yazarlar-icin/kurgu/fantastik",
    "https://ilkoku.com/yazarlar-icin/kurgu/bilim-kurgu",
    "https://ilkoku.com/yazarlar-icin/kurgu/distopya",
    "https://ilkoku.com/yazarlar-icin/edebiyat/siir",
    "https://ilkoku.com/okurlar-icin/okumaya-baslama",
    "https://ilkoku.com/editorler-icin/egitim/editorluge-baslama",
    "https://ilkoku.com/editorler-icin/egitim/dil-ve-anlatim-editorlugu",
    "https://ilkoku.com/editorler-icin/egitim/metin-degerlendirme",
  ]) {
    assertContains(smoke, route, route + " full soft-launch smoke cohort");
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
  assertNotContains(
    submitWorkflow,
    "  push:",
    "GSC submit must not silently skip an automatic submission",
  );
  assertNotContains(
    submitWorkflow,
    '"src/lib/soft-launch-search-policy.ts"',
    "policy changes no longer trigger duplicate GSC submissions",
  );
  assertNotContains(
    submitWorkflow,
    '"src/lib/seo/sitemap-data.ts"',
    "sitemap changes are read by GSC without duplicate automatic submissions",
  );
  assertContains(
    submitWorkflow,
    "Require Search Console write OAuth",
    "manual GSC submission fails visibly when write credentials are absent",
  );
  assertContains(
    submitWorkflow,
    "if: github.event_name == 'workflow_dispatch'",
    "manual confirmation remains required only for manual GSC submissions",
  );
  assertContains(
    census,
    'robotsTxtState: countBy(results, "robotsTxtState")',
    "full GSC census must summarize robots state",
  );
});

test("Madde 14 writer hub links directly to five approved indexable priority guides", () => {
  const writerHub = source("src/components/content/ForWritersExperience.tsx");
  const searchPolicy = source("src/lib/soft-launch-search-policy.ts");
  const styles = source("src/app/yazarlar-icin/education-hub.css");
  const links = [
    "/yazarlar-icin/kurgu/oyku",
    "/yazarlar-icin/kurgu/fantastik",
    "/yazarlar-icin/kurgu/bilim-kurgu",
    "/yazarlar-icin/kurgu/distopya",
    "/yazarlar-icin/edebiyat/siir",
  ];

  for (const path of links) {
    assertContains(writerHub, `href: "${path}"`, `writer hub priority link ${path}`);
    assertContains(searchPolicy, `"${path}"`, `indexable URL retained ${path}`);
  }
  assertContains(writerHub, 'aria-label="Doğrudan yazarlık rehberleri"', "accessible quick links");
  assertContains(writerHub, "priorityWritingGuideLinks.map((guide)", "SSR-rendered real link list");
  assertContains(writerHub, "<Link href={guide.href}", "crawler-visible href anchors");
  assertContains(styles, ".writers-education__shortcuts-links", "responsive link styling");
});

test("Madde 14 writer hub sitemap lastmod reflects the actual five-guide link release", () => {
  const freshness = source("src/lib/search-content-freshness.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  assertContains(freshness, 'WRITER_HUB_PRIORITY_GUIDES_UPDATED_AT = new Date("2026-10-12T18:15:50Z")', "accurate PR #1673 release timestamp");
  assertContains(freshness, '["/yazarlar-icin", WRITER_HUB_PRIORITY_GUIDES_UPDATED_AT]', "route-specific freshness");
  assertContains(sitemap, "applySearchCodeFreshness(", "dynamic sitemap honors changed route timestamp");
});
