import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
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

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "src", "app");
const REFERENCE_DIRS = [
  path.join(ROOT, "src", "app"),
  path.join(ROOT, "src", "components"),
  path.join(ROOT, "src", "content"),
  path.join(ROOT, "src", "features"),
  path.join(ROOT, "src", "lib"),
];

const sourceRouteFilePattern = /\/(page|route)\.(?:ts|tsx|js|jsx)$/u;
const sourceCodeFilePattern = /\.(?:ts|tsx|js|jsx)$/u;
const internalLiteralPattern = /(["'`])(\/(?!\/)[^"'`\r\n]{0,240})\1/gu;
const ignoredReferencePattern = /\.(?:css|gif|ico|jpe?g|json|map|pdf|png|svg|webp|woff2?)(?:\?|#|$)/iu;

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
    steps: ["/yazar", "/eserlerim", "/eserlerim/[workId]", "yayın işlemi", "/kitap/[slug]"],
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
    steps: ["/icerik", "CMS çalışma masaları", "yayın", "/ + public içerik route'ları"],
  },
  {
    id: "contracts",
    title: "Merkezi sözleşme akışı",
    description: "Admin şablonundan kullanıcı sözleşme kutusuna ve cevabın tekrar merkeze dönmesine kadar olan kanonik akış.",
    steps: [contractManagementPath, `${contractManagementPath}/sablonlar`, "rol + kullanıcı seçimi", contractInboxPath, "kabul / ret", contractManagementPath],
  },
  {
    id: "system",
    title: "Sistem yönetimi ve mimari izleme",
    description: "Admin operasyonları ile canlı route/bağlantı haritasını aynı güvenlik sınırı içinde izleyen yönetim katmanı.",
    steps: [systemManagementPath, "/harita", contractManagementPath],
  },
];

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      files.push(...(await walk(absolute)));
      continue;
    }

    if (entry.isFile()) files.push(absolute);
  }

  return files;
}

function cleanRouteSegments(segments: string[]) {
  return segments.filter((segment) => {
    if (!segment) return false;
    if (/^\(.*\)$/u.test(segment)) return false;
    if (segment.startsWith("@")) return false;
    return true;
  });
}

function routeFromAppSourceFile(filePath: string): string | null {
  const normalized = filePath.replaceAll("\\", "/");
  const marker = "/src/app/";
  const markerIndex = normalized.indexOf(marker);

  if (markerIndex < 0 || !sourceRouteFilePattern.test(normalized)) {
    return null;
  }

  const relative = normalized.slice(markerIndex + marker.length);
  const segments = relative.split("/");
  segments.pop();
  const cleaned = cleanRouteSegments(segments);

  return cleaned.length > 0 ? `/${cleaned.join("/")}` : "/";
}

function kindFromSourceFile(filePath: string): DetectedRoute["kind"] {
  return /\/route\.(?:ts|tsx|js|jsx)$/u.test(filePath.replaceAll("\\", "/"))
    ? "handler"
    : "page";
}

function normalizeManifestRoute(key: string) {
  const segments = key
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean);
  const last = segments.at(-1);

  if (last === "page" || last === "route") segments.pop();

  const cleaned = cleanRouteSegments(segments);
  if (cleaned[0] === "_not-found") return null;
  return cleaned.length > 0 ? `/${cleaned.join("/")}` : "/";
}

async function detectSourceRoutes(): Promise<DetectedRoute[]> {
  const files = await walk(APP_DIR);

  return files
    .filter((file) => sourceRouteFilePattern.test(file.replaceAll("\\", "/")))
    .map((file) => ({
      kind: kindFromSourceFile(file),
      route: routeFromAppSourceFile(file) ?? "/",
      sourceFile: path.relative(ROOT, file).replaceAll("\\", "/"),
    }));
}

async function detectBuildRoutes(): Promise<DetectedRoute[]> {
  const candidates = [
    path.join(ROOT, ".next", "server", "app-paths-manifest.json"),
    path.join(ROOT, ".next", "server", "app", "app-paths-manifest.json"),
  ];

  for (const manifestPath of candidates) {
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, string>;
      const routes: DetectedRoute[] = [];

      for (const [key, value] of Object.entries(manifest)) {
        const route = normalizeManifestRoute(key);
        if (!route) continue;
        routes.push({
          kind: key.endsWith("/route") ? "handler" : "page",
          route,
          sourceFile: `.next manifest → ${value}`,
        });
      }

      if (routes.length > 0) return routes;
    } catch {
      // Bir sonraki manifest adayı denenir.
    }
  }

  return [];
}

function normalizeInternalReference(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/_next") || ignoredReferencePattern.test(trimmed)) return null;

  return trimmed
    .replace(/\$\{[^}]+\}/gu, "[param]")
    .replace(/\s+/gu, "")
    .slice(0, 240);
}

async function detectReferences(): Promise<ReferenceRecord[]> {
  const files = (
    await Promise.all(
      REFERENCE_DIRS.map(async (directory) => {
        try {
          return await walk(directory);
        } catch {
          return [];
        }
      }),
    )
  )
    .flat()
    .filter((file) => sourceCodeFilePattern.test(file));

  const references: ReferenceRecord[] = [];

  for (const file of files) {
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch {
      continue;
    }

    internalLiteralPattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = internalLiteralPattern.exec(text))) {
      const target = normalizeInternalReference(match[2] ?? "");
      if (!target) continue;
      references.push({
        origin: path.relative(ROOT, file).replaceAll("\\", "/"),
        originRoute: routeFromAppSourceFile(file),
        target,
      });
    }
  }

  return references;
}

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

  const addMenu = (
    menuLabel: string,
    items: readonly { href?: string; label: string; type?: string }[],
  ) => {
    for (const item of items) {
      if (!item.href) continue;
      references.push({
        href: item.href,
        itemLabel: item.label,
        menuLabel,
      });
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
    return {
      accessLabel: "Yalnız gerçek admin · proxy + server guard",
      accessMode: "admin",
      approvedRoleRequired: false,
      roles: ["admin"],
    };
  }

  if (matchesPath(route, "/icerik")) {
    return {
      accessLabel: "CMS erişim politikası · server-side yetki",
      accessMode: "authenticated",
      approvedRoleRequired: false,
      roles: ["admin", "content_manager"],
    };
  }

  if (
    matchesPath(route, publisherPath) &&
    !matchesPath(route, publisherInvitationPath)
  ) {
    return {
      accessLabel: "Aktif yayınevi üyeliği veya admin",
      accessMode: "publisher_membership",
      approvedRoleRequired: false,
      roles: ["publisher", "admin"],
    };
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
    return {
      accessLabel: "Oturum gerekli",
      accessMode: "authenticated",
      approvedRoleRequired: false,
      roles: [],
    };
  }

  if (kind === "handler" && matchesPath(route, "/api")) {
    if (matchesPath(route, "/api/admin")) {
      return {
        accessLabel: "Admin API · handler içi yetki kontrolü",
        accessMode: "admin",
        approvedRoleRequired: false,
        roles: ["admin"],
      };
    }

    return {
      accessLabel: "Route handler politikası · handler içinde doğrulanır",
      accessMode: "authenticated",
      approvedRoleRequired: false,
      roles: [],
    };
  }

  return {
    accessLabel: "Public",
    accessMode: "public",
    approvedRoleRequired: false,
    roles: [],
  };
}

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "tr"));
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
    const existing = seen.get(key);
    if (!existing || existing.sourceFile.startsWith(".next")) seen.set(key, route);
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
  let sourceRoutes: DetectedRoute[] = [];
  let buildRoutes: DetectedRoute[] = [];
  let references: ReferenceRecord[] = [];

  try {
    sourceRoutes = await detectSourceRoutes();
  } catch (error) {
    warnings.push(`Kaynak route taraması kullanılamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
  }

  try {
    buildRoutes = await detectBuildRoutes();
  } catch (error) {
    warnings.push(`Build manifest taraması kullanılamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
  }

  if (sourceRoutes.length > 0) {
    try {
      references = await detectReferences();
    } catch (error) {
      warnings.push(`Bağlantı kaynak taraması kullanılamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
    }
  }

  let detected = sourceRoutes.length > 0 ? sourceRoutes : buildRoutes;
  const scanMode: SystemMapSnapshot["scanMode"] = sourceRoutes.length > 0
    ? buildRoutes.length > 0
      ? "hybrid"
      : "source"
    : buildRoutes.length > 0
      ? "build"
      : "fallback";

  if (detected.length === 0) {
    detected = [
      { kind: "page", route: "/", sourceFile: "fallback registry" },
      { kind: "page", route: "/harita", sourceFile: "fallback registry" },
      { kind: "page", route: contractManagementPath, sourceFile: "fallback registry" },
      { kind: "page", route: contractInboxPath, sourceFile: "fallback registry" },
      { kind: "page", route: systemManagementPath, sourceFile: "fallback registry" },
    ];
    warnings.push("Kaynak dosyalar ve Next build manifesti okunamadı; sınırlı fallback envanteri gösteriliyor.");
  }

  detected = dedupeRoutes(addSystemManagementAliases(detected));
  const menus = menuReferences();

  const records: SystemMapRouteRecord[] = detected.map((detectedRoute) => {
    const relatedMenus = menus.filter((menu) => referenceMatchesRoute(menu.href, detectedRoute.route));
    const inbound = unique(
      references
        .filter((reference) => referenceMatchesRoute(reference.target, detectedRoute.route))
        .map((reference) => reference.originRoute ?? reference.origin),
    );
    const outbound = unique(
      references
        .filter((reference) => reference.originRoute === detectedRoute.route)
        .map((reference) => reference.target),
    );
    const access = accessForRoute(detectedRoute.route, detectedRoute.kind);
    const orphanCandidate =
      detectedRoute.kind === "page" &&
      !entryPointRoutes.has(detectedRoute.route) &&
      inbound.length === 0 &&
      relatedMenus.length === 0;

    return {
      ...access,
      area: areaForRoute(detectedRoute.route),
      dynamic: detectedRoute.route.includes("[") || detectedRoute.route.includes("[..."),
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

  if (scanMode === "build" && references.length === 0) {
    warnings.push("Production build manifesti route'ları doğruladı; kaynak dosyalar olmadığı için giriş/çıkış bağlantıları yalnız menü ve çalışma akışları seviyesinde gösterilebilir.");
  }

  return {
    generatedAt: new Date().toISOString(),
    routes: records,
    scanMode,
    stats,
    warnings,
    workflows,
  };
});
