import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { listReaderPaymentHistory } from "@/features/commerce/reader-repository";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Ödeme Geçmişi | İlkOku",
  description: "İlkOku sipariş ve ödeme geçmişinizi görüntüleyin.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatMoney(value: bigint, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(Number(value) / 100);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

const statusLabels = {
  draft: "Taslak",
  pending_payment: "Ödeme bekliyor",
  paid: "Başarılı",
  failed: "Başarısız",
  cancelled: "İptal edildi",
  refunded: "İade edildi",
} as const;

export default async function ReaderPaymentHistoryPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/hesabim/odeme-gecmisi");
  }

  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const orders = await listReaderPaymentHistory(profile.id);

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Hesabım</span>
            <h1>Ödeme Geçmişi</h1>
            <p>
              Eser siparişlerinin tutar ve işlem durumlarını burada
              görüntüleyebilirsin. 0 TL edinimlerde banka veya kart tahsilatı yapılmaz.
            </p>
          </div>
          <Link className={styles.secondaryAction} href="/hesabim">
            Hesabıma dön
          </Link>
        </header>

        {orders.length === 0 ? (
          <div className={styles.empty}>
            Henüz ödeme geçmişinde gösterilecek bir sipariş yok.
          </div>
        ) : (
          <section className={styles.paymentHistoryList}>
            {orders.map((order) => (
              <article className={styles.paymentHistoryCard} key={order.id}>
                <div>
                  <span className={styles.eyebrow}>Sipariş No: {order.orderNo}</span>
                  <h2>{order.work.title}</h2>
                  <p>{formatDate(order.paidAt ?? order.createdAt)}</p>
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
                      -{formatMoney(order.discountAmount, order.currency)}
                    </strong>
                  </span>
                  <span>
                    Toplam
                    <strong>{formatMoney(order.finalAmount, order.currency)}</strong>
                  </span>
                  <span>
                    Durum
                    <strong>
                      {order.status === "paid" && order.finalAmount === BigInt(0)
                        ? "0 TL edinildi · Tahsilat yok"
                        : statusLabels[order.status]}
                    </strong>
                  </span>
                </div>

                {order.couponCodeSnapshot ? (
                  <small>Kupon: {order.couponCodeSnapshot}</small>
                ) : null}

                <div className={styles.heroActions}>
                  <Link
                    className={styles.secondaryAction}
                    href={"/hesabim/odeme-gecmisi/" + encodeURIComponent(order.orderNo)}
                  >
                    Sipariş ayrıntısı
                  </Link>
                  <Link
                    className={styles.quietAction}
                    href={"/kitap/" + order.work.slug}
                  >
                    Eseri görüntüle
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
