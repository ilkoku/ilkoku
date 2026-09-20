import Link from "next/link";

import { listAuthorBalances } from "@/features/commerce/finance-repository";
import {
  formatFinanceDate,
  formatFinanceMoney,
} from "@/features/commerce/finance-ui";

export default async function AuthorBalancesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 120) ?? "";
  const balances = await listAuthorBalances(q);

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Finans & Gelirler</span>
          <h1>Yazar Bakiyeleri</h1>
          <p>
            Pending, available, processing ve paid projeksiyonlarını izleyin.
            Finansal gerçek kaynak ledger&apos;dır; bakiye tablosu operasyonel
            projeksiyondur.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler">
          Finans & Gelirlere dön
        </Link>
      </header>

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Yazar ara</span>
            <input
              defaultValue={q}
              name="q"
              placeholder="Yazar adı veya İlkOku kimliği"
              type="search"
            />
          </label>
          <button className="admin-button admin-button--primary" type="submit">
            Ara
          </button>
          {q ? (
            <Link
              className="admin-button"
              href="/sistem-yonetimi/finans-gelirler/yazar-bakiyeleri"
            >
              Temizle
            </Link>
          ) : null}
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Operasyonel bakiye projeksiyonu</span>
            <h2>Yazar bakiyeleri</h2>
          </div>
          <b>{balances.length}</b>
        </div>

        {balances.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead>
                <tr>
                  <th>Yazar</th>
                  <th>Bekleyen</th>
                  <th>Ödenebilir</th>
                  <th>İşleniyor</th>
                  <th>Ödenen</th>
                  <th>Güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((balance) => (
                  <tr key={balance.id}>
                    <td>
                      <strong>
                        {balance.author.displayName ?? balance.author.fullName}
                      </strong>
                      <small>{balance.author.publicId}</small>
                    </td>
                    <td>
                      <strong>
                        {formatFinanceMoney(balance.pendingAmount, balance.currency)}
                      </strong>
                    </td>
                    <td>
                      <strong>
                        {formatFinanceMoney(balance.availableAmount, balance.currency)}
                      </strong>
                    </td>
                    <td>
                      <strong>
                        {formatFinanceMoney(balance.processingAmount, balance.currency)}
                      </strong>
                    </td>
                    <td>
                      <strong>
                        {formatFinanceMoney(balance.paidAmount, balance.currency)}
                      </strong>
                    </td>
                    <td>{formatFinanceDate(balance.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Yazar bakiyesi yok</strong>
            <p>Seçilen aramada bakiye kaydı bulunamadı.</p>
          </div>
        )}
      </section>
    </>
  );
}
