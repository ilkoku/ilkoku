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
