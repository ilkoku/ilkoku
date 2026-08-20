import "server-only";

import { cache } from "react";
import {
  editorNavigationContent,
  navigationContent,
  publisherNavigationContent,
  readerNavigationContent,
} from "@/content";
import { adminNavigation } from "@/lib/admin-navigation";
import { systemMapSourceManifest } from "./runtime-manifest.generated";
import type {
  SystemMapAccessMode,
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
  consumers: string[];
  dataModels: string[];
  file: string;
  guardEvidence: string[];
  imports: string[];
  methods: string[];
  rawSql: boolean;
};

type MenuReference = {
  href: string;
  itemLabel: string;
  menuLabel: string;
};

const routeStepPattern = /\/[A-Za-z0-9_\-\[\].?=&/]+/gu;

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "tr"));
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

function sourceModules() {
  return new Map<string, SourceModule>(
    systemMapSourceManifest.modules.map((sourceModule) => [
      sourceModule.file,
      {
        actionNames: [...sourceModule.actionNames],
        consumers: [...sourceModule.consumers],
        dataModels: [...sourceModule.dataModels],
        file: sourceModule.file,
        guardEvidence: [...sourceModule.guardEvidence],
        imports: [...sourceModule.imports],
        methods: [...sourceModule.methods],
        rawSql: sourceModule.rawSql,
      },
    ]),
  );
}

function transitiveDependencies(start: string, modules: Map<string, SourceModule>) {
  const seen = new Set<string>();
  const queue: Array<{ depth: number; file: string }> = [{ depth: 0, file: start }];
  while (queue.length > 0 && seen.size < 500) {
    const current = queue.shift();
    if (!current || seen.has(current.file) || current.depth > 8) continue;
    seen.add(current.file);
    const sourceModule = modules.get(current.file);
    if (!sourceModule) continue;
    for (const imported of sourceModule.imports) {
      if (!seen.has(imported)) queue.push({ depth: current.depth + 1, file: imported });
    }
  }
  return seen;
}

function extractStepRoutes(step: string) {
  routeStepPattern.lastIndex = 0;
  const routes: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = routeStepPattern.exec(step))) {
    if (match[0]) routes.push(match[0]);
  }
  return unique(routes);
}

function validateWorkflow(workflow: SystemMapWorkflow, routes: SystemMapRouteRecord[]): SystemOperationWorkflowCheck {
  const steps = workflow.steps.map((label) => {
    const candidates = extractStepRoutes(label);
    if (candidates.length === 0) return { label, matchedRoutes: [], status: "unknown" as const };
    const matchedRoutes = unique(
      candidates.flatMap((candidate) => routes.filter((route) => routeMatches(candidate, route.route)).map((route) => route.route)),
    );
    const missing = candidates.filter((candidate) => !findMatchingRoute(candidate, routes));
    return { label, matchedRoutes, status: missing.length > 0 ? "blocker" as const : "pass" as const };
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
  if (systemMapSourceManifest.version !== 1) {
    warnings.push(`Kaynak bağımlılık manifest sürümü desteklenmiyor: ${systemMapSourceManifest.version}`);
  }
  const modules = sourceModules();
  if (modules.size === 0) {
    warnings.push("Build-time kaynak bağımlılık manifesti boş; action/import/veri zinciri sınırlı.");
  }

  const scanMode: SystemOperationsReport["scanMode"] = modules.size > 0 ? "source" : "limited";
  const menus = menuReferences();
  const menuChecks: SystemOperationMenuCheck[] = menus.map((menu) => {
    const matched = findMatchingRoute(menu.href, snapshot.routes);
    return { ...menu, matchedRoute: matched?.route ?? null, status: matched ? "pass" : "blocker" };
  });

  const workflowChecks = snapshot.workflows.map((workflow) => validateWorkflow(workflow, snapshot.routes));
  const actionModules: SystemOperationActionModule[] = [...modules.values()]
    .filter((sourceModule) => sourceModule.actionNames.length > 0)
    .map((sourceModule) => ({
      actions: sourceModule.actionNames,
      consumers: sourceModule.consumers,
      sourceFile: sourceModule.file,
    }))
    .sort((left, right) => left.sourceFile.localeCompare(right.sourceFile));

  const dataModules: SystemOperationDataModule[] = [...modules.values()]
    .filter((sourceModule) => sourceModule.dataModels.length > 0 || sourceModule.rawSql)
    .map((sourceModule) => ({ models: sourceModule.dataModels, rawSql: sourceModule.rawSql, sourceFile: sourceModule.file }))
    .sort((left, right) => left.sourceFile.localeCompare(right.sourceFile));

  const apiSurface: SystemOperationApiSurface[] = snapshot.routes
    .filter((route) => route.kind === "handler")
    .map((route) => {
      const sourceFile = sourceFileFromRoute(route);
      const sourceModule = sourceFile ? modules.get(sourceFile) : null;
      const methods = sourceModule?.methods ?? [];
      const guardEvidence = sourceModule?.guardEvidence ?? [];
      return {
        accessLabel: route.accessLabel,
        accessMode: route.accessMode,
        guardEvidence,
        methods,
        route: route.route,
        sourceFile: sourceFile ?? route.sourceFile,
        status: sourceModule ? apiStatus(route, methods, guardEvidence) : "unknown",
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
      detail: "Bu sayfaya build-time kaynak taramasında veya rol menülerinde giriş bağlantısı bulunamadı.",
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
      detail: "Build-time kaynak manifesti boş olduğu için server action, import grafiği ve veri bağımlılıkları doğrulanamadı.",
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
      actions: actionModules.reduce((total, sourceModule) => total + sourceModule.actions.length, 0),
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
