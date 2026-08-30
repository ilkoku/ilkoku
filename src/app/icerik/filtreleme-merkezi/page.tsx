import Link from "next/link";

import { commonDiscoveryAuthorWhereFor } from "@/features/discovery/common-author-scope";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { requireCmsManager } from "@/lib/cms-access";
import { getDiscoveryFilterConfiguration } from "@/lib/discovery-filter-config";
import {
  discoveryFilterLabels,
  discoveryPoolLabels,
  discoveryRegistryDiagnostics,
  discoveryRelationshipLabels,
  discoveryRoleLabels,
  discoverySecurityLocks,
  discoverySurfaces,
  type DiscoveryRole,
} from "@/lib/discovery-filter-registry";
import { prisma } from "@/lib/prisma";
import {
  addDiscoveryFilterAction,
  removeDiscoveryFilterAction,
} from "./actions";
import styles from "./FilteringCenter.module.css";

export const dynamic = "force-dynamic";

const roles = ["reader", "editor", "publisher"] as const satisfies readonly DiscoveryRole[];

function normalizeRole(value: string | undefined): DiscoveryRole | undefined {
  return roles.includes(value as DiscoveryRole) ? (value as DiscoveryRole) : undefined;
}

async function loadPoolMetrics() {
  const [
    allWorks,
    safeWorks,
    adultWorks,
    allAuthors,
    safeAuthors,
    activeWriters,
  ] = await Promise.all([
    prisma.work.count({ where: commonDiscoveryWorkWhereFor(true) }),
    prisma.work.count({ where: commonDiscoveryWorkWhereFor(false) }),
    prisma.work.count({
      where: {
        ...commonDiscoveryWorkWhereFor(true),
        contentRating: "adult_18",
      },
    }),
    prisma.user.count({ where: commonDiscoveryAuthorWhereFor(true) }),
    prisma.user.count({ where: commonDiscoveryAuthorWhereFor(false) }),
    prisma.user.count({
      where: {
        deletedAt: null,
        role: "writer",
        status: "active",
      },
    }),
  ]);

  return {
    activeWriters,
    adultWorks,
    allAuthors,
    allWorks,
    safeAuthors,
    safeWorks,
    writersOutsidePool: Math.max(0, activeWriters - allAuthors),
  };
}

export default async function FilteringCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ rol?: string }>;
}) {
  const access = await requireCmsManager("/icerik/filtreleme-merkezi");
  const params = await searchParams;
  const activeRole = normalizeRole(params.rol);
  const diagnostics = discoveryRegistryDiagnostics();
  const filterConfiguration = await getDiscoveryFilterConfiguration();
  const canConfigure = access.isAdmin && filterConfiguration.storageReady;

  let metrics: Awaited<ReturnType<typeof loadPoolMetrics>> | null = null;
  let loadError = false;
  try {
    metrics = await loadPoolMetrics();
  } catch {
    loadError = true;
  }

  const visibleSurfaces = activeRole
    ? filterConfiguration.surfaces.filter((surface) => surface.role === activeRole)
    : filterConfiguration.surfaces;
  const relationshipSurfaces = visibleSurfaces.filter(
    (surface) => surface.relationship !== "none",
  );
  const roleCounts = roles.map((role) => ({
    role,
    count: discoverySurfaces.filter((surface) => surface.role === role).length,
  }));
  const uniqueFilterIds = Array.from(
    new Set(visibleSurfaces.flatMap((surface) => surface.activeFilters)),
  );
  const registryHealthy =
    diagnostics.duplicateIds.length === 0 &&
    diagnostics.wrongPageSize.length === 0 &&
    filterConfiguration.storageReady;

  return (
    <section className={styles.workbench}>
      <header className="content-page-heading">
        <div>
          <span>İçerik · Keşif altyapısı</span>
          <h1>Filtreleme Merkezi</h1>
          <p>
            Eser Havuzu ve Yazar Havuzu&apos;nun Okur, Editör ve Yayınevi
            ekranlarında hangi Filtre Masası ile çağrıldığını tek yerden denetleyin.
            Yetkili yönetici filtreleri + ile ekleyebilir, × ile yüzeyden çıkarabilir.
          </p>
        </div>
        <div className={`${styles.healthBadge} ${registryHealthy ? styles.pass : styles.warn}`}>
          <small>Liste standardı</small>
          <strong>{registryHealthy ? "UYUMLU" : "İNCELE"}</strong>
          <span>{diagnostics.standardPageSize} kayıt / sayfa</span>
        </div>
      </header>

      <section className={styles.standardStrip} aria-label="Ortak liste standardı">
        <strong>Tek akış</strong>
        <span>Havuz</span>
        <b aria-hidden="true">→</b>
        <span>Rol görünürlüğü</span>
        <b aria-hidden="true">→</b>
        <span>Filtre Masası</span>
        <b aria-hidden="true">→</b>
        <span>Masadaki sonuç</span>
        <b aria-hidden="true">→</b>
        <span>Liste</span>
        <b aria-hidden="true">→</b>
        <span>Sayfalama</span>
      </section>

      {!filterConfiguration.storageReady ? (
        <div className="content-panel" role="alert">
          <strong>Filtre yönetim deposu henüz hazır değil.</strong>
          <p>
            Ürün yüzeyleri güvenli biçimde kod varsayılanlarıyla çalışmaya devam ediyor.
            + / × yönetimi veritabanı migration&apos;ı uygulanana kadar kapalı tutulur.
          </p>
        </div>
      ) : null}

      {loadError || !metrics ? (
        <div className="content-panel" role="alert">
          <strong>Canlı havuz metrikleri okunamadı.</strong>
          <p>
            Filtre haritası gösterilmeye devam ediyor; ancak Eser/Yazar Havuzu
            sayıları yanlış bir sıfır değer üretmemek için gizlendi.
          </p>
        </div>
      ) : (
        <section className={styles.metrics} aria-label="Canlı havuz metrikleri">
          <article>
            <small>ESER HAVUZU</small>
            <strong>{metrics.allWorks.toLocaleString("tr-TR")}</strong>
            <span>public + yayımlanmış eser</span>
            <p>
              {metrics.safeWorks.toLocaleString("tr-TR")} standart görünür ·{" "}
              {metrics.adultWorks.toLocaleString("tr-TR")} adet 18+
            </p>
          </article>
          <article>
            <small>YAZAR HAVUZU</small>
            <strong>{metrics.allAuthors.toLocaleString("tr-TR")}</strong>
            <span>en az bir görünür public eseri olan aktif yazar</span>
            <p>
              {metrics.safeAuthors.toLocaleString("tr-TR")} güvenli varsayılan görünürlükte
            </p>
          </article>
          <article>
            <small>HAVUZ DIŞINDAKİ AKTİF YAZAR</small>
            <strong>{metrics.writersOutsidePool.toLocaleString("tr-TR")}</strong>
            <span>henüz görünür public eseri olmayan aktif yazar</span>
            <p>Toplam aktif yazar: {metrics.activeWriters.toLocaleString("tr-TR")}</p>
          </article>
          <article>
            <small>BAĞLI YÜZEY</small>
            <strong>{diagnostics.surfaceCount}</strong>
            <span>{diagnostics.routeCount} benzersiz sayfa yolu</span>
            <p>{uniqueFilterIds.length} aktif filtre türü bu görünümde kullanılıyor.</p>
          </article>
        </section>
      )}

      <section className={styles.roleToolbar} aria-label="Rol görünümü">
        <div>
          <span>Rol görünümü</span>
          <strong>Filtre haritasını daralt</strong>
        </div>
        <nav>
          <Link className={!activeRole ? styles.active : undefined} href="/icerik/filtreleme-merkezi">
            Tümü · {discoverySurfaces.length}
          </Link>
          {roleCounts.map(({ role, count }) => (
            <Link
              className={activeRole === role ? styles.active : undefined}
              href={`/icerik/filtreleme-merkezi?rol=${role}`}
              key={role}
            >
              {discoveryRoleLabels[role]} · {count}
            </Link>
          ))}
        </nav>
      </section>

      <section className={styles.permissionStrip} data-enabled={canConfigure ? "true" : "false"}>
        <div>
          <span>Filtre yönetim yetkisi</span>
          <strong>{canConfigure ? "Açık" : access.isAdmin ? "Depo bekleniyor" : "Salt okunur"}</strong>
        </div>
        <p>
          {canConfigure
            ? "× mevcut filtreyi bu yüzeyden çıkarır. + Ekle, daha önce çıkarılmış desteklenen filtreyi geri açar."
            : access.isAdmin
              ? "Migration tamamlandığında ekle/çıkar kontrolleri otomatik açılır."
              : "Filtre haritasını görebilirsiniz; ekle/çıkar işlemi yalnız yönetici yetkisiyle yapılır."}
        </p>
      </section>

      <section className="content-panel">
        <div className={styles.sectionHeading}>
          <div>
            <span>Sayfa haritası</span>
            <h2>Filtre Masası nerede, neyi çağırıyor?</h2>
          </div>
          <small>{visibleSurfaces.length} yüzey</small>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rol / Sayfa</th>
                <th>Ana kaynak</th>
                <th>Filtre Masası</th>
                <th>İlişki görünümü</th>
                <th>Standart</th>
              </tr>
            </thead>
            <tbody>
              {visibleSurfaces.map((surface) => (
                <tr key={surface.id}>
                  <td>
                    <strong>{discoveryRoleLabels[surface.role]} · {surface.label}</strong>
                    <code>{surface.route}</code>
                    <small>{surface.note}</small>
                  </td>
                  <td>
                    <span className={styles.poolChip}>{discoveryPoolLabels[surface.pool]}</span>
                  </td>
                  <td>
                    <div className={styles.filterManager}>
                      <div className={styles.filterChips}>
                        {surface.activeFilters.map((filter) => (
                          <span className={styles.managedFilterChip} key={filter}>
                            {discoveryFilterLabels[filter]}
                            {canConfigure ? (
                              <form action={removeDiscoveryFilterAction}>
                                <input name="surfaceId" type="hidden" value={surface.id} />
                                <input name="filterId" type="hidden" value={filter} />
                                <button
                                  aria-label={`${surface.label}: ${discoveryFilterLabels[filter]} filtresini çıkar`}
                                  title="Filtreyi çıkar"
                                  type="submit"
                                >
                                  ×
                                </button>
                              </form>
                            ) : null}
                          </span>
                        ))}
                        {surface.activeFilters.length === 0 ? (
                          <span className={styles.emptyFilterChip}>Filtre alanı yok</span>
                        ) : null}
                      </div>

                      {canConfigure ? (
                        surface.removedFilters.length > 0 ? (
                          <details className={styles.addFilterMenu}>
                            <summary>+ Ekle</summary>
                            <div>
                              {surface.removedFilters.map((filter) => (
                                <form action={addDiscoveryFilterAction} key={filter}>
                                  <input name="surfaceId" type="hidden" value={surface.id} />
                                  <input name="filterId" type="hidden" value={filter} />
                                  <button type="submit">+ {discoveryFilterLabels[filter]}</button>
                                </form>
                              ))}
                            </div>
                          </details>
                        ) : (
                          <span className={styles.allFiltersActive}>Tüm desteklenen filtreler açık</span>
                        )
                      ) : null}
                    </div>
                  </td>
                  <td>{discoveryRelationshipLabels[surface.relationship]}</td>
                  <td>
                    <strong>{surface.pageSize}/sayfa</strong>
                    <small>
                      {surface.activeFilters.length}/{surface.filters.length} filtre açık · Masadaki sonuç + numaralı sayfalama
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.twoColumns}>
        <section className="content-panel">
          <div className={styles.sectionHeading}>
            <div>
              <span>Hazır görünümler</span>
              <h2>Havuz + ilişki</h2>
            </div>
            <small>{relationshipSurfaces.length} görünüm</small>
          </div>
          <div className={styles.relationshipList}>
            {relationshipSurfaces.map((surface) => (
              <article key={surface.id}>
                <div>
                  <strong>{surface.label}</strong>
                  <code>{surface.route}</code>
                </div>
                <span>{discoveryPoolLabels[surface.pool]}</span>
                <b>+</b>
                <span>{discoveryRelationshipLabels[surface.relationship].replace(/^Havuz \+ /u, "")}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="content-panel">
          <div className={styles.sectionHeading}>
            <div>
              <span>Güvenlik kilitleri</span>
              <h2>Filtre Masası&apos;nın değiştiremeyeceği sınırlar</h2>
            </div>
            <small>salt okunur</small>
          </div>
          <ol className={styles.lockList}>
            {discoverySecurityLocks.map((lock) => (
              <li key={lock}>{lock}</li>
            ))}
          </ol>
        </section>
      </div>

      <section className="content-panel">
        <div className={styles.sectionHeading}>
          <div>
            <span>Tanı</span>
            <h2>Standart sapma kontrolü</h2>
          </div>
          <small>{registryHealthy ? "PASS" : "UYARI"}</small>
        </div>
        <div className={styles.diagnostics}>
          <article data-state={diagnostics.duplicateIds.length ? "warn" : "pass"}>
            <strong>Yüzey kimlikleri</strong>
            <span>
              {diagnostics.duplicateIds.length
                ? `${diagnostics.duplicateIds.length} yinelenen kimlik`
                : "Yinelenen kimlik yok"}
            </span>
          </article>
          <article data-state={diagnostics.wrongPageSize.length ? "warn" : "pass"}>
            <strong>Sayfa boyutu</strong>
            <span>
              {diagnostics.wrongPageSize.length
                ? `${diagnostics.wrongPageSize.length} yüzey 24 standardı dışında`
                : "Tüm kayıtlı yüzeyler 24/sayfa standardında"}
            </span>
          </article>
          <article data-state={filterConfiguration.storageReady ? "pass" : "warn"}>
            <strong>Filtre yönetim deposu</strong>
            <span>
              {filterConfiguration.storageReady
                ? "Kalıcı ekle/çıkar ayar deposu hazır"
                : "Kod varsayılanları aktif; migration bekleniyor"}
            </span>
          </article>
          <article data-state="pass">
            <strong>Kaynak modeli</strong>
            <span>2 ana havuz: Eser Havuzu + Yazar Havuzu</span>
          </article>
        </div>
      </section>
    </section>
  );
}
