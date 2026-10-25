import { hasPublishedEditorProfiles } from "@/features/editors/data";
import { isSoftLaunchSearchExcludedPath } from "@/lib/soft-launch-search-policy";
import {
  publicLegalLinks,
  publicPlatformLinks,
  publicTrustLinks,
} from "@/lib/public-site-navigation";

const publicCodeOwnedIndexCandidates = [
  "/",
  "/yardim",
  ...(hasPublishedEditorProfiles ? ["/editorler"] as const : []),
  "/iletisim",
  "/site-haritasi",
  "/okurlar-icin",
] as const;

export const publicCodeOwnedIndexRoutes = publicCodeOwnedIndexCandidates.filter(
  (route) => !isSoftLaunchSearchExcludedPath(route),
);

export const publicCmsManagedCoreRoutes = [
  ...publicPlatformLinks.map((link) => link.href),
  ...publicTrustLinks.map((link) => link.href),
  ...publicLegalLinks.map((link) => link.href),
].filter((route) => !isSoftLaunchSearchExcludedPath(route));

export const publicDefaultCoreSeoRoutes = Array.from(
  new Set<string>([
    ...publicCodeOwnedIndexRoutes,
    ...publicCmsManagedCoreRoutes,
  ]),
);
