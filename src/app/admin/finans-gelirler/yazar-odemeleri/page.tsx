import Link from "next/link";

import {
  getFinancePayoutStatusCounts,
  listFinancePayouts,
  type FinancePayoutStatusFilter,
} from "@/features/commerce/finance-repository";
import {
  formatFinanceDate,
  formatFinanceMoney,
  payoutStatusLabels,
} from "@/features/commerce/finance-ui";

const statuses: FinancePayoutStatusFilter[] = [
  "all",
  "pending",
  "processing",
  "paid",
  "failed",
  "held",
];

function parseStatus(value: string | undefined): FinancePayoutStatusFilter {
  return statuses.includes(value as FinancePayoutStatusFilter)
    ? (value as FinancePayoutStatusFilter)
    : "all";
}

function hrefFor(status: FinancePayoutStatusFilter, q: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return `/sistem-yonetimi/finans-gelirler/yazar-odemeleri${query ? `?${query}` : ""}`;
}

export default async function AuthorPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 120) ?? "";
  const status = parseStatus(query.status);

  const [payouts, counts] = await Promise.all([
    listFinancePayouts({ q, status }),
    getFinancePayoutStatusCounts(),
  ]);

  const total = Object.values(counts).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  );

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Finans & Gelirler</span>
          <h1>Yazar Ödemeleri</h1>
          <p>
            Payout kayıtlarını izleyin. Gerçek para transferi ve banka
            sağlayıcısı bu foundation aşamasında aktif değildir.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler">
          Finans & Gelirlere dön
        </Link>
      </header>

      <div className="admin-readonly-notice admin-commerce-readonly">
        <strong>Gerçek payout yürütümü kapalı</strong>
        <p>
          Bu ekran mevcut payout kayıtlarını salt okunur gösterir. Kesin ödeme
          yöntemi, eşik, vergi/stopaj ve banka transfer süreci tanımlanmadan
          ödeme başlatma aksiyonu eklenmez.
        </p>
      </div>

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Ara</span>
            <input
              defaultValue={q}
              name="q"
              placeholder="Yazar, İlkOku kimliği, yöntem veya referans"
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
              href="/sistem-yonetimi/finans-gelirler/yazar-odemeleri"
            >
              Temizle
            </Link>
          ) : null}
        </form>

        <nav aria-label="Payout durumu" className="admin-commerce-tabs">
          {statuses.map((item) => (
            <Link
              aria-current={status === item ? "page" : undefined}
              href={hrefFor(item, q)}
              key={item}
            >
              {item === "all"
                ? `Tümü (${total})`
                : `${payoutStatusLabels[item]} (${counts[item] ?? 0})`}
            </Link>
          ))}
        </nav>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Payout kayıtları</span>
            <h2>Son 300 yazar ödemesi</h2>
          </div>
          <b>{payouts.length}</b>
        </div>

        {payouts.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead>
                <tr>
                  <th>Yazar</th>
                  <th>Durum</th>
                  <th>Tutar</th>
                  <th>Dönem</th>
                  <th>Yöntem / referans</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td>
                      <strong>
                        {payout.author.displayName ?? payout.author.fullName}
                      </strong>
                      <small>{payout.author.publicId}</small>
                    </td>
                    <td>
                      <span
                        className="admin-table-badge"
                        data-status={payout.status}
                      >
                        {payoutStatusLabels[payout.status]}
                      </span>
                      <small>{payout._count.ledgerEntries} ledger hareketi</small>
                    </td>
                    <td>
                      <strong>
                        {formatFinanceMoney(payout.amount, payout.currency)}
                      </strong>
                    </td>
                    <td>
                      <small>
                        {formatFinanceDate(payout.periodStart)}
                        {" → "}
                        {formatFinanceDate(payout.periodEnd)}
                      </small>
                    </td>
                    <td>
                      <strong>{payout.method ?? "Yöntem yok"}</strong>
                      <small>{payout.reference ?? "Referans yok"}</small>
                    </td>
                    <td>
                      <strong>{formatFinanceDate(payout.createdAt)}</strong>
                      <small>Ödeme: {formatFinanceDate(payout.paidAt)}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Payout kaydı yok</strong>
            <p>Seçilen filtrelerde yazar ödeme kaydı bulunamadı.</p>
          </div>
        )}
      </section>
    </>
  );
}
