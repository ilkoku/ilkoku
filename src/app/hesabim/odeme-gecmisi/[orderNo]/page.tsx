import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { getReaderOrderDetail } from "@/features/commerce/reader-repository";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Sipariş Ayrıntısı | İlkOku",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function money(amount: bigint, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency })
    .format(Number(amount) / 100);
}

function dateText(date: Date | null) {
  return date ? new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul",
  }).format(date) : "—";
}

const statusNames: Record<string, string> = {
  draft: "Taslak", pending_payment: "Ödeme bekleniyor",
  paid: "Tamamlandı", failed: "Başarısız",
  cancelled: "İptal edildi", refunded: "İade edildi",
};

export default async function ReaderOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const profile = await getCurrentProfile();
  const { orderNo } = await params;
  if (!profile) {
    redirect("/giris?sonraki=" + encodeURIComponent(
      "/hesabim/odeme-gecmisi/" + encodeURIComponent(orderNo),
    ));
  }
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  // Authorization is enforced in the database query, not just the UI.
  const order = await getReaderOrderDetail(profile.id, orderNo);
  if (!order) notFound();

  const hasAccess = order.status === "paid" &&
    order.entitlement?.status === "active";
  const seller = order.legalSnapshot;
  const cancellationMailSubject = encodeURIComponent(
    `İlkOku sipariş iptal/iade talebi — ${order.orderNo}`,
  );
  const cancellationMailBody = encodeURIComponent(
    `Merhaba,\n\n${order.orderNo} numaralı ${order.work.title} siparişi için iptal/iade koşullarının değerlendirilmesini talep ediyorum.\n\nSipariş durumu: ${statusNames[order.status] ?? order.status}\n\nTalep gerekçem:\n\n`,
  );
  const cancellationMailHref =
    `mailto:destek@ilkoku.com?subject=${cancellationMailSubject}&body=${cancellationMailBody}`;

  return (
    <AppShell profile={profile}>
      <div className={`${styles.page} ${styles.readerPurchasedPage}`}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Satın alma sonrası · Sipariş kaydı</span>
            <h1>Sipariş ayrıntısı</h1>
            <p>{order.work.title}</p>
            <p>Sipariş numarası: <strong>{order.orderNo}</strong></p>
          </div>
          <Link className={styles.secondaryAction} href="/hesabim/odeme-gecmisi">
            Ödeme geçmişine dön
          </Link>
        </header>
        <section className={`${styles.panel} ${styles.readerOrderPanel}`}>
          <span className={styles.eyebrow}>1. Sipariş durumu</span>
          <h2>{statusNames[order.status] ?? order.status}</h2>
          <div className={styles.summaryGrid}>
            <div><span>Sipariş No</span><strong>{order.orderNo}</strong></div>
            <div><span>Sipariş tarihi</span><strong>{dateText(order.createdAt)}</strong></div>
            <div><span>Tamamlanma tarihi</span><strong>{dateText(order.paidAt)}</strong></div>
            <div><span>Erişim hakkı</span><strong>{hasAccess ? "Aktif" : "Etkin değil"}</strong></div>
            <div><span>İşlem</span><strong>{
              order.status === "paid" && order.finalAmount === BigInt(0)
                ? "0 TL · Para tahsil edilmedi" : statusNames[order.status] ?? order.status
            }</strong></div>
          </div>
          {hasAccess ? (
            <Link className={styles.action} href={"/kitap/" + order.work.slug}>
              Eseri okumaya başla
            </Link>
          ) : (
            <p className={styles.notice}>Erişim hakkı yalnız doğrulanmış tamamlanan siparişlerde açılır.</p>
          )}
          {(order.status === "paid" || order.status === "pending_payment") ? (
            <aside className={styles.readerCancelInfo} aria-label="Sipariş iptal ve iade başvurusu">
              <h3>Sipariş iptal / iade talebi</h3>
              <p>
                Bu bağlantı destek ekibine e-posta hazırlayarak başvuru yapmanı sağlar.
                Siparişi kendiliğinden iptal etmez ve otomatik para iadesi oluşturmaz.
                Talebin ve yürürlükteki yasal hakların ayrıca değerlendirilir.
              </p>
              <a href={cancellationMailHref}>E-posta ile iptal / iade talebi gönder</a>
            </aside>
          ) : null}
        </section>
        <section className={`${styles.panel} ${styles.readerOrderPanel}`}>
          <span className={styles.eyebrow}>2. Tahsilat özeti</span>
          <h2>Satın alma tutarları</h2>
          <div className={styles.summaryGrid}>
            {order.priceQuoteSnapshot?.taxTreatment === "net_plus_vat" ? (
              <>
                <div><span>Eser fiyatı (KDV hariç)</span><strong>{money(order.priceQuoteSnapshot.listNetAmount, order.currency)}</strong></div>
                <div><span>Satış KDV&apos;si (sipariş fiyat teklifi)</span><strong>{money(order.priceQuoteSnapshot.listVatAmount, order.currency)}</strong></div>
              </>
            ) : (
              <div><span>Eser fiyatı (önceki sipariş fiyat kaydı)</span><strong>{money(order.originalAmount, order.currency)}</strong></div>
            )}
            <div><span>İlkOku kupon indirimi</span><strong>−{money(
              order.couponOwnerSnapshot === "platform" ? order.discountAmount : BigInt(0),
              order.currency,
            )}</strong></div>
            <div><span>Yazar indirim kodu</span><strong>−{money(
              order.couponOwnerSnapshot === "author" ? order.discountAmount : BigInt(0),
              order.currency,
            )}</strong></div>
            <div><span>Ödenecek / ödenen toplam</span><strong>{money(order.finalAmount, order.currency)}</strong></div>
          </div>
          {order.couponCodeSnapshot ? (
            <p className={styles.helper}>Uygulanan indirim kodu: {order.couponCodeSnapshot}</p>
          ) : null}
          <p className={styles.notice}>
            {order.priceQuoteSnapshot?.taxTreatment === "net_plus_vat"
              ? "Bu kayıt, sipariş anında saklanan KDV hariç liste fiyatı ile satış KDV fiyat teklifini gösterir. Kupon sonrası kesin vergisel matrah ve platform tarafından finanse edilen kampanya işlemleri ayrıca muhasebede belirlenir."
              : "Bu eski sipariş fiyatında KDV hariç matrah ve KDV oranı ayrı kaydedilmemiştir. KDV tutarı sonradan tahmin edilmez."}
            {" "}Bu ekran resmî e-fatura veya e-arşiv faturası değildir. Yazar komisyonu,
            stopaj ve aracılık hizmet bedeli okurdan ikinci kez tahsil edilmez.
          </p>
        </section>
        <section className={`${styles.panel} ${styles.readerOrderPanel}`}>
          <span className={styles.eyebrow}>3. Satıcı ve onay kayıtları</span>
          <h2>Siparişe ait bilgiler</h2>
          {seller ? (
            <div className={styles.summaryGrid}>
              <div><span>Satışın hukukî tarafı</span><strong>{seller.sellerName}</strong></div>
              <div><span>Satıcının rolü</span><strong>{
                seller.sellerMode === "platform_direct" ? "Doğrudan satıcı" : "Aracı platform"
              }</strong></div>
              <div><span>Satıcı iletişimi</span><strong>{seller.sellerEmail}</strong></div>
              <div><span>Satıcı adresi</span><strong>{seller.sellerAddress}</strong></div>
            </div>
          ) : (
            <div className={styles.notice}>
              Eski sipariş için doğrulanmış satıcı kimlik kaydı bulunmuyor.
            </div>
          )}
          {order.consent ? (
            <p className={styles.helper}>
              Dijital içerik satın alma koşulları sürüm {order.consent.documentVersion},
              kabul tarihi {dateText(order.consent.acceptedAt)}.
            </p>
          ) : (
            <p className={styles.helper}>Sözleşme onay kaydı bu siparişte bulunamadı.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
