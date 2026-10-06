// Shared freshness timestamp for the Oct 1 structured-data update applied across all writing guides (PR #1450).
export const WRITING_GUIDE_STRUCTURED_DATA_UPDATED_AT = new Date("2026-10-01T08:40:42Z");

// Truthful content update for the Bilgilendirici guide-family differentiation merged in PR #1609.
export const INFORMATIONAL_GUIDE_CONTENT_UPDATED_AT = new Date("2026-10-04T12:14:35Z");

// Truthful visible-content update for contextual internal links across all writing category hubs and guide pages.
export const WRITING_INTERNAL_LINKS_UPDATED_AT = new Date("2026-10-04T14:20:31Z");

// Significant search-facing updates merged on Oct 6. These timestamps are
// intentionally route-specific: Google recommends changing sitemap lastmod
// only when the page itself received a meaningful content, structured-data,
// or link update. Do not advance unrelated routes on every deploy.
const FLAGSHIP_GUIDE_INTENT_UPDATED_AT = new Date("2026-10-06T07:55:57Z");
const PRIORITY_EDUCATION_INTENT_UPDATED_AT = new Date("2026-10-06T08:04:59Z");
const PRIORITY_CATEGORY_SCHEMA_UPDATED_AT = new Date("2026-10-06T08:33:10Z");
const PRIORITY_EDITOR_SCHEMA_UPDATED_AT = new Date("2026-10-06T09:14:20Z");

const SEARCH_CODE_FRESHNESS_BY_PATH: ReadonlyMap<string, Date> = new Map([
  ["/yazarlar-icin/kurgu/roman", FLAGSHIP_GUIDE_INTENT_UPDATED_AT],
  ["/yazarlar-icin/kurgu/oyku", FLAGSHIP_GUIDE_INTENT_UPDATED_AT],
  ["/yazarlar-icin/kurgu/fantastik", FLAGSHIP_GUIDE_INTENT_UPDATED_AT],
  ["/yazarlar-icin/kurgu/bilim-kurgu", FLAGSHIP_GUIDE_INTENT_UPDATED_AT],
  ["/yazarlar-icin/kurgu/distopya", FLAGSHIP_GUIDE_INTENT_UPDATED_AT],
  ["/yazarlar-icin/edebiyat/siir", FLAGSHIP_GUIDE_INTENT_UPDATED_AT],

  ["/okurlar-icin/okumaya-baslama", PRIORITY_EDUCATION_INTENT_UPDATED_AT],

  ["/yazarlar-icin/kurgu", PRIORITY_CATEGORY_SCHEMA_UPDATED_AT],
  ["/yazarlar-icin/edebiyat", PRIORITY_CATEGORY_SCHEMA_UPDATED_AT],
  ["/yazarlar-icin/akademik", PRIORITY_CATEGORY_SCHEMA_UPDATED_AT],
  ["/yazarlar-icin/bilgilendirici", PRIORITY_CATEGORY_SCHEMA_UPDATED_AT],
  ["/yazarlar-icin/senaryo-ve-sahne", PRIORITY_CATEGORY_SCHEMA_UPDATED_AT],
  ["/yazarlar-icin/cocuk-ve-genclik", PRIORITY_CATEGORY_SCHEMA_UPDATED_AT],
  ["/yazarlar-icin/cizgi-anlati", PRIORITY_CATEGORY_SCHEMA_UPDATED_AT],
  ["/okurlar-icin", PRIORITY_CATEGORY_SCHEMA_UPDATED_AT],

  ["/editorler-icin/egitim/editorluge-baslama", PRIORITY_EDITOR_SCHEMA_UPDATED_AT],
  ["/editorler-icin/egitim/dil-ve-anlatim-editorlugu", PRIORITY_EDITOR_SCHEMA_UPDATED_AT],
  ["/editorler-icin/egitim/metin-degerlendirme", PRIORITY_EDITOR_SCHEMA_UPDATED_AT],
]);

function normalizeSearchPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "/";

  let path = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      path = new URL(trimmed).pathname;
    } catch {
      return trimmed;
    }
  } else {
    path = trimmed.split(/[?#]/u, 1)[0] || "/";
  }

  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/u, "");
  return path || "/";
}

export function getSearchCodeFreshness(value: string) {
  return SEARCH_CODE_FRESHNESS_BY_PATH.get(normalizeSearchPath(value));
}
