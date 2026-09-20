import Link from "next/link";

import {
  getCommerceEntitlementStatusCounts,
  listCommerceEntitlements,
  type CommerceEntitlementSourceFilter,
  type CommerceEntitlementStatusFilter,
} from "@/features/commerce/admin-operations-repository";
import {
  formatCommerceDate,
  formatCommerceMoney,
} from "@/features/commerce/admin-operations-ui";

const statuses: CommerceEntitlementStatusFilter[] = [
  "all",
  "active",
  "revoked",
  "refunded",
];

const sources: CommerceEntitlementSourceFilter[] = [
  "all",
  "purchase",
  "coupon",
  "admin",
  "promotion",
];

const statusLabels = {
  active: "Aktif",
  revoked: "Geri alındı",
  refunded: "İade edildi",
} as const;

const sourceLabels = {
  purchase: "Satın alma",
  coupon: "Kupon",
  admin: "Admin",
  promotion: "Promosyon",
} as const;

function parseStatus(value: string | undefined): CommerceEntitlementStatusFilter {
  return statuses.includes(value as CommerceEntitlementStatusFilter)
    ? (value as CommerceEntitlementStatusFilter)
    : "all";
}

function parseSource(value: string | undefined): CommerceEntitlementSourceFilter {
  return sources.includes(value as CommerceEntitlementSourceFilter)
    ? (value as CommerceEntitlementSourceFilter)
    : "all";
}

function hrefFor(input: {
  q: string;
  source: CommerceEntitlementSourceFilter;
  status: CommerceEntitlementStatusFilter;
}) {
  const params = new URLSearchParams();
  if (input.status !== "all") params.set("status", input.status);
  if (input.source !== "all") params.set("source", input.source);
  if (input.q) params.set("q", input.q);
  const query = params.toString();

  return `/sistem-yonetimi/odeme-sistemi/erisim-haklari${query ? `?${query}` : ""}`;
}

export default async function CommerceEntitlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; status?: string }>;
}) {
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 120) ?? "";
  const status = parseStatus(query.status);
  const source = parseSource(query.source);

  const [entitlements, counts] = await Promise.all([
    listCommerceEntitlements({ q, source, status }),
    getCommerceEntitlementStatusCounts(),
  ]);

  const total = Object.values(counts).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  );

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Ödeme Sistemi</span>
          <h1>Erişim Hakları</h1>
          <p>
            Okurun eser bazlı erişim hakkını sipariş, kaynak ve eser satış
            durumuyla birlikte izleyin. Fiyat hiçbir zaman erişim kararı olarak
            kullanılmaz.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/odeme-sistemi">
          Ödeme Sistemine dön
        </Link>
      </header>

      <section className="admin-settings-grid admin-commerce-summary">
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Toplam</span>
          <h2>{total.toLocaleString("tr-TR")}</h2>
          <p>Tüm eser erişim hakları.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Aktif</span>
          <h2>{(counts.active ?? 0).toLocaleString("tr-TR")}</h2>
          <p>Okumaya yetki veren haklar.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Geri alındı</span>
          <h2>{(counts.revoked ?? 0).toLocaleString("tr-TR")}</h2>
          <p>Artık erişim vermeyen kayıtlar.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">İade</span>
          <h2>{(counts.refunded ?? 0).toLocaleString("tr-TR")}</h2>
          <p>İade nedeniyle erişimi kapanan kayıtlar.</p>
        </article>
      </section>

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Ara</span>
            <input
              defaultValue={q}
              name="q"
              placeholder="Eser, okur veya sipariş no"
              type="search"
            />
          </label>
          {status !== "all" ? (
            <input name="status" type="hidden" value={status} />
          ) : null}
          {source !== "all" ? (
            <input name="source" type="hidden" value={source} />
          ) : null}
          <button className="admin-button admin-button--primary" type="submit">
            Ara
          </button>
          {q || status !== "all" || source !== "all" ? (
            <Link
              className="admin-button"
              href="/sistem-yonetimi/odeme-sistemi/erisim-haklari"
            >
              Temizle
            </Link>
          ) : null}
        </form>

        <nav aria-label="Erişim durumu" className="admin-commerce-tabs">
          {statuses.map((item) => (
            <Link
              aria-current={status === item ? "page" : undefined}
              href={hrefFor({ q, source, status: item })}
              key={item}
            >
              {item === "all"
                ? `Tümü (${total})`
                : `${statusLabels[item]} (${counts[item] ?? 0})`}
            </Link>
          ))}
        </nav>

        <nav aria-label="Erişim kaynağı" className="admin-commerce-tabs">
          {sources.map((item) => (
            <Link
              aria-current={source === item ? "page" : undefined}
              href={hrefFor({ q, source: item, status })}
              key={item}
            >
              {item === "all" ? "Tüm kaynaklar" : sourceLabels[item]}
            </Link>
          ))}
        </nav>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Erişim operasyonu</span>
            <h2>Son 200 erişim hakkı</h2>
          </div>
          <b>{entitlements.length}</b>
        </div>

        {entitlements.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead>
                <tr>
                  <th>Durum / kaynak</th>
                  <th>Eser</th>
                  <th>Okur</th>
                  <th>Sipariş</th>
                  <th>Satış modeli</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {entitlements.map((entitlement) => (
                  <tr key={entitlement.id}>
                    <td>
                      <span
                        className="admin-table-badge"
                        data-status={entitlement.status}
                      >
                        {statusLabels[entitlement.status]}
                      </span>
                      <small>{sourceLabels[entitlement.source]}</small>
                    </td>
                    <td>
                      <strong>{entitlement.work.title}</strong>
                      <small>{entitlement.work.slug}</small>
                    </td>
                    <td>
                      <strong>
                        {entitlement.reader.displayName ??
                          entitlement.reader.fullName}
                      </strong>
                      <small>{entitlement.reader.publicId}</small>
                    </td>
                    <td>
                      {entitlement.order ? (
                        <>
                          <strong>{entitlement.order.orderNo}</strong>
                          <small>{entitlement.order.status}</small>
                          <small>
                            {formatCommerceMoney(
                              entitlement.order.finalAmount,
                              entitlement.order.currency,
                            )}
                          </small>
                        </>
                      ) : (
                        <small>Sipariş bağlantısı yok</small>
                      )}
                    </td>
                    <td>
                      {entitlement.work.saleConfiguration ? (
                        <>
                          <strong>
                            {entitlement.work.saleConfiguration.saleModel ===
                            "paid"
                              ? "Ücretli"
                              : "Ücretsiz"}
                          </strong>
                          <small>
                            {entitlement.work.saleConfiguration.status}
                          </small>
                        </>
                      ) : (
                        <small>Satış yapılandırması yok</small>
                      )}
                    </td>
                    <td>
                      <strong>{formatCommerceDate(entitlement.grantedAt)}</strong>
                      <small>
                        Geri alma:{" "}
                        {formatCommerceDate(entitlement.revokedAt)}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Eşleşen erişim hakkı yok</strong>
            <p>Seçilen filtrelerde entitlement kaydı bulunamadı.</p>
          </div>
        )}
      </section>
    </>
  );
}
