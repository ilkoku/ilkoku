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

test("writer public page stays CMS-compatible, discovery-led and truthful about publication, review and rights", () => {
  const content = source("src/content/for-writers.ts");
  const page = source("src/app/yazarlar-icin/page.tsx");
  const experience = source("src/components/content/ForWritersExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const starterContent = source("src/features/cms/starter-content-actions.ts");
  const cmsStore = source("src/lib/cms-public-page-store.ts");
  const sitemap = source("src/app/sitemap.ts");
  const writerFlow = source("src/features/writer/components/NewWorkFlow.tsx");
  const howItWorks = source("src/content/how-it-works.ts");

  contains(content, "Kaydetmek yayınlamak değildir", "draft-publication boundary");
  contains(content, "18+ içerikler mevcut sistemde keşfe açık yayımlanmaz", "adult draft boundary");
  contains(content, "editör incelemesi talep edebilirsin", "separate review request path");
  contains(content, "yaratıcı sesin ve nihai metin tercihin sende kalır", "writer creative decision boundary");
  contains(content, "yayın kararı ve olası anlaşma tarafların ayrıca vereceği kararlardır", "publisher interest boundary");
  contains(content, "fikrî haklarını kendiliğinden platforma, editöre ya da yayınevine devretmez", "rights boundary");
  contains(content, "Dosyan bilgisayarında beklemek zorunda değil", "writer acquisition value proposition");

  contains(page, 'getPublishedCmsPublicPageState("yazarlar-icin")', "CMS-owned writer page");
  contains(page, "ForWritersExperience", "branded writer experience");
  contains(page, '"@type": "BreadcrumbList"', "writer breadcrumb schema");
  contains(experience, 'getPublicTrustPageVisual("/yazarlar-icin")', "prepared writer visual");
  contains(experience, 'href="/kayit?rol=writer"', "writer registration CTA");
  contains(experience, "Gerçek okur tepkisiyle profesyonel editör görüşünü birlikte kullan", "writer value-first experience");
  contains(experience, 'href="/telif-bildirimi"', "copyright safety link");
  contains(preview, 'page.contentKey === "page:tr:yazarlar-icin"', "visual CMS preview boundary");
  contains(starterContent, 'contentKey: "page:tr:yazarlar-icin"', "CMS starter draft");
  contains(starterContent, 'revalidatePath("/yazarlar-icin")', "writer public revalidation");
  contains(cmsStore, '"yazarlar-icin": {', "legacy writer CMS bridge");
  contains(cmsStore, "getBundledCopyForLegacyCms", "legacy CMS compatibility gate");
  contains(sitemap, "${baseUrl}/yazarlar-icin", "writer sitemap route");

  contains(writerFlow, "ClassificationFields", "real writer classification UI");
  contains(writerFlow, "publishWorkAction", "canonical writer publication action");
  contains(howItWorks, "Yazar editör incelemesi talep edebilir", "public review journey");
  contains(howItWorks, "Olası yayın veya ticari ilişki", "publisher expectation boundary");

  notContains(content, "yayın garantisi verir", "fabricated publication guarantee");
  notContains(content, "telifinizi garanti eder", "fabricated copyright guarantee");
  notContains(content, "yayınevi mutlaka", "fabricated publisher outcome");
});

test("writer inspiration journey is detailed, writer-only and connects history back to starting a work", () => {
  const experience = source("src/components/content/ForWritersExperience.tsx");
  const css = source("src/app/yazarlar-icin/for-writers.css");
  const historyStart = experience.indexOf("const writerHistoryMilestones");
  const historyEnd = experience.indexOf("const knownSections");

  assert.ok(historyStart >= 0 && historyEnd > historyStart, "writer history milestone data must stay isolated");
  const writerHistory = experience.slice(historyStart, historyEnd);

  for (const writer of [
    "Enheduanna",
    "Murasaki Shikibu",
    "Mary Shelley",
    "Mehmet Rauf",
    "Selma Lagerlöf",
    "Toni Morrison",
    "Orhan Pamuk",
  ]) {
    contains(writerHistory, writer, `${writer} inspiration milestone`);
  }

  notContains(writerHistory, "Yayınevi", "writer-only historical milestones");
  notContains(writerHistory, "Editör", "writer-only historical milestones");
  notContains(writerHistory, "Okur", "writer-only historical milestones");
  contains(experience, 'id="yazar-ilkleri"', "writer history section anchor");
  contains(experience, "Her şey bir “ilk” ile başlar", "homepage history narrative continuity");
  contains(experience, "Sıradaki “ilk” henüz yazılmadı", "present-day writer handoff");
  contains(experience, "Kendi ilk cümlene başla", "history-to-registration CTA");
  contains(experience, 'href="#yazar-ilkleri"', "hero-to-history CTA");
  contains(experience, 'href="#yazar-yolculugu"', "history-to-product-flow continuation");
  contains(css, ".writers-history__grid", "writer history responsive grid");
  contains(css, ".writers-history__now", "writer history present-day CTA styling");
});

test("writer history option A keeps large cards, hides numbering and overrides illustrations with real covers", () => {
  const css = source("src/app/yazarlar-icin/for-writers.css");
  const realCovers = source("src/app/yazarlar-icin/real-covers.css");
  const layout = source("src/app/yazarlar-icin/layout.tsx");

  contains(css, "grid-template-columns:minmax(17rem,20rem) minmax(0,1fr)", "large editorial history card layout");
  contains(css, ".writers-history__meta > span { display:none; }", "history milestone numbers hidden from layout and accessibility tree");
  contains(layout, 'import "./real-covers.css"', "real writer cover override loaded after page styles");

  for (const coverReference of [
    "Enheduanna%2C%20daughter%20of%20Sargon%20of%20Akkad.jpg",
    "2004551302v6%3A0001",
    "Frankenstein_1818_edition_title_page.jpg",
    "Eyl%C3%BCl%20kapak.png",
    "G%C3%B6sta_Berlings_saga_1919.djvu",
    "inquiringreader.org/assets/img/beloved.jpg",
    "covers.storytel.com/jpg-640/9789180613828",
  ]) {
    contains(realCovers, coverReference, `${coverReference} real writer work visual`);
  }

  contains(realCovers, "filter:sepia(.08)", "subtle aged cover treatment");
  contains(realCovers, "background-size:contain", "full real cover preserved without artificial cropping");
  notContains(realCovers, "/writers/history/enheduanna-ilahiler.svg", "generated Enheduanna cover must not drive the live override");
  notContains(realCovers, "/writers/history/beloved.svg", "generated Beloved cover must not drive the live override");
  contains(css, ".writers-history__card:nth-child(even)::before", "alternating large cover composition");
  contains(css, "aspect-ratio:2/3", "mobile book cover ratio");
});
