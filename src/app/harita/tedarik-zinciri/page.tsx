import Link from "next/link";
import { supplyChainSecurityReport } from "@/features/system-map/supply-chain.generated";

const statusLabel = (status: "pass" | "blocker") => status === "pass" ? "PASS" : "BLOCKER";

export default function SupplyChainSecurityPage() {
  const report = supplyChainSecurityReport;
  const overall = report.summary.blockers > 0 ? "blocker" : "pass";

  return (
    <main className="system-map-page">
      <header className="system-map-workspace-header">
        <div>
          <p className="system-map-eyebrow">HARİTA · TEDARİK ZİNCİRİ</p>
          <h1>Tedarik Zinciri Güvenliği</h1>
          <p>
            npm audit sonucunu lockfile sürüm politikasıyla çaprazlar; bilinen advisory eşiklerini hat bazında doğrular ve yanlış-pozitif tarayıcı sinyallerini ayrı kanıt olarak gösterir.
          </p>
        </div>
        <Link href="/harita/bagimliliklar">Bağımlılık Zinciri →</Link>
      </header>

      <section className="system-map-integrity" aria-label="Tedarik zinciri güvenlik durumu">
        <div>
          <span className="system-map-live-dot" />
          <strong>{overall === "pass" ? "Lockfile güvenlik kapısı temiz" : "Lockfile güvenlik kapısı blokajlı"}</strong>
          <span>{report.summary.blockers} BLOCKER · {report.summary.instances} instance</span>
        </div>
        <p>
          Kaynak: {report.source} · üretim: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(report.generatedAt))}
        </p>
      </section>

      <section className="system-ops-command" aria-labelledby="supply-chain-summary-title">
        <div className="system-map-section-heading">
          <div>
            <p>ÇOKLU KONTROL</p>
            <h2 id="supply-chain-summary-title">Bağımlılık güvenlik kapıları</h2>
          </div>
          <span className="system-ops-status" data-status={overall}>{overall === "pass" ? "PASS" : "BLOCKER"}</span>
        </div>
        <div className="system-ops-summary-grid">
          <article data-tone={report.summary.blockers > 0 ? "danger" : "ok"}><strong>{report.summary.blockers}</strong><span>BLOCKER</span><small>Yamalı eşik altında instance</small></article>
          <article><strong>{report.summary.developmentInstances}</strong><span>Development</span><small>Build/lint araç zinciri</small></article>
          <article><strong>{report.summary.runtimeInstances}</strong><span>Runtime</span><small>Production dependency instance</small></article>
          <article><strong>{report.policy.advisories.length}</strong><span>Advisory</span><small>{report.policy.advisories.join(" · ")}</small></article>
        </div>
      </section>

      <section className="system-ops-pane system-ops-pane--standalone" aria-labelledby="supply-chain-instances-title">
        <div className="system-map-section-heading">
          <div><p>LOCKFILE</p><h2 id="supply-chain-instances-title">brace-expansion instance&apos;ları</h2></div>
          <span>{report.instances.length} kayıt</span>
        </div>
        <div className="system-ops-table-wrap system-ops-table-wrap--wide">
          <table>
            <thead><tr><th>Sürüm</th><th>Kapsam</th><th>Paket yolu</th><th>Durum</th></tr></thead>
            <tbody>
              {report.instances.map((instance) => (
                <tr key={instance.packagePath}>
                  <td><code>{instance.version}</code></td>
                  <td>{instance.scope === "development" ? "Development" : "Runtime"}</td>
                  <td><code>{instance.packagePath}</code></td>
                  <td><span className="system-ops-status" data-status={instance.status}>{statusLabel(instance.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="system-ops-pane system-ops-pane--standalone" aria-labelledby="supply-chain-parent-title">
        <div className="system-map-section-heading">
          <div><p>DOĞRUDAN TÜKETİCİ</p><h2 id="supply-chain-parent-title">brace-expansion isteyen paketler</h2></div>
          <span>{report.directParents.length} kayıt</span>
        </div>
        <div className="system-ops-table-wrap system-ops-table-wrap--wide">
          <table>
            <thead><tr><th>Paket</th><th>Sürüm</th><th>İstenen aralık</th><th>Kapsam</th><th>Yol</th></tr></thead>
            <tbody>
              {report.directParents.map((parent) => (
                <tr key={`${parent.packagePath}:${parent.requestedRange}`}>
                  <td><code>{parent.package}</code></td>
                  <td>{parent.version ? <code>{parent.version}</code> : "—"}</td>
                  <td><code>{parent.requestedRange}</code></td>
                  <td>{parent.scope === "development" ? "Development" : "Runtime"}</td>
                  <td><code>{parent.packagePath}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="system-ops-gaps" aria-labelledby="scanner-discrepancy-title">
        <div className="system-map-section-heading">
          <div><p>TARAYICI UYUŞMAZLIĞI</p><h2 id="scanner-discrepancy-title">Hostinger sinyali neden kırmızı?</h2></div>
          <span>İNCELEME KANITI</span>
        </div>
        <div className="system-ops-gap-list">
          <article data-status="warn">
            <div className="system-ops-gap-heading"><span className="system-ops-status" data-status="warn">WARN</span><span>{report.scannerDiscrepancy.package}</span></div>
            <h3>Yamalı development instance · advisory aralık uyuşmazlığı</h3>
            <p>{report.scannerDiscrepancy.detail}</p>
            <dl>
              <div><dt>Yamalı hatlar</dt><dd><code>{report.policy.patchedLines.join(" · ")}</code></dd></div>
              <div><dt>Politika</dt><dd>{report.policy.note}</dd></div>
            </dl>
          </article>
        </div>
      </section>
    </main>
  );
}
