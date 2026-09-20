import Link from "next/link";

import {
  getCommercePaymentStatusCounts,
  listCommercePayments,
  type CommercePaymentStatusFilter,
} from "@/features/commerce/admin-operations-repository";
import {
  formatCommerceDate,
  formatCommerceMoney,
  paymentMethodLabels,
  paymentStatusLabels,
} from "@/features/commerce/admin-operations-ui";

const statuses: CommercePaymentStatusFilter[] = [
  "all",
  "pending",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
];

function parseStatus(value: string | undefined): CommercePaymentStatusFilter {
  return statuses.includes(value as CommercePaymentStatusFilter)
    ? (value as CommercePaymentStatusFilter)
    : "all";
}

function filterHref(status: CommercePaymentStatusFilter, q: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return `/sistem-yonetimi/odeme-sistemi/odemeler${query ? `?${query}` : ""}`;
}

export default async function CommercePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const query = await searchParams;
  const status = parseStatus(query.status);
  const q = query.q?.trim().slice(0, 120) ?? "";

  const [payments, counts] = await Promise.all([
    listCommercePayments({ q, status }),
    getCommercePaymentStatusCounts(),
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
          <h1>Ödemeler</h1>
          <p>
            Provider bağımsız ödeme denemelerini, doğrulama sonucunu ve sipariş
            bağlantısını izleyin. Kart veya operatör kimlik bilgileri burada
            tutulmaz.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/odeme-sistemi">
          Ödeme Sistemine dön
        </Link>
      </header>

      <section className="admin-settings-grid admin-commerce-summary">
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Toplam deneme</span>
          <h2>{total.toLocaleString("tr-TR")}</h2>
          <p>Tüm provider ödeme kayıtları.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Bekleyen</span>
          <h2>{(counts.pending ?? 0).toLocaleString("tr-TR")}</h2>
          <p>Henüz terminal provider sonucu gelmeyenler.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Başarılı</span>
          <h2>{(counts.succeeded ?? 0).toLocaleString("tr-TR")}</h2>
          <p>Doğrulanmış başarılı ödeme denemeleri.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Başarısız</span>
          <h2>{(counts.failed ?? 0).toLocaleString("tr-TR")}</h2>
          <p>Provider veya doğrulama hatasıyla kapananlar.</p>
        </article>
      </section>

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Ara</span>
            <input
              defaultValue={q}
              name="q"
              placeholder="Sipariş no, eser, provider veya işlem id"
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
              href="/sistem-yonetimi/odeme-sistemi/odemeler"
            >
              Temizle
            </Link>
          ) : null}
        </form>

        <nav aria-label="Ödeme durumu" className="admin-commerce-tabs">
          {statuses.map((item) => (
            <Link
              aria-current={status === item ? "page" : undefined}
              href={filterHref(item, q)}
              key={item}
            >
              {item === "all"
                ? `Tümü (${total})`
                : `${paymentStatusLabels[item]} (${counts[item] ?? 0})`}
            </Link>
          ))}
        </nav>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Provider operasyonu</span>
            <h2>Son 200 ödeme denemesi</h2>
          </div>
          <b>{payments.length}</b>
        </div>

        {payments.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Sipariş / eser</th>
                  <th>Yöntem / provider</th>
                  <th>Tutar</th>
                  <th>Provider sonucu</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <span
                        className="admin-table-badge"
                        data-status={payment.status}
                      >
                        {paymentStatusLabels[payment.status]}
                      </span>
                      <small>Sipariş: {payment.order.status}</small>
                    </td>
                    <td>
                      <strong>{payment.order.orderNo}</strong>
                      <small>{payment.order.work.title}</small>
                      <small>
                        Okur:{" "}
                        {payment.order.reader.displayName ??
                          payment.order.reader.fullName}
                        {" · "}
                        {payment.order.reader.publicId}
                      </small>
                    </td>
                    <td>
                      <strong>{paymentMethodLabels[payment.method]}</strong>
                      <small>{payment.provider}</small>
                      <small>
                        {payment.providerTransactionId ??
                          "Provider işlem id henüz yok"}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {formatCommerceMoney(payment.amount, payment.currency)}
                      </strong>
                      <small>{payment.currency}</small>
                    </td>
                    <td>
                      {payment.failureCode ? (
                        <>
                          <strong>{payment.failureCode}</strong>
                          <small>
                            {payment.failureMessage ?? "Hata ayrıntısı yok"}
                          </small>
                        </>
                      ) : (
                        <small>Hata kaydı yok</small>
                      )}
                      <small>{payment._count.refunds} iade kaydı</small>
                    </td>
                    <td>
                      <strong>{formatCommerceDate(payment.createdAt)}</strong>
                      <small>
                        Tamamlanma: {formatCommerceDate(payment.completedAt)}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Eşleşen ödeme denemesi yok</strong>
            <p>Seçilen filtrelerde ödeme kaydı bulunamadı.</p>
          </div>
        )}
      </section>
    </>
  );
}
