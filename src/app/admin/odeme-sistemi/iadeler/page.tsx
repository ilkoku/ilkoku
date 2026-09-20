import Link from "next/link";

import {
  getCommerceRefundStatusCounts,
  listCommerceRefunds,
  type CommerceRefundStatusFilter,
} from "@/features/commerce/admin-operations-repository";
import {
  formatCommerceDate,
  formatCommerceMoney,
  paymentMethodLabels,
  refundStatusLabels,
} from "@/features/commerce/admin-operations-ui";

const statuses: CommerceRefundStatusFilter[] = [
  "all",
  "requested",
  "approved",
  "processing",
  "processed",
  "rejected",
];

function parseStatus(value: string | undefined): CommerceRefundStatusFilter {
  return statuses.includes(value as CommerceRefundStatusFilter)
    ? (value as CommerceRefundStatusFilter)
    : "all";
}

function filterHref(status: CommerceRefundStatusFilter, q: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return `/sistem-yonetimi/odeme-sistemi/iadeler${query ? `?${query}` : ""}`;
}

export default async function CommerceRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const query = await searchParams;
  const status = parseStatus(query.status);
  const q = query.q?.trim().slice(0, 120) ?? "";

  const [refunds, counts] = await Promise.all([
    listCommerceRefunds({ q, status }),
    getCommerceRefundStatusCounts(),
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
          <h1>İadeler</h1>
          <p>
            İade kayıtlarını ve provider bağlantısını izleyin. İade politikası,
            kuponun yeniden kullanılabilirliği ve kısmi iade kuralları henüz
            dondurulmadığı için bu ekran şu aşamada salt okunurdur.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/odeme-sistemi">
          Ödeme Sistemine dön
        </Link>
      </header>

      <div className="admin-readonly-notice admin-commerce-readonly">
        <strong>İade işlemi burada yürütülmüyor</strong>
        <p>
          Provider iade adapterı, kısmi iade politikası ve kupon iade sonrası
          kullanım kuralı kesinleşmeden onayla/işle butonu eklenmedi.
        </p>
      </div>

      <section className="admin-settings-grid admin-commerce-summary">
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Toplam</span>
          <h2>{total.toLocaleString("tr-TR")}</h2>
          <p>Tüm iade kayıtları.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Talep</span>
          <h2>{(counts.requested ?? 0).toLocaleString("tr-TR")}</h2>
          <p>Henüz değerlendirilmemiş kayıtlar.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">İşleniyor</span>
          <h2>{(counts.processing ?? 0).toLocaleString("tr-TR")}</h2>
          <p>Provider iade sonucu beklenen kayıtlar.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Tamamlandı</span>
          <h2>{(counts.processed ?? 0).toLocaleString("tr-TR")}</h2>
          <p>İade süreci tamamlanan kayıtlar.</p>
        </article>
      </section>

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Ara</span>
            <input
              defaultValue={q}
              name="q"
              placeholder="Sipariş no, eser, provider veya neden"
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
              href="/sistem-yonetimi/odeme-sistemi/iadeler"
            >
              Temizle
            </Link>
          ) : null}
        </form>

        <nav aria-label="İade durumu" className="admin-commerce-tabs">
          {statuses.map((item) => (
            <Link
              aria-current={status === item ? "page" : undefined}
              href={filterHref(item, q)}
              key={item}
            >
              {item === "all"
                ? `Tümü (${total})`
                : `${refundStatusLabels[item]} (${counts[item] ?? 0})`}
            </Link>
          ))}
        </nav>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Salt okunur operasyon kuyruğu</span>
            <h2>Son 200 iade kaydı</h2>
          </div>
          <b>{refunds.length}</b>
        </div>

        {refunds.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead>
                <tr>
                  <th>İade</th>
                  <th>Sipariş / eser</th>
                  <th>Tutar</th>
                  <th>Ödeme bağlantısı</th>
                  <th>Neden</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td>
                      <span
                        className="admin-table-badge"
                        data-status={refund.status}
                      >
                        {refundStatusLabels[refund.status]}
                      </span>
                      <small>{refund.id}</small>
                    </td>
                    <td>
                      <strong>{refund.order.orderNo}</strong>
                      <small>{refund.order.work.title}</small>
                      <small>
                        Okur:{" "}
                        {refund.order.reader.displayName ??
                          refund.order.reader.fullName}
                        {" · "}
                        {refund.order.reader.publicId}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {formatCommerceMoney(refund.amount, refund.currency)}
                      </strong>
                      <small>Sipariş: {refund.order.status}</small>
                    </td>
                    <td>
                      {refund.payment ? (
                        <>
                          <strong>
                            {paymentMethodLabels[refund.payment.method]}
                          </strong>
                          <small>{refund.payment.provider}</small>
                          <small>
                            {refund.payment.providerTransactionId ??
                              "Provider işlem id yok"}
                          </small>
                          <small>Ödeme: {refund.payment.status}</small>
                        </>
                      ) : (
                        <small>Harici payment kaydı yok</small>
                      )}
                    </td>
                    <td>
                      <span className="admin-commerce-reason">
                        {refund.reason ?? "Neden kaydedilmedi"}
                      </span>
                    </td>
                    <td>
                      <strong>{formatCommerceDate(refund.createdAt)}</strong>
                      <small>
                        İşlenme: {formatCommerceDate(refund.processedAt)}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Eşleşen iade kaydı yok</strong>
            <p>Seçilen filtrelerde iade kaydı bulunamadı.</p>
          </div>
        )}
      </section>
    </>
  );
}
