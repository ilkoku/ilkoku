import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Gelirler | İlkOku",
  description: "Yazar satış ve hakediş görünümü.",
};

export const dynamic = "force-dynamic";

export default async function WriterIncomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/gelirler");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi");
  }

  const checkoutEnabled = isCommerceCheckoutEnabled();

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Yazar finans görünümü</span>
            <h1>Gelirler</h1>
            <p>
              Satışlar, kesintiler, net kazanç ve ödeme durumları bu alanda
              izlenecek.
            </p>
          </div>
          <span className={styles.badge}>
            {checkoutEnabled ? "Tahsilat aktif" : "Henüz tahsilat yok"}
          </span>
        </header>

        <section className={styles.statGrid}>
          <article className={styles.stat}>
            <span>Toplam satış</span>
            <strong>0,00 TL</strong>
          </article>
          <article className={styles.stat}>
            <span>Kesintiler</span>
            <strong>0,00 TL</strong>
          </article>
          <article className={styles.stat}>
            <span>Net kazancım</span>
            <strong>0,00 TL</strong>
          </article>
          <article className={styles.stat}>
            <span>Ödenebilir</span>
            <strong>0,00 TL</strong>
          </article>
        </section>

        <div className={styles.notice}>
          Gerçek ödeme sistemi henüz etkin olmadığı için finans hareketi
          oluşmuyor. Bu ekran sonraki aşamada ledger kayıtlarından beslenecek.
        </div>
      </div>
    </AppShell>
  );
}
