import {
  publicLegalLinks,
  publicPlatformLinks,
  publicTrustLinks,
} from "@/lib/public-site-navigation";

// Compatibility exports stay empty so older internal consumers cannot
// accidentally reintroduce the retired public discovery routes.
export const publicDiscoveryStaticIndexRoutes = [] as const;
export const publicPausedDiscoveryReservedRoutes = publicDiscoveryStaticIndexRoutes;

export const publicCodeOwnedIndexRoutes = [
  "/",
  "/yardim",
  "/editorler",
  "/iletisim",
] as const;

export const publicCmsManagedCoreRoutes = [
  ...publicPlatformLinks.map((link) => link.href),
  ...publicTrustLinks.map((link) => link.href),
  ...publicLegalLinks.map((link) => link.href),
] as readonly string[];

export const publicDefaultCoreSeoRoutes = Array.from(
  new Set<string>([
    ...publicCodeOwnedIndexRoutes,
    ...publicCmsManagedCoreRoutes,
  ]),
);
