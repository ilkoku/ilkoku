import "server-only";

import { cache } from "react";
import {
  editorNavigationContent,
  navigationContent,
  publisherNavigationContent,
  readerNavigationContent,
} from "@/content";
import { adminNavigation } from "@/lib/admin-navigation";
import {
  contractInboxPath,
  contractManagementPath,
  getRouteRoleRule,
  isAdminOnlyPath,
  isProtectedPath,
  matchesPath,
  publisherInvitationPath,
  publisherPath,
  systemManagementPath,
} from "@/lib/route-security";
import { systemMapSourceManifest } from "./runtime-manifest.generated";
import type {
  SystemMapAccessMode,
  SystemMapMenuReference,
  SystemMapRouteKind,
  SystemMapRouteRecord,
  SystemMapSnapshot,
  SystemMapWorkflow,
} from "./types";

type DetectedRoute = {
  kind: Exclude<SystemMapRouteKind, "alias">;
  route: string;
  sourceFile: string;
};

type ReferenceRecord = {
  origin: string;
  originRoute: string | null;
  target: string;
};

const workflows: SystemMapWorkflow[] = [
  {
    id: "auth-role",
    title: "Kayıt ve rol yolculuğu",
    description: "Yeni kullanıcının hesap oluşturmasından rol çalışma alanına ulaşmasına kadar olan ana kimlik akışı.",
    steps: ["/kayit", "/rol-secimi", "/okuyucu | /yazar | /editor | /yayinevi"],
  },
  {
    id: "reader",
    title: "Okuyucu yolculuğu",
    description: "Keşiften esere, bölüm okumaya ve tamamlanan eser arşivine giden akış.",
    steps: ["/okuyucu", "/kesfet", "/kitap/[slug]", "/oku/[slug]/...", "/tamamlanan-eserler"],
  },
  {
    id: "writer",
    title: "Yazar ve eser yayın akışı",
    description: "Yazar çalışma alanından eserin oluşturulması, bölüm yönetimi, yayın ve public eser yüzeyine uzanan akış.",
    steps: ["/yazar", "/eserlerim", "/eserlerim · NewWorkFlow bölüm/yayın çalışma alanı", "/kitap/[slug]"],
  },
  {
    id: "editor",
    title: "Editör inceleme akışı",
    description: "Genel havuzdan 1. editör ve 2. editör incelemesine, ardından tamamlanmış sonuca giden çalışma zinciri.",
    steps: ["/editor/talepler", "/editor/incelemeler?asama=birinci", "/editor/incelemeler?asama=ikinci", "/editor/incelemeler?durum=tamamlanan"],
  },
  {
    id: "publisher",
    title: "Yayınevi keşif ve operasyon akışı",
    description: "Yayınevi keşfi, başvuru, editör talebi, dosya ve yayın planı operasyonlarının çalışma düzeni.",
    steps: ["/yayinevi", "/yayinevi/kesfet/eserler", "/yayinevi/basvurular/[submissionId]", "/yayinevi/editor-talepleri", "/yayinevi/dosyalar"],
  },
  {
    id: "cms",
    title: "İçerik yayın akışı",
    description: "İçerik çalışma masasından taslak/yayın durumuna ve public İlkOku yüzeyine giden CMS zinciri.",
    steps: ["/icerik", "/icerik/ana-sayfa | /icerik/rol-kartlari | /icerik/menuler | /icerik/seo", "/"],
  },
  {
    id: "contracts",
    title: "Merkezi sözleşme akışı",
    description: "Admin şablonundan kullanıcı sözleşme kutusuna ve cevabın tekrar merkeze dönmesine kadar olan kanonik akış.",
    steps: [
      contractManagementPath,
      `${contractManagementPath}/sablonlar/yeni | ${contractManagementPath}/sablonlar/[templateId]`,
      contractInboxPath,
      `${contractInboxPath}/[contractId]`,
      contractManagementPath,
    ],
  },
  {
    id: "system",
    title: "Sistem yönetimi ve mimari izleme",
    description: "Admin operasyonları ile canlı route/bağlantı haritasını aynı güvenlik sınırı içinde izleyen yönetim katmanı.",
    steps: [systemManagementPath, "/harita", contractManagementPath],
  },
];

const publicApiPaths = [
  "/api/content-faq",
  "/api/media",
  "/api/public-announcements",
  "/api/site-contact",
  "/api/site-content",
] as const;

const cmsProtectedApiPaths = [
  "/api/cms-access-manage",
  "/api/cms-history",
  "/api/cms-media-upload",
  "/api/cms-seo-audit",
  "/api/cms-settings",
  "/api/content-notices",
  "/api/site-contact-manage",
] as const;

function canonicalShape(value: string) {
  return value
    .split(/[?#]/u)[0]
    .replace(/\[\[\.\.\.[^\]]+\]\]/gu, "[*]")
    .replace(/\[\.\.\.[^\]]+\]/gu, "[*]")
    .replace(/\[[^\]]+\]/gu, "[]")
    .replace(/\[param\]/gu, "[]")
    .replace(/\/$/u, "") || "/";
}

function referenceMatchesRoute(reference: string, route: string) {
  const referenceShape = canonicalShape(reference);
  const routeShape = canonicalShape(route);
  if (referenceShape === routeShape) return true;
  if (routeShape.includes("[*]")) {
    const prefix = routeShape.split("[*]")[0];
    return Boolean(prefix) && referenceShape.startsWith(prefix);
  }
  return false;
}

function menuReferences(): SystemMapMenuReference[] {
  const references: SystemMapMenuReference[] = [];
  const addMenu = (menuLabel: string, items: readonly { href?: string; label: string; type?: string }[]) => {
    for (const item of items) {
      if (!item.href) continue;
      references.push({ href: item.href, itemLabel: item.label, menuLabel });
    }
  };
  addMenu("Yazar menüsü", navigationContent.items);
  addMenu("Okuyucu menüsü", readerNavigationContent.items);
  addMenu("Editör menüsü", editorNavigationContent.items);
  addMenu("Yayınevi menüsü", publisherNavigationContent.items);
  addMenu("Sistem yönetimi menüsü", adminNavigation);
  return references;
}

function areaForRoute(route: string) {
  if (matchesPath(route, "/api")) return "API / Route Handler";
  if (matchesPath(route, "/harita")) return "Sistem Haritası";
  if (matchesPath(route, contractManagementPath) || matchesPath(route, contractInboxPath)) return "Sözleşme Yönetimi";
  if (matchesPath(route, "/admin") || matchesPath(route, systemManagementPath)) return "Sistem Yönetimi";
  if (matchesPath(route, "/icerik")) return "İçerik Yönetimi";
  if (matchesPath(route, "/yayinevi")) return "Yayınevi";
  if (matchesPath(route, "/editor")) return "Editör";
  if (["/yazar", "/eserlerim", "/yazmaya-devam", "/geri-bildirimler", "/yorumlarim", "/yayinevleri", "/sayfa-renkleri"].some((prefix) => matchesPath(route, prefix))) return "Yazar";
  if (["/okuyucu", "/kesfet", "/favorilerim", "/okumaya-devam", "/tamamlanan-eserler"].some((prefix) => matchesPath(route, prefix))) return "Okuyucu";
  if (["/giris", "/kayit", "/hesabim", "/rol-secimi", "/sifre-yenile", "/auth"].some((prefix) => matchesPath(route, prefix))) return "Kimlik / Hesap";
  if (["/kitap", "/oku", "/editorler", "/rehber", "/yasal"].some((prefix) => matchesPath(route, prefix))) return "Public İçerik";
  return "Genel";
}

function accessForRoute(route: string, kind: SystemMapRouteKind): {
  accessLabel: string;
  accessMode: SystemMapAccessMode;
  approvedRoleRequired: boolean;
  roles: string[];
} {
  if (isAdminOnlyPath(route)) {
    return { accessLabel: "Yalnız gerçek admin · proxy + server guard", accessMode: "admin", approvedRoleRequired: false, roles: ["admin"] };
  }
  if (matchesPath(route, "/icerik")) {
    return { accessLabel: "CMS erişim politikası · server-side yetki", accessMode: "authenticated", approvedRoleRequired: false, roles: ["admin", "content_manager"] };
  }
  if (matchesPath(route, publisherPath) && !matchesPath(route, publisherInvitationPath)) {
    return { accessLabel: "Aktif yayınevi üyeliği veya admin", accessMode: "publisher_membership", approvedRoleRequired: false, roles: ["publisher", "admin"] };
  }
  const roleRule = getRouteRoleRule(route);
  if (roleRule) {
    return {
      accessLabel: `${roleRule.roles.join(", ")}${roleRule.approved ? " · rol onayı gerekli" : ""}`,
      accessMode: "role",
      approvedRoleRequired: roleRule.approved,
      roles: roleRule.roles,
    };
  }
  if (isProtectedPath(route)) {
    return { accessLabel: "Oturum gerekli", accessMode: "authenticated", approvedRoleRequired: false, roles: [] };
  }
  if (kind === "handler" && matchesPath(route, "/api")) {
    if (matchesPath(route, "/api/admin")) {
      return { accessLabel: "Admin API · handler içi yetki kontrolü", accessMode: "admin", approvedRoleRequired: false, roles: ["admin"] };
    }
    if (publicApiPaths.some((prefix) => matchesPath(route, prefix))) {
      return { accessLabel: "Public API · yayınlanmış/public veri veya public form yüzeyi", accessMode: "public", approvedRoleRequired: false, roles: [] };
    }
    if (matchesPath(route, "/api/internal")) {
      return { accessLabel: "Internal API · bearer/secret guard", accessMode: "authenticated", approvedRoleRequired: false, roles: [] };
    }
    if (cmsProtectedApiPaths.some((prefix) => matchesPath(route, prefix))) {
      return { accessLabel: "CMS API · CMS erişimi + handler guard", accessMode: "authenticated", approvedRoleRequired: false, roles: ["admin", "content_manager"] };
    }
    return { accessLabel: "Route handler politikası · handler içinde doğrulanır", accessMode: "authenticated", approvedRoleRequired: false, roles: [] };
  }
  return { accessLabel: "Public", accessMode: "public", approvedRoleRequired: false, roles: [] };
}

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "tr"));
}

function equivalentRoutePaths(route: string) {
  if (route === "/admin") return [route, systemManagementPath];
  if (route.startsWith("/admin/")) return [route, `${systemManagementPath}${route.slice("/admin".length)}`];
  if (route === systemManagementPath) return [route, "/admin"];
  if (route.startsWith(`${systemManagementPath}/`)) return [route, `/admin${route.slice(systemManagementPath.length)}`];
  return [route];
}

function addSystemManagementAliases(routes: DetectedRoute[]) {
  const aliases: DetectedRoute[] = [];
  for (const route of routes) {
    if (!matchesPath(route.route, "/admin")) continue;
    aliases.push({
      kind: route.kind,
      route: route.route.replace(/^\/admin/u, systemManagementPath),
      sourceFile: `${route.sourceFile} · next.config.ts rewrite`,
    });
  }
  return [...routes, ...aliases];
}

function dedupeRoutes(routes: DetectedRoute[]) {
  const seen = new Map<string, DetectedRoute>();
  for (const route of routes) {
    const key = `${route.kind}:${route.route}`;
    if (!seen.has(key)) seen.set(key, route);
  }
  return [...seen.values()];
}

const entryPointRoutes = new Set([
  "/",
  "/giris",
  "/kayit",
  "/sifre-yenile",
  "/erisim-reddedildi",
  "/editor-daveti",
  "/robots.txt",
  "/sitemap.xml",
  "/harita",
  contractManagementPath,
]);

export const getSystemMapSnapshot = cache(async (): Promise<SystemMapSnapshot> => {
  const warnings: string[] = [];
  if (systemMapSourceManifest.version !== 1) {
    warnings.push(`Sistem haritası build manifest sürümü desteklenmiyor: ${systemMapSourceManifest.version}`);
  }
  if (systemMapSourceManifest.sourceFileCount === 0) {
    warnings.push("Sistem haritası build manifestinde kaynak dosya bulunamadı; envanter sınırlı.");
  }

  const sourceRoutes: DetectedRoute[] = systemMapSourceManifest.routes.map((route) => ({ ...route }));
  const references: ReferenceRecord[] = systemMapSourceManifest.references.map((reference) => ({ ...reference }));
  let detected = sourceRoutes;
  let scanMode: SystemMapSnapshot["scanMode"] = "source";

  if (detected.length === 0) {
    detected = [
      { kind: "page", route: "/", sourceFile: "fallback registry" },
      { kind: "page", route: "/harita", sourceFile: "fallback registry" },
      { kind: "page", route: contractManagementPath, sourceFile: "fallback registry" },
      { kind: "page", route: contractInboxPath, sourceFile: "fallback registry" },
      { kind: "page", route: systemManagementPath, sourceFile: "fallback registry" },
    ];
    scanMode = "fallback";
    warnings.push("Build-time kaynak manifesti boş; sınırlı fallback envanteri gösteriliyor.");
  }

  detected = dedupeRoutes(addSystemManagementAliases(detected));
  const menus = menuReferences();
  const records: SystemMapRouteRecord[] = detected.map((detectedRoute) => {
    const routePaths = equivalentRoutePaths(detectedRoute.route);
    const relatedMenus = menus.filter((menu) => routePaths.some((route) => referenceMatchesRoute(menu.href, route)));
    const inbound = unique(
      references
        .filter((reference) => routePaths.some((route) => referenceMatchesRoute(reference.target, route)))
        .map((reference) => reference.originRoute ?? reference.origin),
    );
    const outbound = unique(
      references
        .filter((reference) => reference.originRoute && routePaths.some((route) => referenceMatchesRoute(reference.originRoute ?? "", route)))
        .map((reference) => reference.target),
    );
    const access = accessForRoute(detectedRoute.route, detectedRoute.kind);
    const orphanCandidate =
      detectedRoute.kind === "page" &&
      !routePaths.some((route) => entryPointRoutes.has(route)) &&
      inbound.length === 0 &&
      relatedMenus.length === 0;

    return {
      ...access,
      area: areaForRoute(detectedRoute.route),
      dynamic: detectedRoute.route.includes("["),
      inbound,
      kind: detectedRoute.kind,
      menuReferences: relatedMenus,
      orphanCandidate,
      outbound,
      route: detectedRoute.route,
      sourceFile: detectedRoute.sourceFile,
    };
  });

  records.sort((left, right) => {
    const area = left.area.localeCompare(right.area, "tr");
    return area === 0 ? left.route.localeCompare(right.route, "tr") : area;
  });

  const stats = {
    adminOnly: records.filter((route) => route.accessMode === "admin").length,
    apiHandlers: records.filter((route) => route.kind === "handler").length,
    orphanCandidates: records.filter((route) => route.orphanCandidate).length,
    pages: records.filter((route) => route.kind === "page").length,
    protectedRoutes: records.filter((route) => route.accessMode !== "public").length,
    publicRoutes: records.filter((route) => route.accessMode === "public").length,
    total: records.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    routes: records,
    scanMode,
    stats,
    warnings,
    workflows,
  };
});
