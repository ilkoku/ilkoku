import type { BookIndexInsights } from "./insights";

export type BookIndexInsightKey =
  | "newEntries"
  | "risers"
  | "everywhereSellers"
  | "longSellers";

export type BookIndexInsightPageDefinition = {
  slug: string;
  key: BookIndexInsightKey;
  eyebrow: string;
  heading: string;
  searchTitle: string;
  description: string;
};

export const BOOK_INDEX_INSIGHT_PAGES: readonly BookIndexInsightPageDefinition[] = [
  {
    slug: "cok-satanlara-yeni-girenler",
    key: "newEntries",
    eyebrow: "Çok Satanlara Yeni Girenler",
    heading: "Çok Satanlara Yeni Giren Kitaplar",
    searchTitle: "Çok Satanlara Yeni Giren Kitaplar",
    description:
      "Bir önceki başarılı snapshotta görünmeyip güncel çok satan listelerine yeni giren kitapları, kitap satış kanalı bilgileriyle inceleyin.",
  },
  {
    slug: "cok-satanlarda-yukselenler",
    key: "risers",
    eyebrow: "Çok Satanlarda Yükselenler",
    heading: "Çok Satan Listelerinde Yükselen Kitaplar",
    searchTitle: "Çok Satanlarda Yükselen Kitaplar",
    description:
      "Kitap satış kanalı listelerinde önceki başarılı snapshot'a göre sırası yükselen kitapları, toplam sıra kazanımı ve kitap satış kanalı sayısıyla inceleyin.",
  },
  {
    slug: "birden-fazla-listede-cok-satanlar",
    key: "everywhereSellers",
    eyebrow: "Birden Fazla Listede Çok Satanlar",
    heading: "Birden Fazla Listede Çok Satan Kitaplar",
    searchTitle: "Birden Fazla Listede Çok Satan Kitaplar",
    description:
      "Aynı anda en az üç kitap satış kanalında görünen çok satan kitapları karşılaştırın.",
  },
  {
    slug: "uzun-suredir-cok-satanlar",
    key: "longSellers",
    eyebrow: "Uzun Süredir Çok Satanlar",
    heading: "Uzun Süredir Çok Satan Kitaplar",
    searchTitle: "Uzun Süredir Çok Satan Kitaplar",
    description:
      "Çok satan listelerinde ilk ve son doğrulanmış gözlemi arasındaki süre en uzun olan kitapları tarihsel gözlem aralığıyla inceleyin.",
  },
] as const;

export function getBookIndexInsightPage(slug: string) {
  return BOOK_INDEX_INSIGHT_PAGES.find((page) => page.slug === slug) ?? null;
}

export function getBookIndexInsightItems(
  insights: BookIndexInsights,
  key: BookIndexInsightKey,
) {
  if (key === "longSellers") {
    return insights.longSellers.filter((item) => item.historyDays > 0);
  }
  return insights[key];
}

export function getPublishedBookIndexInsightPages(insights: BookIndexInsights) {
  return BOOK_INDEX_INSIGHT_PAGES.filter(
    (page) => getBookIndexInsightItems(insights, page.key).length > 0,
  );
}
