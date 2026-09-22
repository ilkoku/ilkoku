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

  assert.match(affiliate, /13992555/);
  assert.match(affiliate, /width: 728/);
  assert.match(affiliate, /height: 90/);
  assert.match(affiliate, /13992112/);
  assert.match(affiliate, /width: 300/);
  assert.match(affiliate, /height: 250/);
  assert.match(affiliate, /window\.matchMedia\("\(max-width: 767px\)"\)/);
  assert.match(affiliate, /rel="sponsored nofollow"/);
  assert.match(affiliate, /İş ortağı bağlantısı/);
});
