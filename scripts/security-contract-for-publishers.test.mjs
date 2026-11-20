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

test("publisher public page stays CMS-compatible, evaluation-led and truthful about permissions and commercial boundaries", () => {
  const content = source("src/content/for-publishers.ts");
  const page = source("src/app/yayinevleri-icin/page.tsx");
  const experience = source("src/components/content/ForPublishersExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const starterContent = source("src/features/cms/starter-content-actions.ts");
  const cmsStore = source("src/lib/cms-public-page-store.ts");
  const sitemap = source("src/lib/seo/sitemap-data.ts");
  const discovery = source("src/app/yayinevi/kesfet/eserler/page.tsx");
  const access = source("src/features/publisher-discovery/access.ts");
  const permissions = source("src/features/publisher-workspace/permissions.ts");

  contains(content, "pasif bir başvuru kutusundan daha geniş bir çalışma zemini sunar", "publisher evaluation value");
  contains(content, "Bağlayıcı ticari adım, daha sonra ayrı karar ve süreçlerle oluşur", "engagement-commercial boundary");
  contains(content, "Pasaport bilgisi ile özel tam metin erişimi ayrı yetkilerdir", "passport-content permission boundary");
  contains(content, "aktif olmadığı ortamda yayınevi kullanıcılarına kullanılabilir işlem gibi sunulmaz", "planned editor-request truth boundary");
  contains(content, "Kurumsal paylaşım araçları kademeli olarak etkinleştirilen çalışma katmanıdır", "planned sharing truth boundary");
  contains(content, "İlkOku değerlendirme alanını genişletir; yayınevinin editoryal ve ticari kararını devralmaz", "publisher decision boundary");

  contains(page, 'getPublishedCmsPublicPageState("yayinevleri-icin")', "CMS-owned publisher page");
  contains(page, "ForPublishersExperience", "branded publisher experience");
  contains(page, '"@type": "BreadcrumbList"', "publisher breadcrumb schema");
  contains(experience, 'getPublicTrustPageVisual("/yayinevleri-icin")', "prepared publisher visual");
  contains(experience, 'href="/kayit?rol=publisher"', "publisher onboarding CTA");
  contains(experience, "Yeni yetenekleri başvuru kutunuza düşmeden önce keşfedin", "publisher acquisition headline");
  contains(experience, 'href="/telif-bildirimi"', "copyright safety link");
  contains(preview, 'page.contentKey === "page:tr:yayinevleri-icin"', "visual CMS preview boundary");
  contains(starterContent, 'contentKey: "page:tr:yayinevleri-icin"', "CMS starter draft");
  contains(starterContent, 'revalidatePath("/yayinevleri-icin")', "publisher public revalidation");
  contains(cmsStore, '"yayinevleri-icin": {', "legacy publisher CMS bridge");
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
  notContains(content, "kurumsal paylaşım şu anda kullanımdadır", "fabricated live sharing claim");
});

test("publisher page follows the proven /yazarlar-icin public-page shell without touching shared footer infrastructure", () => {
  const publisher = source("src/components/content/ForPublishersExperience.tsx");
  const writer = source("src/components/content/ForWritersExperience.tsx");
  const styles = source("src/app/yayinevleri-icin/for-publishers.css");
  const layout = source("src/app/layout.tsx");
  const hydrator = source("src/components/content/PublicFooterHydrator.tsx");

  contains(writer, 'className="how-page', "writer route keeps its content shell");
  contains(publisher, 'className="how-page', "publisher route keeps its content shell");
  for (const experience of [writer, publisher]) {
    notContains(experience, '<footer className="how-footer">', "dead footer markup removed");
    notContains(experience, '<header className="how-header">', "dead header markup removed");
  }

  contains(writer, 'className="how-related how-container', "writer related-section shell classes");
  contains(publisher, 'className="how-related how-container"', "publisher related-section shell classes");
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
  contains(hydrator, "const pathname = usePathname();", "route-aware homepage footer hydrator boundary");
  contains(hydrator, 'if (pathname !== "/") return;', "homepage-only footer hydrator boundary");
  contains(hydrator, "}, [pathname]);", "footer hydrator route-change dependency");
});

test("publisher hero uses an already-supported quality level without changing responsive crop or priority", () => {
  const hero = source("src/components/content/ForPublishersExperience.tsx");
  const config = source("next.config.ts");
  contains(config, "qualities: [45, 60, 75]", "the Next.js configured image quality allowlist");
  const staticHero = source("src/components/content/PublisherHeroStaticImage.tsx");
  contains(hero, '<PublisherHeroStaticImage src={visual.src} alt={visual.alt} focalPoint={visual.focalPoint} />', "publisher retains original visual, alternative text and crop");
  contains(staticHero, 'quality={60}', "publisher image keeps q60");
  contains(staticHero, 'fetchPriority="high"', "publisher image keeps high priority");
  contains(staticHero, 'sizes="(max-width: 860px) 100vw, 54vw"', "publisher keeps responsive image sizes");
  contains(staticHero, 'fill', "publisher preserves the fill-based layout");
  notContains(hero, 'src={logo} alt="İlkOku" quality={60}', "brand logo quality unchanged");
});

test("publisher above-the-fold hero is sole high-priority image, without altering visuals", () => {
  const code = source("src/components/content/ForPublishersExperience.tsx");
  contains(code, '<PublisherHeroStaticImage src={visual.src} alt={visual.alt} focalPoint={visual.focalPoint} />', "publisher only replaces the hero image source");
  const staticHero = source("src/components/content/PublisherHeroStaticImage.tsx");
  contains(staticHero, 'priority', "measured LCP image retains preload");
  contains(staticHero, 'fetchPriority="high"', "measured LCP image keeps explicit browser priority");
  notContains(code, '<header className="how-header">', "legacy publisher header is no longer rendered inside the shared PublicSiteFrame");
  notContains(code, 'loading="eager" sizes="160px"', "hidden eager logo must not generate a redundant mobile download");
  notContains(code, '<footer className="how-footer">', "duplicate footer removed; shared footer remains");
  notContains(code, '<Image src={logo} alt="İlkOku" priority', "logo must not preload ahead of LCP image");
});

test("publisher removes only its hidden legacy header, retaining canonical shared header and login", () => {
  const component = source("src/components/content/ForPublishersExperience.tsx");
  const layout = source("src/app/yayinevleri-icin/layout.tsx");
  const sharedFrame = source("src/components/layout/PublicSiteFrame.tsx");
  const header = source("src/components/layout/PublicSiteHeader.tsx");
  const css = source("src/components/layout/public-site-header.css");
  contains(layout, "<PublicSiteFrame>{children}</PublicSiteFrame>", "publisher route always uses shared frame");
  contains(sharedFrame, "<PublicSiteHeader />", "shared visible site header is preserved");
  contains(header, "<PublicSiteAccount />", "shared account entry is preserved");
  notContains(css, ".public-site-frame .how-header,", "dead hidden header CSS is removed");
  notContains(component, '<header className="how-header">', "publisher must not render an invisible eager-logo header");
  contains(component, 'href="/kayit?rol=publisher"', "publisher registration CTA remains");
  contains(component, 'href="/giris"', "publisher login link elsewhere in the page remains");
});

test("publisher route coalesces both page-owned CSS imports without changing CMS preview", () => {
  const publisherRoute = source("src/app/yayinevleri-icin/page.tsx");
  const roleStyles = source("src/app/yayinevleri-icin/role-illustrations.css");
  const baseStyles = source("src/app/yayinevleri-icin/for-publishers.css");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  contains(publisherRoute, 'import "./role-illustrations.css";', "public publisher role styles remain included");
  notContains(publisherRoute, 'import "./for-publishers.css";', "publisher page uses a single route-owned CSS entry");
  contains(roleStyles, '@import "./for-publishers.css";', "base rules precede icon rules with no selector edits");
  contains(baseStyles, ".publishers-discovery { padding-block:", "original publisher base styles preserved");
  contains(roleStyles, ".for-publishers-page .publishers-hero__visual figcaption span:nth-child(1)::before", "hero role illustrations remain visible");
  contains(preview, 'import "@/app/yayinevleri-icin/for-publishers.css";', "CMS preview still loads original publisher base stylesheet");
});

test("publisher static image variants are real WebP assets and only affect the publisher hero", () => {
  const image = source("src/components/content/PublisherHeroStaticImage.tsx");
  const publisher = source("src/components/content/ForPublishersExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  for (const width of [384,640,750,828,1080,1200,1920,2048,3840]) {
    const file=readFileSync(join(ROOT,"public/trust-pages/for-publishers-w" + width + "-q60-v1.webp"));
    assert.equal(file.subarray(0,4).toString("ascii"),"RIFF","RIFF signature " + width);
    assert.equal(file.subarray(8,12).toString("ascii"),"WEBP","WebP signature " + width);
    assert.ok(file.length>3000 && file.length<1000000,"reasonable bytes " + width);
  }
  const w750=readFileSync(join(ROOT,"public/trust-pages/for-publishers-w750-q60-v1.webp"));
  assert.equal(w750.length,36188,"750px variant is identical size to accepted q60");
  contains(image,'const sourceImage = "/trust-pages/for-publishers.webp";',"original source path remains explicit");
  contains(image,'if (src !== sourceImage || quality !== 60 || !supportedWidths.has(width))',"safe fallback for future changes");
  contains(publisher,'<PublisherHeroStaticImage src={visual.src} alt={visual.alt} focalPoint={visual.focalPoint} />',"publisher hero is scoped");
  contains(preview,'<ForPublishersExperience',"CMS draft stays on approved publisher render path");
  notContains(publisher,'loading="lazy"',"hero not accidentally lazy-loaded");
});
