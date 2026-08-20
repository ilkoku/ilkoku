import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import {
  editorNavigationContent,
  navigationContent,
  publisherNavigationContent,
  readerNavigationContent,
} from "@/content";
import { adminNavigation } from "@/lib/admin-navigation";
import type {
  SystemMapAccessMode,
  SystemMapRouteKind,
  SystemMapRouteRecord,
  SystemMapSnapshot,
  SystemMapWorkflow,
} from "./types";

export type OperationStatus = "pass" | "warn" | "blocker" | "unknown";

export interface SystemOperationGap {
  detail: string;
  id: string;
  scope: string;
  source: string;
  status: Exclude<OperationStatus, "pass">;
  target: string | null;
  title: string;
}

export interface SystemOperationMenuCheck {
  href: string;
  itemLabel: string;
  menuLabel: string;
  matchedRoute: string | null;
  status: "pass" | "blocker";
}

export interface SystemOperationWorkflowCheck {
  description: string;
  id: string;
  resolvedRoutes: string[];
  status: OperationStatus;
  steps: Array<{
    label: string;
    matchedRoutes: string[];
    status: OperationStatus;
  }>;
  title: string;
}

export interface SystemOperationActionModule {
  actions: string[];
  consumers: string[];
  sourceFile: string;
}

export interface SystemOperationApiSurface {
  accessLabel: string;
  accessMode: SystemMapAccessMode;
  guardEvidence: string[];
  methods: string[];
  route: string;
  sourceFile: string;
  status: OperationStatus;
}

export interface SystemOperationRouteDependency {
  apiTargets: string[];
  dataModels: string[];
  dependencyCount: number;
  route: string;
  serverActions: string[];
  sourceFile: string;
  status: OperationStatus;
}

export interface SystemOperationDataModule {
  models: string[];
  rawSql: boolean;
  sourceFile: string;
}

export interface SystemOperationsReport {
  actionModules: SystemOperationActionModule[];
  apiSurface: SystemOperationApiSurface[];
  dataModules: SystemOperationDataModule[];
  generatedAt: string;
  gaps: SystemOperationGap[];
  menuChecks: SystemOperationMenuCheck[];
  routeDependencies: SystemOperationRouteDependency[];
  scanMode: "source" | "limited";
  summary: {
    actionModules: number;
    actions: number;
    apiHandlers: number;
    blockers: number;
    dataModules: number;
    menuTargets: number;
    menuTargetsBroken: number;
    routeDependencyCoverage: number;
    warnings: number;
    workflowBlockers: number;
    workflowPass: number;
    workflowWarnings: number;
  };
  warnings: string[];
  workflowChecks: SystemOperationWorkflowCheck[];
}

type SourceModule = {
  actionNames: string[];
  dataModels: string[];
  file: string;
  guardEvidence: string[];
  imports: string[];
  methods: string[];
  rawSql: boolean;
  text: string;
};

type MenuReference = {
  href: string;
  itemLabel: string;
  menuLabel: string;
};

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const SOURCE_ROOTS = [
  path.join(SRC, "app"),
  path.join(SRC, "components"),
  path.join(SRC, "content"),
  path.join(SRC, "features"),
  path.join(SRC, "lib"),
];
const sourceExtensionPattern = /\.(?:ts|tsx|js|jsx)$/u;
const importPattern = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/gu;
const actionFunctionPattern = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gu;
const actionConstPattern = /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?/gu;
const prismaModelPattern = /\bprisma\.([A-Za-z_$][\w$]*)\s*\./gu;
const httpMethodPattern = /export\s+(?:async\s+function|const)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/gu;
const routeStepPattern = /\/[A-Za-z0-9_\-\[\].?=&/]+/gu;
const actionNamePattern = /(Action|action)$/u;
const guardMarkers = [
  ["getCurrentUser", "getCurrentUser"],
  ["requireAdmin", "requireAdmin"],
  ["requireApprovedRole", "requireApprovedRole"],
  ["requirePublisher", "requirePublisher"],
  ["getPublisherWorkspaceContext", "publisher workspace context"],
  ["auth(", "auth()"],
  ["session", "session check"],
] as const;

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
    if (entry.isFile() && sourceExtensionPattern.test(entry.name)) files.push(absolute);
  }

  return files;
}

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "tr"));
}

function normalizeRepoPath(absolute: string) {
  return path.relative(ROOT, absolute).replaceAll("\\", "/");
}

function sourceFileFromRoute(route: SystemMapRouteRecord) {
  const source = route.sourceFile.split(" · ")[0]?.trim() ?? route.sourceFile;
  return source.startsWith("src/") ? source : null;
}

function cleanRoute(value: string) {
  return value.split(/[?#]/u)[0]?.replace(/\/$/u, "") || "/";
}

function routeShape(value: string) {
  return cleanRoute(value)
    .replace(/\[\[\.\.\.[^\]]+\]\]/gu, "[*]")
    .replace(/\[\.\.\.[^\]]+\]/gu, "[*]")
    .replace(/\[[^\]]+\]/gu, "[]")
    .replace(/\.\.\.$/u, "[*]");
}

function routeMatches(reference: string, route: string) {
  const referenceShape = routeShape(reference);
  const routePattern = routeShape(route);
  if (referenceShape === routePattern) return true;

  const routeSegments = routePattern.split("/").filter(Boolean);
  const referenceSegments = referenceShape.split("/").filter(Boolean);
  if (routeSegments.length === 0) return referenceSegments.length === 0;

  for (let index = 0; index < routeSegments.length; index += 1) {
    const expected = routeSegments[index];
    const actual = referenceSegments[index];
    if (expected === "[*]") return referenceSegments.length >= index;
    if (expected === "[]") {
      if (!actual) return false;
      continue;
    }
    if (expected !== actual) return false;
  }

  return referenceSegments.length === routeSegments.length;
}

function findMatchingRoute(value: string, routes: SystemMapRouteRecord[]) {
  return routes.find((route) => routeMatches(value, route.route)) ?? null;
}

function menuReferences(): MenuReference[] {
  const result: MenuReference[] = [];
  const add = (menuLabel: string, items: readonly { href?: string; label: string }[]) => {
    for (const item of items) {
      if (!item.href) continue;
      result.push({ href: item.href, itemLabel: item.label, menuLabel });
    }
  };

  add("Yazar menüsü", navigationContent.items);
  add("Okuyucu menüsü", readerNavigationContent.items);
  add("Editör menüsü", editorNavigationContent.items);
  add("Yayınevi menüsü", publisherNavigationContent.items);
  add("Sistem yönetimi menüsü", adminNavigation);
  return result;
}

async function fileExists(file: string) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function resolveImport(origin: string, specifier: string) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;

  const base = specifier.startsWith("@/")
    ? path.join(SRC, specifier.slice(2))
    : path.resolve(path.dirname(origin), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.jsx"),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return normalizeRepoPath(candidate);
  }
  return null;
}

function extractActionNames(text: string) {
  if (!/^\s*["']use server["'];?/u.test(text)) return [];
  const names: string[] = [];
  actionFunctionPattern.lastIndex = 0;
  actionConstPattern.lastIndex = 0;
  for (const pattern of [actionFunctionPattern, actionConstPattern]) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const name = match[1];
      if (name && (actionNamePattern.test(name) || /Action/u.test(name))) names.push(name);
    }
  }
  return unique(names);
}

function extractModels(text: string) {
  const models: string[] = [];
  prismaModelPattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = prismaModelPattern.exec(text))) {
    if (match[1] && !match[1].startsWith("$")) models.push(match[1]);
  }
  return unique(models);
}

function extractMethods(text: string) {
  const methods: string[] = [];
  httpMethodPattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = httpMethodPattern.exec(text))) {
    if (match[1]) methods.push(match[1]);
  }
  return unique(methods);
}

function extractGuardEvidence(text: string) {
  return guardMarkers
    .filter(([needle]) => text.includes(needle))
    .map(([, label]) => label);
}

async function scanModules(): Promise<Map<string, SourceModule>> {
  const files = (
    await Promise.all(
      SOURCE_ROOTS.map(async (root) => {
        try {
          return await walk(root);
        } catch {
          return [];
        }
      }),
    )
  ).flat();
  const uniqueFiles = [...new Set(files)];
  const modules = new Map<string, SourceModule>();

  for (const absolute of uniqueFiles) {
    let text: string;
    try {
      text = await readFile(absolute, "utf8");
    } catch {
      continue;
    }

    const imports: string[] = [];
    importPattern.lastIndex = 0;
    let importMatch: RegExpExecArray | null;
    while ((importMatch = importPattern.exec(text))) {
      const specifier = importMatch[1];
      if (!specifier) continue;
      const resolved = await resolveImport(absolute, specifier);
      if (resolved) imports.push(resolved);
    }

    const file = normalizeRepoPath(absolute);
    modules.set(file, {
      actionNames: extractActionNames(text),
      dataModels: extractModels(text),
      file,
      guardEvidence: extractGuardEvidence(text),
      imports: unique(imports),
      methods: extractMethods(text),
      rawSql: text.includes("$queryRaw") || text.includes("$executeRaw"),
      text,
    });
  }

  return modules;
}

function transitiveDependencies(start: string, modules: Map<string, SourceModule>) {
  const seen = new Set<string>();
  const queue: Array<{ depth: number; file: string }> = [{ depth: 0, file: start }];

  while (queue.length > 0 && seen.size < 500) {
    const current = queue.shift();
    if (!current || seen.has(current.file) || current.depth > 8) continue;
    seen.add(current.file);
    const module = modules.get(current.file);
    if (!module) continue;
    for (const imported of module.imports) {
      if (!seen.has(imported)) queue.push({ depth: current.depth + 1, file: imported });
    }
  }

  return seen;
}

function symbolConsumers(actionName: string, sourceFile: string, modules: Map<string, SourceModule>) {
  const escaped = actionName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const matcher = new RegExp(`\\b${escaped}\\b`, "u");
  return [...modules.values()]
    .filter((module) => module.file !== sourceFile && matcher.test(module.text))
    .map((module) => module.file)
    .slice(0, 20);
}

function extractStepRoutes(step: string) {
  routeStepPattern.lastIndex = 0;
  const routes: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = routeStepPattern.exec(step))) {
    const candidate = match[0];
    if (candidate) routes.push(candidate);
  }
  return unique(routes);
}

function validateWorkflow(workflow: SystemMapWorkflow, routes: SystemMapRouteRecord[]): SystemOperationWorkflowCheck {
  const steps = workflow.steps.map((label) => {
    const candidates = extractStepRoutes(label);
    if (candidates.length === 0) {
      return { label, matchedRoutes: [], status: "unknown" as const };
    }

    const matchedRoutes = unique(
      candidates.flatMap((candidate) => routes.filter((route) => routeMatches(candidate, route.route)).map((route) => route.route)),
    );
    const missing = candidates.filter((candidate) => !findMatchingRoute(candidate, routes));
    return {
      label,
      matchedRoutes,
      status: missing.length > 0 ? "blocker" as const : "pass" as const,
    };
  });

  const hasBlocker = steps.some((step) => step.status === "blocker");
  const hasUnknown = steps.some((step) => step.status === "unknown");
  return {
    description: workflow.description,
    id: workflow.id,
    resolvedRoutes: unique(steps.flatMap((step) => step.matchedRoutes)),
    status: hasBlocker ? "blocker" : hasUnknown ? "warn" : "pass",
    steps,
    title: workflow.title,
  };
}

function routeDependencyStatus(record: SystemOperationRouteDependency) {
  if (record.apiTargets.length > 0 || record.dataModels.length > 0 || record.serverActions.length > 0) return "pass" as const;
  return record.dependencyCount > 0 ? "warn" as const : "unknown" as const;
}

function apiStatus(route: SystemMapRouteRecord, methods: string[], guardEvidence: string[]) {
  if (methods.length === 0) return "warn" as const;
  if (route.accessMode === "admin" && guardEvidence.length === 0) return "blocker" as const;
  if (route.accessMode !== "public" && guardEvidence.length === 0) return "warn" as const;
  return "pass" as const;
}

export const getSystemOperationsReport = cache(async (snapshot: SystemMapSnapshot): Promise<SystemOperationsReport> => {
  const warnings: string[] = [];
  let modules = new Map<string, SourceModule>();

  try {
    modules = await scanModules();
  } catch (error) {
    warnings.push(`Kaynak bağımlılık taraması kullanılamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
  }

  const scanMode: SystemOperationsReport["scanMode"] = modules.size > 0 ? "source" : "limited";
  const menus = menuReferences();
  const menuChecks: SystemOperationMenuCheck[] = menus.map((menu) => {
    const matched = findMatchingRoute(menu.href, snapshot.routes);
    return {
      ...menu,
      matchedRoute: matched?.route ?? null,
      status: matched ? "pass" : "blocker",
    };
  });

  const workflowChecks = snapshot.workflows.map((workflow) => validateWorkflow(workflow, snapshot.routes));
  const actionModules: SystemOperationActionModule[] = [...modules.values()]
    .filter((module) => module.actionNames.length > 0)
    .map((module) => ({
      actions: module.actionNames,
      consumers: unique(module.actionNames.flatMap((action) => symbolConsumers(action, module.file, modules))),
      sourceFile: module.file,
    }))
    .sort((left, right) => left.sourceFile.localeCompare(right.sourceFile));

  const dataModules: SystemOperationDataModule[] = [...modules.values()]
    .filter((module) => module.dataModels.length > 0 || module.rawSql)
    .map((module) => ({ models: module.dataModels, rawSql: module.rawSql, sourceFile: module.file }))
    .sort((left, right) => left.sourceFile.localeCompare(right.sourceFile));

  const apiSurface: SystemOperationApiSurface[] = snapshot.routes
    .filter((route) => route.kind === "handler")
    .map((route) => {
      const sourceFile = sourceFileFromRoute(route);
      const module = sourceFile ? modules.get(sourceFile) : null;
      const methods = module?.methods ?? [];
      const guardEvidence = module?.guardEvidence ?? [];
      return {
        accessLabel: route.accessLabel,
        accessMode: route.accessMode,
        guardEvidence,
        methods,
        route: route.route,
        sourceFile: sourceFile ?? route.sourceFile,
        status: module ? apiStatus(route, methods, guardEvidence) : "unknown",
      };
    });

  const routeDependencies: SystemOperationRouteDependency[] = snapshot.routes
    .filter((route) => route.kind === "page")
    .map((route) => {
      const sourceFile = sourceFileFromRoute(route);
      if (!sourceFile || !modules.has(sourceFile)) {
        return {
          apiTargets: route.outbound.filter((target) => cleanRoute(target).startsWith("/api")),
          dataModels: [],
          dependencyCount: 0,
          route: route.route,
          serverActions: [],
          sourceFile: sourceFile ?? route.sourceFile,
          status: "unknown" as const,
        };
      }

      const dependencies = transitiveDependencies(sourceFile, modules);
      const dataModels = unique([...dependencies].flatMap((file) => modules.get(file)?.dataModels ?? []));
      const serverActions = unique([...dependencies].flatMap((file) => modules.get(file)?.actionNames ?? []));
      const record: SystemOperationRouteDependency = {
        apiTargets: unique(route.outbound.filter((target) => cleanRoute(target).startsWith("/api"))),
        dataModels,
        dependencyCount: Math.max(0, dependencies.size - 1),
        route: route.route,
        serverActions,
        sourceFile,
        status: "unknown",
      };
      return { ...record, status: routeDependencyStatus(record) };
    });

  const gaps: SystemOperationGap[] = [];
  for (const menu of menuChecks.filter((item) => item.status === "blocker")) {
    gaps.push({
      detail: `${menu.menuLabel} içindeki “${menu.itemLabel}” hedefi canlı route envanterinde bulunamadı.`,
      id: `menu:${menu.menuLabel}:${menu.href}`,
      scope: "Menü → Route",
      source: menu.menuLabel,
      status: "blocker",
      target: menu.href,
      title: "Kırık menü hedefi",
    });
  }

  for (const workflow of workflowChecks.filter((item) => item.status === "blocker")) {
    const failed = workflow.steps.filter((step) => step.status === "blocker").map((step) => step.label).join(" · ");
    gaps.push({
      detail: `Kanonik akışta route karşılığı bulunamayan adım var: ${failed}`,
      id: `workflow:${workflow.id}`,
      scope: "Kullanıcı Akışı",
      source: workflow.title,
      status: "blocker",
      target: null,
      title: "Akışta eksik route",
    });
  }

  for (const api of apiSurface) {
    if (api.status === "blocker") {
      gaps.push({
        detail: `${api.accessLabel}; ancak handler kaynak dosyasında doğrudan admin/oturum guard kanıtı bulunamadı.`,
        id: `api:${api.route}`,
        scope: "API Güvenliği",
        source: api.sourceFile,
        status: "blocker",
        target: api.route,
        title: "Admin API guard kanıtı eksik",
      });
    } else if (api.status === "warn") {
      gaps.push({
        detail: api.methods.length === 0
          ? "HTTP method export'u statik taramada bulunamadı."
          : "Handler korumalı görünüyor; doğrudan guard kanıtı statik taramada bulunamadı. Dolaylı guard olabilir, manuel doğrulama gerekir.",
        id: `apiwarn:${api.route}`,
        scope: "API Güvenliği",
        source: api.sourceFile,
        status: "warn",
        target: api.route,
        title: "API handler kontrolü gerekli",
      });
    }
  }

  for (const route of snapshot.routes.filter((item) => item.orphanCandidate)) {
    gaps.push({
      detail: "Bu sayfaya kaynak taramasında veya rol menülerinde giriş bağlantısı bulunamadı.",
      id: `orphan:${route.route}`,
      scope: "Route Bağlantısı",
      source: route.sourceFile,
      status: "warn",
      target: route.route,
      title: "Yetim route adayı",
    });
  }

  if (scanMode === "limited") {
    gaps.push({
      detail: "Kaynak dosyalar okunamadığı için server action, import grafiği ve veri bağımlılıkları doğrulanamadı.",
      id: "source-scan-unavailable",
      scope: "Tarama Altyapısı",
      source: "/harita",
      status: "warn",
      target: null,
      title: "Derin kaynak taraması sınırlı",
    });
  }

  const blockers = gaps.filter((gap) => gap.status === "blocker").length;
  const warningCount = gaps.filter((gap) => gap.status === "warn").length;
  const routeDependenciesResolved = routeDependencies.filter((item) => item.status !== "unknown").length;

  return {
    actionModules,
    apiSurface,
    dataModules,
    generatedAt: new Date().toISOString(),
    gaps: gaps.sort((left, right) => {
      const weight = (status: SystemOperationGap["status"]) => status === "blocker" ? 0 : status === "warn" ? 1 : 2;
      return weight(left.status) - weight(right.status) || left.scope.localeCompare(right.scope, "tr");
    }),
    menuChecks,
    routeDependencies,
    scanMode,
    summary: {
      actionModules: actionModules.length,
      actions: actionModules.reduce((total, module) => total + module.actions.length, 0),
      apiHandlers: apiSurface.length,
      blockers,
      dataModules: dataModules.length,
      menuTargets: menuChecks.length,
      menuTargetsBroken: menuChecks.filter((item) => item.status === "blocker").length,
      routeDependencyCoverage: routeDependencies.length > 0
        ? Math.round((routeDependenciesResolved / routeDependencies.length) * 100)
        : 0,
      warnings: warningCount,
      workflowBlockers: workflowChecks.filter((item) => item.status === "blocker").length,
      workflowPass: workflowChecks.filter((item) => item.status === "pass").length,
      workflowWarnings: workflowChecks.filter((item) => item.status === "warn").length,
    },
    warnings,
    workflowChecks,
  };
});
