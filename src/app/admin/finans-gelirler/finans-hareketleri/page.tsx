import Link from "next/link";

import {
  getFinanceLedgerTypeCounts,
  listFinanceLedger,
  type FinanceLedgerTypeFilter,
} from "@/features/commerce/finance-repository";
import {
  formatFinanceDate,
  formatFinanceMoney,
  ledgerTypeLabels,
} from "@/features/commerce/finance-ui";

const types: FinanceLedgerTypeFilter[] = [
  "all",
  "sale_gross",
  "author_earning",
  "platform_commission",
  "platform_coupon_discount",
  "author_coupon_discount",
  "payment_provider_fee",
  "refund",
  "tax_withholding",
  "adjustment",
  "payout",
];

function parseType(value: string | undefined): FinanceLedgerTypeFilter {
  return types.includes(value as FinanceLedgerTypeFilter)
    ? (value as FinanceLedgerTypeFilter)
    : "all";
}

function hrefFor(type: FinanceLedgerTypeFilter, q: string) {
  const params = new URLSearchParams();
  if (type !== "all") params.set("type", type);
  if (q) params.set("q", q);
  const query = params.toString();

  return `/sistem-yonetimi/finans-gelirler/finans-hareketleri${query ? `?${query}` : ""}`;
}

export default async function FinanceLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 120) ?? "";
  const type = parseType(query.type);

  const [entries, counts] = await Promise.all([
    listFinanceLedger({ q, type }),
    getFinanceLedgerTypeCounts(),
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
          <h1>Finans Hareketleri</h1>
          <p>
            Ledger İlkOku commerce finansının değiştirilmeyen işlem
            kaynağıdır. Sipariş, eser, yazar, kupon ve payout bağlantılarını
            birlikte izleyin.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler">
          Finans & Gelirlere dön
        </Link>
      </header>

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Ara</span>
            <input
              defaultValue={q}
              name="q"
              placeholder="Sipariş no, eser, yazar, kupon veya idempotency key"
              type="search"
            />
          </label>
          {type !== "all" ? <input name="type" type="hidden" value={type} /> : null}
          <button className="admin-button admin-button--primary" type="submit">
            Ara
          </button>
          {q || type !== "all" ? (
            <Link
              className="admin-button"
              href="/sistem-yonetimi/finans-gelirler/finans-hareketleri"
            >
              Temizle
            </Link>
          ) : null}
        </form>

        <nav aria-label="Ledger hareket türü" className="admin-commerce-tabs">
          {types.map((item) => (
            <Link
              aria-current={type === item ? "page" : undefined}
              href={hrefFor(item, q)}
              key={item}
            >
              {item === "all"
                ? `Tümü (${total})`
                : `${ledgerTypeLabels[item]} (${counts[item] ?? 0})`}
            </Link>
          ))}
        </nav>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Ledger</span>
            <h2>Son 300 hareket</h2>
          </div>
          <b>{entries.length}</b>
        </div>

        {entries.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead>
                <tr>
                  <th>Tür</th>
                  <th>Tutar</th>
                  <th>Sipariş / eser</th>
                  <th>Yazar</th>
                  <th>Kupon / payout</th>
                  <th>Kayıt</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{ledgerTypeLabels[entry.entryType]}</strong>
                      <small>{entry.entryType}</small>
                    </td>
                    <td>
                      <strong>{formatFinanceMoney(entry.amount, entry.currency)}</strong>
                      <small>{entry.currency}</small>
                    </td>
                    <td>
                      <strong>{entry.order?.orderNo ?? "Sipariş yok"}</strong>
                      <small>{entry.work?.title ?? "Eser bağlantısı yok"}</small>
                      {entry.order ? <small>Sipariş: {entry.order.status}</small> : null}
                    </td>
                    <td>
                      {entry.author ? (
                        <>
                          <strong>{entry.author.displayName ?? entry.author.fullName}</strong>
                          <small>{entry.author.publicId}</small>
                        </>
                      ) : (
                        <small>Yazar bağlantısı yok</small>
                      )}
                    </td>
                    <td>
                      {entry.coupon ? (
                        <small>
                          Kupon: {entry.coupon.code} · {entry.coupon.owner}
                        </small>
                      ) : null}
                      {entry.payout ? (
                        <small>
                          Payout: {entry.payout.status}
                          {entry.payout.reference ? ` · ${entry.payout.reference}` : ""}
                        </small>
                      ) : null}
                      {!entry.coupon && !entry.payout ? <small>—</small> : null}
                    </td>
                    <td>
                      <strong>{formatFinanceDate(entry.createdAt)}</strong>
                      <small>{entry.idempotencyKey}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Finans hareketi yok</strong>
            <p>Seçilen filtrelerde ledger kaydı bulunamadı.</p>
          </div>
        )}
      </section>
    </>
  );
}
