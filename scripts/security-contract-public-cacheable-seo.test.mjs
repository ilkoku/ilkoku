import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("public SEO shell stays cacheable and session-neutral", () => {
  const homepage = read("src/app/page.tsx");
  const experience = read("src/features/homepage/HomepageExperience.tsx");
  const header = read("src/components/layout/PublicSiteHeader.tsx");
  const footer = read("src/components/content/PublicTrustFooter.tsx");
  const readerEducation = read("src/app/okurlar-icin/[slug]/page.tsx");
  const editorProfile = read("src/app/editorler/[slug]/page.tsx");
  const readerStore = read("src/lib/cms-reader-education.ts");

  for (const publicRoute of [homepage, readerEducation, editorProfile]) {
    assert.match(publicRoute, /export const revalidate = 300;/u);
    assert.doesNotMatch(publicRoute, /force-dynamic/u);
  }
  assert.match(readerStore, /catch \{/u);
  assert.match(readerStore, /return readerEducationGuideDefault\(category\);/u);

  for (const source of [experience, header, footer]) {
    assert.doesNotMatch(source, /getCurrentProfile/u);
    assert.doesNotMatch(source, /getRoleNavigation/u);
  }
});

test("public Green routes bypass the auth proxy", () => {
  const proxy = read("src/proxy.ts");

  assert.doesNotMatch(
    proxy,
    /\/\(\(\?!_next\/static\|_next\/image/u,
    "proxy must not use the site-wide catch-all matcher",
  );

  const protectedMatchers = [
    "/admin/:path*",
    "/sistem-yonetimi/:path*",
    "/harita/:path*",
    "/sozlesme/:path*",
    "/sozlesmelerim/:path*",
    "/hesabim/:path*",
    "/editor/:path*",
    "/favorilerim/:path*",
    "/bildirimler/:path*",
    "/kesfet/:path*",
    "/okuyucu/:path*",
    "/okumaya-devam/:path*",
    "/oku/:path*",
    "/tamamlanan-eserler/:path*",
    "/yazar/:path*",
    "/eserlerim/:path*",
    "/yazmaya-devam/:path*",
    "/geri-bildirimler/:path*",
    "/yorumlarim/:path*",
    "/yayinevleri/:path*",
    "/sayfa-renkleri/:path*",
    "/yayinevi/:path*",
    "/rol-secimi/:path*",
    "/editörler/:path*",
  ];

  for (const matcher of protectedMatchers) {
    assert.ok(proxy.includes(`"${matcher}"`), `missing proxy matcher: ${matcher}`);
  }

  for (const publicPath of ["/robots.txt", "/sitemap.xml", "/nasil-calisir", "/hakkimizda"]) {
    assert.equal(
      proxy.includes(`"${publicPath}"`),
      false,
      `Green public route must bypass proxy: ${publicPath}`,
    );
  }
});


test("all writing education detail routes use five-minute public revalidation", () => {
  const genresSource = read("src/lib/genres.ts");
  const hubsSource = read("src/lib/writing-category-hubs.ts");

  const genres = [...genresSource.matchAll(
    /\{ slug: "([^"]+)", label: "[^"]+", category: "([^"]+)" \}/g,
  )].map((match) => ({ slug: match[1], category: match[2] }));

  const hubs = [...hubsSource.matchAll(
    /category: "([^"]+)",\s+slug: "([^"]+)",\s+href: "([^"]+)"/g,
  )].map((match) => ({ category: match[1], href: match[3] }));

  const hrefByCategory = new Map(hubs.map((hub) => [hub.category, hub.href]));
  const detailFiles = new Set(
    genres.map((genre) =>
      genre.category === "Bilgilendirici"
        ? "src/app/yazarlar-icin/bilgilendirici/[slug]/page.tsx"
        : `src/app${hrefByCategory.get(genre.category)}/${genre.slug}/page.tsx`,
    ),
  );

  assert.equal(detailFiles.size, 63, "writing detail route-file inventory must stay complete");

  for (const path of detailFiles) {
    const page = read(path);
    assert.match(page, /export const revalidate = 300;/u, `${path} must revalidate every five minutes`);
    assert.doesNotMatch(page, /force-dynamic/u, `${path} must not force request-time SSR`);
  }
});
