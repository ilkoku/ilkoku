import type { UserRole } from "@/features/auth/types";

export const legacyAdminPath = "/admin";
export const systemManagementPath = "/sistem-yonetimi";
export const systemMapPath = "/harita";
export const contractManagementPath = "/sozlesme";
export const contractInboxPath = "/sozlesmelerim";
export const publisherPath = "/yayinevi";
export const publisherInvitationPath = "/yayinevi/davet";

export interface RouteRoleRule {
  approved: boolean;
  path: string;
  roles: UserRole[];
}

export const adminOnlyPaths = [
  legacyAdminPath,
  systemManagementPath,
  systemMapPath,
  contractManagementPath,
] as const;

export const protectedPaths = [
  ...adminOnlyPaths,
  contractInboxPath,
  "/hesabim",
  "/editor",
  "/favorilerim",
  "/bildirimler",
  "/kesfet",
  "/okuyucu",
  "/okumaya-devam",
  "/oku",
  "/tamamlanan-eserler",
  "/yazar",
  "/eserlerim",
  "/yazmaya-devam",
  "/geri-bildirimler",
  "/yorumlarim",
  "/yayinevleri",
  "/sayfa-renkleri",
  "/yayinevi",
  "/rol-secimi",
] as const;

export const routeRoleRules: RouteRoleRule[] = [
  { approved: false, path: "/favorilerim", roles: ["reader", "editor_pending"] },
  {
    approved: false,
    path: "/bildirimler",
    roles: ["reader", "writer", "editor_pending", "editor", "publisher"],
  },
  { approved: false, path: "/kesfet", roles: ["reader", "editor_pending"] },
  { approved: false, path: "/okuyucu", roles: ["reader", "editor_pending"] },
  { approved: false, path: "/okumaya-devam", roles: ["reader", "editor_pending"] },
  { approved: false, path: "/tamamlanan-eserler", roles: ["reader", "editor_pending"] },
  { approved: false, path: "/yazar", roles: ["writer"] },
  { approved: false, path: "/eserlerim", roles: ["writer"] },
  { approved: false, path: "/yazmaya-devam", roles: ["writer"] },
  { approved: false, path: "/geri-bildirimler", roles: ["writer"] },
  { approved: false, path: "/yorumlarim", roles: ["writer"] },
  { approved: false, path: "/yayinevleri", roles: ["writer"] },
  { approved: false, path: "/sayfa-renkleri", roles: ["writer"] },
  { approved: true, path: "/editor", roles: ["editor"] },
];

export function matchesPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function isProtectedPath(pathname: string) {
  return protectedPaths.some((path) => matchesPath(pathname, path));
}

export function getRouteRoleRule(pathname: string) {
  return routeRoleRules.find(({ path }) => matchesPath(pathname, path));
}

export function isAdminOnlyPath(pathname: string) {
  return adminOnlyPaths.some((path) => matchesPath(pathname, path));
}

export function adminAccessSource(pathname: string) {
  if (matchesPath(pathname, systemMapPath)) return "system_map";
  if (matchesPath(pathname, contractManagementPath)) return "contract_management";
  return "system_management";
}
