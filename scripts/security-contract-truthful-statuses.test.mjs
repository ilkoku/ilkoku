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
  assert.equal(text.includes(fragment), false, `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("contact is a complete indexable public SEO surface and sitemap member", () => {
  const page = source("src/app/iletisim/page.tsx");
  const sitemap = source("src/app/sitemap.ts");
  const technical = source("src/app/icerik/seo/SeoTechnicalAudit.tsx");

  contains(page, 'canonical: "/iletisim"', "contact self canonical");
  contains(page, "robots: { index: true, follow: true }", "contact index policy");
  contains(page, "openGraph:", "contact Open Graph metadata");
  contains(page, "twitter:", "contact Twitter metadata");
  contains(page, 'const socialImage = "/opengraph-image"', "contact social image fallback");
  contains(sitemap, 'url: `${baseUrl}/iletisim`', "contact sitemap entry");
  contains(technical, '"/iletisim"', "technical SEO code-owned contact inventory");
});

test("SEO workbench never paints robots social or structured data green without live evidence", () => {
  const technical = source("src/app/icerik/seo/SeoTechnicalAudit.tsx");
  const metadata = source("src/app/icerik/seo/SeoMetadataQualityAudit.tsx");
  const verifier = source("src/lib/seo-live-verification.ts");

  contains(technical, "getLiveSeoVerification()", "technical live evidence loader");
  contains(technical, "state={live.robots.state}", "robots evidence-driven state");
  contains(technical, "state={live.social.state}", "social evidence-driven state");
  notContains(technical, '<Card state="ok" label="Robots"', "no fixed green robots card");
  notContains(technical, '<Card state="ok" label="Social preview"', "no fixed green social card");

  contains(metadata, "getLiveSeoVerification()", "structured-data live evidence loader");
  contains(metadata, "state={check.state}", "structured-data evidence-driven state");
  contains(metadata, "Kodda bir schema tipi bulunması tek başına", "structured-data no-fake-ready disclaimer");
  notContains(metadata, 'data-state="ok">Hazır', "no fixed green structured-data header");

  contains(verifier, 'fetchLive("/robots.txt")', "live robots fetch");
  contains(verifier, '"/iletisim"', "live social contact coverage");
  contains(verifier, '"WebSite" | "Book" | "CollectionPage" | "ProfilePage" | "FAQPage" | "BreadcrumbList"', "schema evidence vocabulary");
  contains(verifier, "PASS üretilmedi", "fail-closed unavailable evidence wording");
});

test("runtime infrastructure cannot report PASS while any ENV status is unknown", () => {
  const panel = source("src/features/system-map/RuntimeInfrastructurePanel.tsx");

  contains(panel, 'const unknownEnv = report.env.filter((item) => item.status === "unknown").length', "unknown ENV count");
  contains(panel, 'unknownEnv > 0\n        ? "unknown"\n        : "pass"', "unknown ENV blocks overall PASS");
  contains(panel, "genel PASS verilmez", "unknown ENV operator message");
});

test("malformed form payloads contribute a redacted CMS overview warning without promoting PII detail", () => {
  const dashboard = source("src/lib/cms-dashboard-integrity.ts");
  const integrity = source("src/lib/cms-health-integrity.ts");

  contains(integrity, "invalidForms:", "form integrity source signal");
  contains(integrity, "overviewSanitizedWarnings: invalidForms", "redacted overview warning projection");
  contains(dashboard, "+ integrity.overviewSanitizedWarnings", "dashboard redacted warning aggregation");
  notContains(dashboard, "invalidForms", "dashboard does not promote form-specific integrity detail");
});

test("homepage CTA green status requires live target and anchor evidence", () => {
  const homepage = source("src/app/icerik/seo/SeoHomepageAudit.tsx");

  contains(homepage, "verifyCtaHref", "CTA live verifier");
  contains(homepage, "await fetch(url.toString()", "CTA HTTP evidence");
  contains(homepage, "anchor'ı canlı HTML içinde bulunamadı", "CTA anchor evidence");
  contains(homepage, "PASS üretilmedi", "CTA unavailable fail-closed state");
  contains(homepage, 'label="CTA hedef doğrulaması"', "truthful CTA label");
  notContains(homepage, 'value={invalidCtas > 0 ? `${invalidCtas} hatalı hedef` : "Güvenli"}', "no format-only green CTA status");
});
