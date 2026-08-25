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

test("writer public page stays CMS-owned and truthful about publication, review and rights", () => {
  const content = source("src/content/for-writers.ts");
  const page = source("src/app/yazarlar-icin/page.tsx");
  const experience = source("src/components/content/ForWritersExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const starterContent = source("src/features/cms/starter-content-actions.ts");
  const sitemap = source("src/app/sitemap.ts");
  const writerFlow = source("src/features/writer/components/NewWorkFlow.tsx");
  const howItWorks = source("src/content/how-it-works.ts");

  contains(content, "Taslağı kaydetmek ile eseri yayımlamak farklı işlemlerdir", "draft-publication boundary");
  contains(content, "Sınıflandırılmamış eser public olarak yayımlanamaz", "classification publication gate");
  contains(content, "18+ olarak beyan edilen eser taslakta saklanabilir", "adult draft boundary");
  contains(content, "Eseri yayımlamak editör incelemesini otomatik başlatmaz", "separate review request boundary");
  contains(content, "nihai karar yazarda kalır", "writer creative decision boundary");
  contains(content, "otomatik basım, sözleşme veya ticari teklif oluşturmaz", "publisher interest boundary");
  contains(content, "hakların kendiliğinden İlkOku'ya, editöre ya da yayınevine devredildiği anlamına gelmez", "rights boundary");
  contains(content, "mahkeme yerine geçen kesin telif mülkiyeti kararı değildir", "passport legal boundary");

  contains(page, 'getPublishedCmsPublicPageState("yazarlar-icin")', "CMS-owned writer page");
  contains(page, "ForWritersExperience", "branded writer experience");
  contains(page, '"@type": "BreadcrumbList"', "writer breadcrumb schema");
  contains(experience, 'getPublicTrustPageVisual("/yazarlar-icin")', "prepared writer visual");
  contains(experience, 'href="/kayit"', "writer registration CTA");
  contains(experience, 'href="/telif-bildirimi"', "copyright safety link");
  contains(preview, 'page.contentKey === "page:tr:yazarlar-icin"', "visual CMS preview boundary");
  contains(starterContent, 'contentKey: "page:tr:yazarlar-icin"', "CMS starter draft");
  contains(starterContent, 'revalidatePath("/yazarlar-icin")', "writer public revalidation");
  contains(sitemap, "${baseUrl}/yazarlar-icin", "writer sitemap route");

  contains(writerFlow, "ClassificationFields", "real writer classification UI");
  contains(writerFlow, "publishWorkAction", "canonical writer publication action");
  contains(howItWorks, "Yazar editör incelemesi talep edebilir", "existing public review description");
  contains(howItWorks, "Yayınevinin bir eseri görüntülemesi", "existing publisher expectation boundary");

  notContains(content, "yayın garantisi verir", "fabricated publication guarantee");
  notContains(content, "telifinizi garanti eder", "fabricated copyright guarantee");
  notContains(content, "yayınevi mutlaka", "fabricated publisher outcome");
});
