import "server-only";

import { aboutPageContent } from "@/content/about";
import { communityRulesPageContent } from "@/content/community-rules";
import { contentAgePolicyPageContent } from "@/content/content-age-policy";
import { copyrightNoticePageContent } from "@/content/copyright-notice";
import { editorialStandardsPageContent } from "@/content/editorial-standards";
import { forEditorsPageContent } from "@/content/for-editors";
import { forPublishersPageContent } from "@/content/for-publishers";
import { forWritersPageContent } from "@/content/for-writers";
import { howItWorksPageContent } from "@/content/how-it-works";
import { parseCmsPageBody } from "@/lib/cms-pages";
import type { publicCmsPageCatalog } from "@/lib/public-cms-page-catalog";

type CorePublicPageKey = (typeof publicCmsPageCatalog)[number]["contentKey"];

export type CorePublicCodeCopy = {
  canonical: string;
  title: string;
  summary: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
};

// Read-only reference: these are exactly the nine copies used when the
// public route has no approved, published CMS version. Never write these
// into production or silently replace editorial work.
export const corePublicCodeCopies: Record<CorePublicPageKey, CorePublicCodeCopy> = {
  "page:tr:hakkimizda": aboutPageContent,
  "page:tr:nasil-calisir": howItWorksPageContent,
  "page:tr:editoryal-standartlar": editorialStandardsPageContent,
  "page:tr:icerik-ve-yas-politikasi": contentAgePolicyPageContent,
  "page:tr:topluluk-kurallari": communityRulesPageContent,
  "page:tr:telif-bildirimi": copyrightNoticePageContent,
  "page:tr:yazarlar-icin": forWritersPageContent,
  "page:tr:editorler-icin": forEditorsPageContent,
  "page:tr:yayinevleri-icin": forPublishersPageContent,
};

type StoredCorePublicPage = {
  slug: string;
  title: string;
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
};

function normalized(value: string | null | undefined) {
  return (value ?? "").trim();
}

// A difference is informational, not a permission to override an editor's
// pending draft or an explicitly approved CMS publication.
export function compareCorePageToCode(
  stored: StoredCorePublicPage,
  code: CorePublicCodeCopy,
): string[] {
  const body = parseCmsPageBody(stored.bodyJson);
  const values = [
    ["Başlık", stored.title, code.title],
    ["Kısa özet", body.summary, code.summary],
    ["Sayfa metni", body.body, code.body],
    ["SEO başlığı", stored.seoTitle, code.seoTitle],
    ["SEO açıklaması", stored.seoDescription, code.seoDescription],
    ["Canonical", stored.canonicalUrl, code.canonical],
    ["URL", stored.slug, code.canonical],
  ] as const;
  const differences = values
    .filter(([, actual, expected]) => normalized(actual) !== normalized(expected))
    .map(([label]) => label);
  if (stored.noIndex) differences.push("Noindex");
  return differences;
}
