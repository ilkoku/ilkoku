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
