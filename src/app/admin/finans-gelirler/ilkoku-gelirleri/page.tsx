import Link from "next/link";

import { listPlatformIncomeLedger } from "@/features/commerce/finance-repository";
import {
  formatFinanceDate,
  formatFinanceMoney,
} from "@/features/commerce/finance-ui";

export default async function PlatformIncomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 120) ?? "";
  const entries = await listPlatformIncomeLedger(q);
  const total = entries.reduce(
    (sum, entry) => sum + entry.amount,
    BigInt(0),
  );

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Finans & Gelirler</span>
          <h1>İlkOku Gelirleri</h1>
          <p>
            Yalnız platform_commission ledger hareketlerini gösterir. Brüt
            satış hacmi İlkOku geliri olarak kabul edilmez.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler">
          Finans & Gelirlere dön
        </Link>
      </header>

      <section className="admin-settings-grid admin-commerce-summary">
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">İlkOku hizmet payı</span>
          <h2>{formatFinanceMoney(total, "TRY")}</h2>
          <p>Gösterilen platform_commission hareketlerinin toplamı.</p>
        </article>
      </section>

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Ara</span>
            <input
              defaultValue={q}
              name="q"
              placeholder="Sipariş, eser veya yazar"
              type="search"
            />
          </label>
          <button className="admin-button admin-button--primary" type="submit">
            Ara
          </button>
          {q ? (
            <Link
              className="admin-button"
              href="/sistem-yonetimi/finans-gelirler/ilkoku-gelirleri"
            >
              Temizle
            </Link>
          ) : null}
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Platform hizmet payı</span>
            <h2>Son 300 hareket</h2>
          </div>
          <b>{entries.length}</b>
        </div>

        {entries.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Eser</th>
                  <th>Yazar</th>
                  <th>İlkOku hizmet payı</th>
                  <th>Okur toplamı</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.order?.orderNo ?? "Sipariş yok"}</strong>
                    </td>
                    <td>
                      <strong>{entry.work?.title ?? "Eser bağlantısı yok"}</strong>
                    </td>
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
                      <strong>{formatFinanceMoney(entry.amount, entry.currency)}</strong>
                    </td>
                    <td>
                      {entry.order ? (
                        <strong>
                          {formatFinanceMoney(
                            entry.order.finalAmount,
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
            <strong>İlkOku gelir hareketi yok</strong>
            <p>Seçilen aramada platform komisyon kaydı bulunamadı.</p>
          </div>
        )}
      </section>

      <div className="admin-readonly-notice admin-commerce-readonly">
        <strong>Net kâr hesabı yapılmıyor</strong>
        <p>
          Ödeme sağlayıcı gideri, kampanya maliyeti, vergi ve diğer gider
          kuralları tamamlanmadan bu ekran yalnız kayıtlı platform hizmet payını
          gösterir; net gelir/kâr uydurmaz.
        </p>
      </div>
    </>
  );
}
