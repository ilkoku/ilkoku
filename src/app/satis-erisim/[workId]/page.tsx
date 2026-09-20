import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import {
  saveChapterAccessPlanAction,
  saveWorkSaleModelAction,
} from "@/features/commerce/actions";
import { getAuthorCommerceWork } from "@/features/commerce/repository";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Eser Satış & Erişim | İlkOku",
};

export const dynamic = "force-dynamic";

export default async function WriterCommerceWorkPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/satis-erisim");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi");
  }

  const { workId } = await params;
  const [work, checkoutEnabled] = await Promise.all([
    getAuthorCommerceWork(profile.id, workId),
    Promise.resolve(isCommerceCheckoutEnabled()),
  ]);

  if (!work) notFound();

  const currentModel = work.saleConfiguration?.saleModel ?? "free";

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Satış & Erişim</span>
            <h1>{work.title}</h1>
            <p>
              Önce bölüm erişimlerini belirle. Sonra eserin ücretsiz veya
              ücretli yayın modelini kaydet.
            </p>
          </div>
          <Link className={styles.secondaryAction} href="/satis-erisim">
            Eserlere dön
          </Link>
        </header>

        {!checkoutEnabled ? (
          <div className={styles.notice}>
            Hazırlık modu açık. Ücretli model ve kilitli bölümler kaydedilir,
            fakat ödeme sistemi açılana kadar okur tarafında erişim kilidi
            uygulanmaz.
          </div>
        ) : null}

        <form action={saveChapterAccessPlanAction} className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>1. adım</span>
              <h2>Erişimleri planla</h2>
              <p>
                Her bölümü bağımsız olarak Ön İzleme veya Kilitli seçebilirsin.
              </p>
            </div>
            <span className={styles.badge}>{work.chapters.length} bölüm</span>
          </div>

          <input name="workId" type="hidden" value={work.id} />

          {work.chapters.length === 0 ? (
            <div className={styles.empty}>Bu eserde henüz bölüm bulunmuyor.</div>
          ) : (
            <div className={styles.chapterList}>
              {work.chapters.map((chapter) => {
                const accessType = chapter.commerceAccess?.accessType ?? "preview";
                return (
                  <div className={styles.chapterRow} key={chapter.id}>
                    <div className={styles.chapterTitle}>
                      <strong>
                        Bölüm {chapter.position}: {chapter.title}
                      </strong>
                      <small>Yayın durumu: {chapter.status}</small>
                    </div>

                    <div className={styles.choices}>
                      <label className={styles.choice}>
                        <input
                          defaultChecked={accessType === "preview"}
                          name={`chapter:${chapter.id}`}
                          type="radio"
                          value="preview"
                        />
                        Ön İzleme
                      </label>

                      <label className={styles.choice}>
                        <input
                          defaultChecked={accessType === "locked"}
                          name={`chapter:${chapter.id}`}
                          type="radio"
                          value="locked"
                        />
                        Kilitli
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button className={styles.action} type="submit">
            Erişim planını kaydet
          </button>
        </form>

        <form action={saveWorkSaleModelAction} className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>2. adım</span>
              <h2>Yayın modelini seç</h2>
              <p>
                Ücretli modeli seçebilirsin. Ödeme sistemi devreye alınana
                kadar ücretli alanı sabit 0 TL olarak hazırlanır.
              </p>
            </div>
          </div>

          <input name="workId" type="hidden" value={work.id} />

          <div className={styles.saleOptions}>
            <label className={styles.saleOption}>
              <input
                defaultChecked={currentModel === "free"}
                name="saleModel"
                type="radio"
                value="free"
              />
              <span>
                <strong>Ücretsiz</strong>
                <br />
                Okurdan ödeme istenmez.
              </span>
            </label>

            <label className={styles.saleOption}>
              <input
                defaultChecked={currentModel === "paid"}
                name="saleModel"
                type="radio"
                value="paid"
              />
              <span>
                <strong>Ücretli</strong>
                <br />
                Fiyat: 0 TL
                <br />
                Ön İzleme bölümleri açık, Kilitli bölümler satın alma hakkına
                bağlı olacak.
              </span>
            </label>
          </div>


          <button className={styles.action} type="submit">
            Yayın modelini kaydet
          </button>
        </form>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>3. adım</span>
              <h2>Sözleşme ve son onay</h2>
              <p>
                İlkOku Yazar Yayın ve Erişim Sözleşmesi ile eser bazlı son
                onay bu adımda tamamlanacak.
              </p>
            </div>
            <span className={styles.badge}>Sıradaki geliştirme</span>
          </div>

          <div className={styles.notice}>
            Bu alan henüz onay işlemi yapmaz. Erişim planını ve yayın modelini
            güvenle hazırlayabilirsin; satış/yayın aktivasyonu sözleşme adımı
            tamamlandıktan sonra açılacak.
          </div>
        </section>
      </div>
    </AppShell>
  );
}
