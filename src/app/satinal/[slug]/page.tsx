import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { enforceAdultWorkGate } from "@/features/adult-content/work-gate";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  beginPaidCheckoutAction,
  completeZeroTotalCheckoutAction,
  completeTest209ZeroTlDemoAction,
} from "@/features/commerce/checkout-actions";
import {
  getApplicableCheckoutCoupon,
  getCheckoutWorkBySlug,
  getReaderPendingCheckoutOrderNo,
} from "@/features/commerce/checkout-repository";
import { getActiveReaderPurchaseTerms } from "@/features/commerce/checkout-terms";
import { resolveEffectiveCommerceState } from "@/features/commerce/effective-state";
import { isTest209DemoReader, TEST209_DEMO_SLUG } from "@/features/commerce/test209-demo-access";
import { getPaymentMethodAvailability } from "@/features/commerce/payment-providers";
import { quoteCommercePrice } from "@/features/commerce/price-quote";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import { getVerifiedWorkSeller } from "@/features/commerce/verified-seller";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Satın Alma | İlkOku",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const checkoutMessages: Record<string, string> = {
  "kosul-onayi-gerekli": "Devam etmek için dijital içerik satın alma koşullarını kabul etmelisin.",
  "deneme-onayi-gerekli": "0 TL deneme erişimi için onay kutusunu işaretlemelisin.",
  "deneme-hazir-degil": "Bu test eseri veya test hesabı şu anda erişim denemesine uygun değil.",
  "tahsilat-kapali": "Satın alma işlemi henüz aktif değil.",
  "eser-hazir-degil": "Bu eser henüz ücretli satın almaya hazır değil.",
  "satici-yetkisi-dogrulanmadi": "Bu eser için hukukî satıcı ve satış yetkisi henüz doğrulanmadı.",
  "kupon-gecersiz": "Kupon artık geçerli değil veya kullanım hakkı kalmadı.",
  "sifir-toplam-gerekli": "Bu işlem yalnız toplam tutarı 0 TL olan siparişlerde tamamlanabilir.",
  "eser-bulunamadi": "Eser bulunamadı.",
  "satin-alma-kosullari-hazir-degil": "Dijital içerik satın alma koşulları henüz aktif değil. Satın alma işlemi başlatılamaz.",
  "odeme-yontemi-gerekli": "Devam etmek için bir ödeme yöntemi seçmelisin.",
  "odeme-saglayicisi-hazir-degil": "Seçilen ödeme yöntemi henüz aktif değil.",
  "siparis-bekliyor": "Bu eser için zaten ödeme bekleyen bir sipariş bulunuyor.",
  "sifir-toplam-akisi": "Toplam 0 TL olduğu için harici ödeme yerine 0 TL sipariş akışı kullanılmalı.",
  "odeme-baslatilamadi": "Ödeme sağlayıcısı başlatılamadı. Herhangi bir erişim hakkı verilmedi.",
  "odeme-donus-adresi-hazir-degil": "Ödeme dönüş adresi yapılandırılmadığı için işlem başlatılamadı.",
};

function formatMoney(value: bigint, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(Number(value) / 100);
}

function safeReturnPath(value: string | undefined, slug: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return `/kitap/${slug}`;
  }

  return value;
}

export default async function CheckoutPreparationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ durum?: string; from?: string; kupon?: string; kuponTuru?: string; siparis?: string }>;
}) {
  const profile = await getCurrentProfile();
  const { slug } = await params;
  const query = await searchParams;

  if (!profile) {
    redirect(
      `/giris?sonraki=${encodeURIComponent(
        `/satinal/${slug}${query.from ? `?from=${encodeURIComponent(query.from)}` : ""}`,
      )}`,
    );
  }

  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const checkoutReturnTo = `/satinal/${slug}${query.from ? `?from=${encodeURIComponent(query.from)}` : ""}`;
  await enforceAdultWorkGate({
    returnTo: checkoutReturnTo,
    slug,
    user: profile,
  });

  const [work, purchaseTerms] = await Promise.all([
    getCheckoutWorkBySlug(slug, profile.id),
    getActiveReaderPurchaseTerms(),
  ]);
  if (!work) notFound();

  const returnTo = safeReturnPath(query.from, work.slug);
  const checkoutEnabled = isCommerceCheckoutEnabled();
  const paymentMethods = getPaymentMethodAvailability();
  const hasAvailableProvider = paymentMethods.some((item) => item.available);
  const configuration = work.saleConfiguration;
  const effectiveCommerce = resolveEffectiveCommerceState({
    configuration,
    latestConsent: work.publicationConsents[0] ?? null,
  });
  const entitlement = work.entitlements[0] ?? null;

  if (entitlement) {
    const isTestAccess =
      entitlement.source === "promotion" &&
      work.slug === TEST209_DEMO_SLUG &&
      !entitlement.order?.orderNo;
    return (
      <AppShell profile={profile}>
        <div className={styles.page}>
          <header className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>{entitlement.order?.orderNo
                ? "Satın alındı"
                : isTestAccess ? "0 TL test erişimi" : "Erişim hakkı aktif"}</span>
              <h1>{work.title}</h1>
              <p>{isTestAccess
                ? "Bu eser için 0 TL deneme erişimin etkin. Bu işlem gerçek sipariş veya tahsilat değildir."
                : "Bu eser için aktif erişim hakkın zaten bulunuyor."}</p>
              {entitlement.order?.orderNo ? (
                <p>Sipariş numarası: <strong>{entitlement.order.orderNo}</strong></p>
              ) : null}
            </div>
          </header>

          <div className={styles.heroActions}>
            <Link className={styles.action} href={returnTo}>
              Okumaya dön
            </Link>
            {entitlement.order?.orderNo ? (
              <Link
                className={styles.secondaryAction}
                href={"/hesabim/odeme-gecmisi/" + encodeURIComponent(entitlement.order.orderNo)}
              >
                Sipariş ayrıntısını görüntüle
              </Link>
            ) : null}
          </div>
        </div>
      </AppShell>
    );
  }

  const verifiedSeller = effectiveCommerce.saleModel === "paid"
    ? await getVerifiedWorkSeller(work.id)
    : null;
  const previouslyActivatedPaid =
    Boolean(configuration?.activatedAt);
  const stagedZeroPurchaseReady =
    !previouslyActivatedPaid &&
    Boolean(purchaseTerms) &&
    Boolean(verifiedSeller) &&
    effectiveCommerce.saleModel === "paid" &&
    effectiveCommerce.status === "ready" &&
    effectiveCommerce.priceAmount === BigInt(0);
  const livePaidCheckoutActive =
    checkoutEnabled &&
    hasAvailableProvider &&
    Boolean(purchaseTerms) &&
    effectiveCommerce.saleModel === "paid" &&
    effectiveCommerce.status === "active" &&
    effectiveCommerce.priceAmount !== null &&
    effectiveCommerce.priceAmount > BigInt(0);
  // Keep the checkout overview visible even when purchase is not ready.
  // 0 TL is the only provider-free completion path.
  const stagedZeroCandidate =
    !previouslyActivatedPaid &&
    effectiveCommerce.saleModel === "paid" &&
    effectiveCommerce.status === "ready" &&
    effectiveCommerce.priceAmount === BigInt(0);
  // This is a separate non-sale trial for one QA reader and one QA work.
  // Never make the real 0 TL order or its seller gate appear approved.
  const test209DemoUser = stagedZeroCandidate ? await getCurrentUser() : null;
  const test209DemoReady =
    stagedZeroCandidate &&
    Boolean(purchaseTerms) &&
    !verifiedSeller &&
    work.slug === TEST209_DEMO_SLUG &&
    Boolean(test209DemoUser && isTest209DemoReader(test209DemoUser));
  const originalAmount = effectiveCommerce.priceAmount ?? BigInt(0);
  const couponInputEnabled =
    effectiveCommerce.saleModel === "paid" &&
    effectiveCommerce.status === "active" &&
    originalAmount > BigInt(0);
  const requestedCouponCode = query.kupon?.trim() ?? "";
  const requestedCouponKind =
    query.kuponTuru === "platform" || query.kuponTuru === "author"
      ? query.kuponTuru
      : null;
  const candidateCoupon = couponInputEnabled && requestedCouponCode
    ? await getApplicableCheckoutCoupon({
        authorId: work.authorId,
        code: requestedCouponCode,
        readerId: profile.id,
        workId: work.id,
      })
    : null;
  // A platform coupon cannot be entered as an author discount or vice versa.
  // Preserve links carrying the pre-existing "kupon" query without a type.
  const coupon = candidateCoupon &&
    (!requestedCouponKind || candidateCoupon.owner === requestedCouponKind)
    ? candidateCoupon
    : null;

  const verifiedPendingOrderNo =
    query.durum === "siparis-bekliyor" && query.siparis
      ? await getReaderPendingCheckoutOrderNo({
          orderNo: query.siparis,
          readerId: profile.id,
          workId: work.id,
        })
      : null;
  const flash = query.durum
    ? `${checkoutMessages[query.durum] ?? "Satın alma işleminde bir durum oluştu."}${
        verifiedPendingOrderNo ? ` · Sipariş No: ${verifiedPendingOrderNo}` : ""
      }`
    : null;

  const priceQuote = quoteCommercePrice({
    configuredPriceAmount: originalAmount,
    taxTreatment: effectiveCommerce.priceTaxTreatment,
    coupon: coupon
      ? {
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          owner: coupon.owner,
        }
      : null,
  });
  const { pricing } = priceQuote;
  const couponZeroPurchaseReady =
    Boolean(purchaseTerms) &&
    Boolean(verifiedSeller) &&
    Boolean(coupon) &&
    effectiveCommerce.saleModel === "paid" &&
    effectiveCommerce.status === "active" &&
    effectiveCommerce.priceAmount !== null &&
    effectiveCommerce.priceAmount > BigInt(0) &&
    pricing.finalAmount === BigInt(0);

  // A 100%-off coupon may complete as 0 TL even with card/phone disabled;
  // a nonzero remaining balance must NEVER start a provider-free order.
  const checkoutConfigurationActive =
    stagedZeroPurchaseReady || couponZeroPurchaseReady || livePaidCheckoutActive;
  const paidAccessEnforced =
    effectiveCommerce.saleModel === "paid" &&
    (previouslyActivatedPaid ||
      effectiveCommerce.status === "ready" ||
      effectiveCommerce.status === "active");
  const purchaseUnavailableMessage = stagedZeroCandidate
    ? "0 TL edinim akışı için doğrulanmış satıcı, satış yetkisi ve aktif okur koşulları gereklidir. Bunlar tamamlanıncaya kadar yeni sipariş oluşturulmaz."
    : effectiveCommerce.status === "active" && originalAmount > BigInt(0)
      ? "Gerçek tahsilat kapalı. Geçerli bir %100 indirim kuponu toplamı 0 TL'ye indirirse, onaylı satıcı ve sözleşme koşullarıyla sipariş tamamlanabilir."
      : paidAccessEnforced
        ? "Erişim korunuyor. Eserin mevcut ücretli erişim hakları geçerlidir; yeni satın alma yolu geçici olarak kapalı olsa bile eser bu nedenle ücretsiz erişime açılmaz."
        : "Bu eser henüz satın almaya açık değil. Yayın ve satış ayarları tamamlanıncaya kadar sipariş oluşturulmaz.";

  // An available 0 TL option is not itself a completed purchase: the existing
  // server-side contract, seller and authorization gates still decide whether
  // the submit action can run. Card/carrier remain disabled in this UI.
  const zeroTotalOptionSelected =
    effectiveCommerce.saleModel === "paid" &&
    pricing.finalAmount === BigInt(0);


  return (
    <AppShell profile={profile}>
      <div className={`${styles.page} ${styles.readerCheckoutPage}`}>
        <header className={`${styles.hero} ${styles.readerCheckoutHero}`}>
          <div>
            <span className={styles.eyebrow}>İlkOku · Dijital eser erişimi</span>
            <h1>{work.title}</h1>
            <p>Yazar: {work.author.displayName ?? work.author.fullName}</p>
          </div>
          <Link className={styles.secondaryAction} href={returnTo}>
            Eser sayfasına dön
          </Link>
        </header>

        <nav className={styles.checkoutStages} aria-label="Satın alma adımları">
          <div><span>1</span><strong>Eser ve fiyat</strong><small>Eser ve indirimleri kontrol et</small></div>
          <div><span>2</span><strong>Sözleşme ve işlem</strong><small>Onay ve uygun ödeme yöntemi</small></div>
          <div><span>3</span><strong>Kütüphane ve sipariş</strong><small>Erişim ve sipariş dökümü</small></div>
        </nav>

        {flash ? <div role="alert" className={styles.flash}>{flash}</div> : null}
        {!checkoutConfigurationActive && !test209DemoReady ? (
          <div role="status" className={styles.notice}>
            {purchaseUnavailableMessage}
          </div>
        ) : null}

        <div className={styles.readerCheckoutLayout}>
          <div className={styles.readerCheckoutMain}>
        <section className={`${styles.panel} ${styles.readerCheckoutForm}`}>
          <span className={styles.eyebrow}>Sipariş adımı</span>
          <h2>{pricing.finalAmount === BigInt(0) ? "Eser erişimi" : "Ödeme yöntemi"}</h2>
          <p className={styles.helper}>
            Satın alma yalnızca bu eserin dijital okuma erişimini kapsar.
            Aktif erişim hakkı kütüphanene eklenir; fiziksel kitap gönderilmez.
          </p>
          <section
            className={styles.readerCheckoutPaymentOptions}
            aria-labelledby="reader-payment-options-title"
          >
            <h3 id="reader-payment-options-title">İşlem seçeneği</h3>
            <div className={styles.readerCheckoutPaymentGrid}>
              <label className={`${styles.readerCheckoutPaymentChoice} ${styles.readerCheckoutPaymentChoiceDisabled}`}>
                <input type="radio" name="purchasePath" value="card" disabled />
                <span className={styles.readerCheckoutPaymentCopy}>
                  <strong>Kredi Kartı</strong>
                  <small>Pasif</small>
                </span>
              </label>
              <label className={`${styles.readerCheckoutPaymentChoice} ${styles.readerCheckoutPaymentChoiceDisabled}`}>
                <input type="radio" name="purchasePath" value="carrier" disabled />
                <span className={styles.readerCheckoutPaymentCopy}>
                  <strong>Telefon Faturası</strong>
                  <small>Pasif</small>
                </span>
              </label>
              <label
                className={`${styles.readerCheckoutPaymentChoice} ${
                  zeroTotalOptionSelected
                    ? styles.readerCheckoutPaymentChoiceSelected
                    : styles.readerCheckoutPaymentChoiceDisabled
                }`}
              >
                <input
                  type="radio"
                  name="purchasePath"
                  value="zero"
                  checked={zeroTotalOptionSelected}
                  disabled={!zeroTotalOptionSelected}
                  readOnly
                />
                <span className={styles.readerCheckoutPaymentCopy}>
                  <strong>Ücretli <span className={styles.readerCheckoutPaymentAmount}>0 TL</span></strong>
                  <small>{zeroTotalOptionSelected ? "Seçili · Gerçek ödeme yok" : "Bu eser için kullanılamıyor"}</small>
                </span>
              </label>
            </div>
          </section>

          {zeroTotalOptionSelected ? (
            <section className={styles.readerCheckoutNotReady} aria-label="0 TL satın alma ekranı" data-commerce-zero-screen="reader-checkout">
              <strong>0 TL satın alma ekranı hazır</strong>
              <p>Bu işlemde kredi kartı veya telefon faturası kullanılmaz.
                Tamamlanan gerçek 0 TL siparişi için sipariş numarası ve
                kütüphane erişimi oluşturulur.</p>
              <div className={styles.summaryGrid}>
                <div><span>Toplam tutar</span><strong>{formatMoney(BigInt(0), effectiveCommerce.currency)}</strong></div>
                <div><span>Gerçek tahsilat</span><strong>Yok</strong></div>
                <div><span>Hukukî satıcı</span><strong>{verifiedSeller
                  ? verifiedSeller.party.legalName
                  : "Satıcı kaydı bekleniyor"}</strong></div>
                <div><span>Satın alma koşulları</span><strong>{purchaseTerms
                  ? "Metin hazır" : "Henüz aktif değil"}</strong></div>
                <div><span>İşlem durumu</span><strong>{checkoutConfigurationActive
                  ? "0 TL edinim kullanılabilir"
                  : test209DemoReady ? "TEST209 deneme erişimi (gerçek sipariş değil)"
                    : "Ekran hazır · Sipariş henüz açılamaz"}</strong></div>
              </div>
            </section>
          ) : null}

          {purchaseTerms ? (
            <div className={styles.contractBox}>
              <div className={styles.contractHeading}>
                <strong>{purchaseTerms.title}</strong>
                <span>Sürüm {purchaseTerms.version}</span>
              </div>
              <div className={styles.contractText}>{purchaseTerms.body}</div>
            </div>
          ) : null}

          {!purchaseTerms ? (
            <div className={styles.notice}>
              Dijital içerik satın alma koşulları henüz aktif değil. Hukuki
              inceleme ve yönetim aktivasyonu tamamlanmadan sipariş
              oluşturulmayacak.
            </div>
          ) : null}

          {checkoutConfigurationActive && pricing.finalAmount === BigInt(0) && purchaseTerms ? (
            <>
              <div className={styles.successNotice}>
                {coupon
                  ? "Kupon toplam tutarı 0 TL'ye düşürdü. Harici ödeme sağlayıcısına gidilmeden eser erişimi açılacak."
                  : "Eser erişim fiyatı 0 TL. Sipariş ücretsiz olarak tamamlanacak ve eser kütüphanene eklenecek."}
              </div>

              <form action={completeZeroTotalCheckoutAction}>
                <input name="slug" type="hidden" value={work.slug} />
                <input
                  name="couponCode"
                  type="hidden"
                  value={coupon?.code ?? ""}
                />
                <input name="returnTo" type="hidden" value={returnTo} />

                <label className={styles.confirmation}>
                  <input name="acceptDigitalContent" type="checkbox" required />
                  <span>
                    <strong>{work.title}</strong> eserinin dijital okuma erişimini, ödenecek toplam{" "}
                    <strong>{formatMoney(pricing.finalAmount, effectiveCommerce.currency)}</strong>{" "}
                    olmak üzere <strong>gerçek bir satın alma işlemiyle</strong> satın
                    almayı onaylıyorum. Bu işlem deneme erişimi değildir; gerçek sipariş
                    oluşturulacak ve benden para tahsil edilmeyecektir.{" "}
                    {purchaseTerms.title} (sürüm {purchaseTerms.version}) metnini
                    okudum ve kabul ediyorum.
                  </span>
                </label>

                <button className={styles.action} type="submit">
                  0 TL ile satın al
                </button>
              </form>
            </>
          ) : test209DemoReady ? (
            <div className={styles.readerCheckoutNotReady}>
              <strong>0 TL test erişimi hazır</strong>
              <p>
                YENİ TEST209 için okuma erişimi denemesi yapılacak.
                Bu bir gerçek satın alma değildir; sipariş, ödeme ve
                muhasebe kaydı oluşturulmaz. Test eseri kütüphanene eklenecek.
              </p>
              <form action={completeTest209ZeroTlDemoAction}>
                <input name="slug" type="hidden" value={work.slug} />
                <input name="returnTo" type="hidden" value={returnTo} />
                <label className={styles.confirmation}>
                  <input name="acceptDemoAccess" type="checkbox" required />
                  <span>
                    0 TL denemenin gerçek bir satış veya ödeme olmadığını
                    ve erişimin yalnız TEST209 için verileceğini kabul ediyorum.
                  </span>
                </label>
                <button className={styles.action} type="submit">
                  0 TL denemeyi etkinleştir
                </button>
              </form>
            </div>
          ) : !checkoutConfigurationActive ? (
            <div className={styles.readerCheckoutNotReady}>
              <strong>{stagedZeroCandidate ? "0 TL erişim hazırlıkta" : "Satın alma şu an kapalı"}</strong>
              <p>
                {stagedZeroCandidate
                  ? "Eserin toplam tutarı 0 TL. İlkOku satın alma koşulları aktif olunca kart bilgisi istenmeden sipariş oluşturulabilecek."
                  : "Sipariş veya ödeme alınmıyor. Mevcut okuma hakkın korunur."}
              </p>
              <button type="button" className={styles.action} disabled>
                {stagedZeroCandidate ? "0 TL ile edin — henüz aktif değil" : "Satın alma kapalı"}
              </button>
              <Link className={styles.quietAction} href={returnTo}>Eser sayfasına dön</Link>
            </div>
          ) : (
            <form action={beginPaidCheckoutAction}>
              <input name="slug" type="hidden" value={work.slug} />
              <input
                name="couponCode"
                type="hidden"
                value={coupon?.code ?? ""}
              />
              <input name="returnTo" type="hidden" value={returnTo} />

              <div className={styles.saleOptions}>
                {paymentMethods.map((method) => (
                  <label className={styles.saleOption} key={method.method}>
                    <input
                      disabled={!method.available || !purchaseTerms}
                      name="paymentMethod"
                      type="radio"
                      value={method.method}
                    />
                    <span>
                      <strong>{method.label}</strong>
                      <br />
                      {method.available
                        ? "Ödeme sağlayıcısı hazır."
                        : "Provider entegrasyonu henüz aktif değil."}
                    </span>
                  </label>
                ))}
              </div>

              <label className={styles.confirmation}>
                <input
                  disabled={!hasAvailableProvider || !purchaseTerms}
                  name="acceptDigitalContent"
                  type="checkbox"
                />
                <span>
                  {purchaseTerms
                    ? `${purchaseTerms.title} (sürüm ${purchaseTerms.version}) metnini okudum ve kabul ediyorum.`
                    : "Dijital içerik satın alma koşulları henüz aktif değil."}
                </span>
              </label>

              <button
                className={styles.action}
                disabled={!hasAvailableProvider || !purchaseTerms}
                type="submit"
              >
                {hasAvailableProvider
                  ? `${formatMoney(pricing.finalAmount, effectiveCommerce.currency)} ÖDE`
                  : "Ödeme sağlayıcısı bekleniyor"}
              </button>
            </form>
          )}
        </section>
          </div>
          <aside className={styles.readerCheckoutAside} aria-label="Sipariş özeti">
        <section className={`${styles.panel} ${styles.readerCheckoutSummary}`}>
          <span className={styles.eyebrow}>Ödeme özeti</span>
          <h2>Sipariş özeti</h2>
          <div className={styles.summaryGrid}>
            <div>
              <span>{priceQuote.taxTreatment === "net_plus_vat"
                ? "Eser fiyatı (KDV hariç)"
                : "Eser fiyatı"}</span>
              <strong>
                {formatMoney(originalAmount, effectiveCommerce.currency)}
              </strong>
            </div>
            {priceQuote.listVatAmount !== null ? (
              <div>
                <span>Satış KDV&apos;si (%20)</span>
                <strong>{formatMoney(priceQuote.listVatAmount, effectiveCommerce.currency)}</strong>
              </div>
            ) : null}
            <div>
              <span>İlkOku kupon indirimi</span>
              <strong>
                {coupon?.owner === "platform" && pricing.discountAmount > BigInt(0) ? "-" : ""}
                {formatMoney(
                  coupon?.owner === "platform" ? pricing.discountAmount : BigInt(0),
                  effectiveCommerce.currency,
                )}
              </strong>
            </div>
            <div>
              <span>Yazar indirim kodu</span>
              <strong>
                {coupon?.owner === "author" && pricing.discountAmount > BigInt(0) ? "-" : ""}
                {formatMoney(
                  coupon?.owner === "author" ? pricing.discountAmount : BigInt(0),
                  effectiveCommerce.currency,
                )}
              </strong>
            </div>
            <div>
              <span>Ödenecek toplam</span>
              <strong>
                {formatMoney(pricing.finalAmount, effectiveCommerce.currency)}
              </strong>
            </div>
          </div>
          <section className={styles.readerCheckoutCoupons} aria-label="Kupon ve indirim kodları">
            <div className={styles.readerCheckoutCouponHeading}>
              <h3>Kupon ve indirim kodları</h3>
              <p>İlkOku veya yazar kodundan yalnızca biri kullanılabilir.</p>
            </div>
            {(["platform", "author"] as const).map((owner) => (
              <form className={styles.readerCheckoutCouponForm} method="get" key={owner}>
                <input name="from" type="hidden" value={returnTo} />
                <input name="kuponTuru" type="hidden" value={owner} />
                <label className={styles.field}>
                  <span>{owner === "platform" ? "İlkOku kuponu" : "Yazar indirim kodu"}</span>
                  <input
                    aria-label={owner === "platform" ? "İlkOku kupon kodu" : "Yazar indirim kodu"}
                    autoComplete="off"
                    defaultValue={
                      requestedCouponKind === owner ||
                      (!requestedCouponKind && coupon?.owner === owner)
                        ? requestedCouponCode
                        : ""
                    }
                    disabled={!couponInputEnabled}
                    name="kupon"
                    placeholder={owner === "platform" ? "İlkOku kupon kodu" : "Yazarın verdiği kod"}
                    required
                    type="text"
                    maxLength={80}
                  />
                </label>
                <button className={styles.secondaryAction} disabled={!couponInputEnabled} type="submit">
                  Uygula
                </button>
              </form>
            ))}
            {!couponInputEnabled ? (
              <p className={styles.readerCheckoutCouponUnavailable} role="status">
                {originalAmount === BigInt(0)
                  ? "Bu eserin bedeli 0 TL olduğundan kupon veya yazar indirimi uygulanamaz. Alanlar, pozitif fiyatlı eserlerde kullanılabilir."
                  : "Kupon ve yazar indirim kodları yalnız aktif, pozitif fiyatlı eserlerde kullanılabilir."}
              </p>
            ) : null}
            {couponInputEnabled && requestedCouponCode && !coupon ? (
              <p className={styles.readerCheckoutCouponError} role="status">
                Kod geçersiz, süresi dolmuş, kullanım sınırına ulaşmış, bu eserde kullanılamıyor veya seçilen kupon türüyle eşleşmiyor.
              </p>
            ) : null}
            {coupon ? (
              <div className={styles.successNotice} role="status">
                {coupon.owner === "platform" ? "İlkOku kuponu" : "Yazar indirim kodu"} {coupon.code} uygulandı.
                {pricing.finalAmount === BigInt(0)
                  ? " Toplam 0 TL; kart veya telefon tahsilatı yapılmayacak."
                  : " Kalan tutar 0 TL olmadığı için ödeme olmadan edinim yapılamaz."}
                {coupon.owner === "platform"
                  ? " İndirim İlkOku tarafından karşılanır."
                  : " İndirim yazar tarafından karşılanır."}
              </div>
            ) : null}
            {requestedCouponCode ? (
              <Link className={styles.quietAction} href={`/satinal/${work.slug}?from=${encodeURIComponent(returnTo)}`}>
                Kuponu kaldır
              </Link>
            ) : null}
          </section>
          {stagedZeroCandidate ? (
            <div className={stagedZeroPurchaseReady ? styles.successNotice : styles.helper}>
              {stagedZeroPurchaseReady
                ? "Bu eser için erişim fiyatı 0 TL. Harici ödeme sağlayıcısı kullanılmadan sipariş tamamlanacak."
                : test209DemoReady
                  ? "TEST209 için 0 TL deneme erişimi hazır; gerçek sipariş veya ödeme oluşturulmaz."
                  : "Eser 0 TL erişime hazırlanıyor. Satıcı ve erişim yetkisi doğrulanınca sipariş oluşturulabilecek."}
            </div>
          ) : null}
          <div className={styles.readerCheckoutWorkMeta}>
            <strong>{work.title}</strong>
            <span>Yazar: {work.author.displayName ?? work.author.fullName}</span>
            <span>Platform: İlkOku</span>
            {verifiedSeller ? (
              <>
                <span>Hukukî satıcı: {verifiedSeller.party.legalName}</span>
                <span>Satıcı adresi: {verifiedSeller.party.legalAddress}</span>
                <span>Satıcı iletişim: {verifiedSeller.party.contactEmail}</span>
                <span>İlkOku rolü: {verifiedSeller.mode === "platform_direct" ? "Doğrudan satıcı" : "Aracı platform"}</span>
              </>
            ) : null}
            <span>Ürün: Eserin dijital okuma erişimi</span>
          </div>



        </section>

          </aside>
        </div>
      </div>
    </AppShell>
  );
}
