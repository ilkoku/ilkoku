import Link from "next/link";

import { listAuthorEarningLedger } from "@/features/commerce/finance-repository";
import {
  formatFinanceDate,
  formatFinanceMoney,
} from "@/features/commerce/finance-ui";

export default async function AuthorEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 120) ?? "";
  const entries = await listAuthorEarningLedger(q);
  const total = entries.reduce(
    (sum, entry) => sum + entry.amount,
    BigInt(0),
  );

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Finans & Gelirler</span>
          <h1>Yazar Hakedişleri</h1>
          <p>
            Yalnız author_earning ledger hareketlerini gösterir. Hakediş
            oranları kesinleşmeden yeni bir komisyon hesabı üretilmez.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler">
          Finans & Gelirlere dön
        </Link>
      </header>

      <section className="admin-settings-grid admin-commerce-summary">
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Yazar hakediş toplamı</span>
          <h2>{formatFinanceMoney(total, "TRY")}</h2>
          <p>Gösterilen author_earning hareketlerinin toplamı.</p>
        </article>
      </section>

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Ara</span>
            <input
              defaultValue={q}
              name="q"
              placeholder="Yazar, eser veya sipariş no"
              type="search"
            />
          </label>
          <button className="admin-button admin-button--primary" type="submit">
            Ara
          </button>
          {q ? (
            <Link
              className="admin-button"
              href="/sistem-yonetimi/finans-gelirler/yazar-hakedisleri"
            >
              Temizle
            </Link>
          ) : null}
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Ledger hakediş hareketleri</span>
            <h2>Son 300 kayıt</h2>
          </div>
          <b>{entries.length}</b>
        </div>

        {entries.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead>
                <tr>
                  <th>Yazar</th>
                  <th>Eser</th>
                  <th>Sipariş</th>
                  <th>Hakediş</th>
                  <th>Hakediş matrahı</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      {entry.author ? (
                        <>
                          <strong>
                            {entry.author.displayName ?? entry.author.fullName}
                          </strong>
                          <small>{entry.author.publicId}</small>
                        </>
                      ) : (
                        <small>Yazar bağlantısı yok</small>
                      )}
                    </td>
                    <td>
                      <strong>{entry.work?.title ?? "Eser bağlantısı yok"}</strong>
                    </td>
                    <td>
                      <strong>{entry.order?.orderNo ?? "Sipariş yok"}</strong>
                      {entry.order ? (
                        <>
                          <small>
                            Okur toplamı:{" "}
                            {formatFinanceMoney(
                              entry.order.finalAmount,
                              entry.currency,
                            )}
                          </small>
                          <small>
                            İndirim:{" "}
                            {formatFinanceMoney(
                              entry.order.discountAmount,
                              entry.currency,
                            )}
                          </small>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <strong>{formatFinanceMoney(entry.amount, entry.currency)}</strong>
                    </td>
                    <td>
                      {entry.order ? (
                        <strong>
                          {formatFinanceMoney(
                            entry.order.authorEarningBaseAmount,
                            entry.currency,
                          )}
                        </strong>
                      ) : (
                        <small>—</small>
                      )}
                    </td>
                    <td>{formatFinanceDate(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Hakediş hareketi yok</strong>
            <p>Seçilen aramada author_earning kaydı bulunamadı.</p>
          </div>
        )}
      </section>
    </>
  );
}
