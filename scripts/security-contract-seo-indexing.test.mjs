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

test("homepage H1 text retains natural spaces across visual spans", () => {
  const home = source("src/features/homepage/HomepageExperience.tsx");
  assertContains(home, '{index > 0 ? " " : null}{line}', "homepage SSR hero H1 must separate split text lines");
  assertNotContains(home, '<span key={`${index}-${line}`}>{line}</span>', "homepage must not concatenate H1 lines");
});

test("HTML sitemap links to the published indexable registration agreement", () => {
  const htmlSiteMap = source("src/app/site-haritasi/page.tsx");
  const registrationAgreement = source("src/app/uyelik-sozlesmesi/page.tsx");
  const registrationLayout = source("src/app/uyelik-sozlesmesi/layout.tsx");
  const sitemapData = source("src/lib/seo/sitemap-data.ts");
  assertContains(htmlSiteMap, '{ href: "/uyelik-sozlesmesi", label: "Üyelik Sözleşmesi" }', "HTML legal sitemap links public registration agreement");
  assertContains(htmlSiteMap, "...siteMapLegalLinks.map((link) => link.href)", "CMS sitemap deduplication includes the registration agreement");
  assertContains(htmlSiteMap, "{siteMapLegalLinks.map((link) => (", "HTML legal section renders the added link");
  assertContains(registrationLayout, "createPublicPageMetadata({", "registration agreement metadata generated at its layout boundary");
  assertContains(registrationLayout, 'canonical: "/uyelik-sozlesmesi"', "registration agreement self-canonical");
  assertContains(registrationLayout, 'title: "Platform Kullanım ve Gizlilik Taahhüdü | İlkOku"', "registration agreement unique search title");
  assertContains(registrationLayout, 'description: "İlkOku hesabı oluşturulurken kabul edilen temel platform kullanım ve gizlilik taahhüdü."', "registration agreement unique description");
  assertNotContains(registrationAgreement, "export const metadata:", "dynamic agreement body must not shadow segment head metadata");
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


test("manual full-sitemap crawler guard has an achievable pacing budget", () => {
  const workflow = source(".github/workflows/full-public-googlebot-guard.yml");
  const timeoutMinutes = Number(workflow.match(/timeout-minutes: ([0-9]+)/u)?.[1]);
  const requestDelaySeconds = Number(workflow.match(/REQUEST_DELAY_SECONDS=([0-9]+)/u)?.[1]);
  const maxUrls = Number(workflow.match(/MAX_DIAGNOSTIC_URLS=([0-9]+)/u)?.[1]);
  assert.equal(timeoutMinutes, 40, "manual crawl compatibility timeout");
  assert.equal(requestDelaySeconds, 10, "polite crawling gap");
  assert.equal(maxUrls, 150, "manual sitemap size circuit breaker");
  assert.ok(129 * requestDelaySeconds < timeoutMinutes * 60,
    "129 sitemap URLs must fit the job's pacing floor");
  assertContains(workflow, '(( ${#sitemap_urls[@]} <= MAX_DIAGNOSTIC_URLS ))',
    "new sitemap URL volume must not silently overrun the manual diagnostic budget");
  assertContains(workflow, 'USER_AGENT="IlkOku-Public-Crawler-Guard/1.0 (+https://ilkoku.com)"',
    "real Googlebot identity must never be spoofed");
  assertNotContains(workflow, "Googlebot/2.1", "never impersonate Googlebot");
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


test("verified public page updates reach XML sitemap and Atom without fabricated timestamps", () => {
  const freshness = source("src/lib/search-content-freshness.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const atom = source("src/app/recent-updates.atom/route.ts");

  assertContains(freshness, 'HTML_SITE_MAP_DISCOVERY_UPDATED_AT = new Date("2026-10-14T12:56:16Z")', "PR #1701 actual HTML sitemap link change");
  assertContains(freshness, 'REGISTRATION_AGREEMENT_METADATA_UPDATED_AT = new Date("2026-10-15T22:21:25Z")', "PR #1750 actual agreement head update");
  assertContains(freshness, '["/site-haritasi", HTML_SITE_MAP_DISCOVERY_UPDATED_AT]', "site map lastmod mapping");
  assertContains(freshness, '["/uyelik-sozlesmesi", REGISTRATION_AGREEMENT_METADATA_UPDATED_AT]', "agreement lastmod mapping");
  assertContains(sitemap, "getSearchCodeFreshness(entry.url)", "XML sitemap derives truthful route freshness");
  assertContains(atom, "const sitemap = await buildSitemap();", "Atom derives entries from the XML sitemap");
  assertContains(atom, "const updatedAt = normalizeLastModified(entry.lastModified);", "Atom includes genuine lastmod entries only");
  assertNotContains(freshness, '["/yardim",', "do not invent help page lastmod");
  assertNotContains(freshness, '["/iletisim",', "do not invent contact page lastmod");
});

test("Power-SEO adds read-only Turkish-safe content analysis without changing public indexing", () => {
  const center = source("src/app/icerik/seo/page.tsx");
  const audit = source("src/app/icerik/seo/PowerSeoContentAudit.tsx");
  const pkg = JSON.parse(source("package.json"));
  const lock = JSON.parse(source("package-lock.json"));
  assert.equal(pkg.dependencies["@power-seo/content-analysis"], "1.0.19");
  assert.equal(lock.packages[""].dependencies["@power-seo/content-analysis"], "1.0.19");
  assert.equal(lock.packages["node_modules/@power-seo/core"].version, "1.0.19");
  assertContains(center, 'import { PowerSeoContentAudit } from "./PowerSeoContentAudit";', "reuse current protected SEO center");
  assertContains(center, "SELECT bodyJson FROM ContentPage", "analyze genuine CMS content");
  assertContains(center, "<PowerSeoContentAudit", "show analysis on selected page only");
  assertContains(audit, 'import { analyzeContent } from "@power-seo/content-analysis";', "use actual Power-SEO engine");
  assertContains(audit, "if (!bodyFound) return null;", "refuse false scores without content");
  assertContains(audit, "STRUCTURAL_CHECKS.has(item.id)", "exclude English-only language heuristics");
  assertNotContains(audit, "focusKeyphrase: props.title", "do not fabricate focus keyword");
  assertNotContains(audit, "generateMetadata", "do not change public metadata");
  assertNotContains(audit, "robots:", "do not alter robots indexing policy");
});

test("Power-SEO editorially reviewed links connect real writing guides without changing public SEO metadata", () => {
  const guide = source("src/components/content/WritingGuideShell.tsx");
  const requiredPairs = [
    ["akademik-inceleme", "/yazarlar-icin/edebiyat/inceleme"],
    ["cocuk-romani", "/yazarlar-icin/kurgu/roman"],
    ["genc-yetiskin", "/yazarlar-icin/kurgu/roman"],
    ["grafik-roman", "/yazarlar-icin/kurgu/roman"],
    ["roman", "/yazarlar-icin/cizgi-anlati/grafik-roman"],
    ["tarihi-roman", "/yazarlar-icin/bilgilendirici/tarih"],
    ["alternatif-tarih", "/yazarlar-icin/bilgilendirici/tarih"],
  ];
  for (const [sourceSlug, targetPath] of requiredPairs) {
    assertContains(guide, '"' + sourceSlug + '": {', "cross-category source guide " + sourceSlug);
    assertContains(guide, 'href: "' + targetPath + '"', "canonical same-origin target " + targetPath);
  }
  assertContains(guide, "const contextualBridge = activeGenreSlug ? CONTEXTUAL_GUIDE_BRIDGES[activeGenreSlug] : undefined;",
    "only individual guide pages receive contextual links");
  assertContains(guide, "href={contextualBridge.href}", "contextual href rendered as Next Link");
  assertContains(guide, "{contextualBridge.label} →", "natural editorial anchor text exposed");
  assertNotContains(guide, "generateMetadata", "no metadata rewrite");
  assertNotContains(guide, "noindex", "no indexability rules introduced");
  assertNotContains(guide, "dangerouslySetInnerHTML", "no HTML injection introduced");
});

test("Shared homepage footer must own its CSS on every public route, not only the home page", () => {
  const footer = source("src/features/homepage/live-footer.tsx");
  const home = source("src/app/page.tsx");
  const base = source("src/features/homepage/live-footer.css");
  const qa = source("tests/browser/mobile-smoke.spec.mjs");
  assertContains(footer, 'import "@/app/landing-footer-pro.css";',
    "common footer imports its background, text, and structural styling");
  assertContains(footer, 'import "@/app/landing-footer-tight.css";',
    "common footer imports responsive grid styling");
  assertNotContains(home, 'import "./landing-footer-pro.css";',
    "footer design is not tied to homepage route-only styles");
  assertNotContains(home, 'import "./landing-footer-tight.css";',
    "mobile column behavior is not tied to homepage route");
  assertContains(base, '.nx-live-footer-scope .landing-container',
    "footer container has isolated layout even without landing.css");
  assertContains(qa, '"/editorler-icin/egitim/tur-editorlugu"',
    "the user-reported editor genre page is part of visual QA");
  assertContains(qa, 'metrics.isSingleColumn',
    "mobile footer layout is checked beyond mere CSS grid presence");
  assertContains(qa, 'metrics.precedingContentBottom',
    "footer/content overlap is checked in browser QA");
});

test("Public writing, reader and editor education templates use one non-nested main landmark", () => {
  const writing = source("src/components/content/WritingGuideShell.tsx");
  assertContains(writing, 'const ContentLandmark = activeGenreSlug ? "div" : "main";',
    "category landing pages own main; genre guides delegate to the inner main");
  assertContains(writing, '<ContentLandmark className="min-w-0">',
    "writing content retains its original CSS class");
  assertContains(writing, "</ContentLandmark>", "conditional writing landmark closes");

  for (const file of [
    "src/components/content/ReaderEducationShell.tsx",
    "src/components/content/EditorEducationShell.tsx",
  ]) {
    const shell = source(file);
    assert.equal(shell.split('<main className="min-w-0">').length - 1, 1,
      file + ": exactly one main opens");
    assert.equal(shell.split("</main>").length - 1, 1, file + ": exactly one main closes");
    assertNotContains(shell, "generateMetadata", file + ": no SEO metadata mutation");
    assertNotContains(shell, "robots:", file + ": no robots policy mutation");
  }

  const blocks = source("src/components/content/PublicCmsPageBlocks.tsx");
  assertContains(blocks, '<main className="min-h-screen',
    "individual genre guides still have an inner main when shell uses div");
  const categories = source("src/components/content/WritingCategoryLandingPage.tsx");
  assertContains(categories, '<h1 className=', "category pages keep their original heading");
  assertNotContains(writing, "robots:", "no writing indexing policy mutation");
});

test("Roman editorial emphasis is rendered as safe semantic strong instead of literal asterisks", () => {
  const editor = source("src/components/content/PublicEditorialDocument.tsx");
  const template = source("src/lib/cms-page-templates.ts");
  assertContains(template, "**Ham fikir:**", "published roman template uses inline emphasis");
  assertContains(template, "**İstediği şey:**", "roman character list uses inline emphasis");
  assertContains(editor, "function renderInlineEmphasis(value: string)",
    "restricted inline emphasis renderer exists");
  assertContains(editor, "<strong key={index}>{part.slice(2, -2)}</strong>",
    "only text inside markers becomes a React strong element");
  assertContains(editor, "renderInlineEmphasis(line.slice(2))",
    "unordered list labels are formatted safely");
  assertContains(editor, "renderInlineEmphasis(block)", "paragraph text is formatted safely");
  assertNotContains(editor, "dangerouslySetInnerHTML",
    "untrusted HTML is not injected to render inline emphasis");
});

test("Power-SEO published analyzer executes on Turkish CMS content", async () => {
  const { analyzeContent } = await import("@power-seo/content-analysis");
  const analysis = analyzeContent({
    title: "Roman Yazma Rehberi",
    metaDescription: "Roman yazarlığı üzerine özgün ve kapsamlı başlangıç rehberi.",
    content: "<h1>Roman Yazma Rehberi</h1><h2>Anlatı Yapısı</h2><p>Romanın karakter ve olay örgüsünü planlayın.</p>",
    locale: "tr-TR",
    siteUrl: "https://ilkoku.com",
  });
  assert.ok(Array.isArray(analysis.results));
  assert.ok(analysis.results.some((result) => result.id === "title-presence"));
  assert.ok(Number.isFinite(analysis.score));
  assert.ok(analysis.maxScore > 0);
});

test("Power-SEO full toolkit is explicitly pinned with verified lockfile entries", () => {
  const pkg = JSON.parse(source("package.json"));
  const lock = JSON.parse(source("package-lock.json"));
  const modules = [
    "ai", "analytics", "audit", "content-analysis", "core", "images",
    "integrations", "links", "meta", "preview", "react", "readability",
    "redirects", "schema", "search-console", "sitemap", "tracking",
  ];
  assert.equal(modules.length, 17);
  for (const name of modules) {
    const id = "@power-seo/" + name;
    assert.equal(pkg.dependencies[id], "1.0.19", id + " dependency");
    assert.equal(lock.packages[""].dependencies[id], "1.0.19", id + " root lock");
    const entry = lock.packages["node_modules/" + id];
    assert.equal(entry?.version, "1.0.19");
    assert.match(entry?.integrity || "", /^sha512-/u);
    assert.match(entry?.resolved || "", /^https:\/\/registry\.npmjs\.org\/@power-seo\//u);
    assert.ok(import.meta.resolve(id).includes("/node_modules/"), id + " resolves");
  }
});

test("Power-SEO independent admin page does not reuse failing CMS SEO query", async () => {
  const page = source("src/app/admin/power-seo/page.tsx");
  const adminNavigation = source("src/lib/admin-navigation.ts");
  const adminLayout = source("src/app/admin/layout.tsx");
  const config = source("next.config.ts");
  assertContains(page, 'from "@power-seo/audit"', "real audit engine");
  assertContains(page, 'from "@power-seo/content-analysis"', "real content analyzer");
  assertContains(page, "inspectLivePage(path)", "explicit one-URL live HTML audit");
  assertContains(page, 'redirect: "manual"', "no off-site redirect");
  assertContains(page, "AbortSignal.timeout(8000)", "bounded same-site request");
  assertContains(page, 'safePath(raw)', "restrict user-provided URL to site paths");
  assertContains(page, "Denetim yapılmadı:", "surface failures rather than false success");
  assertNotContains(page, "ContentPage", "independent of CMS database");
  assertNotContains(page, "prisma", "no database prerequisite");
  assertNotContains(page, "generateMetadata(", "no public metadata mutation");
  assertContains(adminNavigation, 'label: "Power-SEO"', "admin navigation entry");
  assertContains(adminLayout, 'user.role !== "admin"', "admin role enforced");
  assertContains(config, '"/sistem-yonetimi/:path*"', "private route noindex header");
  const { auditPage } = await import("@power-seo/audit");
  const report = auditPage({
    url: "https://ilkoku.com/nasil-calisir",
    title: "İlkOku Nasıl Çalışır",
    metaDescription: "İlkOku hizmetini ve yazarların eserlerini nasıl paylaşacağını açıklayan bilgilendirme.",
    canonical: "https://ilkoku.com/nasil-calisir",
    headings: ["h1:İlkOku Nasıl Çalışır"],
    statusCode: 200,
  });
  assert.ok(Number.isFinite(report.score), "actual engine returned numeric audit score");
  assert.ok(Array.isArray(report.rules), "actual engine produced findings");
});

test("Power-SEO independent operational tabs stay read-only and bounded", async () => {
  const dashboard = source("src/app/admin/power-seo/page.tsx");
  const operations = source("src/app/admin/power-seo/PowerSeoOperations.tsx");
  const css = source("src/app/admin/power-seo/PowerSeoDashboard.module.css");
  assertContains(dashboard, 'import { validateSchema, type SchemaObject } from "@power-seo/schema"', "real JSON-LD validator");
  assertContains(dashboard, '<PowerSeoOperations mode={scanMode} slice={requestedSlice} />', "bounded operations render only in site tools");
  assertContains(dashboard, 'activeTab === "tarama"', "task-first site audit panel");
  assertContains(dashboard, "JSON.parse(script[2])", "analyze actual HTML JSON-LD");
  assertContains(operations, 'import { validateSitemapUrl } from "@power-seo/sitemap"', "sitemap package active");
  assertContains(operations, 'import { buildLinkGraph, analyzeLinkEquity, suggestLinks } from "@power-seo/links"', "graph package active");
  assertContains(operations, 'from "@power-seo/redirects"', "redirect package active");
  assertContains(operations, "const PAGE_LIMIT = 4", "bounded origin scanning");
  assertContains(operations, 'redirect: "manual"', "do not follow redirects during scans");
  assertContains(operations, "AbortSignal.timeout(", "bound external requests");
  assertNotContains(operations, "prisma", "standalone operations do not depend on CMS DB");
  assertNotContains(operations, "$executeRaw", "no database mutations");
  assertNotContains(dashboard, "generateMetadata(", "no public metadata rewrite");
  assertContains(css, "overflow-wrap:anywhere", "mobile long URLs wrap");
  const [{ buildLinkGraph }, { validateSitemapUrl }, { validateSchema }, { isDestinationSafe }] = await Promise.all([
    import("@power-seo/links"),
    import("@power-seo/sitemap"),
    import("@power-seo/schema"),
    import("@power-seo/redirects"),
  ]);
  const graph = buildLinkGraph([
    { url: "https://ilkoku.com/", links: ["https://ilkoku.com/nasil-calisir"] },
    { url: "https://ilkoku.com/nasil-calisir", links: ["https://ilkoku.com/"] },
  ]);
  assert.ok(graph.totalLinks > 0, "real internal link graph computed");
  assert.equal(validateSitemapUrl({ loc: "https://ilkoku.com/" }).valid, true);
  assert.equal(validateSitemapUrl({ loc: "x" }).valid, false);
  assert.equal(validateSchema({ "@type": "Article" }).valid, false, "missing required article fields caught");
  assert.equal(isDestinationSafe("/nasil-calisir", "javascript:alert(1)"), false);
});

test("Power-SEO 17 modules are used in bounded admin diagnostics and protected provider API", async () => {
  const panel = source("src/app/admin/power-seo/page.tsx");
  const operations = source("src/app/admin/power-seo/PowerSeoOperations.tsx");
  const fullSite = source("src/app/admin/power-seo/FullSiteLinkAudit.tsx");
  const local = source("src/app/admin/power-seo/PowerSeoLocalDiagnostics.tsx");
  const providers = source("src/app/api/admin/power-seo/providers/route.ts");
  const controls = source("src/app/admin/power-seo/PowerSeoProviderChecks.tsx");
  const modules = new Set(
    [panel, operations, fullSite, local, providers].flatMap((code) =>
      [...code.matchAll(/from ["']@power-seo\/([a-z-]+)["']/gu)].map((match) => match[1]),
    ),
  );
  assert.deepEqual([...modules].sort(), [
    "ai", "analytics", "audit", "content-analysis", "core", "images",
    "integrations", "links", "meta", "preview", "react", "readability",
    "redirects", "schema", "search-console", "sitemap", "tracking",
  ]);
  assertContains(panel, '<strong>17</strong><span>Kod entegrasyonu (API yetkisi ayrı)</span>', "inventory is not a claim that external APIs are authorized");
  assertContains(panel, "<PowerSeoProviderChecks />", "manual API interface");
  assertContains(panel, "<PowerSeoLocalDiagnostics />", "safe isolated helpers");
  assertContains(providers, 'getCurrentUser()', "server-side session protection");
  assertContains(providers, "process.env.GSC_SITE_URL", "reuse existing workflow GSC property configuration");
  assertContains(providers, "process.env.GSC_OAUTH_CLIENT_ID", "reuse read-only GSC OAuth");

  assertContains(providers, 'browserOrigin.origin === ORIGIN', "fixed site origin supports proxy");
  assertContains(providers, 'browserOrigin.port === requestUrl.port', "local testing only on loopback");
  assertContains(providers, 'request.headers.get("sec-fetch-site") === "cross-site"', "cross-site requests rejected");
  assertContains(providers, 'if (!trustedOrigin', "missing or invalid origin rejected");
  assertNotContains(providers, 'hostname !== expectedHostname', "no proxy-internal hostname comparison");
  assertContains(providers, 'browserOrigin.origin === ORIGIN', "fixed public origin supports Hostinger proxy rewriting");
  assertContains(providers, 'browserOrigin.port === requestUrl.port', "loopback integration test remains bounded");
  assertContains(providers, 'request.headers.get("sec-fetch-site") === "cross-site"', "cross-site browser requests rejected");
  assertContains(providers, 'if (!trustedOrigin', "missing or invalid origin rejected");
  assertNotContains(providers, 'hostname !== expectedHostname', "do not compare against proxy-internal request hostname");
  assertContains(providers, 'user.role !== "admin"', "server-side role guard");
  assertContains(providers, 'method: "POST"', "external provider requests require explicit POST");
  assertContains(providers, 'maxRetries: 0', "bounded paid provider retries");
  assertContains(providers, 'rowLimit: 15', "bounded GSC sample");
  assertContains(providers, 'Cache-Control": "private, no-store"', "private API responses");
  assertContains(providers, 'redirect: "manual"', "AI only fetches same-origin public page");
  assertContains(providers, 'max_tokens: 220', "bounded on-demand model output");
  assertContains(providers, 'safePublicPath(rawPath)', "safe same-site path validation");
  assertContains(providers, '"https://api.openai.com/v1/chat/completions"', "real but opt-in model path");
  assertNotContains(providers, "prisma", "provider checks must not write to database");
  assertNotContains(providers, "submitSitemap", "no GSC sitemap state mutation");
  assertNotContains(providers, "deleteSitemap", "no GSC sitemap deletion");
  assertNotContains(providers, "console.log", "no secrets in logs");
  assertContains(controls, 'onClick={() => void check(service.id)}', "user-initiated action");
  assertContains(local, '"use client"', "React package requires explicit client boundary in Next App Router");
  assertContains(local, "createConsentManager()", "tracking module used only in isolated sandbox");
  assertContains(local, "renderMetaTags([", "React metadata element created but not mounted");
  assertContains(local, "analyzeReadability({", "English sample functionality checks");
  assertNotContains(local, "dangerouslySetInnerHTML", "do not inject analytics or metadata");
  const [{ buildDashboardData }, { analyzeReadability }, { createConsentManager }] = await Promise.all([
    import("@power-seo/analytics"), import("@power-seo/readability"), import("@power-seo/tracking"),
  ]);
  assert.equal(buildDashboardData({}).overview.totalPages, 0);
  assert.ok(Number.isFinite(analyzeReadability({ content: "This is a short English sample." }).score));
  const consent = createConsentManager();
  assert.equal(consent.isGranted("analytics"), false);
  assert.equal(consent.isGranted("necessary"), true);
});

test("Power-SEO Google URL Inspection is admin-only, opt-in and read-only", () => {
  const api = source("src/app/api/admin/power-seo/providers/route.ts");
  const controls = source("src/app/admin/power-seo/PowerSeoProviderChecks.tsx");
  assertContains(api, '"gsc-index"', "GSC indexing provider registered");
  assertContains(api, '"https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"', "real Google URL Inspection endpoint");
  assertContains(api, "async function queryGscIndex(rawPath: string)", "bounded single-URL inspection");
  assertContains(api, "const path = safePublicPath(rawPath);", "strict allowed public path");
  assertContains(api, 'siteUrl, languageCode: "tr-TR"', "correct GSC property language request");
  assertContains(api, "Google'ın kayıtlı indeksleme durumu", "results explicitly not live test");
  assertContains(api, 'user.role !== "admin"', "no unauthenticated inspections");
  assertContains(api, 'browserOrigin.origin === ORIGIN', "CSRF origin boundary preserved");
  assertContains(api, 'AbortSignal.timeout(24000)', "inspection time bounded");
  assertContains(api, 'Cache-Control": "private, no-store"', "no shared-cache inspection results");
  assertContains(controls, 'GSC indeks durumunu sorgula', "real GSC index-status UI trigger");
  assertContains(controls, 'onClick={() => void check(service.id)}', "query initiated only by admin action");
  assertContains(controls, 'provider === "gsc-index" ? path : undefined', "path forwarded only for user-directed inspection");
  assertNotContains(api, "indexing.googleapis.com", "never use Google Indexing API to request indexing");
  assertNotContains(api, "indexing:publish", "no Google indexing submission");
});
test("Power-SEO OpenAI API 429 diagnosis separates quota from rate limits without leaking upstream messages", () => {
  const api = source("src/app/api/admin/power-seo/providers/route.ts");
  assertContains(api, "async function classifyOpenAiFailure(response: Response)", "dedicated OpenAI error classifier");
  assertContains(api, 'response.status !== 429', "non-429 errors handled independently");
  assertContains(api, '"credit_balance_exhausted"', "credit exhaustion identified");
  assertContains(api, '"organization_usage_limit_exceeded"', "organization usage cap identified");
  assertContains(api, '"project_spend_limit_exceeded"', "project spending cap identified");
  assertContains(api, 'type === "insufficient_quota"', "legacy quota error type handled");
  assertContains(api, 'code === "rate_limit_exceeded"', "rate limiting identified separately");
  assertContains(api, "quotaCodes.includes(code) ? code", "only allowlisted provider error codes returned");
  assertContains(api, "if (!aiResponse.ok) return classifyOpenAiFailure(aiResponse);", "safe classifier used in live request");
  assertNotContains(api, "message: error.message", "raw upstream error message must not be returned");
  assertNotContains(api, "message: payload", "raw upstream payload must not be returned");
});

test("Power-SEO provider readiness and independent live census are truthful and read only", () => {
  const connections = source("src/app/admin/power-seo/PowerSeoConnections.tsx");
  const api = source("src/app/api/admin/power-seo/providers/route.ts");
  const example = source(".env.example");
  const guide = source("docs/power-seo-live-setup.md");
  const census = source("scripts/power-seo-live-census.mjs");
  const workflow = source(".github/workflows/power-seo-live-census.yml");
  assertContains(connections, 'present("GOOGLE_SERVICE_ACCOUNT_EMAIL")', "service account email detected");
  assertContains(connections, 'present("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")', "service account private key detected");
  assertNotContains(connections, 'present("GSC_PROPERTY"))', "service account must not require optional property variable");
  assertContains(api, "process.env.GSC_SITE_URL", "Power-SEO accepts property variable used by GSC workflows");
  for (const key of [
    "GSC_SITE_URL", "GSC_OAUTH_CLIENT_ID", "GSC_OAUTH_CLIENT_SECRET",
    "GSC_OAUTH_REFRESH_TOKEN", "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "AHREFS_API_KEY",
    "SEMRUSH_API_KEY", "OPENAI_API_KEY",
  ]) {
    assertContains(example, key + "=", "safe key documentation: " + key);
  }
  assertContains(guide, "Hostinger", "hosting-only runtime secret guidance");
  assertContains(guide, "GitHub Actions secrets", "GitHub secrets are not hosting runtime secrets");
  assertContains(census, "const CONCURRENCY = 2", "safe production crawl concurrency");
  assertContains(census, 'redirect: "manual"', "no cross-site redirects");
  assertContains(census, "MAX_URLS = 400", "safe sitemap count cap");
  assertContains(census, "canonicalMatches", "real canonical comparison");
  assertContains(census, "noindexPagesInSitemap", "live indexability gate");
  assertContains(census, "GITHUB_STEP_SUMMARY", "CI audit summary");
  assertNotContains(census, "GSC_OAUTH_REFRESH_TOKEN", "external public audit needs no private token");
  assertNotContains(census, "prisma", "public crawl must not mutate data");
  assertContains(workflow, "workflow_dispatch:", "on-demand rerun available");
  assertContains(workflow, "timeout-minutes: 15", "bounded job time");
  assertContains(workflow, "actions/upload-artifact@", "per-page result retained as evidence");
  assertContains(workflow, "contents: read", "GitHub token cannot write site or repo");
});

test("Power-SEO priority review runs real, bounded and opt-in technical diagnostics on the two Google follow-up URLs", () => {
  const page = source("src/app/admin/power-seo/page.tsx");
  assertContains(page, 'const priorityPaths = ["/nasil-calisir", "/yazarlar-icin/kurgu/roman"] as const;',
    "exactly two fixed public priority URLs");
  assertContains(page, 'activeTab === "genel" && params.kontrol === "oncelik"',
    "prioritized live scan only starts when the admin explicitly requests it");
  assertContains(page, 'for (const target of priorityPaths)',
    "priority targets are walked as a bounded list");
  assertContains(page, 'audit: await inspectLivePage(target)',
    "real HTML auditing is awaited sequentially, no parallel traffic burst");
  assertContains(page, 'function priorityFindings(path: string, audit: AuditResult)',
    "priority findings are derived from the actual live audit, not invented");
  assertContains(page, 'if (audit.statusCode !== 200)', "HTTP errors cannot be marked good");
  assertContains(page, 'if (canonical !== expected)', "canonical mismatch reported");
  assertContains(page, 'audit.robots', "robots meta used by priority checker");
  assertContains(page, 'response.headers.get("x-robots-tag")', "live HTTP indexing header read");
  assertContains(page, 'audit.xRobotsTag', "HTTP noindex must not be silently skipped");
  assertContains(page, 'audit.imageAltIssues', "alt text audit reused");
  assertContains(page, 'audit.schemaIssues.length', "schema validation reused");
  assertContains(page, 'Google indeks durumu ayrıca GSC ile değerlendirilir.',
    "technical checks must not claim that Google indexed a URL");
  assertContains(page, 'sekme=sayfa&yol=', "each result leads to the existing full audit");
  assertNotContains(page, 'submitSitemap(', "priority check does not submit sitemap");
  assertNotContains(page, 'indexing:publish', "priority check does not request indexing");
  assertNotContains(page, 'prisma.', "priority check does not write to database");
});

test("Power-SEO read-only live sitemap census measures per-page meta descriptions and duplicate review signals", () => {
  const census = source("scripts/power-seo-live-census.mjs");
  assertContains(census, 'function descriptionFromHtml(html)', "extract actual HTML meta description");
  assertContains(census, 'attribute(tag, "name").toLowerCase() === "description"', "use named meta description tag");
  assertContains(census, 'description = ok ? descriptionFromHtml(body) : ""', "only trust successful HTML");
  assertContains(census, 'function comparableDescription(value)', "normalize Unicode Turkish text");
  assertContains(census, 'function descriptionSimilarity(a, b)', "near duplicates are review-only, not declared errors");
  assertContains(census, 'duplicateDescriptions', "exact duplicate groups recorded with affected URLs");
  assertContains(census, 'nearDuplicateDescriptions', "near duplicate pairs recorded with affected URLs");
  assertContains(census, 'descriptionReview', "missing, short and long description review items captured");
  assertContains(census, 'descriptionsMissing:', "absence is reported honestly");
  assertContains(census, 'descriptionsOver180Review:', "longer content is only a review signal");
  assertContains(census, 'not Google indexing requirements or penalties', "avoid claiming indexing effect");
  assertContains(census, 'const CONCURRENCY = 2', "bounded requests retained");
  assertNotContains(census, 'indexing:publish', "no Google indexing submissions");
  assertNotContains(census, 'prisma.', "read-only without DB mutations");
});

test("Power-SEO fullsite API scans only authenticated sitemap batches without modifying SEO", () => {
  const api = source("src/app/api/admin/power-seo/scan/route.ts");
  const page = source("src/app/admin/power-seo/page.tsx");
  const full = source("src/app/admin/power-seo/FullSiteLinkAudit.tsx");
  assertContains(api, 'user.role !== "admin"', "admin permission enforced for JSON endpoint");
  assertContains(api, "const BATCH_SIZE = 4", "bounded batch");
  assertContains(api, "const MAX_URLS = 400", "sitewide safety cap");
  assertContains(api, 'redirect: "manual"', "no offsite redirect following");
  assertContains(api, 'const ORIGIN = "https://ilkoku.com"', "fixed target origin");
  assertContains(api, "AbortSignal.timeout(", "requests have timeouts");
  assertContains(api, '"Cache-Control": "private, no-store"', "sensitive admin reports never shared-cache");
  assertContains(api, 'getCurrentUser()', "session enforced inside API not only layout");
  assertContains(api, 'response.status !== 200', "only successful HTML accepted");
  assertNotContains(api, "prisma", "no writes or CMS coupling");
  assertNotContains(api, "axios", "no external crawler");
  assertContains(full, 'import { analyzeLinkEquity, buildLinkGraph, findOrphanPages, suggestLinks }', "real link-analysis engine");
  assertContains(full, "pages.length !== urls.length", "completeness check before orphan reporting");
  assertContains(full, "summary.complete", "explicit true completeness gate");
  assertContains(full, "Baştan tara", "human-only crawl trigger");
  assertContains(full, "JSON raporunu al", "report export");
  assertContains(full, "stopRef.current = true", "user stop control");
  assertContains(page, 'scanMode === "full-links" ? <FullSiteLinkAudit />', "isolated panel route");
  assertContains(page, 'href="/sistem-yonetimi/power-seo?sekme=tarama&mod=full-links"', "important audit is directly navigable");
  assertNotContains(page, "generateMetadata(", "no public SEO rewrites");
  assertNotContains(full, "fetch('/sitemap.xml')", "scan remains server-authorized");
});

test("Power-SEO distinguishes off-sitemap references from HTTP-verified broken links", () => {
  const panel = source("src/app/admin/power-seo/FullSiteLinkAudit.tsx");
  const api = source("src/app/api/admin/power-seo/verify-links/route.ts");
  assertContains(panel, "offSitemapTargets:", "off-sitemap inventory included in report");
  assertContains(panel, "httpVerificationComplete:", "partial verification must never be marked complete");
  assertContains(panel, "email-protection", "Cloudflare obfuscation is a separate category");
  assertContains(panel, "HTTP 404/410 ile doğrulanmış kırık hedef", "broken link must have actual HTTP evidence");
  assertContains(panel, "onClick={() => void verifyOffSitemap()}", "opt-in verification only");
  assertContains(panel, "Sitemap dışı hedefleri HTTP ile doğrula", "manual verifier visible");
  assertContains(panel, "if (body.halted)", "client stops on edge block");
  assertContains(api, "getCurrentUser()", "server-side session required");
  assertContains(api, 'user.role !== "admin"', "no non-admin verification");
  assertContains(api, 'browserOrigin?.origin === ORIGIN', "same origin CSRF boundary");
  assertContains(api, 'request.headers.get("sec-fetch-site") === "cross-site"', "reject cross-site requests");
  assertContains(api, 'const MAX_BATCH = 4', "four URL maximum per request");
  assertContains(api, 'const HTTP_TIMEOUT_MS = 6500', "bounded HTTP timeout");
  assertContains(api, 'redirect: "manual"', "never follow redirects to login/other hosts");
  assertContains(api, 'if (status === 404 || status === 410) outcome = "missing"', "only 404/410 are declared missing");
  assertContains(api, 'if (pair.some((row) => row.status === 403 || row.status === 429)) break', "WAF and rate-limit circuit breaker");
  assertContains(api, 'raw.startsWith(prefix)', "do not fetch private application routes");
  assertContains(api, '"Cache-Control": "private, no-store"', "private HTTP verification report");
  assertNotContains(api, "prisma", "HTTP check must not mutate database");
  assertNotContains(api, "indexing.googleapis.com", "never request indexing");
  assertNotContains(api, "console.log", "never leak URL or session secrets to server logs");
});

test("Power-SEO reuses a completed JSON report only after live sitemap integrity check", () => {
  const full = source("src/app/admin/power-seo/FullSiteLinkAudit.tsx");
  assertContains(full, "async function importPreviousReport(file: File | undefined)", "explicit user-selected JSON import");
  assertContains(full, "await file.text()", "read local JSON without server upload");
  assertContains(full, 'report.site !== ORIGIN', "prevent cross-site import");
  assertContains(full, 'report.complete !== true', "partial reports rejected");
  assertContains(full, 'report.scannedUrls !== expected', "only full census reports accepted");
  assertContains(full, 'report.pages.length !== expected', "all page rows required");
  assertContains(full, 'report.sitemapFingerprint', "content fingerprint presence checked");
  assertContains(full, '"/api/admin/power-seo/scan?offset=0"', "single live four-URL batch checks sitemap fingerprint");
  assertContains(full, 'live.fingerprint !== report.sitemapFingerprint', "stale report must not bypass current sitemap");
  assertContains(full, 'setComplete(true)', "validated report becomes visible without full scan");
  assertContains(full, 'sourceMeasuredAt || new Date().toISOString()', "original measurement date preserved");
  assertContains(full, 'type="file" accept=".json,application/json"', "manual local upload UI");
  assertContains(full, 'void importPreviousReport(file)', "file input really wired");
  assertNotContains(full, 'fetch("/api/admin/power-seo/upload"', "no server-side storage of personal report");
});

test("Power-SEO external credentials are not displayed or misrepresented as live API success", () => {
  const connections = source("src/app/admin/power-seo/PowerSeoConnections.tsx");
  const dashboard = source("src/app/admin/power-seo/page.tsx");
  assertContains(connections, 'process.env[name]?.trim()', "readiness checks use process env presence only");
  assertContains(connections, "API doğrulanmadı", "no invented connectivity success");
  assertContains(connections, "Yetkilendirme gerekli", "missing credentials explicitly named");
  assertContains(connections, "GSC_OAUTH_REFRESH_TOKEN", "reuse existing GSC OAuth credentials");
  assertNotContains(connections, "console.log", "never log secret material");
  assertNotContains(connections, "JSON.stringify(process.env)", "never serialize server env");
  assertContains(dashboard, "<PowerSeoConnections />", "readiness visible to administrator");
});

test("Power-SEO AI and Meta previews are read-only and operate without model secrets", async () => {
  const page = source("src/app/admin/power-seo/page.tsx");
  assertContains(page, 'from "@power-seo/ai"', "real upstream AI prompt module");
  assertContains(page, 'from "@power-seo/meta"', "real upstream Next metadata module");
  assertContains(page, "buildTitlePrompt({ content: excerpt", "real content excerpt");
  assertContains(page, "buildMetaDescriptionPrompt({ title, content: excerpt", "real description prompt");
  assertContains(page, "createMetadata({ title, description, canonical })", "metadata draft only");
  assertContains(page, "Yapay zekâ öneri istemleri", "visible preview");
  assertNotContains(page, "OPENAI_API_KEY", "no API secret in presentation");
  assertNotContains(page, "fetch('https://api.openai.com", "no automatic AI request");
  const [{ buildTitlePrompt, buildMetaDescriptionPrompt }, { createMetadata }] = await Promise.all([
    import("@power-seo/ai"), import("@power-seo/meta")
  ]);
  const p = buildTitlePrompt({ content: "Türkçe öykü yazma rehberi", tone: "Turkish" });
  assert.ok(p.user.includes("Türkçe öykü"));
  const d = buildMetaDescriptionPrompt({ title: "Öykü rehberi", content: "Yazma rehberi" });
  assert.ok(d.user.includes("Öykü rehberi"));
  const m = createMetadata({ title: "Öykü rehberi", canonical: "https://ilkoku.com/yazarlar-icin" });
  assert.equal(m.title, "Öykü rehberi");
  assert.equal(m.alternates?.canonical, "https://ilkoku.com/yazarlar-icin");
});
