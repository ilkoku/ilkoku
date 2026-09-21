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
import { getActiveReaderPurchaseTerms } from "@/features/commerce/checkout-terms";
import { hasOperationalPaymentProvider } from "@/features/commerce/payment-providers";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Eser Satış & Erişim | İlkOku",
};

export const dynamic = "force-dynamic";

function inputPrice(value: bigint | null | undefined) {
  if (value === null || value === undefined) return "";
  const whole = value / BigInt(100);
  const fraction = String(value % BigInt(100)).padStart(2, "0");
  return `${whole},${fraction}`;
}

function formatPrice(value: bigint | null | undefined, currency = "TRY") {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(Number(value) / 100);
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}


const statusMessages: Record<string, string> = {
  "sozlesme-onayi-gerekli": "Sözleşmeyi kabul etmek için onay kutusunu işaretlemelisin.",
  "sozlesme-hazir-degil": "Yazar Yayın ve Erişim Sözleşmesi henüz aktif değil.",
  "sozlesme-kabul-edildi": "Güncel sözleşme kabulün kaydedildi.",
  "sozlesme-kabul-gerekli": "Eser son onayı için önce güncel sözleşmeyi kabul etmelisin.",
  "sozlesme-surum-uyusmazligi": "Aynı sözleşme sürümünde farklı belge içeriği tespit edildi. Kayıt değiştirilmedi; yönetim kontrolü gerekiyor.",
  "sozlesme-kaydi-kilitli": "Bu sözleşme sürümüne ait önceki kayıt artık kabul durumunda değil. Kayıt değiştirilmedi; yönetim kontrolü gerekiyor.",
  "eser-onayi-gerekli": "Eser bazlı son onay kutusunu işaretlemelisin.",
  "eser-bulunamadi": "Eser bulunamadı veya artık bu işlem için uygun değil.",
  "yayin-modeli-gerekli": "Önce Ücretsiz veya Ücretli yayın modelini kaydetmelisin.",
  "yayin-modeli-kaydedildi": "Yayın modeli kaydedildi.",
  "bolum-gerekli": "Son onay için eserde en az bir bölüm bulunmalı.",
  "erisim-plani-gerekli": "Son onaydan önce tüm bölümlerin erişim planını kaydetmelisin.",
  "erisim-secimi-eksik": "Her bölüm için Ön İzleme veya Kilitli seçimini açıkça yapmalısın.",
  "fiyat-gerekli": "Gerçek ödeme yolu ve operasyonel provider aktifken ücretli eser için 0 TL dışında geçerli bir fiyat gerekir.",
  "yayin-onaylandi": "Eserin yayın ve erişim ayarları onaylandı.",
  "satis-hazir": "Ücretli eser hazırlık durumunda kaydedildi. İlk gerçek paid access aktivasyonuna kadar mevcut okuma erişimi açık kalır.",
  "satis-hazir-erisim-korunuyor": "Ücretli eser ayarları kaydedildi. Eser daha önce paid access olarak aktive edildiği için Kilitli bölümler korunur; yeni satın alma ödeme yolu yeniden hazır olduğunda açılır.",
  "satis-hazir-kosullar-bekleniyor": "Ücretli eser ve gerçek fiyat kaydedildi. Okur Dijital İçerik Satın Alma Koşulları henüz aktif olmadığı için eser satışa açılmadı.",
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

function saleStatusLabel(value: string | undefined) {
  const labels: Record<string, string> = {
    draft: "Taslak",
    ready: "Hazır",
    active: "Aktif",
    paused: "Duraklatıldı",
  };
  return value ? labels[value] ?? value : "Taslak";
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

  const [
    work,
    checkoutEnabled,
    agreement,
    agreementStatus,
    readerPurchaseTerms,
  ] = await Promise.all([
    getAuthorCommerceWork(profile.id, workId),
    Promise.resolve(isCommerceCheckoutEnabled()),
    getActiveAuthorPublicationAgreement(),
    getAuthorPublicationAgreementStatus(),
    getActiveReaderPurchaseTerms(),
  ]);
  const paymentProviderReady = hasOperationalPaymentProvider();

  if (!work) notFound();

  const acceptedAgreement = agreement
    ? await getAuthorAgreementAcceptance(profile.id, agreement)
    : null;

  const currentModel = work.saleConfiguration?.saleModel ?? "free";
  const previouslyActivatedPaid =
    Boolean(work.saleConfiguration?.activatedAt);
  const paymentPathReady = checkoutEnabled && paymentProviderReady;
  const paidPricingEnabled = paymentPathReady || previouslyActivatedPaid;
  const paidActivationReady =
    paymentPathReady && Boolean(readerPurchaseTerms);
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
  const latestEffectiveConsent = work.publicationConsents[0] ?? null;
  const paidPriceReady =
    currentModel !== "paid" ||
    !paidPricingEnabled ||
    (work.saleConfiguration?.priceAmount ?? BigInt(0)) > BigInt(0);
  const finalReady =
    Boolean(acceptedAgreement) &&
    accessPlanComplete &&
    saleModelReady &&
    paidPriceReady;
  const flash = query.durum ? statusMessages[query.durum] ?? query.durum : null;

  return (
    <AppShell breadcrumbLabels={{ [work.id]: work.title }} profile={profile}>
      <div className={`${styles.page} ${styles.writerCommercePage}`}>
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

        {previouslyActivatedPaid &&
        work.saleConfiguration?.status !== "active" ? (
          <div className={styles.notice}>
            Bu eserde kaydedilmiş taslak değişiklikler var. Son onaylı ücretli
            durum okuyucu tarafında korunuyor; yeni model, fiyat veya bölüm
            erişim planı ancak eser bazlı son onay tamamlandığında yürürlüğe
            girer.
          </div>
        ) : null}

        {!paidPricingEnabled ? (
          <div className={styles.notice}>
            Hazırlık modu açık. Ücretli model ve kilitli bölümler kaydedilir,
            fakat gerçek ödeme yolu ve operasyonel provider birlikte hazır
            olana kadar okur tarafında erişim kilidi uygulanmaz. Ücretli fiyatı
            bu aşamada sabit 0 TL&apos;dir.
          </div>
        ) : null}

        {currentModel === "paid" &&
        paymentPathReady &&
        !readerPurchaseTerms ? (
          <div className={styles.notice}>
            Gerçek ödeme yolu hazır ve eser fiyatı kaydedilebilir; ancak Okur
            Dijital İçerik Satın Alma Koşulları henüz aktif değil. Eser bu
            aşamada satışa açılmaz ve yalnız hazır durumda tutulur.
          </div>
        ) : null}

        <form action={saveChapterAccessPlanAction} className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>2. adım</span>
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
                const accessType = chapter.commerceAccess?.accessType ?? null;
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
              <span className={styles.eyebrow}>3. adım</span>
              <h2>Ücretsiz / Ücretli seç</h2>
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
                {!paidPricingEnabled ? (
                  <>
                    <span className={styles.paidPrice}>0 TL</span>
                    <small>
                      Gerçek fiyat alanı ödeme sistemi devreye alınırken açılacak.
                    </small>
                  </>
                ) : (
                  <span className={styles.priceField}>
                    <span>Eser satış fiyatı</span>
                    <input
                      defaultValue={inputPrice(work.saleConfiguration?.priceAmount)}
                      inputMode="decimal"
                      name="price"
                      placeholder="149,00"
                      type="text"
                    />
                  </span>
                )}
              </span>
            </label>
          </div>

          <div className={styles.modelSaveFooter}>
            <button className={styles.action} type="submit">
              Yayın modelini kaydet
            </button>
            <div className={styles.modelSaveMeta}>
              <span>
                Son taslak güncelleme:{" "}
                <strong>
                  {formatDateTime(work.saleConfiguration?.updatedAt)}
                </strong>
              </span>
              <span>
                Son yürürlük onayı:{" "}
                <strong>
                  {latestEffectiveConsent
                    ? `${latestEffectiveConsent.publicationModel === "paid" ? "Ücretli" : "Ücretsiz"} · ${formatDateTime(latestEffectiveConsent.confirmedAt)}`
                    : "Henüz yok"}
                </strong>
              </span>
            </div>
          </div>
        </form>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>4. adım</span>
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
              <span className={styles.eyebrow}>5. adım</span>
              <h2>Eser bazlı son onay</h2>
              <p>
                Bu onay, eserin o andaki erişim planını, yayın modelini ve
                sözleşme sürümünü değiştirilemez geçmiş kaydı olarak saklar.
              </p>
            </div>
            <span className={styles.badge}>
              {saleStatusLabel(work.saleConfiguration?.status)}
            </span>
          </div>

          <div className={styles.summaryGrid}>
            <div>
              <span>Yayın modeli</span>
              <strong>{currentModel === "paid" ? "Ücretli" : "Ücretsiz"}</strong>
            </div>
            <div>
              <span>Fiyat</span>
              <strong>
                {currentModel === "paid"
                  ? paidPricingEnabled
                    ? formatPrice(
                        work.saleConfiguration?.priceAmount,
                        work.saleConfiguration?.currency,
                      )
                    : "0 TL"
                  : "—"}
              </strong>
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
                {currentModel === "paid"
                  ? paidActivationReady
                    ? `Bu eserin ${formatPrice(
                        work.saleConfiguration?.priceAmount,
                        work.saleConfiguration?.currency,
                      )} satış fiyatıyla satışa açılmasını onaylıyorum.`
                    : paidPricingEnabled
                      ? `Bu eserin ${formatPrice(
                          work.saleConfiguration?.priceAmount,
                          work.saleConfiguration?.currency,
                        )} fiyatı ve yukarıdaki erişim planıyla satışa hazır durumda kaydedilmesini onaylıyorum.`
                      : "Bu eserin ücretli model, 0 TL hazırlık fiyatı ve yukarıdaki erişim planıyla satış altyapısına hazırlanmasını onaylıyorum."
                  : "Bu eserin yukarıdaki koşullarla yayımlanmasını onaylıyorum."}
              </span>
            </label>

            <button
              className={styles.action}
              disabled={!finalReady}
              type="submit"
            >
              {currentModel === "paid"
                ? paidActivationReady
                  ? "SATIŞA AÇ"
                  : "SATIŞA HAZIRLA"
                : "YAYINA AÇ"}
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
