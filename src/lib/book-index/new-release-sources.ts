import { getBookIndexSource } from "./sources";

export type BookIndexNewReleaseSourceStatus =
  | "verified_native_list"
  | "researching";

export type BookIndexNewReleaseCollectionMode =
  | "dedicated_page"
  | "homepage_section";

export type BookIndexNewReleaseSourceDefinition = {
  sourceCode: string;
  nativeLabel: string;
  sourceUrl: string | null;
  collectionMode: BookIndexNewReleaseCollectionMode | null;
  status: BookIndexNewReleaseSourceStatus;
};

export const BOOK_INDEX_NEW_RELEASE_SOURCES: readonly BookIndexNewReleaseSourceDefinition[] = [
  {
    sourceCode: "remzi",
    nativeLabel: "En Yeniler",
    sourceUrl: "https://www.remzi.com.tr/kitaplarimiz/en-yeniler/",
    collectionMode: "dedicated_page",
    status: "verified_native_list",
  },
  {
    sourceCode: "bkm",
    nativeLabel: "Yeni Çıkan Kitaplar",
    sourceUrl: "https://www.bkmkitap.com/yeni-cikan-kitaplar",
    collectionMode: "dedicated_page",
    status: "verified_native_list",
  },
  {
    sourceCode: "kitapsepeti",
    nativeLabel: "Yeni Çıkan Kitaplar",
    sourceUrl: "https://www.kitapsepeti.com/yeni-urunler",
    collectionMode: "dedicated_page",
    status: "verified_native_list",
  },
  {
    sourceCode: "kitaplarsepette",
    nativeLabel: "Yeni Çıkanlar",
    sourceUrl: "https://www.kitaplarsepette.com/",
    collectionMode: "homepage_section",
    status: "verified_native_list",
  },
  {
    sourceCode: "kitapzen",
    nativeLabel: "Yeniler",
    sourceUrl: "https://www.kitapzen.com/yeni-cikanlar-np51-1.html",
    collectionMode: "dedicated_page",
    status: "verified_native_list",
  },
  {
    sourceCode: "inkilap",
    nativeLabel: "En Yeniler",
    sourceUrl: "https://www.inkilap.com/en-yeniler",
    collectionMode: "dedicated_page",
    status: "verified_native_list",
  },
  {
    sourceCode: "illakitap",
    nativeLabel: "Yeni Çıkan Kitaplar",
    sourceUrl: "https://www.illakitap.com/yeni-cikan-kitaplar",
    collectionMode: "dedicated_page",
    status: "verified_native_list",
  },
  {
    sourceCode: "nobelkitap",
    nativeLabel: "Raflara Yeni Gelenler",
    sourceUrl: "https://www.nobelkitap.com/yeni-cikanlar",
    collectionMode: "dedicated_page",
    status: "verified_native_list",
  },
  {
    sourceCode: "idefix",
    nativeLabel: "Yeni Çıkanlar",
    sourceUrl: null,
    collectionMode: null,
    status: "researching",
  },
  {
    sourceCode: "pandora",
    nativeLabel: "Yeni Gelenler - Türkçe Kitaplar",
    sourceUrl: "https://www.pandora.com.tr/",
    collectionMode: "homepage_section",
    status: "verified_native_list",
  },
  {
    sourceCode: "kitapstore",
    nativeLabel: "Yeni Çıkanlar",
    sourceUrl: "https://www.kitapstore.com/liste/1/yeni-cikanlar/!Sayfa=1",
    collectionMode: "dedicated_page",
    status: "verified_native_list",
  },
] as const;

export function getBookIndexNewReleaseSource(sourceCode: string) {
  return (
    BOOK_INDEX_NEW_RELEASE_SOURCES.find(
      (source) => source.sourceCode === sourceCode,
    ) ?? null
  );
}

export function validateBookIndexNewReleaseSourceRegistry() {
  const seen = new Set<string>();

  for (const source of BOOK_INDEX_NEW_RELEASE_SOURCES) {
    if (!getBookIndexSource(source.sourceCode)) {
      throw new Error(`BOOK_INDEX_NEW_RELEASE_UNKNOWN_SOURCE:${source.sourceCode}`);
    }

    if (seen.has(source.sourceCode)) {
      throw new Error(`BOOK_INDEX_NEW_RELEASE_DUPLICATE_SOURCE:${source.sourceCode}`);
    }

    if (source.status === "verified_native_list" && !source.sourceUrl) {
      throw new Error(`BOOK_INDEX_NEW_RELEASE_VERIFIED_URL_MISSING:${source.sourceCode}`);
    }

    seen.add(source.sourceCode);
  }
}
