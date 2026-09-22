import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/content/PublicFooterHydrator.tsx", "utf8");

test("homepage footer hydration reruns when client navigation returns to root", () => {
  assert.match(source, /import \{ usePathname \} from "next\/navigation";/);
  assert.match(source, /const pathname = usePathname\(\);/);
  assert.match(source, /if \(pathname !== "\/"\) return;/);
  assert.match(source, /\}, \[pathname\]\);/);
  assert.doesNotMatch(source, /window\.location\.pathname !== "\/"/);
});

test("route-return hydration still rebuilds the canonical homepage footer before CMS fetch", () => {
  const legalIndex = source.indexOf("ensureLegalBar(footer, {});");
  const platformIndex = source.indexOf('rebuildPlatformColumn(findColumn(footer, "Platform"), {});');
  const trustIndex = source.indexOf("rebuildTrustColumn(footer);");
  const fetchIndex = source.indexOf('fetch("/api/site-content/footer-navigation"');

  assert.ok(legalIndex >= 0);
  assert.ok(platformIndex > legalIndex);
  assert.ok(trustIndex > platformIndex);
  assert.ok(fetchIndex > trustIndex);
});


test("homepage affiliate banner stays after roles and before passport with responsive CJ creatives", () => {
  const homepage = readFileSync(
    "src/app/onizleme/ana-sayfa-yeni/HomepageExperience.tsx",
    "utf8",
  );
  const affiliate = readFileSync(
    "src/app/onizleme/ana-sayfa-yeni/MagzterAffiliateBanner.tsx",
    "utf8",
  );

  const rolesIndex = homepage.indexOf('className="nx-roles"');
  const affiliateIndex = homepage.indexOf("<MagzterAffiliateBanner />");
  const passportIndex = homepage.indexOf('className="nx-passport"');

  assert.ok(rolesIndex >= 0);
  assert.ok(affiliateIndex > rolesIndex);
  assert.ok(passportIndex > affiliateIndex);
  assert.match(homepage, /getHomepageAffiliateEnabled/);
  assert.match(homepage, /affiliateEnabled \? <MagzterAffiliateBanner \/> : null/);

  assert.match(affiliate, /13992555/);
  assert.match(affiliate, /width: 728/);
  assert.match(affiliate, /height: 90/);
  assert.match(affiliate, /13992112/);
  assert.match(affiliate, /width: 300/);
  assert.match(affiliate, /height: 250/);
  assert.match(affiliate, /window\.matchMedia\("\(max-width: 767px\)"\)/);
  assert.match(affiliate, /target="_blank"/);
  assert.match(affiliate, /rel="sponsored nofollow noopener noreferrer"/);
  assert.match(affiliate, /Magzter GOLD – 7 Günlük Ücretsiz Deneme/);
  assert.match(affiliate, /İş ortağı bağlantısı/);
  assert.match(affiliate, /nx-affiliate__copy/);
  assert.match(affiliate, /13973461/);
  assert.match(
    affiliate,
    /5\.000&apos;den fazla dergi, gazete ve seçilmiş premium içeriğe ücretsiz sınırsız erişim elde edin/,
  );
  assert.match(affiliate, /https:\/\/www\.tqlkg\.com\/image-101886825-13973461/);
  assert.ok(
    affiliate.indexOf("13973461") < affiliate.indexOf("İş ortağı bağlantısı"),
  );
});


test("CMS affiliate placement control is admin-only, persisted and invalidates homepage cache", () => {
  const modules = readFileSync("src/lib/cms-modules.ts", "utf8");
  const placement = readFileSync("src/lib/affiliate-placement.ts", "utf8");
  const page = readFileSync("src/app/icerik/banner-reklam-alanlari/page.tsx", "utf8");
  const route = readFileSync("src/app/api/affiliate-placement/route.ts", "utf8");

  assert.match(modules, /Banner \/ Reklam Alanları/);
  assert.match(modules, /banner-reklam-alanlari/);
  assert.match(modules, /adminOnly: true/);

  assert.match(placement, /HOMEPAGE_AFTER_ROLES_PLACEMENT = "homepage_after_roles"/);
  assert.match(placement, /if \(!row\) return true/);
  assert.match(page, /Aktif/);
  assert.match(page, /Pasif/);
  assert.match(page, /action="\/api\/affiliate-placement"/);
  assert.match(page, /Mevcut Affiliate Kodları/);
  assert.match(page, /13992555/);
  assert.match(page, /13992112/);
  assert.match(page, /13973461/);
  assert.match(page, /tqlkg\.com\/image-101886825-13973461/);

  assert.match(route, /user\.role !== "admin"/);
  assert.match(route, /ON DUPLICATE KEY UPDATE/);
  assert.match(route, /revalidatePath\("\/"\)/);
});
