import Link from "next/link";
import {
  systemMapNavigationGroups,
  type SystemMapWorkspaceKey,
} from "./navigation";

/**
 * One row/column navigation format shared by every /harita specialist page.
 * Source of truth stays in navigation.ts; this adds no duplicate route registry.
 */
export function SystemMapSectionDirectory({
  activeKey,
}: {
  activeKey: Exclude<SystemMapWorkspaceKey, "overview">;
}) {
  const activeGroup = systemMapNavigationGroups.find((group) =>
    group.items.some((item) => item.key === activeKey)
  );

  if (!activeGroup) return null;

  const sectionItems = activeGroup.items.filter((item) => item.key !== "overview");
  const total = systemMapNavigationGroups.reduce(
    (count, group) => count + group.items.filter((item) => item.key !== "overview").length,
    0,
  );

  return (
    <nav className="system-map-section-directory" aria-label="Harita alt sayfaları">
      <div className="system-map-section-directory__heading">
        <div>
          <span>HARİTA MENÜSÜ / SATIR - SÜTUN</span>
          <h2>{activeGroup.label} alt sayfaları</h2>
          <p>{sectionItems.length} alt sayfa · toplam {total} çalışma alanı</p>
        </div>
        <Link href="/harita">Tüm alt sayfaları görüntüle →</Link>
      </div>
      <div className="system-map-section-directory__groups" aria-label="Harita bölüm bağlantıları">
        {systemMapNavigationGroups.map((group) => {
          const first = group.items.find((item) => item.key !== "overview");
          return first ? (
            <Link
              aria-current={group.label === activeGroup.label ? "location" : undefined}
              data-active={group.label === activeGroup.label ? "true" : undefined}
              href={first.href}
              key={group.label}
            >
              {group.label}
            </Link>
          ) : null;
        })}
      </div>
      <div className="system-map-directory-table-wrap" role="region" aria-label={`${activeGroup.label} çalışma alanları tablosu`} tabIndex={0}>
        <table className="system-map-directory-table">
          <thead>
            <tr>
              <th scope="col">Alt sayfa</th>
              <th scope="col">İçerik / amaç</th>
              <th scope="col">URL</th>
              <th scope="col">Bağlantı</th>
            </tr>
          </thead>
          <tbody>
            {sectionItems.map((item) => (
              <tr data-current={item.key === activeKey ? "true" : undefined} key={item.key}>
                <th scope="row">
                  <Link aria-current={item.key === activeKey ? "page" : undefined} href={item.href}>
                    {item.label}
                  </Link>
                </th>
                <td>{item.description}</td>
                <td><code>{item.href}</code></td>
                <td><Link href={item.href}>{item.key === activeKey ? "Bu sayfa" : "Aç →"}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </nav>
  );
}
