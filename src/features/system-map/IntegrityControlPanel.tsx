import type {
  IntegrityConfidence,
  IntegrityControlReport,
  IntegrityGateStatus,
  IntegrityImpact,
} from "./integrity-control";

const statusLabels: Record<IntegrityGateStatus, string> = {
  blocker: "BLOCKER",
  pass: "PASS",
  warn: "WARN",
};

const impactLabels: Record<IntegrityImpact, string> = {
  maintenance: "Bakım",
  release: "Release",
  workflow: "Akış",
};

const confidenceLabels: Record<IntegrityConfidence, string> = {
  high: "Yüksek kanıt",
  low: "Düşük kanıt",
  medium: "Orta kanıt",
};

function StatusBadge({ status }: { status: IntegrityGateStatus }) {
  return <span className="integrity-status" data-status={status}>{statusLabels[status]}</span>;
}

export function IntegrityControlPanel({ report }: { report: IntegrityControlReport }) {
  return (
    <div className="integrity-root">
      <section className="integrity-gate" data-status={report.status} aria-labelledby="integrity-gate-title">
        <div className="integrity-gate__heading">
          <div>
            <p>TEK KANONİK DENETİM KAPISI</p>
            <h2 id="integrity-gate-title">İlkOku bütünlük kontrolü</h2>
            <span>Route, rol, workflow, API, action, ENV, yönlendirme ve veri katmanı bulgularını tek öncelik kuyruğunda birleştirir.</span>
          </div>
          <StatusBadge status={report.status} />
        </div>

        <div className="integrity-summary">
          <article data-tone={report.summary.releaseBlockers > 0 ? "danger" : "ok"}>
            <strong>{report.summary.releaseBlockers}</strong>
            <span>Release blocker</span>
            <small>Yayın öncesi kapanması gereken yüksek etkili bulgu</small>
          </article>
          <article data-tone={report.summary.warnings > 0 ? "warning" : "ok"}>
            <strong>{report.summary.warnings}</strong>
            <span>WARN</span>
            <small>İnceleme / bakım / kanıt güçlendirme kuyruğu</small>
          </article>
          <article>
            <strong>{report.summary.controlsPass}/{report.summary.controlsTotal}</strong>
            <span>Kontrol PASS</span>
            <small>Bağımsız bütünlük kontrolü</small>
          </article>
          <article data-tone={report.summary.menuRoleMismatches > 0 ? "danger" : "ok"}>
            <strong>{report.summary.menuRoleMismatches}</strong>
            <span>Menü ↔ rol uyumsuzluğu</span>
            <small>Route var ama rol erişemiyor kontrolü</small>
          </article>
          <article data-tone={report.summary.unreferencedActionModules > 0 ? "warning" : "ok"}>
            <strong>{report.summary.unreferencedActionModules}</strong>
            <span>Action consumer adayı</span>
            <small>Statik referansı bulunamayan server action modülü</small>
          </article>
          <article>
            <strong>{report.summary.highConfidence}</strong>
            <span>Yüksek kanıtlı bulgu</span>
            <small>Heuristikten daha güçlü kaynak kanıtı</small>
          </article>
        </div>

        <div className="integrity-gate__note">
          <strong>Kapı mantığı:</strong>
          <span>Herhangi bir BLOCKER → BLOCKER · blocker yok ama WARN varsa → WARN · tüm kontroller temizse → PASS.</span>
          <small>Üretim: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(report.generatedAt))}</small>
        </div>
      </section>

      <section className="integrity-controls" aria-labelledby="integrity-controls-title">
        <div className="system-map-section-heading">
          <div>
            <p>12 BAĞIMSIZ KONTROL</p>
            <h2 id="integrity-controls-title">Denetim matrisi</h2>
          </div>
          <span>{report.summary.controlsPass}/{report.summary.controlsTotal} PASS</span>
        </div>

        <div className="integrity-control-grid">
          {report.checks.map((check) => (
            <article key={check.id} data-status={check.status}>
              <div><StatusBadge status={check.status} /><code>{check.id}</code></div>
              <h3>{check.title}</h3>
              <p>{check.detail}</p>
              <small>{check.evidence}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="integrity-queue" aria-labelledby="integrity-queue-title">
        <div className="system-map-section-heading">
          <div>
            <p>TEK ÖNCELİK KUYRUĞU</p>
            <h2 id="integrity-queue-title">Kök bulgu → düzeltme → yeniden doğrulama</h2>
          </div>
          <span>{report.findings.length} kayıt</span>
        </div>

        {report.findings.length === 0 ? (
          <div className="integrity-all-clear">Tüm denetim katmanları temiz. Otomatik kontrolde açık puzzle parçası bulunmadı.</div>
        ) : (
          <div className="integrity-finding-list">
            {report.findings.map((finding, index) => (
              <details key={finding.id} data-status={finding.status} open={index < 4}>
                <summary>
                  <div className="integrity-finding__rank">#{index + 1}</div>
                  <div className="integrity-finding__title">
                    <span>{finding.domain}</span>
                    <strong>{finding.title}</strong>
                    <small>{finding.ownerHint} · {impactLabels[finding.impact]} · {confidenceLabels[finding.confidence]}</small>
                  </div>
                  <StatusBadge status={finding.status} />
                </summary>
                <div className="integrity-finding__body">
                  <p>{finding.detail}</p>
                  <div className="integrity-finding__meta">
                    <div><span>Düzeltme noktası</span><code>{finding.fixPoint}</code></div>
                    {finding.target ? <div><span>Hedef</span><code>{finding.target}</code></div> : null}
                    <div><span>Sahip ipucu</span><strong>{finding.ownerHint}</strong></div>
                    <div><span>Etki</span><strong>{impactLabels[finding.impact]}</strong></div>
                    <div><span>Kanıt güveni</span><strong>{confidenceLabels[finding.confidence]}</strong></div>
                  </div>
                  <div className="integrity-remediation">
                    <div><span>Ne yapılmalı?</span><p>{finding.remediation}</p></div>
                    <div><span>Nasıl kapanacak?</span><p>{finding.verification}</p></div>
                  </div>
                  <div className="integrity-evidence">
                    <span>Kanıt</span>
                    <div>{finding.evidence.map((item) => <code key={item}>{item}</code>)}</div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
