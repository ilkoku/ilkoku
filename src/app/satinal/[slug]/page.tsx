import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { enforceAdultWorkGate } from "@/features/adult-content/work-gate";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import {
  beginPaidCheckoutAction,
  completeZeroTotalCheckoutAction,
} from "@/features/commerce/checkout-actions";
import {
  getApplicableCheckoutCoupon,
  getCheckoutWorkBySlug,
} from "@/features/commerce/checkout-repository";
import { getActiveReaderPurchaseTerms } from "@/features/commerce/checkout-terms";
import { getPaymentMethodAvailability } from "@/features/commerce/payment-providers";
import { calculateCommercePricing } from "@/features/commerce/pricing";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Satın Alma | İlkOku",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const checkoutMessages: Record<string, string> = {
  "kosul-onayi-gerekli": "Devam etmek için dijital içerik satın alma koşullarını kabul etmelisin.",
  "tahsilat-kapali": "Satın alma işlemi henüz aktif değil.",
  "eser-hazir-degil": "Bu eser henüz ücretli satın almaya hazır değil.",
  "kupon-gecersiz": "Kupon artık geçerli değil veya kullanım hakkı kalmadı.",
  "sifir-toplam-gerekli": "Bu işlem yalnız toplam tutarı 0 TL olan kuponlu siparişlerde tamamlanabilir.",
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
  searchParams: Promise<{ durum?: string; from?: string; kupon?: string; siparis?: string }>;
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
  const entitlement = work.entitlements[0] ?? null;

  if (entitlement) {
    return (
      <AppShell profile={profile}>
        <div className={styles.page}>
          <header className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>Satın alındı</span>
              <h1>{work.title}</h1>
              <p>Bu eser için aktif erişim hakkın zaten bulunuyor.</p>
            </div>
          </header>

          <Link className={styles.action} href={returnTo}>
            Okumaya dön
          </Link>
        </div>
      </AppShell>
    );
  }

  const previouslyActivatedPaid =
    configuration?.saleModel === "paid" &&
    Boolean(configuration.activatedAt);
  const paidAccessEnforced =
    configuration?.saleModel === "paid" &&
    (previouslyActivatedPaid ||
      (checkoutEnabled && configuration.status === "active"));
  const checkoutConfigurationActive =
    checkoutEnabled &&
    configuration?.saleModel === "paid" &&
    configuration.status === "active";

  if (!paidAccessEnforced) {
    return (
      <AppShell profile={profile}>
        <div className={styles.page}>
          <header className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>Hazırlık modu</span>
              <h1>{work.title}</h1>
              <p>
                Bu ücretli yapılandırma henüz gerçek paid access olarak aktive
                edilmedi. Mevcut okuma erişimi açık kalır.
              </p>
            </div>
            <span className={styles.badge}>Tahsilat hazırlıkta</span>
          </header>

          <div className={styles.notice}>
            Yazarın ücretli eser ayarları ve bölüm planı saklanıyor; ilk gerçek
            aktivasyon tamamlanana kadar okurdan ödeme istenmez.
          </div>

          <Link className={styles.action} href={returnTo}>
            Okumaya dön
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!checkoutConfigurationActive) {
    return (
      <AppShell profile={profile}>
        <div className={styles.page}>
          <header className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>Satın alma geçici olarak kapalı</span>
              <h1>{work.title}</h1>
              <p>
                Bu eser daha önce ücretli erişimde aktive edildi. Mevcut satın
                alma yolu şu anda kullanılamıyor; eser bu nedenle ücretsiz
                erişime açılmaz.
              </p>
            </div>
            <span className={styles.badge}>Erişim korunuyor</span>
          </header>

          <div className={styles.notice}>
            Aktif erişim hakkı olan okurlar okumaya devam eder. Yeni erişim
            edinmek için satın alma yolu yeniden açılana kadar beklemek gerekir.
          </div>

          <Link className={styles.action} href={`/kitap/${work.slug}`}>
            Eser sayfasına dön
          </Link>
        </div>
      </AppShell>
    );
  }

  const originalAmount = configuration.priceAmount ?? BigInt(0);
  const requestedCouponCode = query.kupon?.trim() ?? "";
  const coupon = requestedCouponCode
    ? await getApplicableCheckoutCoupon({
        authorId: work.authorId,
        code: requestedCouponCode,
        readerId: profile.id,
        workId: work.id,
      })
    : null;

  const flash = query.durum
    ? `${checkoutMessages[query.durum] ?? query.durum}${
        query.siparis ? ` · Sipariş ${query.siparis}` : ""
      }`
    : null;

  const pricing = calculateCommercePricing(
    originalAmount,
    coupon
      ? {
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          owner: coupon.owner,
        }
      : null,
  );

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Satın Alma</span>
            <h1>{work.title}</h1>
            <p>{work.author.displayName ?? work.author.fullName}</p>
          </div>
          <Link className={styles.secondaryAction} href={returnTo}>
            Vazgeç
          </Link>
        </header>

        {flash ? <div className={styles.flash}>{flash}</div> : null}

        <section className={styles.panel}>
          <div className={styles.summaryGrid}>
            <div>
              <span>Eser fiyatı</span>
              <strong>
                {formatMoney(originalAmount, configuration.currency)}
              </strong>
            </div>
            <div>
              <span>İndirim</span>
              <strong>
                -{formatMoney(pricing.discountAmount, configuration.currency)}
              </strong>
            </div>
            <div>
              <span>Toplam</span>
              <strong>
                {formatMoney(pricing.finalAmount, configuration.currency)}
              </strong>
            </div>
          </div>

          <form className={styles.couponApplyForm} method="get">
            <input name="from" type="hidden" value={returnTo} />
            <label className={styles.field}>
              <span>Kupon kodunuz var mı?</span>
              <input
                defaultValue={requestedCouponCode}
                name="kupon"
                placeholder="Kupon kodu"
                type="text"
              />
            </label>
            <button className={styles.secondaryAction} type="submit">
              Uygula
            </button>
          </form>

          {requestedCouponCode && !coupon ? (
            <div className={styles.notice}>
              Kupon geçersiz, süresi dolmuş, kullanım limiti dolmuş veya bu
              eser için geçerli değil.
            </div>
          ) : null}

          {coupon ? (
            <div className={styles.successNotice}>
              {coupon.code} kuponu uygulandı.
            </div>
          ) : null}
        </section>

        <section className={styles.panel}>
          <h2>{pricing.finalAmount === BigInt(0) ? "Siparişi tamamla" : "Ödeme yöntemi"}</h2>

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

          {pricing.finalAmount === BigInt(0) && coupon && purchaseTerms ? (
            <>
              <div className={styles.successNotice}>
                Kupon toplam tutarı 0 TL&apos;ye düşürdü. Harici ödeme
                sağlayıcısına gidilmeden eser erişimi açılacak.
              </div>

              <form action={completeZeroTotalCheckoutAction}>
                <input name="slug" type="hidden" value={work.slug} />
                <input name="couponCode" type="hidden" value={coupon.code} />
                <input name="returnTo" type="hidden" value={returnTo} />

                <label className={styles.confirmation}>
                  <input name="acceptDigitalContent" type="checkbox" />
                  <span>
                    {purchaseTerms.title} (sürüm {purchaseTerms.version}) metnini
                    okudum ve kabul ediyorum.
                  </span>
                </label>

                <button className={styles.action} type="submit">
                  0 TL ile erişimi aç
                </button>
              </form>
            </>
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
                  ? `${formatMoney(pricing.finalAmount, configuration.currency)} ÖDE`
                  : "Ödeme sağlayıcısı bekleniyor"}
              </button>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  );
}
