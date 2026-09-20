import Link from "next/link";

import { getFinanceOverview } from "@/features/commerce/finance-repository";
import { formatFinanceMoney } from "@/features/commerce/finance-ui";

export default async function FinanceIncomePage() {
  const overview = await getFinanceOverview("TRY");

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Muhasebe görünümü</span>
          <h1>Finans & Gelirler</h1>
          <p>
            Satış hacmi, yazar hakedişi, İlkOku hizmet payı, kampanya maliyeti,
            yazar bakiyesi ve payout kayıtlarını ledger merkezli izleyin.
          </p>
        </div>
      </header>

      <section className="admin-settings-grid admin-commerce-summary">
        <article className="admin-panel admin-settings-card">
          <span>Toplam satış hacmi</span>
          <h2>{formatFinanceMoney(overview.grossSales, overview.currency)}</h2>
          <p>İlkOku geliri değildir; brüt satış ledger hareketidir.</p>
          <Link href="/sistem-yonetimi/finans-gelirler/finans-hareketleri">
            Finans hareketlerini aç →
          </Link>
        </article>

        <article className="admin-panel admin-settings-card">
          <span>Yazar hakedişleri</span>
          <h2>
            {formatFinanceMoney(overview.authorEarnings, overview.currency)}
          </h2>
          <p>Ledger üzerindeki author_earning hareketleri.</p>
          <Link href="/sistem-yonetimi/finans-gelirler/yazar-hakedisleri">
            Hakedişleri aç →
          </Link>
        </article>

        <article className="admin-panel admin-settings-card">
          <span>İlkOku hizmet payı</span>
          <h2>
            {formatFinanceMoney(
              overview.platformCommission,
              overview.currency,
            )}
          </h2>
          <p>Platform komisyon hareketidir; toplam satış hacmi değildir.</p>
          <Link href="/sistem-yonetimi/finans-gelirler/ilkoku-gelirleri">
            İlkOku gelirlerini aç →
          </Link>
        </article>

        <article className="admin-panel admin-settings-card">
          <span>Kampanya maliyeti</span>
          <h2>
            {formatFinanceMoney(
              overview.platformCampaignCost,
              overview.currency,
            )}
          </h2>
          <p>İlkOku tarafından finanse edilen kupon hareketleri.</p>
          <Link href="/sistem-yonetimi/finans-gelirler/kampanya-maliyetleri">
            Kampanya maliyetlerini aç →
          </Link>
        </article>

        <article className="admin-panel admin-settings-card">
          <span>Yazarlara bekleyen</span>
          <h2>
            {formatFinanceMoney(overview.pendingAuthor, overview.currency)}
          </h2>
          <p>Henüz ödenebilir bakiyeye geçmemiş tutar.</p>
          <Link href="/sistem-yonetimi/finans-gelirler/yazar-bakiyeleri">
            Yazar bakiyelerini aç →
          </Link>
        </article>

        <article className="admin-panel admin-settings-card">
          <span>Yazarlara ödenebilir</span>
          <h2>
            {formatFinanceMoney(overview.availableAuthor, overview.currency)}
          </h2>
          <p>Ödeme için uygun bakiye projeksiyonu.</p>
          <Link href="/sistem-yonetimi/finans-gelirler/yazar-bakiyeleri">
            Bakiyeleri aç →
          </Link>
        </article>

        <article className="admin-panel admin-settings-card">
          <span>Ödeme sürecinde</span>
          <h2>
            {formatFinanceMoney(overview.processingAuthor, overview.currency)}
          </h2>
          <p>Payout sürecine alınmış bakiye.</p>
          <Link href="/sistem-yonetimi/finans-gelirler/yazar-odemeleri">
            Yazar ödemelerini aç →
          </Link>
        </article>

        <article className="admin-panel admin-settings-card">
          <span>Ödenen</span>
          <h2>{formatFinanceMoney(overview.paidAuthor, overview.currency)}</h2>
          <p>Yazar bakiyesi projeksiyonundaki ödenmiş toplam.</p>
          <Link href="/sistem-yonetimi/finans-gelirler/yazar-odemeleri">
            Payout kayıtlarını aç →
          </Link>
        </article>
      </section>

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <h2>Mutabakat</h2>
          <p>
            Paid sipariş, sale_gross ledger hareketi, aktif entitlement ve
            provider sonucu arasındaki tutarsızlıkları kontrol edin.
          </p>
          <Link
            className="admin-button admin-button--primary"
            href="/sistem-yonetimi/finans-gelirler/mutabakat"
          >
            Mutabakatı aç
          </Link>
        </article>

        <article className="admin-panel">
          <h2>Finans kayıtları</h2>
          <p>
            {overview.ledgerEntryCount.toLocaleString("tr-TR")} ledger hareketi
            ve {overview.payoutCount.toLocaleString("tr-TR")} payout kaydı
            bulunuyor.
          </p>
          <Link
            className="admin-button"
            href="/sistem-yonetimi/finans-gelirler/finans-hareketleri"
          >
            Ledger&apos;ı aç
          </Link>
        </article>
      </section>

      <div className="admin-readonly-notice admin-commerce-readonly">
        <strong>Finansal gerçek kaynak ledger&apos;dır</strong>
        <p>
          AuthorBalance ekranı operasyonel bir projeksiyondur. Komisyon,
          vergi/stopaj ve payout yürütüm oranları kesinleşmeden sistem yeni
          finans kuralı üretmez.
        </p>
      </div>
    </>
  );
}
