import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), label + " must contain " + JSON.stringify(fragment));
}

test("homepage advertising is a dedicated CMS module and renders after role cards", () => {
  const modules = source("src/lib/cms-modules.ts");
  const homepage = source("src/app/onizleme/ana-sayfa-yeni/HomepageExperience.tsx");

  assertContains(modules, 'href: "/icerik/banner-reklam"', "advertising CMS navigation");
  assertContains(homepage, 'import { HomepageAffiliateBanner } from "@/components/content/HomepageAffiliateBanner";', "homepage advertising import");

  const rolesIndex = homepage.indexOf('<section className="nx-roles" id="roller">');
  const bannerIndex = homepage.indexOf("<HomepageAffiliateBanner />");
  const passportIndex = homepage.indexOf('<section className="nx-passport" id="eser-pasaportu">');
  assert.ok(rolesIndex >= 0 && rolesIndex < bannerIndex, "banner must render after role cards");
  assert.ok(bannerIndex < passportIndex, "banner must render before Eser Pasaportu");
});

test("advertising defaults keep the approved responsive Magzter creatives", () => {
  const contract = source("src/lib/cms-advertising.ts");

  assertContains(contract, 'href: "https://www.dpbolvw.net/click-101886825-13992555"', "desktop CJ click URL");
  assertContains(contract, 'imageSrc: "https://www.ftjcfx.com/image-101886825-13992555"', "desktop CJ image URL");
  assertContains(contract, "width: 728", "desktop width");
  assertContains(contract, "height: 90", "desktop height");
  assertContains(contract, 'href: "https://www.jdoqocy.com/click-101886825-13992112"', "mobile CJ click URL");
  assertContains(contract, 'imageSrc: "https://www.awltovhc.com/image-101886825-13992112"', "mobile CJ image URL");
  assertContains(contract, "width: 300", "mobile width");
  assertContains(contract, "height: 250", "mobile height");
});

test("advertising controls validate external creatives and fail closed on unreadable state", () => {
  const contract = source("src/lib/cms-advertising.ts");
  const component = source("src/components/content/HomepageAffiliateBanner.tsx");
  const action = source("src/features/cms/advertising-actions.ts");

  assertContains(contract, 'return url.protocol === "https:";', "HTTPS-only advertising URL validation");
  assertContains(contract, 'if (state.state === "missing") return defaultHomepageAfterRolesAd;', "initial approved fallback");
  assertContains(contract, "return null;", "corrupt or unavailable advertising fail-closed behavior");
  assertContains(component, 'rel="sponsored noopener noreferrer"', "affiliate disclosure relationship");
  assertContains(action, 'requireCmsPublisher("/icerik/banner-reklam")', "live advertising publisher boundary");
  assertContains(action, "desktop.width !== 728 || desktop.height !== 90", "desktop slot size lock");
  assertContains(action, "mobile.width !== 300 || mobile.height !== 250", "mobile slot size lock");
  assertContains(action, 'revalidatePath("/")', "homepage cache invalidation");
});

test("advertising management preserves active/passive control and placement plan", () => {
  const page = source("src/app/icerik/banner-reklam/page.tsx");
  const contract = source("src/lib/cms-advertising.ts");

  assertContains(page, 'value="active"', "active toggle");
  assertContains(page, 'value="passive"', "passive toggle");
  assertContains(page, "Masaüstü CJ HTML · 728×90", "desktop creative editor");
  assertContains(page, "Mobil / tablet CJ HTML · 300×250", "mobile creative editor");
  assertContains(contract, 'label: "Okur alanı"', "reader placement plan");
  assertContains(contract, 'label: "Keşfet / En Çok Satanlar"', "discover placement plan");
  assertContains(contract, 'label: "Eser detay sayfası"', "work detail placement plan");
  assertContains(contract, 'label: "Blog / içerik sayfaları"', "editorial placement plan");
  assertContains(contract, 'label: "Footer üstü"', "pre-footer placement plan");
});
