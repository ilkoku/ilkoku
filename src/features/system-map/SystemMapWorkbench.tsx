"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  SystemMapAccessMode,
  SystemMapRouteKind,
  SystemMapRouteRecord,
  SystemMapSnapshot,
} from "./types";

const accessLabels: Record<SystemMapAccessMode, string> = {
  public: "Public",
  authenticated: "Oturum",
  role: "Rol",
  publisher_membership: "Yayınevi üyeliği",
  admin: "Admin",
};

const kindLabels: Record<SystemMapRouteKind, string> = {
  page: "Sayfa",
  handler: "API / Handler",
  alias: "Alias",
};

type FocusFilter =
  | "all"
  | "attention"
  | "public_handlers"
  | "unlinked"
  | "admin"
  | "dynamic";

type RiskLevel = "critical" | "warning" | "info";

type RiskSignal = {
  label: string;
  level: RiskLevel;
};

const focusLabels: Array<{ key: FocusFilter; label: string }> = [
  { key: "all", label: "Tüm envanter" },
  { key: "attention", label: "Dikkat gerekenler" },
  { key: "public_handlers", label: "Public API / handler" },
  { key: "unlinked", label: "Giriş bağlantısı olmayan" },
  { key: "admin", label: "Admin yüzeyi" },
  { key: "dynamic", label: "Dinamik route" },
];

function inboundCount(route: SystemMapRouteRecord) {
  return route.inbound.length + route.menuReferences.length;
}

function riskSignals(route: SystemMapRouteRecord): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const entryCount = inboundCount(route);

  if (route.accessMode === "role" && route.roles.length === 0) {
    signals.push({ label: "Rol politikası boş", level: "critical" });
  }

  if (route.accessMode === "admin" && !route.roles.includes("admin")) {
    signals.push({ label: "Admin rol tanımı eksik", level: "critical" });
  }

  if (route.orphanCandidate) {
    signals.push({ label: "Yetim route adayı", level: "warning" });
  }

  if (route.dynamic && entryCount === 0) {
    signals.push({ label: "Dinamik route için giriş bağlantısı bulunamadı", level: "warning" });
  }

  if (
    route.kind === "page" &&
    route.accessMode !== "admin" &&
    route.route !== "/" &&
    entryCount === 0
  ) {
    signals.push({ label: "Menü veya kaynak giriş bağlantısı yok", level: "info" });
  }

  return signals;
}

function priorityScore(route: SystemMapRouteRecord) {
  return riskSignals(route).reduce((score, signal) => {
    if (signal.level === "critical") return score + 100;
    if (signal.level === "warning") return score + 20;
    return score + 5;
  }, 0);
}

function highestRisk(route: SystemMapRouteRecord): RiskLevel | "ok" {
  const signals = riskSignals(route);
  if (signals.some((signal) => signal.level === "critical")) return "critical";
  if (signals.some((signal) => signal.level === "warning")) return "warning";
  if (signals.length > 0) return "info";
  return "ok";
}

export function SystemMapWorkbench({ snapshot }: { snapshot: SystemMapSnapshot }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [access, setAccess] = useState<"all" | SystemMapAccessMode>("all");
  const [kind, setKind] = useState<"all" | SystemMapRouteKind>("all");
  const [focus, setFocus] = useState<FocusFilter>("all");
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const areas = useMemo(
    () => [...new Set(snapshot.routes.map((route) => route.area))].sort((left, right) => left.localeCompare(right, "tr")),
    [snapshot.routes],
  );

  const controlSummary = useMemo(() => {
    let critical = 0;
    let warnings = 0;
    let informational = 0;
    let publicHandlers = 0;
    let dynamicRoutes = 0;
    let menuCovered = 0;

    for (const route of snapshot.routes) {
      const level = highestRisk(route);
      if (level === "critical") critical += 1;
      if (level === "warning") warnings += 1;
      if (level === "info") informational += 1;
      if (route.kind === "handler" && route.accessMode === "public") publicHandlers += 1;
      if (route.dynamic) dynamicRoutes += 1;
      if (route.menuReferences.length > 0) menuCovered += 1;
    }

    const penalty = critical * 7 + warnings * 2 + Math.min(informational, 10);
    const healthScore = Math.max(0, Math.min(100, 100 - penalty));

    return {
      critical,
      dynamicRoutes,
      healthScore,
      informational,
      menuCovered,
      publicHandlers,
      queue: critical + warnings + informational,
      warnings,
    };
  }, [snapshot.routes]);

  const areaStats = useMemo(
    () => areas.map((item) => {
      const routes = snapshot.routes.filter((route) => route.area === item);
      const attention = routes.filter((route) => highestRisk(route) !== "ok").length;
      const protectedCount = routes.filter((route) => route.accessMode !== "public").length;
      return {
        attention,
        name: item,
        protectedCount,
        total: routes.length,
      };
    }),
    [areas, snapshot.routes],
  );

  const accessStats = useMemo(
    () => Object.entries(accessLabels).map(([mode, label]) => {
      const count = snapshot.routes.filter((route) => route.accessMode === mode).length;
      return {
        count,
        label,
        mode: mode as SystemMapAccessMode,
        ratio: snapshot.routes.length > 0 ? Math.round((count / snapshot.routes.length) * 100) : 0,
      };
    }),
    [snapshot.routes],
  );

  const actionQueue = useMemo(
    () => snapshot.routes
      .filter((route) => priorityScore(route) > 0)
      .sort((left, right) => priorityScore(right) - priorityScore(left) || left.route.localeCompare(right.route))
      .slice(0, 12),
    [snapshot.routes],
  );

  const filteredRoutes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");

    return snapshot.routes.filter((route) => {
      const entryCount = inboundCount(route);
      const routeNeedsAttention = highestRisk(route) !== "ok";

      if (area !== "all" && route.area !== area) return false;
      if (access !== "all" && route.accessMode !== access) return false;
      if (kind !== "all" && route.kind !== kind) return false;
      if (focus === "attention" && !routeNeedsAttention) return false;
      if (focus === "public_handlers" && !(route.kind === "handler" && route.accessMode === "public")) return false;
      if (focus === "unlinked" && entryCount > 0) return false;
      if (focus === "admin" && route.accessMode !== "admin") return false;
      if (focus === "dynamic" && !route.dynamic) return false;
      if (!needle) return true;

      const haystack = [
        route.route,
        route.area,
        route.accessLabel,
        route.sourceFile,
        ...route.roles,
        ...riskSignals(route).map((signal) => signal.label),
        ...route.inbound,
        ...route.outbound,
        ...route.menuReferences.flatMap((menu) => [menu.menuLabel, menu.itemLabel, menu.href]),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return haystack.includes(needle);
    });
  }, [access, area, focus, kind, query, snapshot.routes]);

  const selected = snapshot.routes.find((route) => route.route === selectedRoute) ?? null;
  const selectedSignals = selected ? riskSignals(selected) : [];

  function applyFocus(nextFocus: FocusFilter) {
    setFocus(nextFocus);
    setArea("all");
    setAccess("all");
    setKind("all");
  }

  return (
    <div className="system-map-workbench">
      <section className="system-map-command-center" aria-labelledby="system-command-center-title">
        <div className="system-map-section-heading">
          <div>
            <p>KONTROL MERKEZİ</p>
            <h2 id="system-command-center-title">Mimari sağlık ve aksiyon masası</h2>
          </div>
          <span>{controlSummary.queue} kontrol sinyali</span>
        </div>

        <div className="system-map-command-grid">
          <article className="system-map-health-score" data-level={controlSummary.critical > 0 ? "critical" : controlSummary.warnings > 0 ? "warning" : "ok"}>
            <span className="system-map-health-score__label">Mimari sağlık</span>
            <strong>{controlSummary.healthScore}</strong>
            <span className="system-map-health-score__suffix">/100</span>
            <p>
              {controlSummary.critical > 0
                ? `${controlSummary.critical} kritik erişim sinyali önce incelenmeli.`
                : controlSummary.warnings > 0
                  ? `${controlSummary.warnings} route kontrol kuyruğunda.`
                  : "Kritik mimari sinyal görünmüyor."}
            </p>
          </article>

          <div className="system-map-command-metrics">
            <button type="button" onClick={() => applyFocus("attention")}>
              <strong>{controlSummary.queue}</strong><span>Aksiyon kuyruğu</span><small>Kritik + uyarı + bilgi</small>
            </button>
            <button type="button" onClick={() => applyFocus("public_handlers")}>
              <strong>{controlSummary.publicHandlers}</strong><span>Public handler</span><small>Erişim yüzeyi</small>
            </button>
            <button type="button" onClick={() => applyFocus("dynamic")}>
              <strong>{controlSummary.dynamicRoutes}</strong><span>Dinamik route</span><small>Parametreli yüzey</small>
            </button>
            <article>
              <strong>{controlSummary.menuCovered}</strong><span>Menü bağlantılı</span><small>{snapshot.routes.length} route içinde</small>
            </article>
          </div>

          <div className="system-map-access-overview" aria-label="Erişim dağılımı">
            <h3>Erişim dağılımı</h3>
            <div>
              {accessStats.map((item) => (
                <button
                  type="button"
                  key={item.mode}
                  onClick={() => {
                    setAccess(item.mode);
                    setFocus("all");
                  }}
                >
                  <span><strong>{item.label}</strong><small>{item.count} route</small></span>
                  <span>{item.ratio}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="system-map-focus-bar" aria-label="Hızlı odak filtreleri">
          {focusLabels.map((item) => (
            <button
              type="button"
              key={item.key}
              data-active={focus === item.key ? "true" : undefined}
              onClick={() => applyFocus(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="system-map-action-queue" aria-labelledby="system-action-queue-title">
        <div className="system-map-section-heading">
          <div>
            <p>ÖNCELİKLİ KONTROL</p>
            <h2 id="system-action-queue-title">Aksiyon kuyruğu</h2>
          </div>
          <span>En yüksek öncelikli {actionQueue.length} kayıt</span>
        </div>

        {actionQueue.length > 0 ? (
          <div className="system-map-action-list">
            {actionQueue.map((route) => {
              const signals = riskSignals(route);
              const level = highestRisk(route);
              return (
                <button type="button" key={`${route.kind}-${route.route}`} onClick={() => setSelectedRoute(route.route)}>
                  <span className="system-map-action-list__main">
                    <code>{route.route}</code>
                    <small>{route.area} · {kindLabels[route.kind]} · {accessLabels[route.accessMode]}</small>
                  </span>
                  <span className="system-map-action-list__signals">
                    {signals.slice(0, 2).map((signal) => (
                      <span key={signal.label} data-level={signal.level}>{signal.label}</span>
                    ))}
                  </span>
                  <span className="system-map-action-list__status" data-level={level}>{level === "critical" ? "Kritik" : level === "warning" ? "Kontrol" : "İncele"}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="system-map-empty">Aksiyon kuyruğunda kayıt yok.</div>
        )}
      </section>

      <section className="system-map-area-coverage" aria-labelledby="system-area-coverage-title">
        <div className="system-map-section-heading">
          <div>
            <p>ALAN KAPSAMASI</p>
            <h2 id="system-area-coverage-title">Çalışma alanları</h2>
          </div>
          <span>{areaStats.length} alan</span>
        </div>
        <div className="system-map-area-grid">
          {areaStats.map((item) => (
            <button
              type="button"
              key={item.name}
              data-active={area === item.name ? "true" : undefined}
              onClick={() => {
                setArea(item.name);
                setFocus("all");
              }}
            >
              <strong>{item.name}</strong>
              <span>{item.total} route</span>
              <small>{item.protectedCount} korumalı · {item.attention} kontrol sinyali</small>
            </button>
          ))}
        </div>
      </section>

      <section className="system-map-metrics" aria-label="Sistem haritası özeti">
        <article><strong>{snapshot.stats.total}</strong><span>Toplam route</span></article>
        <article><strong>{snapshot.stats.pages}</strong><span>Sayfa</span></article>
        <article><strong>{snapshot.stats.apiHandlers}</strong><span>API / handler</span></article>
        <article><strong>{snapshot.stats.protectedRoutes}</strong><span>Korumalı</span></article>
        <article><strong>{snapshot.stats.publicRoutes}</strong><span>Public</span></article>
        <article data-warning={snapshot.stats.orphanCandidates > 0 ? "true" : undefined}>
          <strong>{snapshot.stats.orphanCandidates}</strong><span>Yetim adayı</span>
        </article>
      </section>

      <section className="system-map-workflows" aria-labelledby="system-workflows-title">
        <div className="system-map-section-heading">
          <div>
            <p>UÇTAN UCA AKIŞLAR</p>
            <h2 id="system-workflows-title">İlkOku nasıl çalışıyor?</h2>
          </div>
          <span>{snapshot.workflows.length} kanonik akış</span>
        </div>

        <div className="system-map-workflow-grid">
          {snapshot.workflows.map((workflow) => (
            <article key={workflow.id}>
              <div className="system-map-workflow-card-heading">
                <h3>{workflow.title}</h3>
                <span>İzleniyor</span>
              </div>
              <p>{workflow.description}</p>
              <ol>
                {workflow.steps.map((step) => <li key={`${workflow.id}-${step}`}><code>{step}</code></li>)}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="system-map-routes" aria-labelledby="system-routes-title">
        <div className="system-map-section-heading">
          <div>
            <p>CANLI ENVANTER</p>
            <h2 id="system-routes-title">Route ve bağlantı çalışma masası</h2>
          </div>
          <span>{filteredRoutes.length} / {snapshot.routes.length} kayıt</span>
        </div>

        <div className="system-map-filters">
          <label className="system-map-search">
            <span>Route, kaynak, menü, risk veya bağlantı ara</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="/eserlerim, yayınevi, public handler..."
            />
          </label>

          <label>
            <span>Alan</span>
            <select value={area} onChange={(event) => setArea(event.target.value)}>
              <option value="all">Tüm alanlar</option>
              {areas.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label>
            <span>Erişim</span>
            <select value={access} onChange={(event) => setAccess(event.target.value as "all" | SystemMapAccessMode)}>
              <option value="all">Tümü</option>
              {Object.entries(accessLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label>
            <span>Tür</span>
            <select value={kind} onChange={(event) => setKind(event.target.value as "all" | SystemMapRouteKind)}>
              <option value="all">Tümü</option>
              {Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <button
            type="button"
            className="system-map-reset-filter"
            onClick={() => {
              setQuery("");
              setArea("all");
              setAccess("all");
              setKind("all");
              setFocus("all");
            }}
          >
            Filtreleri temizle
          </button>
        </div>

        <div className="system-map-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Alan</th>
                <th>Tür</th>
                <th>Erişim</th>
                <th>Giriş</th>
                <th>Çıkış</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route) => {
                const level = highestRisk(route);
                return (
                  <tr key={`${route.kind}-${route.route}`}>
                    <td>
                      <button type="button" className="system-map-route-button" onClick={() => setSelectedRoute(route.route)}>
                        <code>{route.route}</code>
                        <small>{route.sourceFile}</small>
                      </button>
                    </td>
                    <td>{route.area}</td>
                    <td><span className="system-map-chip">{kindLabels[route.kind]}</span></td>
                    <td><span className="system-map-chip" data-access={route.accessMode}>{accessLabels[route.accessMode]}</span></td>
                    <td>{inboundCount(route)}</td>
                    <td>{route.outbound.length}</td>
                    <td>
                      <span className="system-map-health" data-status={level}>
                        {level === "critical" ? "Kritik" : level === "warning" ? "Kontrol et" : level === "info" ? "İncele" : "Haritalandı"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredRoutes.length === 0 ? (
            <div className="system-map-empty">Bu filtrelerle eşleşen route bulunamadı.</div>
          ) : null}
        </div>
      </section>

      {selected ? (
        <div className="system-map-drawer-backdrop" role="presentation" onClick={() => setSelectedRoute(null)}>
          <aside className="system-map-drawer" role="dialog" aria-modal="true" aria-labelledby="system-route-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="system-map-drawer__heading">
              <div>
                <p>{selected.area}</p>
                <h2 id="system-route-detail-title"><code>{selected.route}</code></h2>
              </div>
              <button type="button" onClick={() => setSelectedRoute(null)} aria-label="Detayı kapat">×</button>
            </div>

            {selectedSignals.length > 0 ? (
              <section className="system-map-drawer-alerts" aria-label="Route kontrol sinyalleri">
                <h3>Kontrol sinyalleri</h3>
                <div>
                  {selectedSignals.map((signal) => <span key={signal.label} data-level={signal.level}>{signal.label}</span>)}
                </div>
              </section>
            ) : (
              <div className="system-map-drawer-ok">Bu route için otomatik kontrol sinyali yok.</div>
            )}

            <dl className="system-map-detail-list">
              <div><dt>Kaynak</dt><dd><code>{selected.sourceFile}</code></dd></div>
              <div><dt>Erişim</dt><dd>{selected.accessLabel}</dd></div>
              <div><dt>Roller</dt><dd>{selected.roles.length ? selected.roles.join(", ") : "—"}</dd></div>
              <div><dt>Dinamik route</dt><dd>{selected.dynamic ? "Evet" : "Hayır"}</dd></div>
              <div><dt>Rol onayı</dt><dd>{selected.approvedRoleRequired ? "Gerekli" : "Hayır"}</dd></div>
              <div><dt>Giriş bağlantısı</dt><dd>{inboundCount(selected)}</dd></div>
              <div><dt>Çıkış bağlantısı</dt><dd>{selected.outbound.length}</dd></div>
            </dl>

            <section>
              <h3>Bu sayfaya nasıl gelinir?</h3>
              {selected.menuReferences.length > 0 ? (
                <ul>
                  {selected.menuReferences.map((menu) => (
                    <li key={`${menu.menuLabel}-${menu.itemLabel}-${menu.href}`}>
                      <strong>{menu.menuLabel}</strong> → {menu.itemLabel} <code>{menu.href}</code>
                    </li>
                  ))}
                </ul>
              ) : null}
              {selected.inbound.length > 0 ? (
                <ul>{selected.inbound.map((item) => <li key={item}><code>{item}</code></li>)}</ul>
              ) : selected.menuReferences.length === 0 ? <p>Kaynak taramasında doğrudan giriş bağlantısı bulunamadı.</p> : null}
            </section>

            <section>
              <h3>Buradan nereye gidilir?</h3>
              {selected.outbound.length > 0 ? (
                <ul>{selected.outbound.map((item) => <li key={item}><code>{item}</code></li>)}</ul>
              ) : <p>Kaynak taramasında sabit iç bağlantı bulunamadı.</p>}
            </section>

            {selected.kind === "page" && !selected.dynamic && selected.accessMode !== "admin" ? (
              <Link className="system-map-open-route" href={selected.route}>Route&apos;u aç</Link>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
