import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { getWriterPayoutOverview } from "@/features/commerce/finance-repository";
import {
  formatFinanceDate,
  formatFinanceMoney,
  payoutStatusLabels,
} from "@/features/commerce/finance-ui";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Ödemelerim | İlkOku",
  description: "Yazarın kendi bakiye ve ödeme durumları.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WriterPayoutHistoryPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/satis-erisim/odemelerim");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");

  // Never accept authorId from a query parameter: this is writer-only data.
  const { balance, payouts } = await getWriterPayoutOverview(profile.id);

  return (
    <AppShell profile={profile}>
      <div className={`${styles.page} ${styles.writerCommercePage} ${styles.writerFinancePage}`}>
        <header className={`${styles.hero} ${styles.writerFinanceHero}`}>
          <div>
            <span className={styles.eyebrow}>Yazar · Ödeme takibi</span>
            <h1>Ödemelerim</h1>
            <p>
              Hakediş bakiyenin durumunu ve yalnızca sana ait ödeme
              kayıtlarını görüntüleyebilirsin.
            </p>
          </div>
          <Link className={styles.secondaryAction} href="/gelirler">
            Gelirlere dön
          </Link>
        </header>

        <div className={styles.notice} role="status">
          Bu sayfa yalnızca mevcut kayıtları gösterir. Gerçek banka transferi
          bu ekrandan başlatılamaz. 0 TL TEST209 deneme erişimleri ödeme
          veya hakediş kaydı değildir.
        </div>

        <section
          aria-label="Ödeme bakiyelerim"
          className={`${styles.statGrid} ${styles.writerFinanceStatGrid}`}
        >
          {([
            { title: "Bekleyen", amount: balance.pendingAmount },
            { title: "Ödenebilir", amount: balance.availableAmount },
            { title: "Ödeme sürecinde", amount: balance.processingAmount },
            { title: "Ödenen", amount: balance.paidAmount },
          ] as const).map((item) => (
            <article className={`${styles.stat} ${styles.writerFinanceStat}`} key={item.title}>
              <span>{item.title}</span>
              <strong>{formatFinanceMoney(item.amount, "TRY")}</strong>
            </article>
          ))}
        </section>

        <section className={`${styles.panel} ${styles.writerFinancePanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Yazar ödeme geçmişi</span>
              <h2>Son ödeme kayıtlarım</h2>
              <p>
                En yeni 100 ödeme kaydı listelenir. Sadece sistemde kayıtlı
                durumlar gösterilir; burada ödeme, tahakkuk veya fatura
                oluşturulmaz.
              </p>
            </div>
            <span className={styles.badge}>{payouts.length} kayıt</span>
          </div>

          {payouts.length ? (
            <div className={styles.financeWorkList}>
              {payouts.map((payout) => (
                <article className={styles.financeWorkCard} key={payout.id}>
                  <div>
                    <h3>{payoutStatusLabels[payout.status]}</h3>
                    <span>
                      Ödeme tutarı
                      <strong>{formatFinanceMoney(payout.amount, payout.currency)}</strong>
                    </span>
                  </div>
                  <div className={styles.paymentAmounts}>
                    <span>
                      Dönem
                      <strong>
                        {formatFinanceDate(payout.periodStart)} {" → "}
                        {formatFinanceDate(payout.periodEnd)}
                      </strong>
                    </span>
                    <span>
                      Kayıt tarihi
                      <strong>{formatFinanceDate(payout.createdAt)}</strong>
                    </span>
                    <span>
                      Ödeme tarihi
                      <strong>{formatFinanceDate(payout.paidAt)}</strong>
                    </span>
                    <span>
                      Yöntem / referans
                      <strong>
                        {payout.method ?? "Belirtilmedi"}
                        {payout.reference ? ` · ${payout.reference}` : ""}
                      </strong>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty} data-commerce-zero-screen="writer-payouts">
              Henüz gerçek ödeme kaydın yok. 0 TL deneme erişimleri
              bu listeye ve ödeme bakiyene dahil edilmez.
            </div>
          )}
        </section>

        <div className={styles.heroActions}>
          <Link className={styles.secondaryAction} href="/gelirler">Gelirler</Link>
          <Link className={styles.secondaryAction} href="/satis-erisim/odeme-vergi-bilgileri">
            Fatura ve vergi bilgilerim
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
