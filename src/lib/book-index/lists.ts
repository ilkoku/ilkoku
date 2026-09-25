import { getBookIndexSource } from "./sources";

export type BookIndexListDefinition = {
  code: string;
  sourceCode: string;
  title: string;
  categoryKey: string;
  period: "live" | "daily" | "weekly" | "monthly" | "yearly";
  sourceUrl: string;
  maxRank: number | null;
  includeInComposite: boolean;
  collectionEveryMinutes: number | null;
  enabled: boolean;
};

export const BOOK_INDEX_LISTS: readonly BookIndexListDefinition[] = [
  {
    code: "remzi-tr-weekly",
    sourceCode: "remzi",
    title: "Remzi'de Çok Satanlar · Türkçe",
    categoryKey: "general",
    period: "weekly",
    sourceUrl: "https://www.remzi.com.tr/anasayfa",
    maxRank: 15,
    includeInComposite: true,
    collectionEveryMinutes: 1440,
    enabled: true,
  },
  {
    code: "bkm-tr-weekly",
    sourceCode: "bkm",
    title: "BKM Kitap · Haftalık Çok Satanlar",
    categoryKey: "general",
    period: "weekly",
    sourceUrl: "https://www.bkmkitap.com/cok-satan-kitaplar",
    maxRank: 50,
    includeInComposite: true,
    collectionEveryMinutes: 360,
    enabled: true,
  },
  {
    code: "bkm-tr-monthly",
    sourceCode: "bkm",
    title: "BKM Kitap · Aylık Çok Satanlar",
    categoryKey: "general",
    period: "monthly",
    sourceUrl: "https://www.bkmkitap.com/cok-satan-kitaplar",
    maxRank: 50,
    includeInComposite: false,
    collectionEveryMinutes: 720,
    enabled: true,
  },
  {
    code: "bkm-tr-yearly",
    sourceCode: "bkm",
    title: "BKM Kitap · Yıllık Çok Satanlar",
    categoryKey: "general",
    period: "yearly",
    sourceUrl: "https://www.bkmkitap.com/cok-satan-kitaplar",
    maxRank: 50,
    includeInComposite: false,
    collectionEveryMinutes: 1440,
    enabled: true,
  },
  {
    code: "idefix-tr-live",
    sourceCode: "idefix",
    title: "idefix · Çok Satan Kitaplar",
    categoryKey: "general",
    period: "live",
    sourceUrl: "https://www.idefix.com/cok-satanlar-l-162",
    maxRank: 24,
    includeInComposite: true,
    collectionEveryMinutes: 360,
    enabled: true,
  },
] as const;

export function getBookIndexList(code: string) {
  return BOOK_INDEX_LISTS.find((list) => list.code === code) ?? null;
}

export function validateBookIndexListRegistry() {
  for (const list of BOOK_INDEX_LISTS) {
    if (!getBookIndexSource(list.sourceCode)) {
      throw new Error(`BOOK_INDEX_UNKNOWN_SOURCE:${list.sourceCode}`);
    }
  }
}
