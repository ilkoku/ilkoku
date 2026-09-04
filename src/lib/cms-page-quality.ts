export type CmsPagePublishQualityIssueCode =
  | "canonical"
  | "title"
  | "summary"
  | "body"
  | "seo-title"
  | "seo-description";

export type CmsPagePublishQualityIssue = {
  code: CmsPagePublishQualityIssueCode;
  message: string;
};

export type CmsPagePublishQualityInput = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  noIndex?: boolean;
};

export type CmsPagePublishQualityResult = {
  ok: boolean;
  issues: CmsPagePublishQualityIssue[];
  metrics: {
    bodyCharacters: number;
    bodyWords: number;
    effectiveSeoTitleCharacters: number;
    effectiveSeoDescriptionCharacters: number;
  };
};

const MIN_TITLE_CHARACTERS = 5;
const MAX_PAGE_TITLE_CHARACTERS = 120;
const MIN_SUMMARY_CHARACTERS = 40;
const MIN_BODY_CHARACTERS = 250;
const MIN_BODY_WORDS = 45;
const MIN_SEO_TITLE_CHARACTERS = 8;
const MAX_SEO_TITLE_CHARACTERS = 70;
const MIN_SEO_DESCRIPTION_CHARACTERS = 70;
const MAX_SEO_DESCRIPTION_CHARACTERS = 180;

function compact(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function bodyMetrics(body: string) {
  const plain = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = plain ? plain.split(/\s+/).filter(Boolean) : [];
  return { characters: plain.length, words: words.length };
}

function issue(code: CmsPagePublishQualityIssueCode, message: string): CmsPagePublishQualityIssue {
  return { code, message };
}

export function evaluateCmsPagePublishQuality(input: CmsPagePublishQualityInput): CmsPagePublishQualityResult {
  const slug = compact(input.slug);
  const title = compact(input.title);
  const summary = compact(input.summary);
  const seoTitle = compact(input.seoTitle) || title;
  const seoDescription = compact(input.seoDescription) || summary;
  const metrics = bodyMetrics(input.body);
  const issues: CmsPagePublishQualityIssue[] = [];

  if (!/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    issues.push(issue("canonical", "URL/canonical tek seviyeli ve güvenli bir İlkOku public yolu olmalı."));
  }

  if (title.length < MIN_TITLE_CHARACTERS || title.length > MAX_PAGE_TITLE_CHARACTERS) {
    issues.push(issue("title", `Başlık ${MIN_TITLE_CHARACTERS}-${MAX_PAGE_TITLE_CHARACTERS} karakter arasında olmalı.`));
  }

  if (summary.length < MIN_SUMMARY_CHARACTERS) {
    issues.push(issue("summary", `Kısa özet en az ${MIN_SUMMARY_CHARACTERS} karakterle sayfanın amacını açıkça anlatmalı.`));
  }

  if (metrics.characters < MIN_BODY_CHARACTERS || metrics.words < MIN_BODY_WORDS) {
    issues.push(issue("body", `Sayfa metni en az ${MIN_BODY_WORDS} anlamlı kelime ve ${MIN_BODY_CHARACTERS} karakter içermeli.`));
  }

  if (seoTitle.length < MIN_SEO_TITLE_CHARACTERS || seoTitle.length > MAX_SEO_TITLE_CHARACTERS) {
    issues.push(issue("seo-title", `Arama başlığı ${MIN_SEO_TITLE_CHARACTERS}-${MAX_SEO_TITLE_CHARACTERS} karakter arasında olmalı; SEO başlığı boşsa sayfa başlığı kullanılır.`));
  }

  if (!input.noIndex && (seoDescription.length < MIN_SEO_DESCRIPTION_CHARACTERS || seoDescription.length > MAX_SEO_DESCRIPTION_CHARACTERS)) {
    issues.push(issue("seo-description", `Indexlenebilir sayfanın arama açıklaması ${MIN_SEO_DESCRIPTION_CHARACTERS}-${MAX_SEO_DESCRIPTION_CHARACTERS} karakter arasında olmalı; SEO açıklaması boşsa kısa özet kullanılır.`));
  }

  return {
    ok: issues.length === 0,
    issues,
    metrics: {
      bodyCharacters: metrics.characters,
      bodyWords: metrics.words,
      effectiveSeoTitleCharacters: seoTitle.length,
      effectiveSeoDescriptionCharacters: seoDescription.length,
    },
  };
}
