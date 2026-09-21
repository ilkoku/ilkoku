import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { listReaderPurchasedWorks } from "@/features/commerce/reader-repository";
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
  searchParams: Promise<{ durum?: string; siparis?: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/kutuphanem/satin-aldiklarim");
  }

  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const [entitlements, query] = await Promise.all([
    listReaderPurchasedWorks(profile.id),
    searchParams,
  ]);
  const flash =
    query.durum === "eklendi"
      ? `Satın alma başarılı. Eser kütüphanene eklendi${query.siparis ? ` · Sipariş ${query.siparis}` : ""}.`
      : query.durum === "zaten-erisim-var"
        ? "Bu eser zaten kütüphanende."
        : null;

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
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

        {flash ? <div className={styles.successNotice}>{flash}</div> : null}

        {entitlements.length === 0 ? (
          <div className={styles.empty}>
            Henüz satın alma yoluyla kütüphanene eklenen bir eser yok.
          </div>
        ) : (
          <section className={styles.grid} aria-label="Satın alınan eserler">
            {entitlements.map((entitlement) => (
              <article className={styles.card} key={entitlement.id}>
                <div>
                  <span className={styles.eyebrow}>
                    {entitlement.source === "purchase"
                      ? "Satın alındı"
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
                  {entitlement.order?.orderNo ? (
                    <>
                      <span>•</span>
                      <span>{entitlement.order.orderNo}</span>
                    </>
                  ) : null}
                </div>

                <Link
                  className={styles.action}
                  href={"/kitap/" + entitlement.work.slug}
                >
                  Okumaya devam et
                </Link>
              </article>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
