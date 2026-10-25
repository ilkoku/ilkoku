import Link from "next/link";

import {
  getOrderAccountingReviewSource,
  listRecentOrderAccountingReviews,
} from "@/features/commerce/finance-repository";
import { formatFinanceDate, formatFinanceMoney } from "@/features/commerce/finance-ui";
import { reviewCommerceOrderSettlement } from "@/features/commerce/settlement-review";

const BASE = "/sistem-yonetimi/finans-gelirler/siparis-mali-inceleme";

export default async function OrderAccountingReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ siparis?: string }>;
}) {
  const params = await searchParams;
  const orderNo = params.siparis?.trim().slice(0, 40) ?? "";
  const [order, recent] = await Promise.all([
    orderNo ? getOrderAccountingReviewSource(orderNo) : Promise.resolve(null),
    listRecentOrderAccountingReviews(),
  ]);
  const review = order ? reviewCommerceOrderSettlement({
    status: order.status,
    currency: order.currency,
    originalAmount: order.originalAmount,
    discountAmount: order.discountAmount,
    finalAmount: order.finalAmount,
    couponCodeSnapshot: order.couponCodeSnapshot,
    refundedAt: order.refundedAt,
    sellerMode: order.legalSnapshot?.sellerMode ?? null,
    priceQuote: order.priceQuoteSnapshot,
    payments: order.payments,
    bookedEntryTypes: order.financialLedgerEntries.map((entry) => entry.entryType),
    commissionRateSnapshot: order.commissionRateSnapshot,
    taxReview: order.author.taxReviewsAsWriter[0] ?? null,
  }) : null;

  const cases = review?.scenarios ? [
    ...(review.scenarios.invoiced
      ? [{ title: "Faturalı yazar", subtitle: "%15 komisyon + komisyon KDV; aracılık yok", data: review.scenarios.invoiced }]
      : []),
    ...(review.scenarios.expenseReceipt
      ? [{ title: "Gider pusulasına uygun telif – örnek", subtitle: "%15 telif paylaşımı + ayrıca %5 aracılık + KDV", data: review.scenarios.expenseReceipt }]
      : []),
  ] : [];

  const fmt = (value: bigint) => formatFinanceMoney(value, order?.currency ?? "TRY");

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Finans &amp; Gelirler · Salt okunur</span>
          <h1>Sipariş Mali İnceleme</h1>
          <p>Satın alma sipariş numarasına göre orijinal fiyat, KDV, tahsilat,
            kupon, mevcut ledger ve iki varsayımsal yazar ödeme modelini denetleyin.</p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler">
          Finans &amp; Gelirlere dön
        </Link>
      </header>

      <div className="admin-readonly-notice admin-commerce-readonly" role="status">
        <strong>Muhasebe doğrulaması bekleniyor – ödeme emri oluşturulmaz</strong>
        <p>Buradaki %15 komisyon ve faturasız yazara özgü ayrıca %5 + KDV aracılık
          yalnız teklif hesabıdır. Yazarın fatura, e-SMM veya gider pusulası
          uygunluğu, lisans sözleşmesi, KDV indirimi ve stopaj mali müşavir
          tarafından doğrulanmadan gerçek hakediş, beyanname ya da banka
          ödemesi kaydedilmez.</p>
      </div>

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Sipariş numarası</span>
            <input
              name="siparis"
              type="search"
              maxLength={40}
              placeholder="ILK-..."
              defaultValue={orderNo}
              aria-label="İncelenecek sipariş numarası"
            />
          </label>
          <button className="admin-button admin-button--primary" type="submit">
            Mali inceleme yap
          </button>
          {orderNo ? <Link className="admin-button" href={BASE}>Temizle</Link> : null}
        </form>
      </section>

      {orderNo && !order ? (
        <div className="admin-readonly-notice" role="alert">
          Bu sipariş numarasıyla eşleşen kayıt bulunamadı.
        </div>
      ) : null}

      {order ? (
        <>
          <section className="admin-settings-grid admin-commerce-summary">
            <article className="admin-panel admin-settings-card">
              <span>Sipariş No</span>
              <h2>{order.orderNo}</h2>
              <p>{order.work.title}</p>
            </article>
            <article className="admin-panel admin-settings-card">
              <span>Okurdan tahsil edilmesi gereken</span>
              <h2>{fmt(order.finalAmount)}</h2>
              <p>Durum: {order.status} · {formatFinanceDate(order.paidAt)}</p>
            </article>
            <article className="admin-panel admin-settings-card">
              <span>Yazar</span>
              <h2>{order.author.displayName ?? order.author.fullName}</h2>
              <p>{order.author.publicId}</p>
              <p>
                <Link href={"/sistem-yonetimi/finans-gelirler/yazar-vergi-inceleme?yazar=" + encodeURIComponent(order.author.publicId)}>
                  Yazarın belge inceleme kaydını aç
                </Link>
              </p>
              <p>
                Son belge kaydı: {order.author.taxReviewsAsWriter[0]?.decision ?? "Yok"}
                {" · "}{order.author.taxReviewsAsWriter[0]?.documentKind ?? "Tür belirlenmedi"}
              </p>
            </article>
            <article className="admin-panel admin-settings-card">
              <span>Satıcı</span>
              <h2>{order.legalSnapshot?.sellerName ?? "Doğrulanmadı"}</h2>
              <p>{order.legalSnapshot?.sellerMode ?? "Hukukî taraf belirsiz"}</p>
            </article>
          </section>

          <section className="admin-panel">
            <div className="admin-panel__heading">
              <div><span>Kaynak kontrolü</span><h2>Sipariş kayıtları</h2></div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-data-table admin-commerce-table">
                <tbody>
                  <tr><th>KDV hariç liste fiyatı</th><td>{order.priceQuoteSnapshot ? fmt(order.priceQuoteSnapshot.listNetAmount) : "Kayıt yok"}</td></tr>
                  <tr><th>Liste satış KDV&apos;si</th><td>{order.priceQuoteSnapshot ? fmt(order.priceQuoteSnapshot.listVatAmount) : "Kayıt yok"}</td></tr>
                  <tr><th>İskonto (KDV dâhil)</th><td>{fmt(order.discountAmount)}</td></tr>
                  <tr><th>Okurun sipariş tutarı</th><td>{fmt(order.finalAmount)}</td></tr>
                  <tr><th>Başarılı ödeme adedi</th><td>{order.payments.filter((p) => p.status === "succeeded").length}</td></tr>
                  <tr><th>Mevcut finans hareketi adedi</th><td>{order.financialLedgerEntries.length}</td></tr>
                  <tr><th>Mevcut finans hareketleri</th><td>{order.financialLedgerEntries.map((e) => e.entryType).join(", ") || "Yok"}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {review?.blockers.length ? (
            <section className="admin-readonly-notice admin-commerce-readonly" role="alert">
              <strong>Hesaplama durduruldu – {review.blockers.length} kontrol gerekiyor</strong>
              <ul>
                {review.blockers.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
              <p>Sipariş kaydı, hakediş veya ledger değiştirilmedi.</p>
            </section>
          ) : null}

          {cases.length ? (
            <section className="admin-panel">
              <div className="admin-panel__heading">
                <div>
                  <span>Salt okunur ön değerlendirme</span>
                  <h2>İki olası belge modeli – kesin ödeme değil</h2>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-data-table admin-commerce-table">
                  <thead><tr><th>Kalem</th>{cases.map((c) => <th key={c.title}>{c.title}</th>)}</tr></thead>
                  <tbody>
                    {([
                      ["Okur tahsilatı", "readerTotal"],
                      ["İlkOku komisyon geliri", "commissionNet"],
                      ["Komisyon KDV'si", "commissionVat"],
                      ["Ayrı aracılık hizmet geliri", "platformServiceNet"],
                      ["Aracılık hizmet KDV'si", "platformServiceVat"],
                      ["Yazar brüt telifi / alış matrahı", "authorGross"],
                      ["Yazar stopajı", "withholding"],
                      ["Yazara örnek banka ödemesi", "authorBankPayment"],
                      ["1 No.lu KDV nakit çıkışı", "vat1Payment"],
                      ["2 No.lu KDV nakit çıkışı", "vat2Payment"],
                      ["İlkOku vergi öncesi örnek kârı", "profitBeforeCorporateTax"],
                      ["Örnek kurumlar vergisi karşılığı", "corporateTaxIllustration"],
                      ["Diğer giderler öncesi teorik net kâr", "profitAfterTax"],
                    ] as const).map(([label, key]) => (
                      <tr key={key}>
                        <th>{label}</th>
                        {cases.map(({ title, data }) => <td key={title}>{fmt(data[key])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {cases.map((c) => <p key={c.title}><strong>{c.title}:</strong> {c.subtitle}</p>)}
              <p>Bu hesap yalnız KDV indiriminin uygulanabildiği, başka işletme gideri
                olmayan ve hukuken uygun belge düzenlenen varsayımsal işlemi anlatır.
                Yazar ve eser özel oranları, kupon, iadeler veya farklı vergi statüsü
                için kesin hakediş hesaplanmadı. Kurumlar vergisi şirket dönem matrahına bağlıdır.</p>
            </section>
          ) : null}
        </>
      ) : null}

      {!orderNo ? (
        <section className="admin-panel">
          <div className="admin-panel__heading">
            <div><span>Son siparişler</span><h2>Mali inceleme için sipariş seçin</h2></div>
            <b>{recent.length}</b>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead><tr><th>Sipariş No</th><th>Eser</th><th>Tutar</th><th>Fiyat kaydı</th><th>İşlem</th></tr></thead>
              <tbody>
                {recent.map((item) => (
                  <tr key={item.orderNo}>
                    <td><strong>{item.orderNo}</strong></td>
                    <td>{item.work.title}</td>
                    <td>{formatFinanceMoney(item.finalAmount, item.currency)}</td>
                    <td>{item.priceQuoteSnapshot?.taxTreatment ?? "Eski/eksik kayıt"}</td>
                    <td><Link href={BASE + "?siparis=" + encodeURIComponent(item.orderNo)}>Mali inceleme</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!recent.length ? <p>Henüz incelenebilir sipariş kaydı yok.</p> : null}
        </section>
      ) : null}
    </>
  );
}
