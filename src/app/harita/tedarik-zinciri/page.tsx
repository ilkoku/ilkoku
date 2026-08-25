import Link from "next/link";
import { supplyChainSecurityReport } from "@/features/system-map/supply-chain.generated";

type ManifestWarning = {
  package: string;
  status: "warn";
  detail: string;
};

type DeploymentBuildDependency = {
  package: string;
  requestedRange: string | null;
  status: "pass" | "blocker";
};

type DuplicateVersionPackage = {
  package: string;
  versions: readonly string[];
};

type ScannerDiscrepancy = {
  scanner: string;
  package: string;
  classification: string;
  detail: string;
};

const statusLabel = (status: "pass" | "warn" | "blocker") => {
  if (status === "blocker") return "BLOCKER";
  if (status === "warn") return "WARN";
  return "PASS";
};

export default function SupplyChainSecurityPage() {
  const report = supplyChainSecurityReport;
  const deploymentBuildContract = report.deploymentBuildContract;
  const deploymentBuildDependencies = deploymentBuildContract.requiredDependencies as readonly DeploymentBuildDependency[];
  const manifestWarnings = report.rootManifest.warnings as readonly ManifestWarning[];
  const duplicateVersionPackages = report.duplicateVersionPackages as readonly DuplicateVersionPackage[];
  const scannerDiscrepancies = report.scannerDiscrepancies as readonly ScannerDiscrepancy[];
  const overall: "pass" | "warn" | "blocker" = report.summary.blockers > 0
    ? "blocker"
    : report.summary.warnings > 0
      ? "warn"
      : "pass";

  return (
    <main className="system-map-page">
      <header className="system-map-workspace-header">
        <div>
          <p className="system-map-eyebrow">HARİTA · TEDARİK ZİNCİRİ</p>
          <h1>Tedarik Zinciri Güvenliği</h1>
          <p>
            Registry tabanlı npm audit kapısını, internetten bağımsız lockfile envanteri, Hostinger build sözleşmesi ve sürüm politikalarıyla çaprazlar. Runtime, deployment-build, development, advisory ve manifest hijyeni ayrı kanıt olarak tutulur.
          </p>
        </div>
        <Link href="/harita/bagimliliklar">Bağımlılık Zinciri →</Link>
      </header>

      <section className="system-map-integrity" aria-label="Tedarik zinciri güvenlik durumu">
        <div>
          <span className="system-map-live-dot" />
          <strong>{overall === "blocker" ? "Tedarik zinciri blokajlı" : overall === "warn" ? "Tedarik zinciri inceleme istiyor" : "Tedarik zinciri kapıları temiz"}</strong>
          <span>{report.summary.blockers} BLOCKER · {report.summary.warnings} WARN</span>
        </div>
        <p>
          Kaynak: {report.source} · üretim: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(report.generatedAt))}
        </p>
      </section>

      <section className="system-ops-command" aria-labelledby="supply-chain-summary-title">
        <div className="system-map-section-heading">
          <div>
            <p>GENEL PAKET ENVANTERİ</p>
            <h2 id="supply-chain-summary-title">İki katmanlı güvenlik kapısı</h2>
          </div>
          <span className="system-ops-status" data-status={overall}>{statusLabel(overall)}</span>
        </div>
        <div className="system-ops-summary-grid">
          <article data-tone={report.summary.blockers > 0 ? "danger" : "ok"}><strong>{report.summary.blockers}</strong><span>BLOCKER</span><small>Politika altında yamalanmamış instance</small></article>
          <article data-tone={report.summary.warnings > 0 ? "warning" : "ok"}><strong>{report.summary.warnings}</strong><span>WARN</span><small>Production manifest hijyeni</small></article>
          <article><strong>{report.summary.uniquePackages}</strong><span>Benzersiz paket</span><small>{report.summary.totalInstances} lockfile instance</small></article>
          <article><strong>{report.summary.runtimeInstances}</strong><span>Runtime</span><small>Production bağımlılık yüzeyi</small></article>
          <article><strong>{report.summary.developmentInstances}</strong><span>Development</span><small>Build, lint ve test zinciri</small></article>
          <article><strong>{report.summary.monitoredRules}</strong><span>Özel advisory kuralı</span><small>{report.summary.monitoredInstances} izlenen instance</small></article>
          <article><strong>{report.summary.duplicateVersionPackages}</strong><span>Çoklu sürüm</span><small>Aynı paketin birden fazla sürümü</small></article>
          <article><strong>{report.genericAuditGate.blockedSeverities.length}</strong><span>Registry seviyesi</span><small>{report.genericAuditGate.source}: {report.genericAuditGate.blockedSeverities.join(" + ")}</small></article>
        </div>
      </section>

      <section className="system-ops-pane system-ops-pane--standalone" aria-labelledby="generic-audit-title">
        <div className="system-map-section-heading">
          <div><p>GENEL ADVISORY KAPISI</p><h2 id="generic-audit-title">npm audit high / critical</h2></div>
          <span className="system-ops-status" data-status="pass">CI ZORUNLU</span>
        </div>
        <p>
          <code>{report.genericAuditGate.command}</code> tüm registry advisory kayıtlarını tarar ve {report.genericAuditGate.blockedSeverities.join(" / ")} seviyesinde CI akışını durdurur. Lockfile politikası bu kontrolün yerine geçmez; onu tamamlar.
        </p>
      </section>

      <section className="system-ops-pane system-ops-pane--standalone" aria-labelledby="deployment-build-title">
        <div className="system-map-section-heading">
          <div><p>HOSTINGER BUILD SÖZLEŞMESİ</p><h2 id="deployment-build-title">Production kurulumundan deploy build’e</h2></div>
          <span className="system-ops-status" data-status={deploymentBuildContract.status}>{statusLabel(deploymentBuildContract.status)}</span>
        </div>
        <p>
          <strong>{deploymentBuildContract.platform}</strong> · {deploymentBuildContract.installMode} · <code>{deploymentBuildContract.buildCommand}</code>
        </p>
        <p>{deploymentBuildContract.note}</p>
        <div className="system-ops-table-wrap system-ops-table-wrap--wide">
          <table>
            <thead><tr><th>Zorunlu paket</th><th>Root sürüm aralığı</th><th>Durum</th></tr></thead>
            <tbody>
              {deploymentBuildDependencies.map((dependency) => (
                <tr key={dependency.package}>
                  <td><code>{dependency.package}</code></td>
                  <td>{dependency.requestedRange ? <code>{dependency.requestedRange}</code> : "Root dependencies altında yok"}</td>
                  <td><span className="system-ops-status" data-status={dependency.status}>{statusLabel(dependency.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="system-ops-pane system-ops-pane--standalone" aria-labelledby="monitored-advisories-title">
        <div className="system-map-section-heading">
          <div><p>İZLENEN ADVISORY PAKETLERİ</p><h2 id="monitored-advisories-title">Hat bazlı ve backport farkındalıklı kurallar</h2></div>
          <span>{report.monitoredPackages.length} paket kuralı</span>
        </div>
        <div className="system-ops-details-list">
          {report.monitoredPackages.map((entry) => (
            <details key={entry.package}>
              <summary>
                <code>{entry.package}</code>
                <span>{entry.advisories.join(" · ")} · {entry.instances.length} instance · {statusLabel(entry.status)}</span>
              </summary>
              <div>
                <strong>Yamalı major eşikleri</strong>
                <p>{Object.entries(entry.fixedByMajor).map(([major, version]) => `${major}.x ≥ ${version}`).join(" · ")}</p>
                <strong>Politika</strong>
                <p>{entry.note}</p>
                <strong>Kurulu instance</strong>
                {entry.instances.length > 0 ? (
                  <div className="system-ops-table-wrap system-ops-table-wrap--wide">
                    <table>
                      <thead><tr><th>Sürüm</th><th>Kapsam</th><th>Eşik</th><th>Neden</th><th>Durum</th></tr></thead>
                      <tbody>
                        {entry.instances.map((instance) => (
                          <tr key={instance.packagePath}>
                            <td><code>{instance.version}</code></td>
                            <td>{instance.scope === "development" ? "Development" : "Runtime"}</td>
                            <td>{instance.threshold ? <code>{instance.threshold}</code> : "Tanımsız"}</td>
                            <td>{instance.reason}</td>
                            <td><span className="system-ops-status" data-status={instance.status}>{statusLabel(instance.status)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p>Paket lockfile içinde kurulu değil; politika gelecekte geri gelirse tekrar uygulanır.</p>}
                <strong>Doğrudan tüketiciler</strong>
                <p>{entry.directParents.length > 0 ? entry.directParents.map((parent) => `${parent.package}@${parent.version ?? "?"} → ${parent.requestedRange}`).join(" · ") : "Doğrudan tüketici bulunmadı."}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="system-ops-gaps" aria-labelledby="manifest-hygiene-title">
        <div className="system-map-section-heading">
          <div><p>PRODUCTION MANIFEST HİJYENİ</p><h2 id="manifest-hygiene-title">Build araçları runtime yüzeyine karışıyor mu?</h2></div>
          <span>{manifestWarnings.length} inceleme</span>
        </div>
        {manifestWarnings.length > 0 ? (
          <div className="system-ops-gap-list">
            {manifestWarnings.map((warning) => (
              <article data-status="warn" key={warning.package}>
                <div className="system-ops-gap-heading"><span className="system-ops-status" data-status="warn">WARN</span><span>{warning.package}</span></div>
                <h3>Build / type aracı root dependencies altında</h3>
                <p>{warning.detail}</p>
              </article>
            ))}
          </div>
        ) : <div className="system-ops-all-clear">Hostinger build sözleşmesi dışında inceleme gerektiren root build-only aday bulunmadı.</div>}
      </section>

      <section className="system-ops-pane system-ops-pane--standalone" aria-labelledby="duplicate-versions-title">
        <div className="system-map-section-heading">
          <div><p>SÜRÜM ÇOĞALMASI</p><h2 id="duplicate-versions-title">Aynı paketin birden fazla sürümü</h2></div>
          <span>{duplicateVersionPackages.length} paket</span>
        </div>
        <div className="system-ops-table-wrap system-ops-table-wrap--wide">
          <table>
            <thead><tr><th>Paket</th><th>Kurulu sürümler</th><th>Adet</th></tr></thead>
            <tbody>
              {duplicateVersionPackages.map((item) => (
                <tr key={item.package}><td><code>{item.package}</code></td><td>{item.versions.map((version) => <code className="system-ops-token" key={version}>{version}</code>)}</td><td>{item.versions.length}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {scannerDiscrepancies.length > 0 ? (
        <section className="system-ops-gaps" aria-labelledby="scanner-discrepancy-title">
          <div className="system-map-section-heading">
            <div><p>TARAYICI UYUŞMAZLIKLARI</p><h2 id="scanner-discrepancy-title">Dış tarayıcı sinyali ile repo kanıtı</h2></div>
            <span>{scannerDiscrepancies.length} kayıt</span>
          </div>
          <div className="system-ops-gap-list">
            {scannerDiscrepancies.map((item) => (
              <article data-status="warn" key={`${item.scanner}:${item.package}`}>
                <div className="system-ops-gap-heading"><span className="system-ops-status" data-status="warn">WARN</span><span>{item.scanner} · {item.package}</span></div>
                <h3>{item.classification}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
