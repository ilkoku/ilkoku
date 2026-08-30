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
  | "unreadOnly"
  | "author"
  | "completionStatus"
  | "chapterCount"
  | "readerCount"
  | "favoriteCount"
  | "commentCount"
  | "hasPassport"
  | "versionCount"
  | "publishedAt"
  | "updatedAt"
  | "readingProgress"
  | "readingState"
  | "lastReadAt"
  | "favoriteState"
  | "country"
  | "authorPublicWorkCount"
  | "authorCompletedWorkCount"
  | "authorReviewedWorkCount"
  | "authorReaderCount"
  | "authorFavoriteCount"
  | "authorCommentCount";

export type DiscoverySurface = {
  id: string;
  label: string;
  role: DiscoveryRole;
  pool: DiscoveryPoolKind;
  route: string;
  /** Kod varsayılanı: kullanıcı özellikle değiştirmedikçe açık kalan mevcut filtreler. */
  filters: readonly DiscoveryFilterId[];
  /** + Ekle kataloğu: bu yüzeyde güvenli ve anlamlı biçimde kullanılabilen tüm filtreler. */
  availableFilters: readonly DiscoveryFilterId[];
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
  unreadOnly: "Paylaşım okunma durumu",
  author: "Yazar",
  completionStatus: "Eser tamamlanma durumu",
  chapterCount: "Bölüm sayısı",
  readerCount: "Okur sayısı",
  favoriteCount: "Favori / beğeni sayısı",
  commentCount: "Yorum sayısı",
  hasPassport: "Eser Pasaportu",
  versionCount: "Versiyon sayısı",
  publishedAt: "Yayımlanma tarihi",
  updatedAt: "Son güncelleme tarihi",
  readingProgress: "Okuma ilerlemesi",
  readingState: "Eser okuma durumu",
  lastReadAt: "Son okuma tarihi",
  favoriteState: "Favori durumu",
  country: "Ülke",
  authorPublicWorkCount: "Yazar public eser sayısı",
  authorCompletedWorkCount: "Yazar tamamlanan eser sayısı",
  authorReviewedWorkCount: "Yazar editörden geçen eser sayısı",
  authorReaderCount: "Yazar toplam okur sayısı",
  authorFavoriteCount: "Yazar toplam favori sayısı",
  authorCommentCount: "Yazar toplam yorum sayısı",
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

const readerWorkAvailableFilters = [
  ...readerWorkFilters,
  "author",
  "language",
  "wordCount",
  "completionStatus",
  "chapterCount",
  "readerCount",
  "favoriteCount",
  "commentCount",
  "hasPassport",
  "versionCount",
  "publishedAt",
  "updatedAt",
  "readingProgress",
  "readingState",
  "lastReadAt",
  "favoriteState",
] as const satisfies readonly DiscoveryFilterId[];

const readerAuthorFilters = [
  "search",
  "genre",
  "contentRating",
  "reviewStatus",
  "sort",
] as const satisfies readonly DiscoveryFilterId[];

const authorAvailableFilters = [
  "search",
  "genre",
  "contentRating",
  "reviewStatus",
  "sort",
  "city",
  "country",
  "authorPublicWorkCount",
  "authorCompletedWorkCount",
  "authorReviewedWorkCount",
  "authorReaderCount",
  "authorFavoriteCount",
  "authorCommentCount",
] as const satisfies readonly DiscoveryFilterId[];

const editorWorkFilters = [
  "genre",
  "contentRating",
  "language",
  "wordCount",
  "reviewStatus",
] as const satisfies readonly DiscoveryFilterId[];

const editorWorkAvailableFilters = [
  ...editorWorkFilters,
  "search",
  "author",
  "completionStatus",
  "chapterCount",
  "readerCount",
  "favoriteCount",
  "commentCount",
  "hasPassport",
  "versionCount",
  "publishedAt",
  "updatedAt",
] as const satisfies readonly DiscoveryFilterId[];

const editorCollectionWorkAvailableFilters = [
  "search",
  "genre",
  "contentRating",
  "reviewStatus",
  "language",
  "wordCount",
  "author",
  "completionStatus",
  "chapterCount",
  "readerCount",
  "favoriteCount",
  "commentCount",
  "hasPassport",
  "versionCount",
  "publishedAt",
  "updatedAt",
] as const satisfies readonly DiscoveryFilterId[];

const publisherWorkCollectionFilters = [
  "search",
  "genre",
  "contentRating",
  "reviewStatus",
] as const satisfies readonly DiscoveryFilterId[];

const publisherWorkAvailableFilters = [
  "search",
  "genre",
  "contentRating",
  "language",
  "reviewStatus",
  "sort",
  "wordCount",
  "author",
  "completionStatus",
  "chapterCount",
  "readerCount",
  "favoriteCount",
  "commentCount",
  "hasPassport",
  "versionCount",
  "publishedAt",
  "updatedAt",
] as const satisfies readonly DiscoveryFilterId[];

const publisherWorkCollectionAvailableFilters = [
  ...publisherWorkCollectionFilters,
  "language",
  "wordCount",
  "author",
  "completionStatus",
  "chapterCount",
  "readerCount",
  "favoriteCount",
  "commentCount",
  "hasPassport",
  "versionCount",
  "publishedAt",
  "updatedAt",
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
    availableFilters: readerWorkAvailableFilters,
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
    availableFilters: authorAvailableFilters,
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
    availableFilters: readerWorkAvailableFilters,
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
    availableFilters: authorAvailableFilters,
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
    availableFilters: readerWorkAvailableFilters,
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
    availableFilters: readerWorkAvailableFilters,
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
    filters: editorWorkFilters,
    availableFilters: editorWorkAvailableFilters,
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
    availableFilters: authorAvailableFilters,
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
    availableFilters: editorCollectionWorkAvailableFilters,
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
    availableFilters: editorCollectionWorkAvailableFilters,
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
    availableFilters: publisherWorkAvailableFilters,
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
    availableFilters: authorAvailableFilters,
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
    availableFilters: publisherWorkCollectionAvailableFilters,
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
    availableFilters: authorAvailableFilters,
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
    availableFilters: publisherWorkCollectionAvailableFilters,
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
    availableFilters: authorAvailableFilters,
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
    availableFilters: authorAvailableFilters,
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
    availableFilters: ["search", "entityKind", "unreadOnly"],
    relationship: "publisher_share",
    pageSize: DISCOVERY_PAGE_SIZE,
    note: "Paylaşım kaydı yalnız ortak eser/yazar havuzunda hâlâ görünür olan hedefleri gösterir.",
  },
] as const;

export const discoveryNonAddableSiteFilters = [
  {
    label: "Eser durumu",
    reason: "Eser Havuzu yalnız yayımlanmış eserlerden oluşur; taslak/arşiv durumu keşif filtresiyle gevşetilemez.",
  },
  {
    label: "Görünürlük",
    reason: "Eser Havuzu yalnız public eserlerden oluşur; özel/liste dışı içerik keşif filtresiyle açılamaz.",
  },
  {
    label: "İnceleme aşaması (1. / 2. Editör)",
    reason: "Bu bir editör iş kuyruğu filtresidir; keşif havuzundan ayrı operasyon standardında kalır.",
  },
  {
    label: "İnceleme çalışma durumu (aktif / tamamlanan)",
    reason: "Bu bir editör iş kuyruğu filtresidir; keşif havuzundan ayrı operasyon standardında kalır.",
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
  const invalidDefaults: string[] = [];

  for (const surface of discoverySurfaces) {
    if (ids.has(surface.id)) duplicateIds.push(surface.id);
    ids.add(surface.id);
    routes.add(surface.route.split("?")[0] ?? surface.route);
    if (surface.pageSize !== DISCOVERY_PAGE_SIZE) wrongPageSize.push(surface.id);
    if (surface.filters.some((filter) => !surface.availableFilters.includes(filter))) {
      invalidDefaults.push(surface.id);
    }
  }

  return {
    duplicateIds,
    invalidDefaults,
    wrongPageSize,
    routeCount: routes.size,
    surfaceCount: discoverySurfaces.length,
    standardPageSize: DISCOVERY_PAGE_SIZE,
  };
}
