import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

test("reader education keeps eight categories, six optional visual slots and sitemap coverage", () => {
  const inventory = source("src/lib/reader-education.ts");
  const publicRoute = source("src/app/okurlar-icin/[slug]/page.tsx");
  const renderer = source("src/components/content/ReaderEducationPage.tsx");
  const shell = source("src/components/content/ReaderEducationShell.tsx");
  const gateway = source("src/components/content/ReaderEducationGateway.tsx");
  const howItWorks = source("src/components/content/HowItWorksExperience.tsx");
  const writerDashboard = source("src/app/icerik/egitim/page.tsx");
  const readerDashboard = source("src/app/icerik/okur-egitim/page.tsx");
  const readerEditorRoute = source("src/app/icerik/okur-egitim/[slug]/page.tsx");
  const workbench = source("src/components/content/EducationWorkbench.tsx");
  const contentShell = source("src/components/content/ContentShell.tsx");
  const cmsModules = source("src/lib/cms-modules.ts");
  const editor = source("src/app/icerik/egitim/okur/[slug]/page.tsx");
  const actions = source("src/features/cms/reader-education-actions.ts");
  const upload = source("src/app/api/cms-reader-education-media-upload/route.ts");
  const sitemap = source("src/app/sitemap.ts");

  const categorySlugs = [...inventory.matchAll(/\n    slug: "([^"]+)",\n    number: "0[1-8]",/g)].map((match) => match[1]);
  assert.equal(categorySlugs.length, 8, "reader education inventory must stay at 8 main categories");
  assert.equal(new Set(categorySlugs).size, 8, "reader education category slugs must be unique");

  for (const slot of ["hero", "learningPath", "analysis", "example", "practice", "finalCta"]) {
    assertContains(inventory, `key: "${slot}"`, `reader visual slot ${slot}`);
    assertContains(renderer, `slotKey="${slot}"`, `reader renderer slot ${slot}`);
  }

  assertContains(publicRoute, "robots: { index: true, follow: true }", "reader education index/follow");
  assertContains(publicRoute, "readerEducationPublicPath(category)", "reader education self canonical source");
  assertContains(publicRoute, "notFound()", "invalid reader education slug 404");

  assertContains(sitemap, 'import { READER_EDUCATION_CATEGORIES, readerEducationPublicPath } from "@/lib/reader-education"', "reader sitemap inventory source");
  assertContains(sitemap, "const readerEducationHrefs = READER_EDUCATION_CATEGORIES.map", "reader sitemap href generation");
  assertContains(sitemap, "...readerEducationEntries", "reader education static sitemap inclusion");
  assertContains(sitemap, "...readerEducationHrefs", "reader education CMS duplicate guard");

  assertContains(howItWorks, 'import { ReaderEducationGateway } from "@/components/content/ReaderEducationGateway"', "how it works reader gateway import");
  assertContains(howItWorks, "<ReaderEducationGateway />", "how it works reader gateway placement");
  assertContains(gateway, "READER_EDUCATION_CATEGORIES.map", "eight-card gateway generation");
  assertContains(gateway, "Okuma eğitimini kendi yolundan keşfet.", "reader education gateway heading");
  assertContains(gateway, 'className="how-related__grid"', "existing four platform cards remain below education cards");
  assert.equal(gateway.includes("category.number"), false, "gateway category cards must not show 01-08 numbering");

  assertContains(renderer, '<ReaderEducationShell activeCategory={category}>', "reader education shell wrapper");
  assert.equal(renderer.includes("{category.number}"), false, "reader hero must not show category numbering");
  assert.equal(renderer.includes("{item.number}"), false, "reader related cards must not show category numbering");
  assert.equal(renderer.includes('padStart(2, "0")'), false, "reader education cards must not render 01-02-03 numeric labels");
  assert.equal(renderer.includes("Diğer eğitim alanlarını keşfet."), false, "reader page must not duplicate the left education navigation at the bottom");
  assertContains(shell, "READER_EDUCATION_CATEGORIES.map", "reader left menu contains all eight categories");
  assertContains(shell, 'import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader"', "reader education uses original public site header");
  assertContains(shell, "<PublicSiteHeader />", "reader education renders original public site header");
  assert.equal(shell.includes("Okurluk Okulu üst menüsü"), false, "reader education must not create a custom duplicate header");
  assertContains(shell, "<LiveHomepageFooter", "reader education original footer");

  assertContains(readerDashboard, 'import {\n  EducationWorkbench,', "reader center uses shared education workbench");
  assertContains(readerDashboard, "<h1>Okur Eğitim Merkezi</h1>", "reader center heading");
  assertContains(readerDashboard, "visualTarget={6}", "reader center six-slot target");
  assertContains(readerDashboard, 'entityLabel="eğitim"', "reader workbench education terminology");
  assertContains(readerDashboard, 'editHref: `/icerik/okur-egitim/${category.slug}`', "reader center editor links stay under reader center route");
  assertContains(readerDashboard, "readerEducationPublicPath(category)", "reader center live links");
  assert.equal(readerDashboard.includes("48 slot"), false, "reader center must not use the old custom slot-card dashboard");
  assert.equal(readerDashboard.includes("category.number"), false, "reader center must not show 01-08 category numbers");

  assertContains(readerEditorRoute, 'import ReaderEducationGuideEditorPage from "@/app/icerik/egitim/okur/[slug]/page";', "reader editor route reuses the existing editor implementation");
  assertContains(readerEditorRoute, 'export const dynamic = "force-dynamic";', "reader editor route keeps local static route config");
  assertContains(readerEditorRoute, "export default ReaderEducationGuideEditorPage;", "reader editor route exports shared editor implementation");
  assert.equal(readerEditorRoute.includes("export { dynamic }"), false, "reader editor route must not re-export Next route config");
  assertContains(contentShell, 'pathname.startsWith("/icerik/egitim/okur/")', "legacy reader editor routes are recognized");
  assertContains(contentShell, '"/icerik/okur-egitim/"', "legacy reader editor routes select reader center navigation");

  assertContains(writerDashboard, '<Link href="/icerik/okur-egitim">Okur Eğitim Merkezi</Link>', "writer center links separate reader center");
  assert.equal(writerDashboard.includes('id="okur-egitimleri"'), false, "writer center must not embed a second custom reader dashboard");
  assert.equal(writerDashboard.includes("48 slot"), false, "writer center must not show reader slot summary");
  assertContains(workbench, "visualTarget = 7", "shared workbench preserves writer seven-slot default");
  assertContains(workbench, "{item.visualCount}/{visualTarget}", "shared workbench renders configurable slot target");
  assertContains(cmsModules, '{ href: "/icerik/okur-egitim", label: "Okur Eğitim Merkezi"', "reader center CMS navigation item");

  assertContains(editor, '<span className={styles.eyebrow}>Okur Eğitimi · Okurluk Okulu</span>', "reader editor removes 01-08 category numbering");
  assert.equal(editor.includes("category.number"), false, "reader editor must not render category numbering");
  assertContains(editor, 'requireCmsManager(`/icerik/okur-egitim/${category.slug}`)', "reader editor authentication returns to reader center route");
  assertContains(editor, '<Link href="/icerik/okur-egitim">← Okur Eğitim Merkezi</Link>', "reader editor returns to reader center");
  assertContains(editor, "6 gelecekteki görsel slotu", "reader CMS six-slot editor");
  assertContains(editor, "Canlı sayfada bu slot boşluk oluşturmaz.", "reader empty visual no-gap contract");
  assertContains(actions, 'requireCmsManager("/icerik/okur-egitim")', "reader actions require the reader center route");
  assertContains(actions, 'redirect(`/icerik/okur-egitim/${category.slug}?kaydedildi=1`)', "reader save returns to reader editor route");
  assertContains(upload, "isSameOriginRequest(request)", "reader upload same-origin guard");
  assertContains(upload, "access.canManage", "reader upload CMS authorization guard");
  assertContains(upload, "MAX_CMS_MEDIA_BYTES", "reader upload media size guard");
  assertContains(upload, '`/icerik/okur-egitim/${categorySlug}?${query}`', "reader upload returns to reader editor route");
});
