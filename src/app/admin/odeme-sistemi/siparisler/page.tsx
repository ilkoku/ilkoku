import Link from "next/link";

import {
  getCommerceOrderStatusCounts,
  listCommerceOrders,
  type CommerceOrderStatusFilter,
} from "@/features/commerce/admin-operations-repository";
import {
  formatCommerceDate,
  formatCommerceMoney,
  orderStatusLabels,
} from "@/features/commerce/admin-operations-ui";

const statuses: CommerceOrderStatusFilter[] = [
  "all",
  "pending_payment",
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "draft",
];

function parseStatus(value: string | undefined): CommerceOrderStatusFilter {
  return statuses.includes(value as CommerceOrderStatusFilter)
    ? (value as CommerceOrderStatusFilter)
    : "all";
}

function filterHref(status: CommerceOrderStatusFilter, q: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return `/sistem-yonetimi/odeme-sistemi/siparisler${query ? `?${query}` : ""}`;
}

export default async function CommerceOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const query = await searchParams;
  const status = parseStatus(query.status);
  const q = query.q?.trim().slice(0, 120) ?? "";

  const [orders, counts] = await Promise.all([
    listCommerceOrders({ q, status }),
    getCommerceOrderStatusCounts(),
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
          <h1>Siparişler</h1>
          <p>
            Okur satın alma siparişlerini; tutar, kupon, ödeme denemesi,
            erişim hakkı ve onay kanıtıyla birlikte izleyin.
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
          <p>Tüm commerce siparişleri.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Ödeme bekliyor</span>
          <h2>{(counts.pending_payment ?? 0).toLocaleString("tr-TR")}</h2>
          <p>Provider sonucu beklenen siparişler.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Ödendi</span>
          <h2>{(counts.paid ?? 0).toLocaleString("tr-TR")}</h2>
          <p>Erişim açılması gereken başarılı siparişler.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">İade</span>
          <h2>{(counts.refunded ?? 0).toLocaleString("tr-TR")}</h2>
          <p>İade statüsüne geçmiş siparişler.</p>
        </article>
      </section>

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Ara</span>
            <input
              defaultValue={q}
              name="q"
              placeholder="Sipariş no, eser, okur veya yazar"
              type="search"
            />
          </label>
          {status !== "all" ? (
            <input name="status" type="hidden" value={status} />
          ) : null}
          <button className="admin-button admin-button--primary" type="submit">
            Ara
          </button>
          {q || status !== "all" ? (
            <Link
              className="admin-button"
              href="/sistem-yonetimi/odeme-sistemi/siparisler"
            >
              Temizle
            </Link>
          ) : null}
        </form>

        <nav aria-label="Sipariş durumu" className="admin-commerce-tabs">
          {statuses.map((item) => (
            <Link
              aria-current={status === item ? "page" : undefined}
              href={filterHref(item, q)}
              key={item}
            >
              {item === "all"
                ? `Tümü (${total})`
                : `${orderStatusLabels[item]} (${counts[item] ?? 0})`}
            </Link>
          ))}
        </nav>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Operasyon listesi</span>
            <h2>Son 200 sipariş</h2>
          </div>
          <b>{orders.length}</b>
        </div>

        {orders.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Eser / taraflar</th>
                  <th>Tutar</th>
                  <th>Kupon</th>
                  <th>Ödeme / erişim</th>
                  <th>Kanıt / tarih</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNo}</strong>
                      <span
                        className="admin-table-badge"
                        data-status={order.status}
                      >
                        {orderStatusLabels[order.status]}
                      </span>
                    </td>
                    <td>
                      <strong>{order.work.title}</strong>
                      <small>
                        Okur: {order.reader.displayName ?? order.reader.fullName}
                        {" · "}
                        {order.reader.publicId}
                      </small>
                      <small>
                        Yazar: {order.author.displayName ?? order.author.fullName}
                        {" · "}
                        {order.author.publicId}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {formatCommerceMoney(order.finalAmount, order.currency)}
                      </strong>
                      <small>
                        Eser:{" "}
                        {formatCommerceMoney(
                          order.originalAmount,
                          order.currency,
                        )}
                      </small>
                      <small>
                        İndirim:{" "}
                        {formatCommerceMoney(
                          order.discountAmount,
                          order.currency,
                        )}
                      </small>
                      <small>
                        Yazar matrahı:{" "}
                        {formatCommerceMoney(
                          order.authorEarningBaseAmount,
                          order.currency,
                        )}
                      </small>
                    </td>
                    <td>
                      {order.couponCodeSnapshot ? (
                        <>
                          <strong>{order.couponCodeSnapshot}</strong>
                          <small>
                            {order.couponOwnerSnapshot === "platform"
                              ? "İlkOku finansmanlı"
                              : "Yazar finansmanlı"}
                          </small>
                        </>
                      ) : (
                        <small>Kupon yok</small>
                      )}
                    </td>
                    <td>
                      <strong>{order._count.payments} ödeme denemesi</strong>
                      <small>{order._count.refunds} iade kaydı</small>
                      <small>
                        Erişim:{" "}
                        {order.entitlement?.status
                          ? order.entitlement.status
                          : "oluşmadı"}
                      </small>
                    </td>
                    <td>
                      <strong>{formatCommerceDate(order.createdAt)}</strong>
                      <small>
                        Ödeme: {formatCommerceDate(order.paidAt)}
                      </small>
                      <small>
                        Koşul:{" "}
                        {order.consent
                          ? `sürüm ${order.consent.documentVersion} · ${formatCommerceDate(order.consent.acceptedAt)}`
                          : "kayıt yok"}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Eşleşen sipariş yok</strong>
            <p>Seçilen filtrelerde commerce siparişi bulunamadı.</p>
          </div>
        )}
      </section>
    </>
  );
}
