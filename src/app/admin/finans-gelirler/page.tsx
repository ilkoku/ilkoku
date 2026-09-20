import { prisma } from "@/lib/prisma";

function formatMoney(value: bigint) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value) / 100);
}

export default async function FinanceIncomePage() {
  const [ledger, balances, payouts] = await Promise.all([
    prisma.financialLedger.findMany({
      select: { amount: true, entryType: true },
    }),
    prisma.authorBalance.findMany({
      where: { currency: "TRY" },
      select: {
        pendingAmount: true,
        availableAmount: true,
        processingAmount: true,
        paidAmount: true,
      },
    }),
    prisma.payout.count(),
  ]);

  const sum = (type: (typeof ledger)[number]["entryType"]) =>
    ledger
      .filter((entry) => entry.entryType === type)
      .reduce((total, entry) => total + entry.amount, 0n);

  const platformCampaignCost = sum("platform_coupon_discount");
  const grossSales = sum("sale_gross");
  const authorEarnings = sum("author_earning");
  const platformCommission = sum("platform_commission");

  const pendingAuthor = balances.reduce(
    (total, balance) => total + balance.pendingAmount,
    0n,
  );
  const availableAuthor = balances.reduce(
    (total, balance) => total + balance.availableAmount,
    0n,
  );

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Muhasebe görünümü</span>
          <h1>Finans & Gelirler</h1>
          <p>
            Satış hacmini, yazar hakedişini, İlkOku gelirini, kampanya
            maliyetini ve ödeme durumlarını birbirinden ayrı izleyin.
          </p>
        </div>
      </header>

      <section className="admin-settings-grid">
        <article className="admin-panel admin-settings-card">
          <span>Toplam satış hacmi</span>
          <h2>{formatMoney(grossSales)}</h2>
          <p>İlkOku geliri değildir; brüt satış hareketidir.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span>Yazar hakedişleri</span>
          <h2>{formatMoney(authorEarnings)}</h2>
          <p>Ledger üzerindeki yazar kazancı hareketleri.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span>İlkOku brüt payı</span>
          <h2>{formatMoney(platformCommission)}</h2>
          <p>Platform komisyon hareketleri.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span>Kampanya maliyeti</span>
          <h2>{formatMoney(platformCampaignCost)}</h2>
          <p>İlkOku tarafından finanse edilen kupon indirimleri.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span>Yazarlara bekleyen</span>
          <h2>{formatMoney(pendingAuthor)}</h2>
          <p>Henüz ödenebilir duruma gelmemiş bakiye.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span>Yazarlara ödenebilir</span>
          <h2>{formatMoney(availableAuthor)}</h2>
          <p>Ödeme için uygun yazar bakiyesi.</p>
        </article>
      </section>

      <section className="admin-panel">
        <h2>Yazar ödeme kayıtları</h2>
        <p>{payouts.toLocaleString("tr-TR")} payout kaydı bulunuyor.</p>
      </section>
    </>
  );
}
