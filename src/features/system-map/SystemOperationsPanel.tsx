import type {
  OperationStatus,
  SystemOperationsReport,
} from "./operations";

const statusLabels: Record<OperationStatus, string> = {
  blocker: "BLOCKER",
  pass: "PASS",
  unknown: "BİLİNMİYOR",
  warn: "WARN",
};

function StatusBadge({ status }: { status: OperationStatus }) {
  return <span className="system-ops-status" data-status={status}>{statusLabels[status]}</span>;
}

export function SystemOperationsPanel({ report }: { report: SystemOperationsReport }) {
  const overallStatus: OperationStatus = report.summary.blockers > 0
    ? "blocker"
    : report.summary.warnings > 0 || report.scanMode === "limited"
      ? "warn"
      : "pass";

  return (
    <div className="system-ops-root">
      <section className="system-ops-command" aria-labelledby="system-ops-command-title">
        <div className="system-map-section-heading">
          <div>
            <p>OPERASYON KONTROLÜ</p>
            <h2 id="system-ops-command-title">Eksik puzzle parçası denetimi</h2>
          </div>
          <StatusBadge status={overallStatus} />
        </div>

        <div className="system-ops-summary-grid">
          <article data-tone={report.summary.blockers > 0 ? "danger" : "ok"}>
            <strong>{report.summary.blockers}</strong><span>BLOCKER</span><small>Akışı veya güvenliği doğrudan etkileyebilir</small>
          </article>
          <article data-tone={report.summary.warnings > 0 ? "warning" : "ok"}>
            <strong>{report.summary.warnings}</strong><span>WARN</span><small>Manuel doğrulama / bağlantı kontrolü</small>
          </article>
          <article>
            <strong>{report.summary.workflowPass}/{report.workflowChecks.length}</strong><span>Akış PASS</span><small>{report.summary.workflowBlockers} blocker · {report.summary.workflowWarnings} warn</small>
          </article>
          <article data-tone={report.summary.menuTargetsBroken > 0 ? "danger" : "ok"}>
            <strong>{report.summary.menuTargets - report.summary.menuTargetsBroken}/{report.summary.menuTargets}</strong><span>Menü hedefi</span><small>{report.summary.menuTargetsBroken} kırık hedef</small>
          </article>
          <article>
            <strong>{report.summary.routeDependencyCoverage}%</strong><span>Bağımlılık kapsaması</span><small>Route → modül → action/data izi</small>
          </article>
          <article>
            <strong>{report.summary.actions}</strong><span>Server action</span><small>{report.summary.actionModules} action modülü</small>
          </article>
          <article>
            <strong>{report.summary.dataModules}</strong><span>Veri modülü</span><small>Prisma modeli / raw SQL izi</small>
          </article>
          <article>
            <strong>{report.summary.apiHandlers}</strong><span>API / handler</span><small>HTTP ve guard yüzeyi</small>
          </article>
        </div>

        <div className="system-ops-scan-note">
          <strong>Derin tarama:</strong> {report.scanMode === "source" ? "Kaynak kod + import bağımlılık grafiği aktif" : "Sınırlı mod"}
          <span>Üretim: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(report.generatedAt))}</span>
        </div>
      </section>

      <section className="system-ops-gaps" aria-labelledby="system-ops-gaps-title">
        <div className="system-map-section-heading">
          <div>
            <p>PUZZLE BOŞLUKLARI</p>
            <h2 id="system-ops-gaps-title">Eksik / riskli parçalar</h2>
          </div>
          <span>{report.gaps.length} kayıt</span>
        </div>

        {report.gaps.length > 0 ? (
          <div className="system-ops-gap-list">
            {report.gaps.map((gap) => (
              <article key={gap.id} data-status={gap.status}>
                <div className="system-ops-gap-heading">
                  <StatusBadge status={gap.status} />
                  <span>{gap.scope}</span>
                </div>
                <h3>{gap.title}</h3>
                <p>{gap.detail}</p>
                <dl>
                  <div><dt>Kaynak</dt><dd><code>{gap.source}</code></dd></div>
                  {gap.target ? <div><dt>Hedef</dt><dd><code>{gap.target}</code></dd></div> : null}
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="system-ops-all-clear">Otomatik denetimde eksik puzzle parçası bulunmadı.</div>
        )}
      </section>

      <section className="system-ops-workflows" aria-labelledby="system-ops-workflows-title">
        <div className="system-map-section-heading">
          <div>
            <p>UÇTAN UCA ÇAPRAZ KONTROL</p>
            <h2 id="system-ops-workflows-title">Kanonik kullanıcı akışları</h2>
          </div>
          <span>{report.workflowChecks.length} akış</span>
        </div>

        <div className="system-ops-workflow-grid">
          {report.workflowChecks.map((workflow) => (
            <article key={workflow.id} data-status={workflow.status}>
              <div className="system-ops-workflow-heading">
                <h3>{workflow.title}</h3>
                <StatusBadge status={workflow.status} />
              </div>
              <p>{workflow.description}</p>
              <ol>
                {workflow.steps.map((step) => (
                  <li key={`${workflow.id}-${step.label}`}>
                    <StatusBadge status={step.status} />
                    <div>
                      <code>{step.label}</code>
                      {step.matchedRoutes.length > 0 ? <small>Route: {step.matchedRoutes.join(", ")}</small> : <small>İşlem / manuel süreç adımı</small>}
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="system-ops-menu" aria-labelledby="system-ops-menu-title">
        <div className="system-map-section-heading">
          <div>
            <p>MENÜ → ROUTE</p>
            <h2 id="system-ops-menu-title">Rol menüsü hedef doğrulaması</h2>
          </div>
          <span>{report.summary.menuTargets - report.summary.menuTargetsBroken}/{report.summary.menuTargets} geçerli</span>
        </div>

        <div className="system-ops-table-wrap">
          <table>
            <thead><tr><th>Menü</th><th>Öğe</th><th>Hedef</th><th>Eşleşen route</th><th>Durum</th></tr></thead>
            <tbody>
              {report.menuChecks.map((item) => (
                <tr key={`${item.menuLabel}-${item.itemLabel}-${item.href}`}>
                  <td>{item.menuLabel}</td>
                  <td>{item.itemLabel}</td>
                  <td><code>{item.href}</code></td>
                  <td>{item.matchedRoute ? <code>{item.matchedRoute}</code> : "—"}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="system-ops-dependencies" aria-labelledby="system-ops-dependencies-title">
        <div className="system-map-section-heading">
          <div>
            <p>ROUTE → ACTION → DATA</p>
            <h2 id="system-ops-dependencies-title">Çalışma bağımlılık zinciri</h2>
          </div>
          <span>{report.routeDependencies.length} sayfa route&apos;u</span>
        </div>

        <div className="system-ops-table-wrap system-ops-table-wrap--wide">
          <table>
            <thead><tr><th>Route</th><th>Import bağımlılığı</th><th>Server action</th><th>Veri modeli</th><th>API hedefi</th><th>İz</th></tr></thead>
            <tbody>
              {report.routeDependencies.map((item) => (
                <tr key={item.route}>
                  <td><code>{item.route}</code><small>{item.sourceFile}</small></td>
                  <td>{item.dependencyCount}</td>
                  <td>{item.serverActions.length > 0 ? item.serverActions.slice(0, 8).map((action) => <code className="system-ops-token" key={action}>{action}</code>) : "—"}</td>
                  <td>{item.dataModels.length > 0 ? item.dataModels.slice(0, 10).map((model) => <code className="system-ops-token" key={model}>{model}</code>) : "—"}</td>
                  <td>{item.apiTargets.length > 0 ? item.apiTargets.slice(0, 8).map((target) => <code className="system-ops-token" key={target}>{target}</code>) : "—"}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="system-ops-split">
        <div className="system-ops-pane">
          <div className="system-map-section-heading">
            <div><p>SERVER ACTION</p><h2>Action modülleri</h2></div>
            <span>{report.summary.actions} action</span>
          </div>
          <div className="system-ops-details-list">
            {report.actionModules.map((module) => (
              <details key={module.sourceFile}>
                <summary><code>{module.sourceFile}</code><span>{module.actions.length} action · {module.consumers.length} referans</span></summary>
                <div><strong>Action&apos;lar</strong><p>{module.actions.join(", ")}</p><strong>Referans veren modüller</strong><p>{module.consumers.length > 0 ? module.consumers.join(" · ") : "Doğrudan statik referans bulunamadı"}</p></div>
              </details>
            ))}
          </div>
        </div>

        <div className="system-ops-pane">
          <div className="system-map-section-heading">
            <div><p>VERİ KATMANI</p><h2>Prisma / raw SQL izleri</h2></div>
            <span>{report.dataModules.length} modül</span>
          </div>
          <div className="system-ops-details-list">
            {report.dataModules.map((module) => (
              <details key={module.sourceFile}>
                <summary><code>{module.sourceFile}</code><span>{module.models.length} model{module.rawSql ? " · raw SQL" : ""}</span></summary>
                <div><strong>Modeller</strong><p>{module.models.length > 0 ? module.models.join(", ") : "Model adı statik olarak çıkarılamadı"}</p><strong>Raw SQL</strong><p>{module.rawSql ? "Evet — ayrıca manuel sorgu yüzeyi var" : "Hayır"}</p></div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="system-ops-api" aria-labelledby="system-ops-api-title">
        <div className="system-map-section-heading">
          <div><p>API / HANDLER YÜZEYİ</p><h2 id="system-ops-api-title">HTTP ve guard kanıtı</h2></div>
          <span>{report.apiSurface.length} handler</span>
        </div>
        <div className="system-ops-table-wrap">
          <table>
            <thead><tr><th>Route</th><th>Method</th><th>Erişim</th><th>Guard kanıtı</th><th>Durum</th></tr></thead>
            <tbody>
              {report.apiSurface.map((item) => (
                <tr key={item.route}>
                  <td><code>{item.route}</code><small>{item.sourceFile}</small></td>
                  <td>{item.methods.length > 0 ? item.methods.join(", ") : "—"}</td>
                  <td>{item.accessLabel}</td>
                  <td>{item.guardEvidence.length > 0 ? item.guardEvidence.join(", ") : "Statik kanıt yok"}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {report.warnings.length > 0 ? (
        <section className="system-ops-runtime-warnings">
          <h2>Derin tarama uyarıları</h2>
          <ul>{report.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
