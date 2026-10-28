import Link from "next/link";

import { getFinanceReconciliationSnapshot } from "@/features/commerce/finance-repository";
import { formatFinanceMoney } from "@/features/commerce/finance-ui";

export default async function FinanceReconciliationPage() {
  const snapshot = await getFinanceReconciliationSnapshot();
  const anomalyCount =
    snapshot.paidWithoutGrossLedger.length +
    snapshot.paidWithoutActiveEntitlement.length;

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Finans & Gelirler</span>
          <h1>Mutabakat</h1>
          <p>
            Paid sipariş, sale_gross ledger, entitlement ve provider ödeme
            kayıtlarını operasyonel olarak çapraz kontrol edin. Uyarı listeleri
            performans için son 500 paid sipariş üzerinde taranır; üst sayaçlar
            tam veritabanı toplamıdır.
          </p>
        </div>
        <div>
          <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler/siparis-mali-inceleme">
            Sipariş Mali İnceleme
          </Link>
          <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler">
            Finans &amp; Gelirlere dön
          </Link>
        </div>
      </header>

      <section className="admin-settings-grid admin-commerce-summary">
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Paid sipariş</span>
          <h2>{snapshot.paidOrderCount.toLocaleString("tr-TR")}</h2>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">sale_gross hareketi</span>
          <h2>{snapshot.grossEntryCount.toLocaleString("tr-TR")}</h2>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Aktif entitlement</span>
          <h2>{snapshot.activeEntitlementCount.toLocaleString("tr-TR")}</h2>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Başarılı payment</span>
          <h2>{snapshot.successfulPaymentCount.toLocaleString("tr-TR")}</h2>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Bekleyen sipariş</span>
          <h2>{snapshot.pendingOrderCount.toLocaleString("tr-TR")}</h2>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Bekleyen payment</span>
          <h2>{snapshot.pendingPaymentCount.toLocaleString("tr-TR")}</h2>
        </article>
      </section>

      <div
        className={
          anomalyCount > 0
            ? "admin-readonly-notice admin-commerce-readonly"
            : "admin-panel"
        }
      >
        <strong>
          {anomalyCount > 0
            ? `${anomalyCount} mutabakat uyarısı`
            : "Temel paid-order kontrollerinde uyarı yok"}
        </strong>
        <p>
          Bu ekran otomatik düzeltme yapmaz. Tutarsızlık varsa kaynak kayıtlar
          incelenmeden ledger, entitlement veya sipariş üzerinde mutation
          uygulanmaz.
        </p>
      </div>

      <section className="admin-panel" aria-label="Mali inceleme bekleyen ücretli siparişler">
        <div className="admin-panel__heading">
          <div>
            <span>Yazar hakedişi · Salt okunur kontrol</span>
            <h2>Mali inceleme bekleyen ücretli siparişler</h2>
          </div>
          <b>{snapshot.paidAwaitingAuthorEarningReview.length}</b>
        </div>
        <p>
          Yalnızca son 500 paid sipariş içinden, tutarı sıfırdan büyük olduğu
          halde henüz author_earning kaydı bulunmayanlar listelenir. Bu
          durum tek başına hakediş borcu, muhasebe hatası, yazar ödemesi veya
          vergi yükümlülüğü oluşturmaz. Belge ve satıcı modeli kontrolü gerekir.
          0 TL siparişler bu listeye girmez.
        </p>
        {snapshot.paidAwaitingAuthorEarningReview.length ? (
          <div className="admin-profile-list">
            {snapshot.paidAwaitingAuthorEarningReview.map((order) => (
              <div key={order.id}>
                <Link href={
                  "/sistem-yonetimi/finans-gelirler/siparis-mali-inceleme?siparis=" +
                  encodeURIComponent(order.orderNo)
                }>
                  {order.orderNo} · Mali incelemeyi aç
                </Link>
                <span>{formatFinanceMoney(order.finalAmount, order.currency)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p>Son 500 paid siparişte inceleme bekleyen ücretli kayıt bulunmadı.</p>
        )}
      </section>

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <span>Ledger kontrolü</span>
              <h2>Paid ama sale_gross yok</h2>
            </div>
            <b>{snapshot.paidWithoutGrossLedger.length}</b>
          </div>
          {snapshot.paidWithoutGrossLedger.length ? (
            <div className="admin-profile-list">
              {snapshot.paidWithoutGrossLedger.map((order) => (
                <div key={order.id}>
                  <strong>{order.orderNo}</strong>
                  <span>{formatFinanceMoney(order.finalAmount, order.currency)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>Uyarı bulunamadı.</p>
          )}
        </article>

        <article className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <span>Erişim kontrolü</span>
              <h2>Paid ama aktif entitlement yok</h2>
            </div>
            <b>{snapshot.paidWithoutActiveEntitlement.length}</b>
          </div>
          {snapshot.paidWithoutActiveEntitlement.length ? (
            <div className="admin-profile-list">
              {snapshot.paidWithoutActiveEntitlement.map((order) => (
                <div key={order.id}>
                  <strong>{order.orderNo}</strong>
                  <span>{formatFinanceMoney(order.finalAmount, order.currency)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>Uyarı bulunamadı.</p>
          )}
        </article>
      </section>
    </>
  );
}
