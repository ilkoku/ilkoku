import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { listReaderPaymentHistory, listReaderZeroTlDemoActivity } from "@/features/commerce/reader-repository";
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

  const [orders, demoActivity] = await Promise.all([
    listReaderPaymentHistory(profile.id),
    listReaderZeroTlDemoActivity(profile.id),
  ]);

  return (
    <AppShell profile={profile}>
      <div className={`${styles.page} ${styles.readerPurchasedPage} ${styles.readerPaymentHistoryPage}`}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Hesabım</span>
            <h1>Ödeme Geçmişi</h1>
            <p>
              Eser siparişlerinin tutar ve işlem durumlarını burada
              görüntüleyebilirsin. 0 TL edinimlerde banka veya kart tahsilatı yapılmaz.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link className={styles.secondaryAction} href="/kutuphanem/satin-aldiklarim">
              Kütüphaneme dön
            </Link>
            <Link className={styles.quietAction} href="/hesabim">
              Hesabıma dön
            </Link>
          </div>
        </header>

        {demoActivity.length > 0 ? (
          <section className={styles.demoHistorySection} aria-label="0 TL deneme işlemleri">
            <div className={styles.demoHistoryHeading}>
              <span className={styles.eyebrow}>Ödeme olmayan işlemler</span>
              <h2>0 TL Deneme İşlemleri — Tahsilat Yok</h2>
              <p>
                Bu kayıtlar ücretsiz erişim denemeleridir; sipariş, ödeme,
                fatura, tahsilat veya iade işlemi değildir.
              </p>
            </div>
            <div className={styles.paymentHistoryList}>
              {demoActivity.map((demo) => (
                <article className={styles.demoHistoryCard} key={demo.id}>
                  <div>
                    <span className={styles.eyebrow}>Deneme No: TEST-{demo.id.slice(0, 16).toUpperCase()}</span>
                    <h3>{demo.work.title}</h3>
                    <p>Başlangıç: {formatDate(demo.grantedAt)}</p>
                    {demo.status === "revoked" && demo.revokedAt ? (
                      <p>İptal: {formatDate(demo.revokedAt)}</p>
                    ) : null}
                  </div>
                  <div className={styles.demoHistoryFacts}>
                    <span>Bedel: <strong>0,00 TL</strong></span>
                    <span>Tahsilat: <strong>Yok</strong></span>
                    <span>Deneme erişimi: <strong>{demo.status === "active" ? "Aktif" : "İptal edildi"}</strong></span>
                  </div>
                  <Link className={styles.secondaryAction} href="/kutuphanem/satin-aldiklarim">
                    Kütüphanemde görüntüle
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.realOrdersSection} aria-label="Gerçek siparişler">
          <h2>Gerçek Siparişler</h2>
        {orders.length === 0 ? (
          <div className={styles.empty} data-commerce-zero-screen="reader-history">
            <strong>Ödeme geçmişi ekranın hazır</strong>
            <p>Henüz gerçek sipariş kaydın yok. 0 TL eser edindiğinde
              burada ILK- ile başlayan sipariş numaran, eser adı, 0,00 TL
              toplam ve “Tahsilat yok” durumu görünecek.</p>
            <p>Deneme erişimleri gerçek siparişlerden ayrı gösterilir;
              örnek sipariş veya ödeme kaydı oluşturulmaz.</p>
            <div className={styles.heroActions}>
              <Link className={styles.secondaryAction} href="/kesfet">Eserleri keşfet</Link>
              <Link className={styles.quietAction} href="/kutuphanem/satin-aldiklarim">Kütüphanem</Link>
            </div>
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
        </section>
      </div>
    </AppShell>
  );
}
