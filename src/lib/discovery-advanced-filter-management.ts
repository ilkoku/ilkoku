import {
  clearDiscoveryAdvancedFilter,
  type DiscoveryAdvancedFilters,
} from "@/lib/discovery-advanced-filters";
import type { DiscoveryFilterId } from "@/lib/discovery-filter-registry";

export const discoveryAdvancedFilterIds = [
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
  "readingProgress",
  "readingState",
  "lastReadAt",
  "favoriteState",
  "country",
  "authorPublicWorkCount",
  "authorCompletedWorkCount",
  "authorReviewedWorkCount",
  "authorReaderCount",
  "authorFavoriteCount",
  "authorCommentCount",
] as const satisfies readonly DiscoveryFilterId[];

export function sanitizeDiscoveryAdvancedFilters(
  filters: DiscoveryAdvancedFilters,
  enabledFilterIds: ReadonlySet<DiscoveryFilterId>,
) {
  let sanitized = filters;

  for (const id of discoveryAdvancedFilterIds) {
    if (!enabledFilterIds.has(id)) {
      sanitized = clearDiscoveryAdvancedFilter(sanitized, id);
    }
  }

  return sanitized;
}
