import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { getWriterFinanceOverview, getWriterTest209DemoCounts } from "@/features/commerce/finance-repository";
import { hasOperationalPaymentProvider } from "@/features/commerce/payment-providers";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import { prisma } from "@/lib/prisma";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Gelirler | İlkOku",
  description: "Yazar satış, hakediş ve bakiye görünümü.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatMoney(value: bigint, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(Number(value) / 100);
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function formatOrderStatus(status: string) {
  if (status === "refunded") return "İade edildi";
  if (status === "paid") return "Ödendi";
  return status;
}

export default async function WriterIncomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/gelirler");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi");
  }

  const [finance, checkoutEnabled, test209Demo, billing] = await Promise.all([
    getWriterFinanceOverview(profile.id),
    Promise.resolve(isCommerceCheckoutEnabled()),
    getWriterTest209DemoCounts(profile.id),
    prisma.authorBillingProfile.findUnique({
      where: { authorId: profile.id },
      select: { invoiceStatus: true },
    }),
  ]);
  const providerReady = hasOperationalPaymentProvider();
  const paidCommerceLive = checkoutEnabled && providerReady;
  const deductions =
    finance.authorCouponDiscounts +
    finance.providerFees +
    finance.platformCommission +
    finance.refunds +
    finance.taxWithholding;

  return (
    <AppShell profile={profile}>
      <div className={`${styles.page} ${styles.writerCommercePage} ${styles.writerFinancePage}`}>
        <header className={`${styles.hero} ${styles.writerFinanceHero}`}>
          <div>
            <span className={styles.eyebrow}>Yazar finans görünümü</span>
            <h1>Gelirler</h1>
            <p>
              Satış hacmi, kesinti hareketleri, hakediş ve ödeme durumlarını
              kendi eserlerin için izleyebilirsin.
            </p>
          </div>
          <span className={styles.badge}>
            {paidCommerceLive ? "Tahsilat aktif" : "Ödeme sistemi hazırlanıyor"}
          </span>
        </header>

        <div className={styles.heroActions}>
          <Link className={styles.secondaryAction} href="/satis-erisim/odemelerim">
            Ödemelerim
          </Link>
        </div>

        <div className={styles.notice} role="status">
          Fatura durumum:{" "}
          <strong>
            {billing?.invoiceStatus === "invoicing" ? "Faturalı"
              : billing?.invoiceStatus === "non_invoicing" ? "Faturasız"
                : "Henüz belirtilmedi"}
          </strong>. Bu yalnız kendi beyanındır; mali belge incelemesi veya
          hakediş onayı değildir.{" "}
          <Link href="/satis-erisim/odeme-vergi-bilgileri">
            Fatura ve vergi bilgilerimi görüntüle veya güncelle
          </Link>.
        </div>

        <section className={`${styles.statGrid} ${styles.writerFinanceStatGrid}`}>
          <article className={`${styles.stat} ${styles.writerFinanceStat}`}>
            <span>Toplam satış</span>
            <strong>{formatMoney(finance.grossSales, finance.currency)}</strong>
          </article>
          <article className={`${styles.stat} ${styles.writerFinanceStat}`}>
            <span>Kesintiler</span>
            <strong>{formatMoney(deductions, finance.currency)}</strong>
          </article>
          <article className={`${styles.stat} ${styles.writerFinanceStat}`}>
            <span>Net kazancım</span>
            <strong>
              {formatMoney(finance.authorEarnings, finance.currency)}
            </strong>
          </article>
          <article className={`${styles.stat} ${styles.writerFinanceStat}`}>
            <span>Bekleyen</span>
            <strong>
              {formatMoney(finance.balance.pendingAmount, finance.currency)}
            </strong>
          </article>
          <article className={`${styles.stat} ${styles.writerFinanceStat}`}>
            <span>Ödenebilir</span>
            <strong>
              {formatMoney(finance.balance.availableAmount, finance.currency)}
            </strong>
          </article>
          <article className={`${styles.stat} ${styles.writerFinanceStat}`}>
            <span>Ödeme sürecinde</span>
            <strong>
              {formatMoney(finance.balance.processingAmount, finance.currency)}
            </strong>
          </article>
          <article className={`${styles.stat} ${styles.writerFinanceStat}`}>
            <span>Ödenen</span>
            <strong>
              {formatMoney(finance.balance.paidAmount, finance.currency)}
            </strong>
          </article>
        </section>

        <div className={styles.notice}>
          Genel komisyon %15’tir; yazara veya esere özel oran varsa o uygulanır.
          Uygun faturasız telifte ayrıca %5 aracılık hizmeti, stopaj ve KDV
          varsayımlarını satış öncesinde karşılaştırmak için{" "}
          <Link href="/satis-erisim/kazanc-hesaplama">kazanç hesaplama örneğini</Link>{" "}
          inceleyebilirsin. Bu önizleme gerçek muhasebe hareketi oluşturmaz.
        </div>

        <div className={styles.notice}>
          Bu ekran İlkOku’da oluşan gerçek satış ve yazar bakiye kayıtlarını
          gösterir. Komisyon veya vergi oranı burada yeniden hesaplanmaz;
          yalnızca kaydedilmiş finans hareketleri görüntülenir.
        </div>

        {test209Demo.active + test209Demo.revoked > 0 ? (
          <section className={`${styles.panel} ${styles.writerFinancePanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>TEST209 · Mali kayıt dışı deneme</span>
                <h2>0 TL deneme erişimleri</h2>
                <p>
                  Kendi eserine ait promosyon erişimleri gösterilir. Bu
                  kayıtlar gerçek sipariş, satılan adet, hakediş, ödeme,
                  komisyon veya vergi hesabına dahil edilmez.
                </p>
              </div>
              <span className={styles.badge}>
                {test209Demo.active + test209Demo.revoked} erişim
              </span>
            </div>
            <div className={styles.statGrid}>
              <article className={styles.stat}>
                <span>Aktif deneme erişimi</span>
                <strong>{test209Demo.active.toLocaleString("tr-TR")}</strong>
              </article>
              <article className={styles.stat}>
                <span>İptal edilen erişim</span>
                <strong>{test209Demo.revoked.toLocaleString("tr-TR")}</strong>
              </article>
              <article className={styles.stat}>
                <span>Denemeden doğan kazanç</span>
                <strong>{formatMoney(BigInt(0), finance.currency)}</strong>
              </article>
            </div>
          </section>
        ) : null}

        <section className={`${styles.panel} ${styles.writerFinancePanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Eser bazında</span>
              <h2>Gelir özeti</h2>
              <p>
                Brüt satış, ödeme hizmeti ücreti, İlkOku hizmet payı, iade,
                vergi / stopaj ve net hakediş ayrı gösterilir.
              </p>
            </div>
            <span className={styles.badge}>{finance.byWork.length} eser</span>
          </div>

          {finance.byWork.length ? (
            <div className={styles.financeWorkList}>
              {finance.byWork.map((work) => (
                <article className={styles.financeWorkCard} key={work.workId}>
                  <div>
                    <h3>{work.title}</h3>
                    <span>
                      {work.priceTaxTreatment === "net_plus_vat"
                        ? "Kayıtlı fiyat (KDV hariç)" : "Kayıtlı fiyat (eski KDV sınıfı)"}
                      <strong>
                        {work.priceAmount === null
                          ? "—"
                          : formatMoney(work.priceAmount, work.currency)}
                      </strong>
                    </span>
                    <span>
                      Satış adedi (0 TL hariç)
                      <strong>{work.unitsSold.toLocaleString("tr-TR")}</strong>
                    </span>
                    <span>
                      0 TL edinim adedi
                      <strong>{work.zeroTotalAcquisitions.toLocaleString("tr-TR")}</strong>
                    </span>
                    <span>
                      Brüt satış
                      <strong>
                        {formatMoney(work.grossSales, finance.currency)}
                      </strong>
                    </span>
                  </div>
                  <div className={styles.paymentAmounts}>
                    <span>
                      Yazar kupon indirimi
                      <strong>
                        {formatMoney(
                          work.authorCouponDiscounts,
                          finance.currency,
                        )}
                      </strong>
                    </span>
                    <span>
                      Ödeme hizmeti ücreti
                      <strong>
                        {formatMoney(work.providerFees, finance.currency)}
                      </strong>
                    </span>
                    <span>
                      İlkOku hizmet payı
                      <strong>
                        {formatMoney(
                          work.platformCommission,
                          finance.currency,
                        )}
                      </strong>
                    </span>
                    <span>
                      İade
                      <strong>
                        {formatMoney(work.refunds, finance.currency)}
                      </strong>
                    </span>
                    <span>
                      Vergi / stopaj
                      <strong>
                        {formatMoney(work.taxWithholding, finance.currency)}
                      </strong>
                    </span>
                    <span>
                      Diğer düzeltmeler
                      <strong>
                        {formatMoney(work.adjustments, finance.currency)}
                      </strong>
                    </span>
                    <span>
                      Net hakediş
                      <strong>
                        {formatMoney(work.authorEarnings, finance.currency)}
                      </strong>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              Henüz eser bazında finans hareketi oluşmadı.
            </div>
          )}
        </section>

        <section className={`${styles.panel} ${styles.writerFinancePanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Satış geçmişi</span>
              <h2>Son siparişler</h2>
              <p>
                Okurun ödeme bilgileri gösterilmez. Yalnızca eser, sipariş ve
                satış anındaki finans özeti görünür.
              </p>
            </div>
            <span className={styles.badge}>
              {finance.recentOrders.length} kayıt
            </span>
          </div>

          {finance.recentOrders.length ? (
            <div className={styles.paymentHistoryList}>
              {finance.recentOrders.map((order) => (
                <article className={styles.paymentHistoryCard} key={order.id}>
                  <div>
                    <span className={styles.eyebrow}>{order.orderNo}</span>
                    <h2>{order.work.title}</h2>
                    <p>{formatDate(order.paidAt ?? order.refundedAt)}</p>
                  </div>

                  <div className={styles.paymentAmounts}>
                    <span>
                      Eser fiyatı
                      <strong>
                        {formatMoney(order.originalAmount, order.currency)}
                      </strong>
                    </span>
                    <span>
                      İndirim
                      <strong>
                        {formatMoney(order.discountAmount, order.currency)}
                      </strong>
                    </span>
                    <span>
                      Okur toplamı
                      <strong>
                        {formatMoney(order.finalAmount, order.currency)}
                      </strong>
                    </span>
                    <span>
                      Hakediş matrahı
                      <strong>
                        {formatMoney(
                          order.authorEarningBaseAmount,
                          order.currency,
                        )}
                      </strong>
                    </span>
                    <span>
                      Sipariş anındaki komisyon
                      <strong>
                        {order.commissionRateSnapshot?.calculationVersion === "rate-v1"
                          ? (order.commissionRateSnapshot.commissionRateBps / 100).toLocaleString("tr-TR") + "%"
                          : "Oran kaydı eksik"}
                      </strong>
                    </span>
                    <span>
                      Komisyon kaynağı
                      <strong>
                        {order.commissionRateSnapshot?.calculationVersion === "rate-v1"
                          ? order.commissionRateSnapshot.source === "work" ? "Eser"
                            : order.commissionRateSnapshot.source === "author" ? "Yazar" : "Genel"
                          : "Mali inceleme gerekli"}
                      </strong>
                    </span>
                  </div>

                  <small>
                    Durum: {formatOrderStatus(order.status)}
                    {order.couponOwnerSnapshot === "platform"
                      ? " · İlkOku kuponu"
                      : order.couponOwnerSnapshot === "author"
                        ? " · Yazar kuponu"
                        : ""}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>Henüz satış kaydı yok.</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
