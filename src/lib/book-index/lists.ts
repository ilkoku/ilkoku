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
    code: "kitapsepeti-tr-live",
    sourceCode: "kitapsepeti",
    title: "KitapSepeti · Çok Satan Kitaplar",
    categoryKey: "general",
    period: "live",
    sourceUrl: "https://www.kitapsepeti.com/cok-satan-kitaplar",
    maxRank: 60,
    includeInComposite: true,
    collectionEveryMinutes: 360,
    enabled: true,
  },
  {
    code: "kitapzen-tr-weekly",
    sourceCode: "kitapzen",
    title: "Kitapzen · Haftalık Çok Satanlar",
    categoryKey: "general",
    period: "weekly",
    sourceUrl: "https://www.kitapzen.com/index.php?mod_id=41&p=ProductBestsellers&page=1&period=weekly",
    maxRank: 60,
    includeInComposite: true,
    collectionEveryMinutes: 360,
    enabled: true,
  },
  {
    code: "kitapzen-tr-monthly",
    sourceCode: "kitapzen",
    title: "Kitapzen · Aylık Çok Satanlar",
    categoryKey: "general",
    period: "monthly",
    sourceUrl: "https://www.kitapzen.com/index.php?mod_id=41&p=ProductBestsellers&page=1&period=monthly",
    maxRank: 20,
    includeInComposite: false,
    collectionEveryMinutes: 720,
    enabled: true,
  },
  {
    code: "kitapzen-tr-yearly",
    sourceCode: "kitapzen",
    title: "Kitapzen · Yıllık Çok Satanlar",
    categoryKey: "general",
    period: "yearly",
    sourceUrl: "https://www.kitapzen.com/index.php?mod_id=41&p=ProductBestsellers&page=1&period=yearly",
    maxRank: 20,
    includeInComposite: false,
    collectionEveryMinutes: 1440,
    enabled: true,
  },
  {
    code: "inkilap-tr-live",
    sourceCode: "inkilap",
    title: "İnkılâp Kitabevi · Çok Satanlar",
    categoryKey: "general",
    period: "live",
    sourceUrl: "https://www.inkilap.com/cok-satanlar",
    maxRank: 60,
    includeInComposite: true,
    collectionEveryMinutes: 360,
    enabled: true,
  },
  {
    code: "kitapsec-edebiyat-live",
    sourceCode: "kitapsec",
    title: "KitapSeç · Edebiyat Çok Satan Kitaplar",
    categoryKey: "edebiyat",
    period: "live",
    sourceUrl: "https://www.kitapsec.com/Products/Edebiyat/Cok-Satan-Kitaplar/1-6-0a0-0-0-0-0-0.xhtml",
    maxRank: 48,
    includeInComposite: false,
    collectionEveryMinutes: 360,
    enabled: true,
  },
  {
    code: "kitapsec-cocuk-genclik-live",
    sourceCode: "kitapsec",
    title: "KitapSeç · Çocuk ve Gençlik Çok Satan Kitaplar",
    categoryKey: "cocuk-genclik",
    period: "live",
    sourceUrl: "https://www.kitapsec.com/Products/Cocuk-ve-Genclik-Kitaplari/Cok-Satan-Kitaplar/",
    maxRank: 48,
    includeInComposite: false,
    collectionEveryMinutes: 360,
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
