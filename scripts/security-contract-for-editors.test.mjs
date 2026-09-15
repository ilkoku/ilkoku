import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function contains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function notContains(text, fragment, label) {
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("editor public page stays CMS-compatible, value-led and truthful about assignment, independence and confidentiality", () => {
  const content = source("src/content/for-editors.ts");
  const page = source("src/app/editorler-icin/page.tsx");
  const experience = source("src/components/content/ForEditorsExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const starterContent = source("src/features/cms/starter-content-actions.ts");
  const cmsStore = source("src/lib/cms-public-page-store.ts");
  const sitemap = source("src/app/sitemap.ts");
  const requests = source("src/app/editor/talepler/page.tsx");
  const reviews = source("src/app/editor/incelemeler/page.tsx");
  const standards = source("src/content/editorial-standards.ts");

  contains(content, "aynı inceleme birden fazla kişi tarafından eş zamanlı yürütülmez", "first editor assignment lock");
  contains(content, "İkinci editör birinci editörle aynı kişi olamaz", "second editor separation");
  contains(content, "ilk raporu görmez", "second editor independence");
  contains(content, "yalnız görev amacıyla kullanılır", "editor confidentiality boundary");
  contains(content, "Şeffaflık, profesyonel itibarın ve rapor güvenilirliğinin parçasıdır", "conflict disclosure value");
  contains(content, "Editör yazarın yerine eser yazmaz", "writer creative decision value");
  contains(content, "Hukuki hüküm, yayınevi kabulü veya ticari başarı kararı", "editor authority boundary");
  contains(content, "Yeni eserlerin gelişiminde profesyonel iz bırak", "editor acquisition value proposition");

  contains(page, 'getPublishedCmsPublicPageState("editorler-icin")', "CMS-owned editor page");
  contains(page, "ForEditorsExperience", "branded editor experience");
  contains(page, '"@type": "BreadcrumbList"', "editor breadcrumb schema");
  contains(experience, 'getPublicTrustPageVisual("/editorler-icin")', "prepared editor visual");
  contains(experience, 'href="/kayit?rol=editor"', "editor registration CTA");
  contains(experience, "Yeni eserlerin gelişiminde profesyonel iz bırak", "editor value-first hero");
  contains(experience, 'href="/editoryal-standartlar"', "editor standards link");
  contains(preview, 'page.contentKey === "page:tr:editorler-icin"', "visual CMS preview boundary");
  contains(starterContent, 'contentKey: "page:tr:editorler-icin"', "CMS starter draft");
  contains(starterContent, 'revalidatePath("/editorler-icin")', "editor public revalidation");
  contains(cmsStore, '"editorler-icin": {', "legacy editor CMS bridge");
  contains(sitemap, "${baseUrl}/editorler-icin", "editor sitemap route");

  contains(requests, "Bir görevi ilk alan editörün ataması güvenli biçimde kilitlenir", "real editor pool lock");
  contains(requests, "2. Editör Havuzu", "real second editor pool");
  contains(reviews, "bağımsız ikinci editör görevlerini yönetin", "real second editor workspace");
  contains(standards, "İkinci editör aynı kişi olamaz", "editorial independence standard");
  contains(standards, "açıkça yetkilendirilmemiş üçüncü taraf servislerine", "confidentiality standard");

  notContains(content, "yayınevi kabulünü garanti eder", "fabricated publisher guarantee");
  notContains(content, "eseri istediği gibi kullanabilir", "fabricated editor usage right");
  notContains(content, "ikinci editör ilk raporu görür", "broken independence claim");
});

test("editor education section six adds genre editing while preserving the shared shell", () => {
  const inventory = source("src/lib/editor-education.ts");
  const shell = source("src/components/content/EditorEducationShell.tsx");
  const editorLayout = source("src/app/editorler-icin/layout.tsx");
  const publicFrame = source("src/components/layout/PublicSiteFrame.tsx");
  const firstRoute = source("src/app/editorler-icin/egitim/editorluge-baslama/page.tsx");
  const secondRoute = source("src/app/editorler-icin/egitim/metin-degerlendirme/page.tsx");
  const thirdRoute = source("src/app/editorler-icin/egitim/yapisal-editorluk/page.tsx");
  const fourthRoute = source("src/app/editorler-icin/egitim/dil-ve-anlatim-editorlugu/page.tsx");
  const fifthRoute = source("src/app/editorler-icin/egitim/tur-editorlugu/page.tsx");
  const experience = source("src/components/content/ForEditorsExperience.tsx");

  const slugs = [...inventory.matchAll(/slug: "([^"]+)"/g)].map((match) => match[1]);
  assert.equal(slugs.length, 8, "editor education shell must list exactly eight education categories");
  assert.equal(new Set(slugs).size, 8, "editor education category slugs must be unique");
  assert.equal((inventory.match(/live: true/g) ?? []).length, 5, "only the first five editor education routes may be live in section six");

  contains(editorLayout, "<PublicSiteFrame>{children}</PublicSiteFrame>", "editor education inherits public site frame");
  contains(publicFrame, "<PublicSiteHeader />", "public site frame owns the original public header");
  notContains(shell, "PublicSiteHeader", "editor education shell must not render a duplicate public header");
  contains(shell, "EDITOR_EDUCATION_CATEGORIES.map", "editor education eight-item left navigation");
  contains(shell, 'aria-label="Editör eğitimleri"', "editor education navigation semantics");
  contains(shell, 'aria-disabled="true"', "unfinished editor lessons stay non-clickable");
  contains(shell, "<LiveHomepageFooter", "editor education original footer");

  contains(firstRoute, "Bu eğitim sana ne kazandıracak?", "starting lesson remains complete");
  contains(secondRoute, "Metin Değerlendirme", "text evaluation lesson remains complete");
  contains(thirdRoute, "Yapısal Editörlük", "structural editing lesson remains complete");
  contains(fourthRoute, "Dil ve Anlatım Editörlüğü", "language editing lesson remains complete");

  contains(fifthRoute, '<EditorEducationShell activeCategory={category}>', "genre editing route uses shared shell");
  contains(fifthRoute, "Tür Editörlüğü", "genre editing title");
  contains(fifthRoute, "Tür sözleşmesi", "genre editing reader contract");
  contains(fifthRoute, "Türe göre editöryal mercek", "genre editing lenses");
  contains(fifthRoute, "Örnek vaka", "genre editing worked example");
  contains(fifthRoute, "Hibrit eser ve alt tür", "genre editing hybrid and subgenre method");
  contains(fifthRoute, "Konvansiyon, klişe ve bilinçli ihlal", "genre editing convention and cliché distinction");
  contains(fifthRoute, "Kendin dene", "genre editing practice");
  contains(fifthRoute, "İlkOku’da uygula", "genre editing platform application");
  contains(fifthRoute, "bu eser satmaz", "genre editing avoids fabricated commercial certainty");
  contains(fifthRoute, "robots: { index: false, follow: true }", "genre editing remains noindex until final SEO stage");
  notContains(fifthRoute, "AŞAMA 1", "genre editing does not introduce numbered lesson cards");

  contains(experience, 'href: "/editorler-icin/egitim/editorluge-baslama"', "editor gateway first lesson remains linked");
  contains(experience, 'href: "/editorler-icin/egitim/metin-degerlendirme"', "editor gateway text evaluation lesson remains linked");
  contains(experience, 'href: "/editorler-icin/egitim/yapisal-editorluk"', "editor gateway structural editing lesson remains linked");
  contains(experience, 'href: "/editorler-icin/egitim/dil-ve-anlatim-editorlugu"', "editor gateway language editing lesson remains linked");
  contains(experience, 'href: "/editorler-icin/egitim/tur-editorlugu"', "genre editing gateway linked after live verification");
  assert.equal((experience.match(/href: "\/editorler-icin\/egitim\//g) ?? []).length, 5, "first five editor gateway cards are linked after genre editing live verification");
});