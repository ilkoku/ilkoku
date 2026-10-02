import { hasPublishedEditorProfiles } from "@/features/editors/data";
import {
  publicLegalLinks,
  publicPlatformLinks,
  publicTrustLinks,
} from "@/lib/public-site-navigation";

export const publicCodeOwnedIndexRoutes = [
  "/",
  "/yardim",
  ...(hasPublishedEditorProfiles ? ["/editorler"] as const : []),
  "/iletisim",
  "/site-haritasi",
  "/okurlar-icin",
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
