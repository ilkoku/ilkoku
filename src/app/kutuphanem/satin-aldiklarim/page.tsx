import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { listReaderPurchasedWorks } from "@/features/commerce/reader-repository";
import { cancelTest209DemoAccessAction } from "@/features/commerce/test209-demo-cancel-action";
import { isTest209DemoReader } from "@/features/commerce/test209-demo-access";
import { getCurrentUser } from "@/lib/auth/current-user";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Satın Aldıklarım | İlkOku",
  description: "Satın aldığınız eserleri görüntüleyin.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export default async function PurchasedLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; siparis?: string; deneme?: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/kutuphanem/satin-aldiklarim");
  }

  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const [entitlements, query, currentUser] = await Promise.all([
    listReaderPurchasedWorks(profile.id),
    searchParams,
    getCurrentUser(),
  ]);
  const canCancelTestDemo = Boolean(currentUser && isTest209DemoReader(currentUser));
  // Never trust a URL-provided order number without confirming it belongs
  // to the current reader's active entitlement.
  // A demo reference resolves ONLY through an actual entitlement belonging
  // to this reader; URL parameters alone never certify a completed operation.
  const completedDemo = query.durum === "deneme-erisim"
    ? entitlements.find((item) =>
        item.id === query.deneme &&
        item.source === "promotion" &&
        item.work.slug === "yeni-test209-30820c6a",
      ) ?? null
    : null;
  const completedOrderNo = query.durum === "eklendi"
    ? entitlements.find((item) => item.order?.orderNo === query.siparis)?.order?.orderNo ?? null
    : null;
  const flash =
    query.durum === "deneme-iptal-edildi"
      ? "0 TL deneme erişimi iptal edildi. Okuma geçmişin korundu; yeniden denemek istersen TEST209 sayfasına dönebilirsin."
      : query.durum === "iptal-onayi-gerekli"
        ? "İptal için onay kutusunu işaretlemelisin."
        : query.durum === "iptal-gerceklestirilemedi"
          ? "Deneme erişimi iptal edilemedi. İşlem önceden iptal edilmiş veya artık bu hesaba ait olmayabilir."
          : query.durum === "deneme-erisim" && completedDemo
      ? "0 TL deneme erişimi açıldı. TEST209 kütüphanene eklendi; gerçek sipariş veya tahsilat oluşturulmadı."
      : query.durum === "deneme-erisim"
        ? "Deneme erişimi bu hesap için doğrulanamadı."
        : query.durum === "eklendi" && completedOrderNo
      ? "Satın alma başarılı. Eser kütüphanene eklendi."
      : query.durum === "eklendi"
        ? "Sipariş doğrulanamadı. Satın alınan eserleri aşağıdan kontrol edebilirsin."
        : query.durum === "zaten-erisim-var"
          ? "Bu eser zaten kütüphanende."
          : null;

  return (
    <AppShell profile={profile}>
      <div className={`${styles.page} ${styles.readerPurchasedPage}`}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Kütüphanem</span>
            <h1>Satın Aldıklarım</h1>
            <p>
              Satın alma veya kampanya erişimiyle kütüphanene eklenen eserler.
            </p>
          </div>
          <Link className={styles.secondaryAction} href="/okuyucu">
            Okuma masama dön
          </Link>
        </header>

        {flash ? (
          <div className={completedOrderNo || completedDemo || query.durum === "deneme-iptal-edildi" || query.durum === "zaten-erisim-var" ? styles.successNotice : styles.notice} role="status">
            <strong>{flash}</strong>
            {completedDemo ? (
              <p>Deneme referansı: <strong>TEST-{completedDemo.id.slice(0, 16).toUpperCase()}</strong></p>
            ) : null}
            {completedOrderNo ? (
              <div>
                <p>Sipariş numarası: <strong>{completedOrderNo}</strong></p>
                <Link
                  className={styles.secondaryAction}
                  href={"/hesabim/odeme-gecmisi/" + encodeURIComponent(completedOrderNo)}
                >
                  Sipariş ayrıntısını görüntüle
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {entitlements.length === 0 ? (
          <div className={styles.empty}>
            Henüz aktif satın alma veya deneme erişimin bulunmuyor.
          </div>
        ) : (
          <section className={styles.grid} aria-label="Satın alınan eserler">
            {entitlements.map((entitlement) => (
              <article className={styles.card} key={entitlement.id}>
                <div>
                  <span className={styles.eyebrow}>
                    {entitlement.source === "purchase"
                      ? "Satın alındı"
                      : entitlement.source === "promotion" && entitlement.work.slug === "yeni-test209-30820c6a"
                        ? "0 TL test erişimi"
                        : "Erişim hakkı"}
                  </span>
                  <h2>{entitlement.work.title}</h2>
                  <p>
                    {entitlement.work.author.displayName ??
                      entitlement.work.author.fullName}
                  </p>
                </div>

                <div className={styles.cardMeta}>
                  <span>{formatDate(entitlement.grantedAt)}</span>
                  {entitlement.source === "promotion" && entitlement.work.slug === "yeni-test209-30820c6a" ? (
                    <>
                      <span>•</span>
                      <span>Deneme No: TEST-{entitlement.id.slice(0, 16).toUpperCase()}</span>
                    </>
                  ) : null}
                  {entitlement.order?.orderNo ? (
                    <>
                      <span>•</span>
                      <span>Sipariş No: {entitlement.order.orderNo}</span>
                    </>
                  ) : null}
                </div>

                <Link
                  className={styles.action}
                  href={"/kitap/" + entitlement.work.slug}
                >
                  Okumaya devam et
                </Link>
                {entitlement.order?.orderNo ? (
                  <Link
                    className={styles.quietAction}
                    href={"/hesabim/odeme-gecmisi/" + encodeURIComponent(entitlement.order.orderNo)}
                  >
                    Sipariş ve onay kayıtları
                  </Link>
                ) : null}
                {canCancelTestDemo &&
                  entitlement.source === "promotion" &&
                  entitlement.work.slug === "yeni-test209-30820c6a" &&
                  !entitlement.order ? (
                    <details className={styles.testCancelDetails}>
                      <summary>0 TL deneme erişimini iptal et</summary>
                      <form action={cancelTest209DemoAccessAction} className={styles.testCancelPanel}>
                        <input type="hidden" name="entitlementId" value={entitlement.id} />
                        <p>
                          İptal edince TEST209 için erişim hakkın sonlandırılır.
                          Okuma geçmişin silinmez ve para iadesi yapılmaz; zaten
                          para tahsil edilmedi. Sonradan yeniden 0 TL deneme yapabilirsin.
                        </p>
                        <label className={styles.testCancelConfirm}>
                          <input type="checkbox" name="confirmCancel" required />
                          <span>0 TL test erişiminin sonlandırılmasını onaylıyorum.</span>
                        </label>
                        <button className={styles.testCancelButton} type="submit">
                          İptali onayla
                        </button>
                      </form>
                    </details>
                  ) : null}
              </article>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
