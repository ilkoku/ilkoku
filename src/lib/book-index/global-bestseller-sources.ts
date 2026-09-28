export type GlobalBestsellerSourceStatus =
  | "verified_ranked_list"
  | "verified_bestseller_page"
  | "researching";

export type GlobalBestsellerSourceDefinition = {
  marketCode: "US" | "GB" | "DE" | "FR" | "ES" | "JP";
  marketName: string;
  sourceCode: string;
  sourceName: string;
  nativeLabel: string;
  sourceUrl: string | null;
  status: GlobalBestsellerSourceStatus;
  rankingBasis: string | null;
};

export const GLOBAL_BESTSELLER_SOURCES: readonly GlobalBestsellerSourceDefinition[] = [
  {
    marketCode: "US",
    marketName: "Amerika Birleşik Devletleri",
    sourceCode: "publishers-weekly-us",
    sourceName: "Publishers Weekly",
    nativeLabel: "Top 10 Overall",
    sourceUrl: "https://www.publishersweekly.com/pw/nielsen/",
    status: "verified_ranked_list",
    rankingBasis: "Publishers Weekly bestseller charts",
  },
  {
    marketCode: "GB",
    marketName: "Birleşik Krallık",
    sourceCode: "the-bookseller-uk",
    sourceName: "The Bookseller",
    nativeLabel: "Bestsellers",
    sourceUrl: "https://www.thebookseller.com/bestsellers",
    status: "verified_ranked_list",
    rankingBasis: "Nielsen BookScan weekly print bestseller data",
  },
  {
    marketCode: "DE",
    marketName: "Almanya",
    sourceCode: "spiegel-de",
    sourceName: "SPIEGEL",
    nativeLabel: "SPIEGEL-Bestseller",
    sourceUrl: "https://shop.spiegel.de/buecher/spiegel-bestseller/",
    status: "verified_ranked_list",
    rankingBasis: "BuchMarkt and media control for the German book market",
  },
  {
    marketCode: "FR",
    marketName: "Fransa",
    sourceCode: "fnac-fr",
    sourceName: "Fnac",
    nativeLabel: "Meilleures ventes Livre",
    sourceUrl: "https://www.fnac.com/l898/Meilleures-ventes-Livre",
    status: "verified_bestseller_page",
    rankingBasis: "Fnac native book bestseller page; rank extraction still to verify",
  },
  {
    marketCode: "ES",
    marketName: "İspanya",
    sourceCode: "casa-del-libro-es",
    sourceName: "Casa del Libro",
    nativeLabel: "Libros más vendidos",
    sourceUrl: "https://www.casadellibro.com/libros-mas-vendidos",
    status: "verified_bestseller_page",
    rankingBasis: "Casa del Libro native weekly bestseller sections; rank extraction still to verify",
  },
  {
    marketCode: "JP",
    marketName: "Japonya",
    sourceCode: "kinokuniya-jp",
    sourceName: "Kinokuniya",
    nativeLabel: "ベストセラー 総合",
    sourceUrl: "https://www.kinokuniya.co.jp/disp/CKnRankingPageCList.jsp?dispNo=107002001001",
    status: "verified_ranked_list",
    rankingBasis: "Combined domestic-store, web-store and app-store sales",
  },
] as const;

export function getVerifiedGlobalRankedSources() {
  return GLOBAL_BESTSELLER_SOURCES.filter(
    (source) => source.status === "verified_ranked_list",
  );
}

export function validateGlobalBestsellerSourceRegistry() {
  const seenSources = new Set<string>();
  const seenMarkets = new Set<string>();

  for (const source of GLOBAL_BESTSELLER_SOURCES) {
    if (seenSources.has(source.sourceCode)) {
      throw new Error(`BOOK_INDEX_GLOBAL_DUPLICATE_SOURCE:${source.sourceCode}`);
    }

    if (seenMarkets.has(source.marketCode)) {
      throw new Error(`BOOK_INDEX_GLOBAL_DUPLICATE_PRIMARY_MARKET:${source.marketCode}`);
    }

    if (source.status !== "researching" && !source.sourceUrl) {
      throw new Error(`BOOK_INDEX_GLOBAL_VERIFIED_URL_MISSING:${source.sourceCode}`);
    }

    seenSources.add(source.sourceCode);
    seenMarkets.add(source.marketCode);
  }
}
