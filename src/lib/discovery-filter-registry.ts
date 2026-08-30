import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";

export type DiscoveryPoolKind = "work" | "author" | "mixed";
export type DiscoveryRole = "reader" | "editor" | "publisher";
export type DiscoveryRelationship =
  | "none"
  | "reader_favorite"
  | "reading_in_progress"
  | "reading_completed"
  | "editor_favorite"
  | "editor_completed_review"
  | "publisher_like"
  | "publisher_favorite"
  | "publisher_follow"
  | "publisher_share";

export type DiscoveryFilterId =
  | "search"
  | "genre"
  | "contentRating"
  | "reviewStatus"
  | "sort"
  | "language"
  | "wordCount"
  | "city"
  | "entityKind"
  | "unreadOnly";

export type DiscoverySurface = {
  id: string;
  label: string;
  role: DiscoveryRole;
  pool: DiscoveryPoolKind;
  route: string;
  filters: readonly DiscoveryFilterId[];
  relationship: DiscoveryRelationship;
  pageSize: number;
  note: string;
};

export const discoveryRoleLabels: Record<DiscoveryRole, string> = {
  reader: "Okur",
  editor: "Editör",
  publisher: "Yayınevi",
};

export const discoveryPoolLabels: Record<DiscoveryPoolKind, string> = {
  work: "Eser Havuzu",
  author: "Yazar Havuzu",
  mixed: "Eser + Yazar Havuzu",
};

export const discoveryFilterLabels: Record<DiscoveryFilterId, string> = {
  search: "Arama",
  genre: "Tür",
  contentRating: "Hitap yaşı",
  reviewStatus: "Editör durumu",
  sort: "Sıralama",
  language: "Dil",
  wordCount: "Kelime sayısı",
  city: "Şehir",
  entityKind: "Kayıt türü",
  unreadOnly: "Okunma durumu",
};

export const discoveryRelationshipLabels: Record<DiscoveryRelationship, string> = {
  none: "Doğrudan havuz",
  reader_favorite: "Havuz + okur favorisi",
  reading_in_progress: "Havuz + okuma ilerlemesi",
  reading_completed: "Havuz + tamamlanan okuma",
  editor_favorite: "Havuz + editör favorisi",
  editor_completed_review: "Havuz + tamamlanan editör incelemesi",
  publisher_like: "Havuz + yayınevi beğenisi",
  publisher_favorite: "Havuz + yayınevi favorisi",
  publisher_follow: "Havuz + yayınevi takibi",
  publisher_share: "Havuz + ekip paylaşımı",
};

const readerWorkFilters = [
  "search",
  "genre",
  "contentRating",
  "reviewStatus",
  "sort",
] as const satisfies readonly DiscoveryFilterId[];

const readerAuthorFilters = [
  "search",
  "genre",
  "contentRating",
  "reviewStatus",
  "sort",
] as const satisfies readonly DiscoveryFilterId[];

const publisherWorkCollectionFilters = [
  "search",
  "genre",
  "contentRating",
  "reviewStatus",
] as const satisfies readonly DiscoveryFilterId[];

const publisherAuthorCollectionFilters = [
  "search",
  "genre",
  "contentRating",
  "city",
] as const satisfies readonly DiscoveryFilterId[];

export const discoverySurfaces: readonly DiscoverySurface[] = [
  {
    id: "reader-work-discovery",
    label: "Eser Keşfet",
    role: "reader",
    pool: "work",
    route: "/kesfet",
    filters: readerWorkFilters,
    relationship: "none",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Okurun ortak public eser havuzunu keşfettiği ana masa.",
  },
  {
    id: "reader-author-discovery",
    label: "Yazar Keşfet",
    role: "reader",
    pool: "author",
    route: "/yazar-kesfet",
    filters: readerAuthorFilters,
    relationship: "none",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Yazarlar, görünür public eserleri üzerinden ortak yazar havuzundan türetilir.",
  },
  {
    id: "reader-favorite-works",
    label: "Favorilerim · Eserler",
    role: "reader",
    pool: "work",
    route: "/favorilerim",
    filters: readerWorkFilters,
    relationship: "reader_favorite",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Yeni eser havuzu oluşturmaz; okurun favori ilişkisini eser havuzuna uygular.",
  },
  {
    id: "reader-favorite-authors",
    label: "Favorilerim · Yazarlar",
    role: "reader",
    pool: "author",
    route: "/favorilerim?tip=yazar",
    filters: readerAuthorFilters,
    relationship: "reader_favorite",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Favori yazar ilişkisi ortak yazar havuzu üzerinde çalışır.",
  },
  {
    id: "reader-continue-reading",
    label: "Okumaya Devam",
    role: "reader",
    pool: "work",
    route: "/okumaya-devam",
    filters: readerWorkFilters,
    relationship: "reading_in_progress",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Okuma ilerlemesi bulunan eserler ortak eser havuzundan çağrılır.",
  },
  {
    id: "reader-completed-works",
    label: "Tamamlanan Eserler",
    role: "reader",
    pool: "work",
    route: "/tamamlanan-eserler",
    filters: readerWorkFilters,
    relationship: "reading_completed",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Tamamlanan okuma ilişkisi eser havuzunun üzerinde bir görünüm oluşturur.",
  },
  {
    id: "editor-work-discovery",
    label: "Editör Keşfet · Eserler",
    role: "editor",
    pool: "work",
    route: "/editor/kesfet",
    filters: ["genre", "contentRating", "language", "wordCount", "reviewStatus"],
    relationship: "none",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Editör aynı eser havuzunu editoryal karar filtreleriyle çağırır.",
  },
  {
    id: "editor-author-discovery",
    label: "Editör Keşfet · Yazarlar",
    role: "editor",
    pool: "author",
    route: "/editor/yazarlar",
    filters: ["search", "genre", "contentRating", "city"],
    relationship: "none",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Editör, public eseri bulunan aktif yazarları ortak yazar havuzundan görür.",
  },
  {
    id: "editor-favorites",
    label: "Editör Favorilerim",
    role: "editor",
    pool: "work",
    route: "/editor/favoriler",
    filters: ["search", "genre", "contentRating", "reviewStatus"],
    relationship: "editor_favorite",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Editör favorisi, eser havuzunun üzerine eklenen kişisel ilişkidir.",
  },
  {
    id: "editor-selections",
    label: "Editör Seçkilerim",
    role: "editor",
    pool: "work",
    route: "/editor/seckiler",
    filters: ["search", "genre", "contentRating"],
    relationship: "editor_completed_review",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Tamamlanan profesyonel incelemeler ortak eser havuzu içinde bir koleksiyondur.",
  },
  {
    id: "publisher-work-discovery",
    label: "Yayınevi Keşfet · Eserler",
    role: "publisher",
    pool: "work",
    route: "/yayinevi/kesfet/eserler",
    filters: ["search", "genre", "contentRating", "language", "reviewStatus", "sort"],
    relationship: "none",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Yayınevi aynı eser havuzunu kurumsal keşif ihtiyaçlarına göre daraltır.",
  },
  {
    id: "publisher-author-discovery",
    label: "Yayınevi Keşfet · Yazarlar",
    role: "publisher",
    pool: "author",
    route: "/yayinevi/kesfet/yazarlar",
    filters: publisherAuthorCollectionFilters,
    relationship: "none",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Yayınevi yazar keşfi ortak yazar havuzundan beslenir.",
  },
  {
    id: "publisher-liked-works",
    label: "Yayınevi Beğendiklerim · Eserler",
    role: "publisher",
    pool: "work",
    route: "/yayinevi/begenilerim",
    filters: publisherWorkCollectionFilters,
    relationship: "publisher_like",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Kurumsal beğeni, ortak eser havuzunda tutulan ilişki görünümüdür.",
  },
  {
    id: "publisher-liked-authors",
    label: "Yayınevi Beğendiklerim · Yazarlar",
    role: "publisher",
    pool: "author",
    route: "/yayinevi/begenilerim?tip=yazar",
    filters: publisherAuthorCollectionFilters,
    relationship: "publisher_like",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Kurumsal yazar beğenisi ortak yazar havuzuna uygulanır.",
  },
  {
    id: "publisher-favorite-works",
    label: "Yayınevi Favorilerim · Eserler",
    role: "publisher",
    pool: "work",
    route: "/yayinevi/favorilerim",
    filters: publisherWorkCollectionFilters,
    relationship: "publisher_favorite",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Kurumsal favori, ortak eser havuzundan türetilir.",
  },
  {
    id: "publisher-favorite-authors",
    label: "Yayınevi Favorilerim · Yazarlar",
    role: "publisher",
    pool: "author",
    route: "/yayinevi/favorilerim?tip=yazar",
    filters: publisherAuthorCollectionFilters,
    relationship: "publisher_favorite",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Kurumsal yazar favorisi ortak yazar havuzundan türetilir.",
  },
  {
    id: "publisher-following-authors",
    label: "Yayınevi Takip Ettiklerim",
    role: "publisher",
    pool: "author",
    route: "/yayinevi/takip-ettiklerim",
    filters: publisherAuthorCollectionFilters,
    relationship: "publisher_follow",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Takip ilişkisi ortak yazar havuzunun üzerine uygulanır.",
  },
  {
    id: "publisher-shared-items",
    label: "Yayınevi Benimle Paylaşılanlar",
    role: "publisher",
    pool: "mixed",
    route: "/yayinevi/paylasilanlar",
    filters: ["search", "entityKind", "unreadOnly"],
    relationship: "publisher_share",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Paylaşım kaydı yalnız ortak eser/yazar havuzunda hâlâ görünür olan hedefleri gösterir.",
  },
] as const;

export const discoverySecurityLocks = [
  "Eser yalnız yayımlanmış, public ve arşivlenmemişse Eser Havuzu'na girer.",
  "Eser sahibinin aktif ve silinmemiş bir Yazar hesabı olması gerekir.",
  "Yazar Havuzu yalnız ortak Eser Havuzu'nda en az bir görünür eseri bulunan aktif yazarları içerir.",
  "18+ içerik aynı havuzda kalır; görünürlük yalnız yaş doğrulaması ve açık yetişkin içerik onayıyla açılır.",
  "Filtreleme Merkezi bu güvenlik sınırlarını gösterir; buradan gevşetmez veya kapatmaz.",
] as const;

export function discoveryRegistryDiagnostics() {
  const ids = new Set<string>();
  const routes = new Set<string>();
  const duplicateIds: string[] = [];
  const wrongPageSize: string[] = [];

  for (const surface of discoverySurfaces) {
    if (ids.has(surface.id)) duplicateIds.push(surface.id);
    ids.add(surface.id);
    routes.add(surface.route.split("?")[0] ?? surface.route);
    if (surface.pageSize !== DISCOVERY_PAGE_SIZE) wrongPageSize.push(surface.id);
  }

  return {
    duplicateIds,
    wrongPageSize,
    routeCount: routes.size,
    surfaceCount: discoverySurfaces.length,
    standardPageSize: DISCOVERY_PAGE_SIZE,
  };
}
