import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.equal(text.includes(fragment), false, `${label} must not contain ${JSON.stringify(fragment)}`);

test("site identity is admin-only, fail-safe and restricted to published CMS media logos", () => {
  const page = source("src/app/icerik/site-kimligi/page.tsx");
  const actions = source("src/features/cms/site-identity-actions.ts");
  const identity = source("src/lib/site-identity.ts");
  const header = source("src/components/layout/PublicSiteHeader.tsx");
  const footer = source("src/components/content/PublicTrustFooter.tsx");

  contains(page, 'requireCmsAdmin("/icerik/site-kimligi")', "site identity admin page boundary");
  contains(actions, 'requireCmsAdmin("/icerik/site-kimligi")', "site identity mutation boundary");
  contains(actions, "logoIsPublishedCmsImage", "site identity logo revalidation");
  contains(actions, "namespace = 'media'", "site identity published media lookup");
  contains(actions, "value.kind === \"image\"", "site identity image-kind boundary");
  contains(actions, "'site_identity', 'global'", "site identity canonical storage key");
  contains(identity, "parseSiteIdentityStrict", "site identity strict parser");
  contains(identity, "return defaultSiteIdentity", "public identity safe fallback");
  contains(header, "getPublicSiteIdentity()", "public header identity consumer");
  contains(footer, "getPublicSiteIdentity()", "public footer identity consumer");
  notContains(actions, "http://", "site identity must not accept arbitrary remote logo source");
  notContains(actions, "https://", "site identity must not accept arbitrary remote logo source");
});

test("page template builder only creates drafts through the canonical CMS page action", () => {
  const page = source("src/app/icerik/sayfalar/sablonlar/page.tsx");
  const builder = source("src/components/content/CmsPageTemplateBuilder.tsx");
  const templates = source("src/lib/cms-page-templates.ts");
  const modules = source("src/lib/cms-modules.ts");

  contains(page, 'requireCmsManager("/icerik/sayfalar/sablonlar")', "page template manager boundary");
  contains(builder, "action={saveCmsPageAction}", "canonical page save action reuse");
  contains(builder, 'name="mode" value="draft"', "template creation draft-only mode");
  notContains(builder, 'name="mode" value="publish"', "template builder must not expose publish mode");
  notContains(builder, "requireCmsPublisher", "template builder must not invent publisher authority");
  contains(templates, 'key: "kurumsal"', "corporate template");
  contains(templates, 'key: "surec"', "process template");
  contains(templates, 'key: "rol"', "role template");
  contains(templates, 'key: "bilgi"', "information template");
  contains(modules, 'href: "/icerik/site-kimligi"', "site identity CMS navigation");
  contains(modules, 'href: "/icerik/sayfalar/sablonlar"', "page templates CMS navigation");
});
