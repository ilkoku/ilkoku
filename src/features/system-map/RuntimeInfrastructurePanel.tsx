import type {
  InfrastructureStatus,
  RuntimeInfrastructureReport,
} from "./runtime-infrastructure";

const statusLabels: Record<InfrastructureStatus, string> = {
  blocker: "BLOCKER",
  pass: "PASS",
  unknown: "BİLİNMİYOR",
  warn: "WARN",
};

function StatusBadge({ status }: { status: InfrastructureStatus }) {
  return <span className="system-runtime-status" data-status={status}>{statusLabels[status]}</span>;
}

export function RuntimeInfrastructurePanel({ report }: { report: RuntimeInfrastructureReport }) {
  const overall: InfrastructureStatus = report.summary.blockers > 0
    ? "blocker"
    : report.summary.warnings > 0 || report.warnings.length > 0
      ? "warn"
      : "pass";

  return (
    <div className="system-runtime-root">
      <section className="system-runtime-command" aria-labelledby="runtime-command-title">
        <div className="system-map-section-heading">
          <div>
            <p>GÖRÜNMEYEN TESİSAT</p>
            <h2 id="runtime-command-title">Runtime / altyapı kontrol masası</h2>
          </div>
          <StatusBadge status={overall} />
        </div>

        <div className="system-runtime-summary">
          <article data-tone={report.summary.blockers ? "danger" : "ok"}><strong>{report.summary.blockers}</strong><span>BLOCKER</span><small>Redirect/rewrite veya altyapı sözleşmesi</small></article>
          <article data-tone={report.summary.warnings ? "warning" : "ok"}><strong>{report.summary.warnings}</strong><span>WARN</span><small>Belge / beklenmedik şema ayrışması</small></article>
          <article><strong>{report.summary.runtimeConfiguredEnv}/{report.summary.envKeys}</strong><span>ENV tanımlı</span><small>Değerler hiçbir zaman gösterilmez</small></article>
          <article><strong>{report.summary.routeRules - report.summary.routeRulesBroken}/{report.summary.routeRules}</strong><span>Route kuralı PASS</span><small>Redirect + rewrite</small></article>
          <article><strong>{report.summary.notificationProducers}</strong><span>Bildirim üreticisi</span><small>notification.create/createMany</small></article>
          <article><strong>{report.summary.emailProducers}</strong><span>E-posta üreticisi</span><small>sendEmail / email modülleri</small></article>
          <article><strong>{report.summary.schemaModels}</strong><span>Prisma modeli</span><small>{report.summary.schemaRelations} model ilişkisi</small></article>
          <article><strong>{report.schema.migrationCount}</strong><span>Migration</span><small>{report.summary.acknowledgedMigrationOnlyTables} bilinçli · {report.summary.unexpectedMigrationOnlyTables} beklenmedik migration-only</small></article>
        </div>
      </section>

      <section className="system-runtime-gaps" aria-labelledby="runtime-gaps-title">
        <div className="system-map-section-heading">
          <div><p>ALTYAPI BOŞLUKLARI</p><h2 id="runtime-gaps-title">Gözden kaçabilecek parçalar</h2></div>
          <span>{report.gaps.length} kayıt</span>
        </div>
        {report.gaps.length ? (
          <div className="system-runtime-gap-grid">
            {report.gaps.map((gap) => (
              <article key={gap.id} data-status={gap.status}>
                <div><StatusBadge status={gap.status} /><span>{gap.scope}</span></div>
                <h3>{gap.title}</h3>
                <p>{gap.detail}</p>
              </article>
            ))}
          </div>
        ) : <div className="system-runtime-clear">Runtime altyapı taramasında otomatik boşluk bulunmadı.</div>}
      </section>

      <section className="system-runtime-env" aria-labelledby="runtime-env-title">
        <div className="system-map-section-heading">
          <div><p>ENV SÖZLEŞMESİ</p><h2 id="runtime-env-title">Ortam değişkeni bağımlılıkları</h2></div>
          <span>{report.summary.documentedEnv}/{report.summary.envKeys} belgeli</span>
        </div>
        <div className="system-runtime-security-note">
          Bu masa yalnız anahtar adlarını ve tanımlı/tanımsız durumunu gösterir. ENV değerleri, parolalar, tokenlar ve bağlantı dizeleri render edilmez.
        </div>
        <div className="system-runtime-table-wrap">
          <table>
            <thead><tr><th>Anahtar</th><th>Runtime</th><th>.env.example</th><th>Tür</th><th>Kullanan dosya</th><th>Durum</th></tr></thead>
            <tbody>
              {report.env.map((item) => (
                <tr key={item.key}>
                  <td><code>{item.key}</code></td>
                  <td>{item.configured ? "Tanımlı" : "Tanımsız"}</td>
                  <td>{item.documented ? "Belgeli" : "Eksik"}</td>
                  <td>{item.public ? "Public" : item.secretLike ? "Gizli / hassas" : "Server"}</td>
                  <td><span className="system-runtime-file-list">{item.usedBy.join(" · ")}</span></td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="system-runtime-rules" aria-labelledby="runtime-rules-title">
        <div className="system-map-section-heading">
          <div><p>YÖNLENDİRME TESİSATI</p><h2 id="runtime-rules-title">Redirect / rewrite zinciri</h2></div>
          <span>{report.routeRules.length} kural</span>
        </div>
        <div className="system-runtime-rule-grid">
          {report.routeRules.map((rule) => (
            <article key={`${rule.kind}-${rule.source}`} data-status={rule.status}>
              <div><span>{rule.kind === "redirect" ? "REDIRECT" : "REWRITE"}</span><StatusBadge status={rule.status} /></div>
              <code>{rule.source}</code><strong>→</strong><code>{rule.destination}</code>
              <small>{rule.targetRoute ? `Route: ${rule.targetRoute}` : "İç hedef route eşleşmedi"}{rule.permanent === true ? " · permanent" : ""}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="system-runtime-events" aria-labelledby="runtime-events-title">
        <div className="system-map-section-heading">
          <div><p>OLAY / TESLİMAT AKIŞI</p><h2 id="runtime-events-title">Bildirim ve e-posta üreticileri</h2></div>
          <span>{report.eventProducers.length} üretici modül</span>
        </div>
        <div className="system-runtime-table-wrap system-runtime-table-wrap--wide">
          <table>
            <thead><tr><th>Kaynak</th><th>Bildirim</th><th>E-posta</th><th>Template</th><th>İlişkili kayıt türü</th></tr></thead>
            <tbody>
              {report.eventProducers.map((item) => (
                <tr key={item.sourceFile}>
                  <td><code>{item.sourceFile}</code></td>
                  <td>{item.notification ? "Evet" : "—"}</td>
                  <td>{item.email ? "Evet" : "—"}</td>
                  <td>{item.templates.length ? item.templates.map((value) => <code className="system-runtime-token" key={value}>{value}</code>) : "—"}</td>
                  <td>{item.relatedEntityTypes.length ? item.relatedEntityTypes.map((value) => <code className="system-runtime-token" key={value}>{value}</code>) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="system-runtime-schema" aria-labelledby="runtime-schema-title">
        <div className="system-map-section-heading">
          <div><p>VERİ İLİŞKİ HARİTASI</p><h2 id="runtime-schema-title">Prisma modelleri ve migration yüzeyi</h2></div>
          <span>Son migration: {report.schema.latestMigration ?? "—"}</span>
        </div>

        {report.schema.acknowledgedMigrationOnlyTables.length ? (
          <div className="system-runtime-migration-only">
            <strong>Bilinçli raw-SQL / migration-only sınırı · ACKNOWLEDGED</strong>
            <p>{report.schema.acknowledgedMigrationOnlyTables.map((table) => <code key={table}>{table}</code>)}</p>
          </div>
        ) : null}

        {report.schema.unexpectedMigrationOnlyTables.length ? (
          <div className="system-runtime-migration-only">
            <strong>İnceleme gerekli · beklenmedik migration-only tablolar</strong>
            <p>{report.schema.unexpectedMigrationOnlyTables.map((table) => <code key={table}>{table}</code>)}</p>
          </div>
        ) : null}

        <div className="system-runtime-model-grid">
          {report.schema.models.map((model) => (
            <article key={model.model}>
              <div><strong>{model.model}</strong><span>{model.degree} ilişki</span></div>
              <p>{model.relations.length ? model.relations.join(" · ") : "Doğrudan model ilişkisi yok"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="system-runtime-external" aria-labelledby="runtime-external-title">
        <div className="system-map-section-heading">
          <div><p>DIŞ REFERANS YÜZEYİ</p><h2 id="runtime-external-title">Statik dış domain referansları</h2></div>
          <span>{report.externalDomains.length} domain</span>
        </div>
        <p className="system-runtime-caption">Bu liste otomatik olarak “aktif entegrasyon” iddiası taşımaz; kaynak kodda geçen dış HTTP(S) domainlerini görünür yapar.</p>
        <div className="system-runtime-domain-grid">
          {report.externalDomains.map((item) => (
            <article key={item.domain}><strong>{item.domain}</strong><span>{item.sourceFiles.length} dosya</span><small>{item.sourceFiles.join(" · ")}</small></article>
          ))}
        </div>
      </section>

      {report.warnings.length ? (
        <section className="system-runtime-warnings"><h2>Altyapı tarama uyarıları</h2><ul>{report.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>
      ) : null}
    </div>
  );
}
