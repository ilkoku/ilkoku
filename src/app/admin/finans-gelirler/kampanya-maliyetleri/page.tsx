import Link from "next/link";

import { listPlatformCampaignCosts } from "@/features/commerce/finance-repository";
import {
  formatFinanceDate,
  formatFinanceMoney,
} from "@/features/commerce/finance-ui";

export default async function CampaignCostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 120) ?? "";
  const entries = await listPlatformCampaignCosts(q);
  const total = entries.reduce(
    (sum, entry) => sum + entry.amount,
    BigInt(0),
  );

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Finans & Gelirler</span>
          <h1>Kampanya Maliyetleri</h1>
          <p>
            İlkOku tarafından finanse edilen kupon indirimlerini ayrı
            izleyin. Bu hareketler yazarın normal hakediş matrahını azaltmaz.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler">
          Finans & Gelirlere dön
        </Link>
      </header>

      <section className="admin-settings-grid admin-commerce-summary">
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Kampanya maliyeti</span>
          <h2>{formatFinanceMoney(total, "TRY")}</h2>
          <p>Gösterilen platform_coupon_discount hareketlerinin toplamı.</p>
        </article>
      </section>

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Ara</span>
            <input
              defaultValue={q}
              name="q"
              placeholder="Kupon, sipariş, eser veya yazar"
              type="search"
            />
          </label>
          <button className="admin-button admin-button--primary" type="submit">
            Ara
          </button>
          {q ? (
            <Link
              className="admin-button"
              href="/sistem-yonetimi/finans-gelirler/kampanya-maliyetleri"
            >
              Temizle
            </Link>
          ) : null}
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>İlkOku finansmanlı kuponlar</span>
            <h2>Son 300 kampanya maliyeti</h2>
          </div>
          <b>{entries.length}</b>
        </div>

        {entries.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead>
                <tr>
                  <th>Kupon</th>
                  <th>Eser / yazar</th>
                  <th>Kampanya maliyeti</th>
                  <th>Sipariş</th>
                  <th>Yazar matrahı</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.coupon?.code ?? "Kupon kaydı yok"}</strong>
                    </td>
                    <td>
                      <strong>{entry.work?.title ?? "Eser bağlantısı yok"}</strong>
                      <small>
                        {entry.author
                          ? `${entry.author.displayName ?? entry.author.fullName} · ${entry.author.publicId}`
                          : "Yazar bağlantısı yok"}
                      </small>
                    </td>
                    <td>
                      <strong>{formatFinanceMoney(entry.amount, entry.currency)}</strong>
                    </td>
                    <td>
                      <strong>{entry.order?.orderNo ?? "Sipariş yok"}</strong>
                      {entry.order ? (
                        <small>
                          Okur toplamı:{" "}
                          {formatFinanceMoney(entry.order.finalAmount, entry.currency)}
                        </small>
                      ) : null}
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
            <strong>Kampanya maliyeti yok</strong>
            <p>Seçilen aramada platform kupon maliyeti bulunamadı.</p>
          </div>
        )}
      </section>
    </>
  );
}
