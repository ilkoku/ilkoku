export type BookIndexMarket = "TR" | "US";
export type BookIndexSourcePhase = "v1" | "phase_2";
export type BookIndexCollectionState =
  | "planned"
  | "researching"
  | "ready"
  | "active"
  | "paused"
  | "blocked";

export type BookIndexSourceDefinition = {
  code: string;
  name: string;
  market: BookIndexMarket;
  countryCode: "TR" | "US";
  baseUrl: string;
  includeInTurkeyIndex: boolean;
  independenceGroup?: string;
  operatorName?: string;
  phase: BookIndexSourcePhase;
  collectionState: BookIndexCollectionState;
};

export const TURKEY_INDEX_MIN_SOURCES = 3;

export const BOOK_INDEX_SOURCES: readonly BookIndexSourceDefinition[] = [
  {
    code: "kitapyurdu",
    name: "Kitapyurdu",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.kitapyurdu.com",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "blocked",
  },
  {
    code: "bkm",
    name: "BKM Kitap",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.bkmkitap.com",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "ready",
    independenceGroup: "point-internet",
    operatorName: "Point İnternet Teknolojileri ve Lojistik A.Ş.",
  },
  {
    code: "dr",
    name: "D&R",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.dr.com.tr",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "blocked",
  },
  {
    code: "idefix",
    name: "idefix",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.idefix.com",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "ready",
  },
  {
    code: "penguen",
    name: "Penguen Kitabevi",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://penguenkitabevi.com",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "researching",
  },
  {
    code: "remzi",
    name: "Remzi Kitabevi",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.remzi.com.tr",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "ready",
  },
  {
    code: "amazon-tr",
    name: "Amazon Türkiye",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.amazon.com.tr",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "researching",
  },
  {
    code: "amazon-us",
    name: "Amazon ABD",
    market: "US",
    countryCode: "US",
    baseUrl: "https://www.amazon.com",
    includeInTurkeyIndex: false,
    phase: "v1",
    collectionState: "blocked",
  },
  {
    code: "kitapsepeti",
    name: "KitapSepeti",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.kitapsepeti.com",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "ready",
    independenceGroup: "point-internet",
    operatorName: "Point İnternet Teknolojileri ve Lojistik A.Ş.",
  },
  {
    code: "kitapsec",
    name: "KitapSeç",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.kitapsec.com",
    includeInTurkeyIndex: true,
    phase: "phase_2",
    collectionState: "ready",
  },
  {
    code: "kitapzen",
    name: "Kitapzen",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.kitapzen.com",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "ready",
  },
  {
    code: "inkilap",
    name: "İnkılâp Kitabevi",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.inkilap.com",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "ready",
  },
  {
    code: "illakitap",
    name: "İlla Kitap",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.illakitap.com",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "ready",
  },
  {
    code: "nobelkitap",
    name: "NobelKitap",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.nobelkitap.com",
    includeInTurkeyIndex: true,
    phase: "v1",
    collectionState: "ready",
  },
  {
    code: "hepsiburada",
    name: "Hepsiburada",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.hepsiburada.com",
    includeInTurkeyIndex: true,
    phase: "phase_2",
    collectionState: "blocked",
  },
  {
    code: "trendyol",
    name: "Trendyol",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.trendyol.com",
    includeInTurkeyIndex: true,
    phase: "phase_2",
    collectionState: "blocked",
  },
  {
    code: "pttavm",
    name: "PttAVM",
    market: "TR",
    countryCode: "TR",
    baseUrl: "https://www.pttavm.com",
    includeInTurkeyIndex: true,
    phase: "phase_2",
    collectionState: "blocked",
  },
] as const;

export const BOOK_INDEX_V1_SOURCES = BOOK_INDEX_SOURCES.filter(
  (source) => source.phase === "v1",
);

export const TURKEY_INDEX_V1_SOURCES = BOOK_INDEX_V1_SOURCES.filter(
  (source) => source.includeInTurkeyIndex,
);

export function getBookIndexSource(code: string) {
  return BOOK_INDEX_SOURCES.find((source) => source.code === code) ?? null;
}

export function getBookIndexSourceIndependenceGroup(code: string) {
  const source = getBookIndexSource(code);
  return source?.independenceGroup ?? source?.code ?? code;
}

export function getBookIndexSourceOperatorName(code: string) {
  const source = getBookIndexSource(code);
  return source?.operatorName ?? source?.name ?? code;
}
