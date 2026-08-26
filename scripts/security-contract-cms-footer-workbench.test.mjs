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

test("homepage footer keeps its brand and separates platform from trust navigation", () => {
  const homepage = source("src/app/page.tsx");
  const hydrator = source("src/components/content/PublicFooterHydrator.tsx");
  const styles = source("src/app/landing-footer-tight.css");
  const contract = source("src/lib/cms-footer-navigation.ts");
  const validation = source("src/lib/cms-footer-validation.ts");

  has(homepage, 'className="landing-logo landing-logo--footer"', "homepage footer brand logo markup");
  lacks(hydrator, 'footer.querySelector<HTMLElement>(".landing-logo--footer")?.remove();', "footer logo must not be removed by hydration");
  has(hydrator, "canonicalPlatformLinks", "canonical platform navigation source");
  has(hydrator, "canonicalTrustLinks", "canonical trust navigation source");
  has(hydrator, "ensureTrustColumn", "trust column builder");
  has(hydrator, 'heading.textContent = "Güven & Standartlar"', "trust column heading");
  has(styles, "repeat(4, minmax(6.75rem, .72fr))", "five-area desktop footer grid");
  has(styles, "@media (max-width: 27rem)", "single-column narrow mobile footer guard");

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

test("all eight public trust pages render one homepage-aligned canonical footer", () => {
  const routePages = [
    "src/app/nasil-calisir/page.tsx",
    "src/app/editoryal-standartlar/page.tsx",
    "src/app/icerik-ve-yas-politikasi/page.tsx",
    "src/app/topluluk-kurallari/page.tsx",
    "src/app/telif-bildirimi/page.tsx",
    "src/app/yazarlar-icin/page.tsx",
    "src/app/editorler-icin/page.tsx",
    "src/app/yayinevleri-icin/page.tsx",
  ];
  const footer = source("src/components/content/PublicTrustFooter.tsx");
  const styles = source("src/app/nasil-calisir/public-trust-footer.css");
  const layout = source("src/app/layout.tsx");
  const hydrator = source("src/components/content/PublicFooterHydrator.tsx");

  for (const path of routePages) {
    const page = source(path);
    has(page, "public-trust-footer.css", `${path} footer styles`);
    has(page, 'import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";', `${path} canonical footer import`);
    has(page, "<PublicTrustFooter />", `${path} canonical footer render`);
  }

  for (const href of [
    "/nasil-calisir",
    "/yazarlar-icin",
    "/editorler-icin",
    "/yayinevleri-icin",
    "/editoryal-standartlar",
    "/icerik-ve-yas-politikasi",
    "/topluluk-kurallari",
    "/telif-bildirimi",
    "/yasal/kullanim-sartlari",
    "/yasal/gizlilik-politikasi",
    "/yasal/kvkk",
    "/yasal/cerez-politikasi",
    "/yasal/telif-hakki-politikasi",
  ]) {
    has(footer, `href: "${href}"`, `${href} canonical public trust footer link`);
  }

  has(footer, "İlk cümle, ilk okurun,", "homepage footer slogan lead");
  has(footer, "ilk adımın.", "homepage footer slogan emphasis");
  has(footer, "Güven &amp; Standartlar", "trust column heading");
  has(footer, "Hesap", "account column heading");
  has(footer, "Destek", "support column heading");
  has(footer, "public-trust-footer__legal", "legal bar markup");
  has(footer, "getCurrentProfile", "session-aware footer account state");
  has(footer, "getRoleNavigation", "role-aware workspace footer link");
  lacks(footer, 'href="/rehber"', "redirect-only guide route must stay out of canonical trust footer");

  has(styles, ".how-page > .how-footer", "legacy embedded trust footer suppression");
  has(styles, ".public-trust-footer", "canonical trust footer scope");
  has(styles, "linear-gradient(112deg, #17152f 0%, #1d1a3c 55%, #322367 100%)", "homepage-aligned trust footer dark brand gradient");
  has(styles, "grid-template-columns: minmax(13rem, 1.08fr) repeat(4, minmax(6.75rem, 0.72fr))", "homepage-aligned five-area desktop footer grid");
  has(styles, ".public-trust-footer__bottom", "copyright and legal bottom bar");
  has(styles, ".public-trust-footer__legal", "legal navigation styling");
  has(styles, "@media (max-width: 27rem)", "trust footer narrow mobile guard");
  lacks(styles, ".landing-footer", "trust footer must not override homepage footer classes");
  lacks(layout, "PublicTrustFooter", "root layout must not mount trust footer");
  lacks(hydrator, "public-trust-footer", "homepage CMS hydrator must not mutate trust page footer");
});

test("remaining public trust pages keep a consistent closing and structured-data baseline", () => {
  const experiences = [
    "src/components/content/EditorialStandardsExperience.tsx",
    "src/components/content/ContentAgePolicyExperience.tsx",
    "src/components/content/CommunityRulesExperience.tsx",
    "src/components/content/CopyrightNoticeExperience.tsx",
    "src/components/content/ForEditorsExperience.tsx",
  ];

  for (const path of experiences) {
    const experience = source(path);
    has(experience, "how-related", `${path} related-navigation closing`);
  }

  const contentAgePage = source("src/app/icerik-ve-yas-politikasi/page.tsx");
  has(contentAgePage, '"@type": "BreadcrumbList"', "content-age breadcrumb schema");
  has(contentAgePage, 'name: "Ana Sayfa"', "content-age breadcrumb homepage item");
  has(contentAgePage, "item: absoluteUrl", "content-age breadcrumb canonical item");
});
