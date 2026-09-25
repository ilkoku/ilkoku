export type BookIndexSponsorSurface =
  | "general"
  | "category"
  | "source";

export type BookIndexSponsorSlotDefinition = {
  code: string;
  surface: BookIndexSponsorSurface;
  enabledByDefault: false;
  affectsOrganicRank: false;
  takesOrganicRankNumber: false;
  managementSurface: "banner-advertising";
};

export const BOOK_INDEX_SPONSOR_SLOTS: readonly BookIndexSponsorSlotDefinition[] = [
  {
    code: "book-index-general-sponsor",
    surface: "general",
    enabledByDefault: false,
    affectsOrganicRank: false,
    takesOrganicRankNumber: false,
    managementSurface: "banner-advertising",
  },
  {
    code: "book-index-category-sponsor",
    surface: "category",
    enabledByDefault: false,
    affectsOrganicRank: false,
    takesOrganicRankNumber: false,
    managementSurface: "banner-advertising",
  },
  {
    code: "book-index-source-sponsor",
    surface: "source",
    enabledByDefault: false,
    affectsOrganicRank: false,
    takesOrganicRankNumber: false,
    managementSurface: "banner-advertising",
  },
] as const;

export function getBookIndexSponsorSlot(code: string) {
  return BOOK_INDEX_SPONSOR_SLOTS.find((slot) => slot.code === code) ?? null;
}
