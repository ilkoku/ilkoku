import {
  publicLegalLinks,
  publicPlatformLinks,
  publicTrustLinks,
} from "@/lib/public-site-navigation";

export const publicCodeOwnedIndexRoutes = [
  "/",
  "/eserler",
  "/eserler/yeni",
  "/eserler/guncellenen",
  "/yazarlar",
  "/turler",
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
