import Link from "next/link";
import type { IntegrityControlReport } from "./integrity-control";
import type { SystemOperationsReport } from "./operations";
import type { SystemMapSnapshot } from "./types";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function cleanTarget(value: string | null) {
  if (!value) return null;
  return value.split(/[?#]/u)[0]?.replace(/\/$/u, "") || "/";
}

function healthScore(report: IntegrityControlReport) {
  const penalty = report.summary.blockers * 10 + report.summary.warnings * 3;
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function SystemMapArchitecturePanel({
  integrity,
  operations,
  snapshot,
}: {
  integrity: IntegrityControlReport;
  operations: SystemOperationsReport;
  snapshot: SystemMapSnapshot;
}) {
  const publicHandlers = operations.apiSurface.filter((item) => item.accessMode === "public");
  const publicMutations = publicHandlers.filter((item) => item.methods.some((method) => mutationMethods.has(method)));
  const dynamicRoutes = snapshot.routes.filter((route) => route.dynamic).length;
  const protectedRoutes = snapshot.routes.filter((route) => route.accessMode !== "public").length;
  const score = healthScore(integrity);

  const areas = [...new Set(snapshot.routes.map((route) => route.area))]
    .sort((left, right) => left.localeCompare(right, "tr"))
    .map((area) => {
      const routes = snapshot.routes.filter((route) => route.area === area);
      const routeNames = new Set(routes.map((route) => route.route));
      const findings = integrity.findings.filter((finding) => {
        const target = cleanTarget(finding.target);
        return target ? routeNames.has(target) : false;
      });
      return {
        area,
        blockers: findings.filter((finding) => finding.status === "blocker").length,
        protected: routes.filter((route) => route.accessMode !== "public").length,
        total: routes.length,
        warnings: findings.filter((finding) => finding.status === "warn").length,
      };
    });

  return (
    <div className="system-map-workbench">
      <section className="system-map-command-center" aria-labelledby="architecture-health-title">
        <div className="system-map-section-heading">
          <div>
            <p>KANONİK MİMARİ SAĞLIK</p>
            <h2 id="architecture-health-title">Kanıtlı bütünlük sinyalleri</h2>
          </div>
          <span>{integrity.summary.blockers + integrity.summary.warnings} açık bulgu</span>
        </div>

        <div className="system-map-command-grid">
          <article
            className="system-map-health-score"
            data-level={integrity.summary.blockers > 0 ? "critical" : integrity.summary.warnings > 0 ? "warning" : "ok"}
          >
            <span className="system-map-health-score__label">Mimari sağlık</span>
            <strong>{score}</strong>
            <span className="system-map-health-score__suffix">/100</span>
            <p>
              {integrity.summary.blockers > 0
                ? `${integrity.summary.blockers} kanıtlı BLOCKER önce çözülmeli.`
                : integrity.summary.warnings > 0
                  ? `${integrity.summary.warnings} kanıtlı WARN inceleme kuyruğunda.`
                  : "Kanıtlı BLOCKER veya WARN görünmüyor."}
            </p>
          </article>

          <div className="system-map-command-metrics">
            <article>
              <strong>{integrity.summary.blockers}</strong><span>BLOCKER</span><small>Kanıtlı kritik</small>
            </article>
            <article>
              <strong>{integrity.summary.warnings}</strong><span>WARN</span><small>Kanıtlı uyarı</small>
            </article>
            <article>
              <strong>{publicHandlers.length}</strong><span>Public API</span><small>Tek başına risk değildir</small>
            </article>
            <article>
              <strong>{publicMutations.length}</strong><span>Public mutation</span><small>API masasında izlenir</small>
            </article>
          </div>

          <div className="system-map-access-overview" aria-label="Mimari kapsama özeti">
            <h3>Kapsama</h3>
            <div>
              <div><span><strong>Toplam route</strong><small>Canlı envanter</small></span><span>{snapshot.routes.length}</span></div>
              <div><span><strong>Korumalı route</strong><small>Public olmayan</small></span><span>{protectedRoutes}</span></div>
              <div><span><strong>Dinamik route</strong><small>Parametreli yüzey</small></span><span>{dynamicRoutes}</span></div>
              <div><span><strong>Kontrol PASS</strong><small>Fail-closed kapılar</small></span><span>{integrity.summary.controlsPass}/{integrity.summary.controlsTotal}</span></div>
            </div>
          </div>
        </div>

        <div className="system-map-focus-bar" aria-label="Mimari sağlık kaynakları">
          <Link href="/harita/denetim">Denetim Kapısı</Link>
          <Link href="/harita/api">API Güvenliği</Link>
          <Link href="/harita/akislar">Kanonik Akışlar</Link>
          <Link href="/harita/rotalar">Route Envanteri</Link>
        </div>
      </section>

      <section className="system-map-action-queue" aria-labelledby="architecture-findings-title">
        <div className="system-map-section-heading">
          <div>
            <p>ÖNCELİKLİ KONTROL</p>
            <h2 id="architecture-findings-title">Kanıtlı mimari bulgular</h2>
          </div>
          <span>{integrity.findings.length} kayıt</span>
        </div>

        {integrity.findings.length > 0 ? (
          <div className="system-map-action-list">
            {integrity.findings.slice(0, 12).map((finding) => (
              <article key={finding.id}>
                <span className="system-map-action-list__main">
                  <strong>{finding.title}</strong>
                  <small>{finding.domain} · {finding.ownerHint}</small>
                </span>
                <span className="system-map-action-list__signals">
                  <span data-level={finding.status === "blocker" ? "critical" : "warning"}>{finding.detail}</span>
                </span>
                <span className="system-map-action-list__status" data-level={finding.status === "blocker" ? "critical" : "warning"}>
                  {finding.status === "blocker" ? "Kritik" : "Kontrol"}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="system-map-empty">Kanıtlı mimari BLOCKER veya WARN yok.</div>
        )}
      </section>

      <section className="system-map-area-coverage" aria-labelledby="architecture-area-title">
        <div className="system-map-section-heading">
          <div>
            <p>ALAN KAPSAMASI</p>
            <h2 id="architecture-area-title">Çalışma alanları</h2>
          </div>
          <span>{areas.length} alan</span>
        </div>
        <div className="system-map-area-grid">
          {areas.map((item) => (
            <article key={item.area}>
              <strong>{item.area}</strong>
              <span>{item.total} route</span>
              <small>
                {item.protected} korumalı · {item.blockers} blocker · {item.warnings} warn
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="system-map-action-queue" aria-labelledby="architecture-public-api-title">
        <div className="system-map-section-heading">
          <div>
            <p>PUBLIC YÜZEY</p>
            <h2 id="architecture-public-api-title">Public API sınıflandırması</h2>
          </div>
          <Link href="/harita/api">API çalışma masasını aç →</Link>
        </div>
        <div className="system-map-action-list">
          {publicHandlers.map((handler) => {
            const mutation = handler.methods.some((method) => mutationMethods.has(method));
            const level = handler.status === "blocker" ? "critical" : handler.status === "warn" || handler.status === "unknown" ? "warning" : "info";
            return (
              <article key={handler.route}>
                <span className="system-map-action-list__main">
                  <code>{handler.route}</code>
                  <small>{handler.methods.join(", ") || "Method bilinmiyor"} · {handler.accessLabel}</small>
                </span>
                <span className="system-map-action-list__signals">
                  <span data-level={level}>
                    {mutation ? "Public yazma yüzeyi · API kanıt zinciriyle izleniyor" : "Public okuma yüzeyi · yayınlanmış/public veri"}
                  </span>
                </span>
                <span className="system-map-action-list__status" data-level={level}>
                  {handler.status === "pass" ? "Doğrulandı" : handler.status === "blocker" ? "Kritik" : "Kontrol"}
                </span>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
