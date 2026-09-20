import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { getAuthorCommerceWorks } from "@/features/commerce/repository";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Satış & Erişim | İlkOku",
  description: "Eser erişimlerini ve satış modelini yönetin.",
};

export const dynamic = "force-dynamic";

function formatMinorUnits(value: bigint, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(Number(value) / 100);
}

export default async function WriterCommercePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/satis-erisim");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi");
  }

  const [works, checkoutEnabled] = await Promise.all([
    getAuthorCommerceWorks(profile.id),
    Promise.resolve(isCommerceCheckoutEnabled()),
  ]);

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>1. adım · Eser seç</span>
            <h1>Satış & Erişim</h1>
            <p>
              Önce eserini seç. Bölüm erişimlerini planla, ardından eserin
              ücretsiz veya ücretli modelini hazırla.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link className={styles.secondaryAction} href="/satis-erisim/kuponlar">
              Kuponlar
            </Link>
            <span className={styles.badge}>
              {checkoutEnabled ? "Tahsilat aktif" : "Altyapı hazırlık modu"}
            </span>
          </div>
        </header>

        {!checkoutEnabled ? (
          <div className={styles.notice}>
            Ücretli eser ayarları şimdiden hazırlanabilir. Gerçek tahsilat
            devreye alınana kadar bu ayarlar okurun mevcut okuma erişimini
            kısıtlamaz.
          </div>
        ) : null}

        {works.length === 0 ? (
          <div className={styles.empty}>
            Satış ve erişim planı oluşturmak için önce bir eser oluşturmalısın.
          </div>
        ) : (
          <section className={styles.grid} aria-label="Eserler">
            {works.map((work) => {
              const configuration = work.saleConfiguration;
              const modelLabel =
                configuration?.saleModel === "paid"
                  ? configuration.priceAmount === 0n
                    ? "Ücretli · 0 TL"
                    : `Ücretli · ${formatMinorUnits(
                        configuration.priceAmount ?? 0n,
                        configuration.currency,
                      )}`
                  : configuration?.saleModel === "free"
                    ? "Ücretsiz"
                    : "Ayarlanmadı";

              return (
                <article className={styles.card} key={work.id}>
                  <div>
                    <span className={styles.eyebrow}>Eser</span>
                    <h2>{work.title}</h2>
                  </div>

                  <div className={styles.cardMeta}>
                    <span>{work._count.chapters} bölüm</span>
                    <span>•</span>
                    <span>{modelLabel}</span>
                    {configuration ? (
                      <>
                        <span>•</span>
                        <span>{configuration.status}</span>
                      </>
                    ) : null}
                  </div>

                  <Link className={styles.action} href={`/satis-erisim/${work.id}`}>
                    Erişimi planla
                  </Link>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </AppShell>
  );
}
