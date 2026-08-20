import Link from "next/link";
import { IntegrityControlPanel } from "./IntegrityControlPanel";
import { RuntimeInfrastructurePanel } from "./RuntimeInfrastructurePanel";
import { SystemMapWorkbench } from "./SystemMapWorkbench";
import { SystemOperationsPanel } from "./SystemOperationsPanel";
import {
  getSystemMapNavigationItem,
  systemMapNavigationGroups,
  type SystemMapWorkspaceKey,
} from "./navigation";
import { getSystemMapWorkspaceData } from "./workspace-data";

function scanLabel(mode: "source" | "build" | "hybrid" | "fallback") {
  if (mode === "hybrid") return "Kaynak + build manifesti";
  if (mode === "source") return "Kaynak kod taraması";
  if (mode === "build") return "Production build manifesti";
  return "Sınırlı fallback";
}

function WorkspaceStatus({
  blockers,
  controlsPass,
  controlsTotal,
  generatedAt,
  warnings,
  workflowPass,
  workflowTotal,
}: {
  blockers: number;
  controlsPass: number;
  controlsTotal: number;
  generatedAt: string;
  warnings: number;
  workflowPass: number;
  workflowTotal: number;
}) {
  return (
    <section className="system-map-workspace-status" aria-label="Harita genel sağlık durumu">
      <div data-tone={blockers > 0 ? "danger" : "ok"}><strong>{blockers}</strong><span>BLOCKER</span></div>
      <div data-tone={warnings > 0 ? "warning" : "ok"}><strong>{warnings}</strong><span>WARN</span></div>
      <div><strong>{controlsPass}/{controlsTotal}</strong><span>Kontrol PASS</span></div>
      <div><strong>{workflowPass}/{workflowTotal}</strong><span>Workflow PASS</span></div>
      <p>Son tarama: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(generatedAt))}</p>
    </section>
  );
}

export async function SystemMapWorkspacePage({ workspace }: { workspace: SystemMapWorkspaceKey }) {
  const { infrastructure, integrity, operations, snapshot } = await getSystemMapWorkspaceData();
  const navigationItem = getSystemMapNavigationItem(workspace);

  const content = (() => {
    switch (workspace) {
      case "integrity":
        return <IntegrityControlPanel report={integrity} />;
      case "gaps":
        return <SystemOperationsPanel report={operations} view="gaps" />;
      case "workflows":
        return <SystemOperationsPanel report={operations} view="workflows" />;
      case "menus":
        return <SystemOperationsPanel report={operations} view="menu" />;
      case "api":
        return <SystemOperationsPanel report={operations} view="api" />;
      case "actions":
        return <SystemOperationsPanel report={operations} view="actions" />;
      case "dependencies":
        return <SystemOperationsPanel report={operations} view="dependencies" />;
      case "codeData":
        return <SystemOperationsPanel report={operations} view="data" />;
      case "infrastructure":
        return (
          <>
            <RuntimeInfrastructurePanel report={infrastructure} view="summary" />
            <RuntimeInfrastructurePanel report={infrastructure} view="gaps" />
          </>
        );
      case "env":
        return <RuntimeInfrastructurePanel report={infrastructure} view="env" />;
      case "rules":
        return <RuntimeInfrastructurePanel report={infrastructure} view="rules" />;
      case "events":
        return <RuntimeInfrastructurePanel report={infrastructure} view="events" />;
      case "schema":
        return <RuntimeInfrastructurePanel report={infrastructure} view="schema" />;
      case "external":
        return <RuntimeInfrastructurePanel report={infrastructure} view="external" />;
      case "architecture":
        return <div className="system-map-health-only"><SystemMapWorkbench snapshot={snapshot} /></div>;
      case "routes":
        return <div className="system-map-route-only"><SystemMapWorkbench snapshot={snapshot} /></div>;
      case "overview":
      default:
        return (
          <section className="system-map-overview-workbenches" aria-labelledby="system-map-workbenches-title">
            <div className="system-map-section-heading">
              <div>
                <p>ÇALIŞMA MASALARI</p>
                <h2 id="system-map-workbenches-title">Aradığın parçaya doğrudan git</h2>
              </div>
              <span>{systemMapNavigationGroups.flatMap((group) => group.items).length - 1} uzman yüzey</span>
            </div>
            <div className="system-map-overview-groups">
              {systemMapNavigationGroups.map((group) => (
                <section key={group.label}>
                  <h3>{group.label}</h3>
                  <div>
                    {group.items.filter((item) => item.key !== "overview").map((item) => (
                      <Link href={item.href} key={item.href}>
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                        <small>Çalışma masasını aç →</small>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        );
    }
  })();

  return (
    <main className="system-map-page">
      {workspace === "overview" ? (
        <header className="system-map-hero">
          <div>
            <p className="system-map-eyebrow">İLKOKU MİMARİ KONTROL MERKEZİ</p>
            <h1>Sistem / Site Haritası</h1>
            <p className="system-map-lead">
              Uzun tek sayfa yerine her denetim alanı kendi çalışma masasında. Tüm yüzeyler aynı kanonik route, operasyon, altyapı ve bütünlük raporlarından beslenir.
            </p>
          </div>
          <div className="system-map-hero__actions">
            <Link href="/harita/denetim">Denetim Kapısı</Link>
            <Link href="/harita/rotalar">Route Envanteri</Link>
            <Link href="/sistem-yonetimi">Sistem Yönetimi</Link>
          </div>
        </header>
      ) : (
        <header className="system-map-workspace-header">
          <div>
            <p className="system-map-eyebrow">HARİTA ÇALIŞMA MASASI</p>
            <h1>{navigationItem.label}</h1>
            <p>{navigationItem.description}</p>
          </div>
          <Link href="/harita">Genel Bakışa dön</Link>
        </header>
      )}

      <section className="system-map-integrity" aria-label="Harita üretim durumu">
        <div>
          <span className="system-map-live-dot" />
          <strong>Canlı envanter</strong>
          <span>{scanLabel(snapshot.scanMode)}</span>
        </div>
        <p>{snapshot.stats.total} route · {operations.summary.apiHandlers} handler · {operations.summary.actions} server action</p>
      </section>

      <WorkspaceStatus
        blockers={integrity.summary.blockers}
        controlsPass={integrity.summary.controlsPass}
        controlsTotal={integrity.summary.controlsTotal}
        generatedAt={integrity.generatedAt}
        warnings={integrity.summary.warnings}
        workflowPass={operations.summary.workflowPass}
        workflowTotal={operations.workflowChecks.length}
      />

      {snapshot.warnings.length > 0 ? (
        <section className="system-map-warnings" aria-labelledby="system-map-warnings-title">
          <h2 id="system-map-warnings-title">Tarama uyarıları</h2>
          <ul>{snapshot.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </section>
      ) : null}

      <div className="system-map-workspace-body">{content}</div>
    </main>
  );
}
