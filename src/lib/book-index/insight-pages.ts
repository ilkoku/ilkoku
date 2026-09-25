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
    slug: "yeni-girisler",
    key: "newEntries",
    eyebrow: "Yeni Girişler",
    heading: "Çok Satan Listelerine Yeni Giren Kitaplar",
    searchTitle: "Çok Satanlara Yeni Giren Kitaplar",
    description:
      "Bir önceki başarılı snapshotta görünmeyip güncel çok satan listelerine yeni giren kitapları, kaynak kanıtlarıyla inceleyin.",
  },
  {
    slug: "yukselenler",
    key: "risers",
    eyebrow: "Yükselenler",
    heading: "Çok Satan Listelerinde Yükselen Kitaplar",
    searchTitle: "Yükselen Kitaplar",
    description:
      "Birden fazla bağımsız kaynakta sırası yükselen kitapları, toplam sıra kazanımı ve kaynak sayısıyla inceleyin.",
  },
  {
    slug: "her-yerde-satanlar",
    key: "everywhereSellers",
    eyebrow: "Her Yerde Satanlar",
    heading: "Birden Fazla Kaynakta Çok Satan Kitaplar",
    searchTitle: "Birden Fazla Listede Çok Satan Kitaplar",
    description:
      "Aynı anda en az üç bağımsız Türkiye kaynağında görünen çok satan kitapları karşılaştırın.",
  },
  {
    slug: "uzun-satanlar",
    key: "longSellers",
    eyebrow: "Uzun Satanlar",
    heading: "Uzun Süredir Çok Satan Kitaplar",
    searchTitle: "Uzun Süredir Çok Satan Kitaplar",
    description:
      "Çok satan listelerinde en uzun süredir görünmeye devam eden kitapları tarihsel gözlem süresiyle inceleyin.",
  },
] as const;

export function getBookIndexInsightPage(slug: string) {
  return BOOK_INDEX_INSIGHT_PAGES.find((page) => page.slug === slug) ?? null;
}

export function getBookIndexInsightItems(
  insights: BookIndexInsights,
  key: BookIndexInsightKey,
) {
  return insights[key];
}

export function getPublishedBookIndexInsightPages(insights: BookIndexInsights) {
  return BOOK_INDEX_INSIGHT_PAGES.filter(
    (page) => getBookIndexInsightItems(insights, page.key).length > 0,
  );
}
