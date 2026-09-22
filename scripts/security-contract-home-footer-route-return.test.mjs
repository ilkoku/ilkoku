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


test("homepage affiliate banner stays after roles and before passport with responsive validated creatives", () => {
  const homepage = readFileSync(
    "src/app/onizleme/ana-sayfa-yeni/HomepageExperience.tsx",
    "utf8",
  );
  const affiliate = readFileSync(
    "src/app/onizleme/ana-sayfa-yeni/MagzterAffiliateBanner.tsx",
    "utf8",
  );
  const placement = readFileSync("src/lib/affiliate-placement.ts", "utf8");

  const rolesIndex = homepage.indexOf('className="nx-roles"');
  const affiliateIndex = homepage.indexOf("<MagzterAffiliateBanner placement={affiliatePlacement} />");
  const passportIndex = homepage.indexOf('className="nx-passport"');

  assert.ok(rolesIndex >= 0);
  assert.ok(affiliateIndex > rolesIndex);
  assert.ok(passportIndex > affiliateIndex);
  assert.match(homepage, /getHomepageAffiliatePlacement/);
  assert.match(homepage, /affiliatePlacement\.enabled \? <MagzterAffiliateBanner placement=\{affiliatePlacement\} \/> : null/);

  assert.match(placement, /13992555/);
  assert.match(placement, /width="728"/);
  assert.match(placement, /height="90"/);
  assert.match(placement, /13992112/);
  assert.match(placement, /width="300"/);
  assert.match(placement, /height="250"/);
  assert.match(placement, /13973461/);
  assert.match(placement, /tqlkg\.com\/image-101886825-13973461/);
  assert.match(placement, /Magzter GOLD – 7 Günlük Ücretsiz Deneme/);

  assert.match(affiliate, /window\.matchMedia\("\(max-width: 767px\)"\)/);
  assert.match(affiliate, /target="_blank"/);
  assert.match(affiliate, /rel="sponsored nofollow noopener noreferrer"/);
  assert.match(affiliate, /placement\.headline/);
  assert.match(affiliate, /placement\.text\.text/);
  assert.match(affiliate, /placement\.text\.trackingPixelSrc/);
  assert.match(affiliate, /İş ortağı bağlantısı/);
});

test("CMS affiliate editor validates code, previews safely and persists structured settings", () => {
  const modules = readFileSync("src/lib/cms-modules.ts", "utf8");
  const placement = readFileSync("src/lib/affiliate-placement.ts", "utf8");
  const creative = readFileSync("src/lib/affiliate-creative.ts", "utf8");
  const page = readFileSync("src/app/icerik/banner-reklam-alanlari/page.tsx", "utf8");
  const workbench = readFileSync(
    "src/app/icerik/banner-reklam-alanlari/AffiliatePlacementWorkbench.tsx",
    "utf8",
  );
  const route = readFileSync("src/app/api/affiliate-placement/route.ts", "utf8");

  assert.match(modules, /Banner \/ Reklam Alanları/);
  assert.match(modules, /banner-reklam-alanlari/);
  assert.match(modules, /adminOnly: true/);

  assert.match(placement, /HOMEPAGE_AFTER_ROLES_PLACEMENT = "homepage_after_roles"/);
  assert.match(placement, /desktopCode: DEFAULT_DESKTOP_AFFILIATE_CODE/);
  assert.match(placement, /mobileCode: DEFAULT_MOBILE_AFFILIATE_CODE/);
  assert.match(placement, /textCode: DEFAULT_TEXT_AFFILIATE_CODE/);

  assert.match(creative, /javascript\\s\*:/);
  assert.match(creative, /script\\|iframe\\|object\\|embed\\|style\\|svg\\|form/);
  assert.match(creative, /url\.protocol === "https:"/);
  assert.match(creative, /expectedWidth/);
  assert.match(creative, /expectedHeight/);

  assert.match(page, /AffiliatePlacementWorkbench/);
  assert.match(page, /Aktif\/pasif durumunu, kampanya başlığını/);
  assert.match(workbench, /Düzenle/);
  assert.match(workbench, /Önizlemeyi Güncelle/);
  assert.match(workbench, /Kaydet ve Canlıya Uygula/);
  assert.match(workbench, /Önizlemeyi Aç/);
  assert.match(workbench, /Bu alan her zaman görünür/);
  assert.match(workbench, /Takip pikseli çalıştırılmaz/);
  assert.match(workbench, /name="desktopCode"/);
  assert.match(workbench, /name="mobileCode"/);
  assert.match(workbench, /name="textCode"/);
  assert.match(workbench, /name="headline"/);

  assert.match(route, /user\.role !== "admin"/);
  assert.match(route, /validateAffiliateCreativeSet/);
  assert.match(route, /desktopCode/);
  assert.match(route, /mobileCode/);
  assert.match(route, /textCode/);
  assert.match(route, /ON DUPLICATE KEY UPDATE/);
  assert.match(route, /revalidatePath\("\/"\)/);
});
