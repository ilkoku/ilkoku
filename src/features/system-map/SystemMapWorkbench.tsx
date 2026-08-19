"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  SystemMapAccessMode,
  SystemMapRouteKind,
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

export function SystemMapWorkbench({ snapshot }: { snapshot: SystemMapSnapshot }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [access, setAccess] = useState<"all" | SystemMapAccessMode>("all");
  const [kind, setKind] = useState<"all" | SystemMapRouteKind>("all");
  const [onlyWarnings, setOnlyWarnings] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const areas = useMemo(
    () => [...new Set(snapshot.routes.map((route) => route.area))].sort((left, right) => left.localeCompare(right, "tr")),
    [snapshot.routes],
  );

  const filteredRoutes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");

    return snapshot.routes.filter((route) => {
      if (area !== "all" && route.area !== area) return false;
      if (access !== "all" && route.accessMode !== access) return false;
      if (kind !== "all" && route.kind !== kind) return false;
      if (onlyWarnings && !route.orphanCandidate) return false;
      if (!needle) return true;

      const haystack = [
        route.route,
        route.area,
        route.accessLabel,
        route.sourceFile,
        ...route.roles,
        ...route.inbound,
        ...route.outbound,
        ...route.menuReferences.flatMap((menu) => [menu.menuLabel, menu.itemLabel, menu.href]),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return haystack.includes(needle);
    });
  }, [access, area, kind, onlyWarnings, query, snapshot.routes]);

  const selected = snapshot.routes.find((route) => route.route === selectedRoute) ?? null;

  return (
    <div className="system-map-workbench">
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
              <h3>{workflow.title}</h3>
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
            <span>Route, kaynak, menü veya bağlantı ara</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="/eserlerim, yayınevi, notification..."
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

          <label className="system-map-warning-filter">
            <input
              type="checkbox"
              checked={onlyWarnings}
              onChange={(event) => setOnlyWarnings(event.target.checked)}
            />
            <span>Yalnız yetim adayları</span>
          </label>
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
              {filteredRoutes.map((route) => (
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
                  <td>{route.inbound.length + route.menuReferences.length}</td>
                  <td>{route.outbound.length}</td>
                  <td>
                    {route.orphanCandidate ? (
                      <span className="system-map-health" data-status="warn">Kontrol et</span>
                    ) : (
                      <span className="system-map-health" data-status="ok">Haritalandı</span>
                    )}
                  </td>
                </tr>
              ))}
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

            <dl className="system-map-detail-list">
              <div><dt>Kaynak</dt><dd><code>{selected.sourceFile}</code></dd></div>
              <div><dt>Erişim</dt><dd>{selected.accessLabel}</dd></div>
              <div><dt>Roller</dt><dd>{selected.roles.length ? selected.roles.join(", ") : "—"}</dd></div>
              <div><dt>Dinamik route</dt><dd>{selected.dynamic ? "Evet" : "Hayır"}</dd></div>
              <div><dt>Rol onayı</dt><dd>{selected.approvedRoleRequired ? "Gerekli" : "Hayır"}</dd></div>
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
