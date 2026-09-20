import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import {
  acceptAuthorPublicationAgreementAction,
  confirmWorkPublicationCommerceAction,
  saveChapterAccessPlanAction,
  saveWorkSaleModelAction,
} from "@/features/commerce/actions";
import {
  getActiveAuthorPublicationAgreement,
  getAuthorAgreementAcceptance,
  getAuthorPublicationAgreementStatus,
} from "@/features/commerce/agreement";
import { getAuthorCommerceWork } from "@/features/commerce/repository";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Eser Satış & Erişim | İlkOku",
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "sozlesme-onayi-gerekli": "Sözleşmeyi kabul etmek için onay kutusunu işaretlemelisin.",
  "sozlesme-hazir-degil": "Yazar Yayın ve Erişim Sözleşmesi henüz aktif değil.",
  "sozlesme-kabul-edildi": "Güncel sözleşme kabulün kaydedildi.",
  "sozlesme-kabul-gerekli": "Eser son onayı için önce güncel sözleşmeyi kabul etmelisin.",
  "eser-onayi-gerekli": "Eser bazlı son onay kutusunu işaretlemelisin.",
  "eser-bulunamadi": "Eser bulunamadı veya artık bu işlem için uygun değil.",
  "yayin-modeli-gerekli": "Önce Ücretsiz veya Ücretli yayın modelini kaydetmelisin.",
  "bolum-gerekli": "Son onay için eserde en az bir bölüm bulunmalı.",
  "erisim-plani-gerekli": "Son onaydan önce tüm bölümlerin erişim planını kaydetmelisin.",
  "yayin-onaylandi": "Eserin yayın ve erişim ayarları onaylandı.",
  "satis-hazir": "Ücretli eser satışa hazır durumda kaydedildi. Tahsilat açılana kadar okur erişimi kapanmaz.",
};

function lifecycleLabel(value: string | undefined) {
  const labels: Record<string, string> = {
    soft: "Soft taslak",
    draft: "Taslak",
    review: "İncelemede",
    approved: "Onaylandı",
    active: "Aktif",
  };
  return value ? labels[value] ?? value : "Hazır değil";
}

export default async function WriterCommerceWorkPage({
  params,
  searchParams,
}: {
  params: Promise<{ workId: string }>;
  searchParams: Promise<{ durum?: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/satis-erisim");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi");
  }

  const { workId } = await params;
  const query = await searchParams;

  const [work, checkoutEnabled, agreement, agreementStatus] = await Promise.all([
    getAuthorCommerceWork(profile.id, workId),
    Promise.resolve(isCommerceCheckoutEnabled()),
    getActiveAuthorPublicationAgreement(),
    getAuthorPublicationAgreementStatus(),
  ]);

  if (!work) notFound();

  const acceptedAgreement = agreement
    ? await getAuthorAgreementAcceptance(profile.id, agreement)
    : null;

  const currentModel = work.saleConfiguration?.saleModel ?? "free";
  const plannedChapters = work.chapters.filter((chapter) => chapter.commerceAccess);
  const previewCount = plannedChapters.filter(
    (chapter) => chapter.commerceAccess?.accessType === "preview",
  ).length;
  const lockedCount = plannedChapters.filter(
    (chapter) => chapter.commerceAccess?.accessType === "locked",
  ).length;
  const accessPlanComplete =
    work.chapters.length > 0 && plannedChapters.length === work.chapters.length;
  const saleModelReady = Boolean(work.saleConfiguration);
  const finalReady =
    Boolean(acceptedAgreement) && accessPlanComplete && saleModelReady;
  const flash = query.durum ? statusMessages[query.durum] ?? query.durum : null;

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Satış & Erişim</span>
            <h1>{work.title}</h1>
            <p>
              Bölüm erişimlerini, yayın modelini, sözleşmeyi ve eser bazlı son
              onayı tek akışta tamamla.
            </p>
          </div>
          <Link className={styles.secondaryAction} href="/satis-erisim">
            Eserlere dön
          </Link>
        </header>

        {flash ? <div className={styles.flash}>{flash}</div> : null}

        {!checkoutEnabled ? (
          <div className={styles.notice}>
            Hazırlık modu açık. Ücretli model ve kilitli bölümler kaydedilir,
            fakat ödeme sistemi açılana kadar okur tarafında erişim kilidi
            uygulanmaz. Ücretli fiyatı bu aşamada sabit 0 TL&apos;dir.
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
            <span className={styles.badge}>
              {accessPlanComplete ? "Plan tamam" : `${plannedChapters.length}/${work.chapters.length} planlandı`}
            </span>
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
                      <small>
                        {chapter.commerceAccess
                          ? `Kaydedildi: ${accessType === "preview" ? "Ön İzleme" : "Kilitli"}`
                          : "Henüz erişim planı kaydedilmedi"}
                      </small>
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
            <span className={styles.badge}>
              {work.saleConfiguration ? "Model kaydedildi" : "Model bekliyor"}
            </span>
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
                Gerçek fiyat alanı ödeme sistemi devreye alınırken açılacak.
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
              <h2>Yazar sözleşmesi</h2>
              <p>
                Ücretsiz ve ücretli eserlerde güncel İlkOku Yazar Yayın ve
                Erişim Sözleşmesi kabulü zorunludur.
              </p>
            </div>
            <span className={styles.badge}>
              {acceptedAgreement
                ? `Kabul edildi · v${agreement?.version}`
                : lifecycleLabel(agreementStatus?.lifecycleStatus)}
            </span>
          </div>

          {agreement ? (
            <>
              <div className={styles.contractBox}>
                <div className={styles.contractHeading}>
                  <strong>{agreement.title}</strong>
                  <span>Sürüm {agreement.version}</span>
                </div>
                <div className={styles.contractText}>{agreement.body}</div>
              </div>

              {acceptedAgreement ? (
                <div className={styles.successNotice}>
                  Bu sözleşmenin güncel sürümünü kabul ettin. Kabul tarihi
                  sistem kayıtlarında saklanıyor.
                </div>
              ) : (
                <form action={acceptAuthorPublicationAgreementAction}>
                  <input name="workId" type="hidden" value={work.id} />
                  <label className={styles.confirmation}>
                    <input name="acceptAgreement" type="checkbox" />
                    <span>
                      İlkOku Yazar Yayın ve Erişim Sözleşmesi&apos;nin bu
                      sürümünü okudum ve kabul ediyorum.
                    </span>
                  </label>
                  <button className={styles.action} type="submit">
                    Sözleşmeyi kabul et
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className={styles.notice}>
              <strong>
                {agreementStatus?.title ?? "İlkOku Yazar Yayın ve Erişim Sözleşmesi"}
              </strong>
              <br />
              Sözleşme şu anda {lifecycleLabel(agreementStatus?.lifecycleStatus).toLocaleLowerCase("tr-TR")} durumda.
              Hukuki inceleme ve gerekli onaylar tamamlanıp aktif edilmeden
              yazar kabulü veya eser son onayı alınmayacak.
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>4. adım</span>
              <h2>Eser bazlı son onay</h2>
              <p>
                Bu onay, eserin o andaki erişim planını, yayın modelini ve
                sözleşme sürümünü değiştirilemez geçmiş kaydı olarak saklar.
              </p>
            </div>
            <span className={styles.badge}>
              {work.saleConfiguration?.status ?? "draft"}
            </span>
          </div>

          <div className={styles.summaryGrid}>
            <div>
              <span>Yayın modeli</span>
              <strong>{currentModel === "paid" ? "Ücretli" : "Ücretsiz"}</strong>
            </div>
            <div>
              <span>Fiyat</span>
              <strong>{currentModel === "paid" ? "0 TL" : "—"}</strong>
            </div>
            <div>
              <span>Ön İzleme</span>
              <strong>{previewCount} bölüm</strong>
            </div>
            <div>
              <span>Kilitli</span>
              <strong>{lockedCount} bölüm</strong>
            </div>
            <div>
              <span>Sözleşme</span>
              <strong>
                {acceptedAgreement && agreement
                  ? `v${agreement.version} kabul edildi`
                  : "Bekliyor"}
              </strong>
            </div>
          </div>

          <form action={confirmWorkPublicationCommerceAction}>
            <input name="workId" type="hidden" value={work.id} />
            <label className={styles.confirmation}>
              <input
                disabled={!finalReady}
                name="confirmWork"
                type="checkbox"
              />
              <span>
                Bu eserin yukarıdaki yayın modeli, bölüm erişimleri ve güncel
                sözleşme sürümüyle kaydedilmesini onaylıyorum.
              </span>
            </label>

            <button
              className={styles.action}
              disabled={!finalReady}
              type="submit"
            >
              {currentModel === "paid" ? "Satışa hazırla" : "Yayın ayarlarını onayla"}
            </button>
          </form>

          {!finalReady ? (
            <p className={styles.helper}>
              Son onay için bölüm erişim planı, yayın modeli ve güncel sözleşme
              kabulünün tamamlanması gerekir.
            </p>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
