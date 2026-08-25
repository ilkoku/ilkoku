import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");

function has(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function lacks(text, fragment, label) {
  assert.equal(text.includes(fragment), false, `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("footer content management is a sectioned workbench rather than a raw form stack", () => {
  const page = source("src/app/icerik/menuler/page.tsx");
  const workbench = source("src/components/content/FooterNavigationWorkbench.tsx");

  has(page, "FooterNavigationWorkbench", "footer workbench host");
  has(workbench, 'type SectionKey = "platform" | "support" | "legal"', "section navigation model");
  has(workbench, "Anlık önizleme", "live content preview");
  has(workbench, "Kaydedilmemiş footer değişiklikleri var", "dirty-state feedback");
  has(workbench, "Taslağı Kaydet ve Doğrula", "draft validation workflow");
  has(workbench, "setSelected(section.key)", "single-section editing");
  lacks(workbench, "analyzeFooterNavigation", "client must not perform authoritative route validation");
});

test("footer authoritative validation and publish remain server-side and fail-closed", () => {
  const page = source("src/app/icerik/menuler/page.tsx");
  const actions = source("src/features/cms/navigation-actions.ts");

  has(page, "await analyzeFooterNavigation(payload)", "server-side diagnostic read");
  has(page, "const canPublish = hasSafeDraft && Boolean(linkAnalysis) && blockers === 0", "server publish readiness");
  has(actions, "analyzeFooterNavigation(payload)", "publish action revalidation");
  has(actions, "diagnostics.blocking.length > 0", "publish blocking gate");
  has(actions, 'requireCmsAdmin("/icerik/menuler")', "admin-only mutation boundary");
});

test("footer workbench keeps all canonical form fields and fixed fallback semantics", () => {
  const workbench = source("src/components/content/FooterNavigationWorkbench.tsx");
  const contract = source("src/lib/cms-footer-navigation.ts");

  for (const field of ["platformTitle", "platform1Label", "platform1Href", "platform2Label", "platform2Href", "platform3Label", "platform3Href", "supportTitle", "supportLabel", "supportHref", "legalTitle", "termsLabel", "termsHref", "privacyLabel", "privacyHref", "kvkkLabel", "kvkkHref", "cookieLabel", "cookieHref", "copyrightLabel", "copyrightHref"]) {
    has(contract, `"${field}"`, `${field} canonical footer field`);
  }
  has(workbench, "Object.entries(value)", "complete canonical form submission");
  has(workbench, "güvenli destek fallback", "support fallback explanation");
  has(workbench, "Boşsa güvenli fallback kullanılır", "link fallback guidance");
});

test("homepage footer removes the broken footer logo and exposes only canonical public information routes", () => {
  const hydrator = source("src/components/content/PublicFooterHydrator.tsx");
  const contract = source("src/lib/cms-footer-navigation.ts");
  const validation = source("src/lib/cms-footer-validation.ts");

  has(hydrator, 'footer.querySelector<HTMLElement>(".landing-logo--footer")?.remove();', "broken homepage footer logo removal");
  has(hydrator, "canonicalPlatformLinks", "canonical homepage platform link source");
  has(hydrator, "rebuildPlatformColumn", "homepage platform column rebuild");

  for (const href of [
    "/nasil-calisir",
    "/yazarlar-icin",
    "/editorler-icin",
    "/yayinevleri-icin",
    "/editoryal-standartlar",
    "/icerik-ve-yas-politikasi",
    "/topluluk-kurallari",
    "/telif-bildirimi",
  ]) {
    has(hydrator, `href: "${href}"`, `${href} homepage footer link`);
    has(validation, `"${href}"`, `${href} authoritative footer validation route`);
  }

  has(contract, 'platform1Href: "/nasil-calisir"', "platform primary default");
  has(contract, 'platform2Href: "/yazarlar-icin"', "writer public page default");
  has(contract, 'platform3Href: "/editorler-icin"', "editor public page default");
  lacks(contract, 'platform2Href: "#eser-pasaportu"', "obsolete homepage passport anchor default");
  lacks(contract, 'platform3Href: "#neden-ilkoku"', "obsolete homepage why anchor default");
});
