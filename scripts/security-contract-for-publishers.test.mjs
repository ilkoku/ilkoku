import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");

function contains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function notContains(text, fragment, label) {
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("publisher public page stays CMS-owned and truthful about discovery, permissions and commercial boundaries", () => {
  const content = source("src/content/for-publishers.ts");
  const page = source("src/app/yayinevleri-icin/page.tsx");
  const experience = source("src/components/content/ForPublishersExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const starterContent = source("src/features/cms/starter-content-actions.ts");
  const sitemap = source("src/app/sitemap.ts");
  const discovery = source("src/app/yayinevi/kesfet/eserler/page.tsx");
  const access = source("src/features/publisher-discovery/access.ts");
  const permissions = source("src/features/publisher-workspace/permissions.ts");

  contains(content, "bağlayıcı teklif, ön kabul, yayın taahhüdü veya hak devri doğurmaz", "engagement-commercial boundary");
  contains(content, "Pasaport erişimi ile yetkili içerik erişimi sistemde ayrı izinlerdir", "passport-content permission boundary");
  contains(content, "Bu işlem yayınevi kullanıcısını editör yapmaz", "publisher-editor role boundary");
  contains(content, "En geniş erişim varsayılan kabul edilmez", "least privilege boundary");
  contains(content, "otomatik sözleşme oluşturmaz", "discovery-contract boundary");

  contains(page, 'getPublishedCmsPublicPageState("yayinevleri-icin")', "CMS-owned publisher page");
  contains(page, "ForPublishersExperience", "branded publisher experience");
  contains(page, '"@type": "BreadcrumbList"', "publisher breadcrumb schema");
  contains(experience, 'getPublicTrustPageVisual("/yayinevleri-icin")', "prepared publisher visual");
  contains(experience, 'href="/kayit?rol=publisher"', "publisher onboarding CTA");
  contains(experience, 'href="/telif-bildirimi"', "copyright safety link");
  contains(preview, 'page.contentKey === "page:tr:yayinevleri-icin"', "visual CMS preview boundary");
  contains(starterContent, 'contentKey: "page:tr:yayinevleri-icin"', "CMS starter draft");
  contains(starterContent, 'revalidatePath("/yayinevleri-icin")', "publisher public revalidation");
  contains(sitemap, "${baseUrl}/yayinevleri-icin", "publisher sitemap route");

  contains(discovery, '"discover_works"', "real publisher discovery permission");
  contains(access, '"view_authorized_passport"', "real passport permission check");
  contains(access, '"view_authorized_content"', "real content permission check");
  contains(permissions, '"manage_members"', "real member management permission");
  contains(permissions, '"manage_permissions"', "real permission management permission");
  contains(permissions, '"manage_contract"', "real contract permission");
  contains(permissions, '"manage_publication_plan"', "real publication plan permission");

  notContains(content, "yayın garantisi verir", "fabricated publication guarantee");
  notContains(content, "favoriye almak sözleşmedir", "fabricated favorite-contract claim");
  notContains(content, "pasaport tüm özel içeriği açar", "fabricated passport content access");
});

test("publisher page follows the proven /yazarlar-icin public-page shell without touching shared footer infrastructure", () => {
  const publisher = source("src/components/content/ForPublishersExperience.tsx");
  const writer = source("src/components/content/ForWritersExperience.tsx");
  const styles = source("src/app/yayinevleri-icin/for-publishers.css");
  const layout = source("src/app/layout.tsx");
  const hydrator = source("src/components/content/PublicFooterHydrator.tsx");

  for (const hook of [
    'className="how-page',
    'className="how-header"',
    'className="how-related how-container"',
    'className="how-footer"',
  ]) {
    contains(writer, hook, `writer reference ${hook}`);
    contains(publisher, hook, `publisher reuse ${hook}`);
  }

  contains(publisher, 'className="publishers-start how-container"', "writer-style final CTA container");
  contains(styles, ".publishers-start { display:grid", "publisher CTA local style");
  contains(styles, "margin-block:clamp(5rem,9vw,8rem)", "writer-style CTA rhythm");
  notContains(publisher, "PublisherFooter", "no divergent publisher-only footer component");
  notContains(publisher, "publishers-footer", "no divergent publisher-only footer namespace");
  notContains(styles, ".publishers-footer", "no separate footer CSS fork");
  notContains(styles, ".how-page {", "shared trust shell must not be overridden");
  notContains(styles, ".landing-footer", "homepage footer CSS must not be redefined");
  notContains(layout, "ForPublishersExperience", "root layout must not own publisher page");
  notContains(layout, "for-publishers.css", "root layout must not import publisher CSS");
  notContains(layout, "PublicTrustFooter", "shared public footer mount must remain absent");
  contains(hydrator, 'if (window.location.pathname !== "/") return;', "homepage-only footer hydrator boundary");
});
