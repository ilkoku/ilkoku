import "server-only";

import { cache } from "react";
import type { SystemOperationsReport } from "./operations";
import type { RuntimeInfrastructureReport } from "./runtime-infrastructure";
import type { SystemMapRouteRecord, SystemMapSnapshot } from "./types";

export type IntegrityGateStatus = "pass" | "warn" | "blocker";
export type IntegrityImpact = "release" | "workflow" | "maintenance";
export type IntegrityConfidence = "high" | "medium" | "low";

export interface IntegrityFinding {
  confidence: IntegrityConfidence;
  detail: string;
  domain: string;
  evidence: string[];
  fixPoint: string;
  id: string;
  impact: IntegrityImpact;
  ownerHint: string;
  remediation: string;
  status: Exclude<IntegrityGateStatus, "pass">;
  target: string | null;
  title: string;
  verification: string;
}

export interface IntegrityControlCheck {
  detail: string;
  evidence: string;
  id: string;
  status: IntegrityGateStatus;
  title: string;
}

export interface IntegrityControlReport {
  checks: IntegrityControlCheck[];
  findings: IntegrityFinding[];
  generatedAt: string;
  status: IntegrityGateStatus;
  summary: {
    blockers: number;
    controlsPass: number;
    controlsTotal: number;
    highConfidence: number;
    maintenanceRisks: number;
    menuRoleMismatches: number;
    releaseBlockers: number;
    unreferencedActionModules: number;
    warnings: number;
    workflowRisks: number;
  };
}

type MenuRoleExpectation = {
  menuLabel: string;
  roles: string[];
  sourceFile: string;
};

const menuRoleExpectations: MenuRoleExpectation[] = [
  { menuLabel: "Yazar menüsü", roles: ["writer"], sourceFile: "src/content/navigation.ts" },
  { menuLabel: "Okuyucu menüsü", roles: ["reader", "editor_pending", "editor"], sourceFile: "src/content/navigation.ts" },
  { menuLabel: "Editör menüsü", roles: ["editor"], sourceFile: "src/content/navigation.ts" },
  { menuLabel: "Yayınevi menüsü", roles: ["publisher", "admin"], sourceFile: "src/content/navigation.ts" },
  { menuLabel: "Sistem yönetimi menüsü", roles: ["admin"], sourceFile: "src/lib/admin-navigation.ts" },
];

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "tr"));
}

function routeByName(snapshot: SystemMapSnapshot, route: string | null) {
  if (!route) return null;
  return snapshot.routes.find((item) => item.route === route) ?? null;
}

function menuExpectation(menuLabel: string) {
  return menuRoleExpectations.find((item) => item.menuLabel === menuLabel) ?? null;
}

function roleCompatible(route: SystemMapRouteRecord, expectedRoles: string[]) {
  if (route.accessMode === "public" || route.accessMode === "authenticated") return true;
  return route.roles.some((role) => expectedRoles.includes(role));
}

function ownerHint(source: string, domain: string) {
  const value = `${source} ${domain}`.toLowerCase();
  if (value.includes("publisher") || value.includes("yayinevi")) return "Yayınevi çalışma alanı";
  if (value.includes("editor")) return "Editör çalışma alanı";
  if (value.includes("reader") || value.includes("okuyucu")) return "Okuyucu çalışma alanı";
  if (value.includes("writer") || value.includes("yazar") || value.includes("eser")) return "Yazar / eser çalışma alanı";
  if (value.includes("contract") || value.includes("sozles")) return "Sözleşme yönetimi";
  if (value.includes("cms") || value.includes("icerik") || value.includes("content")) return "İçerik yönetimi";
  if (value.includes("auth") || value.includes("giris") || value.includes("kayit") || value.includes("session")) return "Kimlik / hesap";
  if (value.includes("api") || value.includes("security") || value.includes("guard")) return "Platform güvenliği";
  if (value.includes("env") || value.includes("migration") || value.includes("prisma") || value.includes("runtime")) return "Platform altyapısı";
  return "Sistem mimarisi";
}

function impactFor(domain: string, status: "blocker" | "warn"): IntegrityImpact {
  if (status === "blocker") return "release";
  if (["Kullanıcı Akışı", "Menü → Route", "Menü → Rol", "API Güvenliği", "Redirect / Rewrite"].includes(domain)) return "workflow";
  return "maintenance";
}

function confidenceFor(domain: string, status: "blocker" | "warn"): IntegrityConfidence {
  if (status === "blocker") return "high";
  if (["ENV Sözleşmesi", "Veri Şeması", "Menü → Rol"].includes(domain)) return "high";
  if (["Route Bağlantısı", "Server Action Kullanımı"].includes(domain)) return "medium";
  return "medium";
}

function fixPointFor(domain: string, source: string) {
  if (domain === "ENV Sözleşmesi") return ".env.example + ilgili ENV consumer";
  if (domain === "Redirect / Rewrite") return "next.config.ts";
  if (domain === "Veri Şeması") return "prisma/schema.prisma + prisma/migrations";
  if (domain === "Kullanıcı Akışı") return "src/features/system-map/collector.ts + ilgili gerçek route";
  if (domain === "Menü → Route" || domain === "Menü → Rol") return source;
  return source;
}

function verificationFor(domain: string) {
  if (domain === "Menü → Route") return "Menü → route hedef taraması";
  if (domain === "Menü → Rol") return "Menü rolü → route erişim politikası çapraz kontrolü";
  if (domain === "Kullanıcı Akışı") return "Kanonik workflow route doğrulaması";
  if (domain === "API Güvenliği") return "Handler method + guard kanıtı taraması";
  if (domain === "Route Bağlantısı") return "Inbound/menu referans taraması";
  if (domain === "Server Action Kullanımı") return "Exported server action consumer taraması";
  if (domain === "ENV Sözleşmesi") return "process.env → .env.example sözleşme karşılaştırması";
  if (domain === "Redirect / Rewrite") return "next.config hedef → route envanteri kontrolü";
  if (domain === "Veri Şeması") return "Prisma schema + migration tablo karşılaştırması";
  return "Sistem haritası kaynak taraması";
}

function remediationFor(domain: string) {
  if (domain === "Menü → Route") return "Menü hedefini gerçek route'a yönlendir veya artık kullanılmıyorsa menü öğesini kaldır.";
  if (domain === "Menü → Rol") return "Menü hedefini rolün erişebildiği kanonik route'a taşı veya route güvenlik politikasını ürün kararıyla uyumlu hale getir.";
  if (domain === "Kullanıcı Akışı") return "Kanonik akış adımını gerçek uygulama rotasıyla eşleştir; kayıp route varsa akışı onar.";
  if (domain === "API Güvenliği") return "Handler içinde kanonik auth/rol guard sınırını görünür ve doğrudan doğrulanabilir hale getir.";
  if (domain === "Route Bağlantısı") return "Route için kanonik giriş noktası ekle veya gerçekten emekliye ayrıldıysa route'u kaldır.";
  if (domain === "Server Action Kullanımı") return "Action'ın gerçek consumer'ını bağla veya artık kullanılmıyorsa ölü server action modülünü kaldır.";
  if (domain === "ENV Sözleşmesi") return "Anahtarı .env.example içinde dokümante et ve gerekli çalışma ortamlarında tanımlı olduğundan emin ol.";
  if (domain === "Redirect / Rewrite") return "Yönlendirme hedefini mevcut kanonik route ile eşleştir.";
  if (domain === "Veri Şeması") return "Migration-only tablonun bilinçli raw SQL sınırı olduğunu belgele; Prisma'ya taşınacaksa modeli ekle.";
  return "Kaynak kanıtını incele ve kanonik uygulama sınırında düzelt.";
}

function operationFindings(report: SystemOperationsReport): IntegrityFinding[] {
  return report.gaps.map((gap) => {
    const source = gap.scope === "Menü → Route"
      ? menuExpectation(gap.source)?.sourceFile ?? gap.source
      : gap.source;
    return {
      confidence: confidenceFor(gap.scope, gap.status),
      detail: gap.detail,
      domain: gap.scope,
      evidence: unique([gap.source, gap.target ?? ""].filter(Boolean)),
      fixPoint: fixPointFor(gap.scope, source),
      id: `operations:${gap.id}`,
      impact: impactFor(gap.scope, gap.status),
      ownerHint: ownerHint(source, gap.scope),
      remediation: remediationFor(gap.scope),
      status: gap.status,
      target: gap.target,
      title: gap.title,
      verification: verificationFor(gap.scope),
    };
  });
}

function infrastructureFindings(report: RuntimeInfrastructureReport): IntegrityFinding[] {
  return report.gaps.map((gap) => {
    const fixPoint = fixPointFor(gap.scope, gap.scope);
    return {
      confidence: confidenceFor(gap.scope, gap.status),
      detail: gap.detail,
      domain: gap.scope,
      evidence: [gap.id],
      fixPoint,
      id: `runtime:${gap.id}`,
      impact: impactFor(gap.scope, gap.status),
      ownerHint: ownerHint(fixPoint, gap.scope),
      remediation: remediationFor(gap.scope),
      status: gap.status,
      target: null,
      title: gap.title,
      verification: verificationFor(gap.scope),
    };
  });
}

function menuRoleFindings(snapshot: SystemMapSnapshot, report: SystemOperationsReport): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  for (const menu of report.menuChecks) {
    if (menu.status !== "pass") continue;
    const expectation = menuExpectation(menu.menuLabel);
    const route = routeByName(snapshot, menu.matchedRoute);
    if (!expectation || !route || roleCompatible(route, expectation.roles)) continue;

    findings.push({
      confidence: "high",
      detail: `${menu.menuLabel} içindeki “${menu.itemLabel}” route olarak mevcut; ancak beklenen rol (${expectation.roles.join(", ")}) hedefin erişim rolleriyle (${route.roles.join(", ") || route.accessMode}) uyuşmuyor.`,
      domain: "Menü → Rol",
      evidence: [expectation.sourceFile, route.sourceFile, `${menu.href} → ${route.route}`],
      fixPoint: expectation.sourceFile,
      id: `menu-role:${menu.menuLabel}:${menu.href}`,
      impact: "release",
      ownerHint: ownerHint(expectation.sourceFile, menu.menuLabel),
      remediation: remediationFor("Menü → Rol"),
      status: "blocker",
      target: menu.href,
      title: "Menü hedefi rol sınırıyla uyumsuz",
      verification: verificationFor("Menü → Rol"),
    });
  }
  return findings;
}

function unreferencedActionFindings(report: SystemOperationsReport): IntegrityFinding[] {
  return report.actionModules
    .filter((sourceModule) => sourceModule.consumers.length === 0)
    .map((sourceModule) => ({
      confidence: "medium" as const,
      detail: `${sourceModule.actions.length} exported server action için kaynak taramasında modül dışı statik consumer bulunamadı: ${sourceModule.actions.join(", ")}. Dinamik kullanım mümkün olduğundan WARN olarak tutulur.`,
      domain: "Server Action Kullanımı",
      evidence: [sourceModule.sourceFile, ...sourceModule.actions],
      fixPoint: sourceModule.sourceFile,
      id: `unreferenced-actions:${sourceModule.sourceFile}`,
      impact: "maintenance" as const,
      ownerHint: ownerHint(sourceModule.sourceFile, "Server Action Kullanımı"),
      remediation: remediationFor("Server Action Kullanımı"),
      status: "warn" as const,
      target: null,
      title: "Consumer bulunamayan server action modülü",
      verification: verificationFor("Server Action Kullanımı"),
    }));
}

function scannerWarningFindings(snapshot: SystemMapSnapshot, operations: SystemOperationsReport, infrastructure: RuntimeInfrastructureReport): IntegrityFinding[] {
  const warnings = [
    ...snapshot.warnings.map((detail) => ({ id: `snapshot:${detail}`, detail, source: "route collector" })),
    ...operations.warnings.map((detail) => ({ id: `operations:${detail}`, detail, source: "operations collector" })),
    ...infrastructure.warnings.map((detail) => ({ id: `runtime:${detail}`, detail, source: "runtime collector" })),
  ];
  return warnings.map((warning) => ({
    confidence: "high" as const,
    detail: warning.detail,
    domain: "Tarama Altyapısı",
    evidence: [warning.source],
    fixPoint: "src/features/system-map",
    id: `scanner-warning:${warning.id}`,
    impact: "maintenance" as const,
    ownerHint: "Sistem mimarisi",
    remediation: "Tarama kaynağını yeniden kullanılabilir hale getir; eksik veri varken sistemin yanlış PASS üretmesine izin verme.",
    status: "warn" as const,
    target: null,
    title: "Denetim kaynağı sınırlı",
    verification: "Sistem haritası collector self-check",
  }));
}

function controlChecks(input: {
  infrastructure: RuntimeInfrastructureReport;
  menuRoleMismatches: number;
  operations: SystemOperationsReport;
  snapshot: SystemMapSnapshot;
  unreferencedActionModules: number;
}): IntegrityControlCheck[] {
  const { infrastructure, menuRoleMismatches, operations, snapshot, unreferencedActionModules } = input;
  const apiBlockers = operations.apiSurface.filter((item) => item.status === "blocker").length;
  const apiWarnings = operations.apiSurface.filter((item) => item.status === "warn" || item.status === "unknown").length;

  return [
    {
      detail: "Route ve referans envanteri kaynak koddan üretilmeli; fallback release güveni vermez.",
      evidence: `scanMode=${snapshot.scanMode}`,
      id: "route-source",
      status: snapshot.scanMode === "source" || snapshot.scanMode === "hybrid" ? "pass" : snapshot.scanMode === "fallback" ? "blocker" : "warn",
      title: "Route kaynak kapsaması",
    },
    {
      detail: "Tüm rol menüsü hedefleri canlı route envanterinde bulunmalı.",
      evidence: `${operations.summary.menuTargets - operations.summary.menuTargetsBroken}/${operations.summary.menuTargets} hedef geçerli`,
      id: "menu-targets",
      status: operations.summary.menuTargetsBroken > 0 ? "blocker" : "pass",
      title: "Menü → route bütünlüğü",
    },
    {
      detail: "Menü hedefinin yalnız var olması yetmez; menünün rolü hedef route'a erişebilmelidir.",
      evidence: `${menuRoleMismatches} rol uyumsuzluğu`,
      id: "menu-role",
      status: menuRoleMismatches > 0 ? "blocker" : "pass",
      title: "Menü → rol bütünlüğü",
    },
    {
      detail: "Kanonik uçtan uca kullanıcı akışlarında eksik route bulunmamalı.",
      evidence: `${operations.summary.workflowPass}/${operations.workflowChecks.length} PASS · ${operations.summary.workflowBlockers} blocker · ${operations.summary.workflowWarnings} warn`,
      id: "workflows",
      status: operations.summary.workflowBlockers > 0 ? "blocker" : operations.summary.workflowWarnings > 0 ? "warn" : "pass",
      title: "Kanonik kullanıcı akışları",
    },
    {
      detail: "Korumalı API/handler yüzeylerinde statik method ve guard kanıtı görünür olmalı.",
      evidence: `${apiBlockers} blocker · ${apiWarnings} warn/unknown`,
      id: "api-guards",
      status: apiBlockers > 0 ? "blocker" : apiWarnings > 0 ? "warn" : "pass",
      title: "API güvenlik kanıtı",
    },
    {
      detail: "Sayfa route'larının import → action/data zinciri mümkün olan en yüksek kapsamada çıkarılmalı.",
      evidence: `%${operations.summary.routeDependencyCoverage} bağımlılık kapsaması`,
      id: "dependency-coverage",
      status: operations.scanMode === "limited" ? "blocker" : operations.summary.routeDependencyCoverage >= 95 ? "pass" : "warn",
      title: "Route bağımlılık kapsaması",
    },
    {
      detail: "Exported server action modüllerinin statik consumer izi bulunmalı veya bilinçli istisna olarak incelenmeli.",
      evidence: `${unreferencedActionModules} consumer bulunamayan action modülü`,
      id: "action-consumers",
      status: unreferencedActionModules > 0 ? "warn" : "pass",
      title: "Server action consumer kapsaması",
    },
    {
      detail: "next.config redirect/rewrite hedeflerinin tamamı gerçek route envanteriyle eşleşmeli.",
      evidence: `${infrastructure.summary.routeRulesBroken}/${infrastructure.summary.routeRules} kırık kural`,
      id: "route-rules",
      status: infrastructure.summary.routeRulesBroken > 0 ? "blocker" : "pass",
      title: "Redirect / rewrite bütünlüğü",
    },
    {
      detail: "Kaynak kodda kullanılan ENV anahtarlarının tamamı örnek çalışma ortamı sözleşmesinde belgelenmeli.",
      evidence: `${infrastructure.summary.undocumentedEnv}/${infrastructure.summary.envKeys} belgelenmemiş ENV`,
      id: "env-contract",
      status: infrastructure.summary.undocumentedEnv > 0 ? "warn" : "pass",
      title: "ENV sözleşme kapsaması",
    },
    {
      detail: "Inbound/menu izi olmayan route'lar kasıtlı giriş noktası değilse incelenmeli.",
      evidence: `${snapshot.stats.orphanCandidates} yetim route adayı`,
      id: "orphan-routes",
      status: snapshot.stats.orphanCandidates > 0 ? "warn" : "pass",
      title: "Route giriş bağlantıları",
    },
    {
      detail: "Migration-only tablolar görünür ve bilinçli raw SQL sınırı olarak izlenmeli.",
      evidence: `${infrastructure.summary.migrationOnlyTables} migration-only tablo`,
      id: "schema-boundary",
      status: infrastructure.summary.migrationOnlyTables > 0 ? "warn" : "pass",
      title: "Veri şeması sınırı",
    },
    {
      detail: "Denetim collector'larının kendisi veri kaybetmeden çalışmalı.",
      evidence: `${snapshot.warnings.length + operations.warnings.length + infrastructure.warnings.length} collector uyarısı`,
      id: "collector-health",
      status: snapshot.warnings.length + operations.warnings.length + infrastructure.warnings.length > 0 ? "warn" : "pass",
      title: "Denetim motoru sağlığı",
    },
  ];
}

function findingWeight(finding: IntegrityFinding) {
  const status = finding.status === "blocker" ? 0 : 10;
  const impact = finding.impact === "release" ? 0 : finding.impact === "workflow" ? 2 : 4;
  const confidence = finding.confidence === "high" ? 0 : finding.confidence === "medium" ? 1 : 2;
  return status + impact + confidence;
}

export const getIntegrityControlReport = cache((
  snapshot: SystemMapSnapshot,
  operations: SystemOperationsReport,
  infrastructure: RuntimeInfrastructureReport,
): IntegrityControlReport => {
  const menuRole = menuRoleFindings(snapshot, operations);
  const unreferencedActions = unreferencedActionFindings(operations);
  const findings = [
    ...operationFindings(operations),
    ...infrastructureFindings(infrastructure),
    ...menuRole,
    ...unreferencedActions,
    ...scannerWarningFindings(snapshot, operations, infrastructure),
  ].sort((left, right) => findingWeight(left) - findingWeight(right) || left.domain.localeCompare(right.domain, "tr") || left.title.localeCompare(right.title, "tr"));

  const checks = controlChecks({
    infrastructure,
    menuRoleMismatches: menuRole.length,
    operations,
    snapshot,
    unreferencedActionModules: unreferencedActions.length,
  });
  const blockers = findings.filter((item) => item.status === "blocker").length;
  const warnings = findings.filter((item) => item.status === "warn").length;
  const status: IntegrityGateStatus = blockers > 0 || checks.some((check) => check.status === "blocker")
    ? "blocker"
    : warnings > 0 || checks.some((check) => check.status === "warn")
      ? "warn"
      : "pass";

  return {
    checks,
    findings,
    generatedAt: new Date().toISOString(),
    status,
    summary: {
      blockers,
      controlsPass: checks.filter((check) => check.status === "pass").length,
      controlsTotal: checks.length,
      highConfidence: findings.filter((item) => item.confidence === "high").length,
      maintenanceRisks: findings.filter((item) => item.impact === "maintenance").length,
      menuRoleMismatches: menuRole.length,
      releaseBlockers: findings.filter((item) => item.status === "blocker" && item.impact === "release").length,
      unreferencedActionModules: unreferencedActions.length,
      warnings,
      workflowRisks: findings.filter((item) => item.impact === "workflow").length,
    },
  };
});
