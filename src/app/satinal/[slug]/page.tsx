import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import {
  getApplicableCheckoutCoupon,
  getCheckoutWorkBySlug,
} from "@/features/commerce/checkout-repository";
import { calculateCommercePricing } from "@/features/commerce/pricing";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Satın Alma | İlkOku",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ from?: string; kupon?: string }>;
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

  const work = await getCheckoutWorkBySlug(slug, profile.id);
  if (!work) notFound();

  const returnTo = safeReturnPath(query.from, work.slug);
  const checkoutEnabled = isCommerceCheckoutEnabled();
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

  const paidAndActive =
    checkoutEnabled &&
    configuration?.saleModel === "paid" &&
    configuration.status === "active";

  if (!paidAndActive) {
    return (
      <AppShell profile={profile}>
        <div className={styles.page}>
          <header className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>Hazırlık modu</span>
              <h1>{work.title}</h1>
              <p>
                Satın alma altyapısı hazır, ancak gerçek tahsilat henüz aktif
                değil. Eser mevcut okuma düzeninde erişilebilir.
              </p>
            </div>
            <span className={styles.badge}>Tahsilat kapalı</span>
          </header>

          <div className={styles.notice}>
            Ücretli eser hazırlığı yazar tarafında saklanıyor; bu aşamada
            okurdan ödeme istenmez ve okuma erişimi kilitlenmez.
          </div>

          <Link className={styles.action} href={returnTo}>
            Okumaya dön
          </Link>
        </div>
      </AppShell>
    );
  }

  const originalAmount = configuration.priceAmount ?? 0n;
  const requestedCouponCode = query.kupon?.trim() ?? "";
  const coupon = requestedCouponCode
    ? await getApplicableCheckoutCoupon({
        authorId: work.authorId,
        code: requestedCouponCode,
        readerId: profile.id,
        workId: work.id,
      })
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
          <h2>Ödeme yöntemi</h2>
          <div className={styles.saleOptions}>
            <label className={styles.saleOption}>
              <input disabled name="paymentMethod" type="radio" />
              <span>
                <strong>Kredi / Banka Kartı</strong>
                <br />
                Provider entegrasyonu sonraki fazda bağlanacak.
              </span>
            </label>
            <label className={styles.saleOption}>
              <input disabled name="paymentMethod" type="radio" />
              <span>
                <strong>Telefon Faturama Yansıt</strong>
                <br />
                Mobil ödeme sağlayıcısı sonraki fazda bağlanacak.
              </span>
            </label>
          </div>

          <button className={styles.action} disabled type="button">
            Ödeme sağlayıcısı bekleniyor
          </button>
        </section>
      </div>
    </AppShell>
  );
}
