import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import {
  createAuthorCouponAction,
  toggleAuthorCouponAction,
} from "@/features/commerce/actions";
import {
  getAuthorCommerceWorks,
  listAuthorCoupons,
} from "@/features/commerce/repository";
import { hasOperationalPaymentProvider } from "@/features/commerce/payment-providers";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Kuponlar | İlkOku",
  description: "Yazar eser kuponlarını yönetin.",
};

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  "eksik-bilgi": "Kupon için gerekli alanları tamamlamalısın.",
  "gecersiz-kod": "Kupon kodu 3-32 karakter olmalı ve yalnız harf, rakam, - veya _ içermeli.",
  "gecersiz-indirim": "İndirim değeri geçerli değil.",
  "gecersiz-tarih": "Bitiş tarihi başlangıç tarihinden önce olamaz.",
  "eser-bulunamadi": "Seçilen eser bulunamadı.",
  "ucretli-eser-gerekli": "Kupon yalnız ücretli olarak hazırlanmış bir eser için oluşturulabilir.",
  "kupon-kodu-kullaniliyor": "Bu kupon kodu zaten kullanılıyor.",
  "kupon-olusturuldu": "Kupon oluşturuldu.",
  "kupon-guncellendi": "Kupon durumu güncellendi.",
  "kupon-bulunamadi": "Kupon bulunamadı.",
};

function formatDiscount(
  type: "percent" | "fixed",
  value: bigint,
) {
  if (type === "percent") return "%" + value.toString();
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value) / 100);
}

function formatDate(value: Date | null) {
  if (!value) return "Süresiz";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export default async function AuthorCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/satis-erisim/kuponlar");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi");
  }

  const query = await searchParams;
  const [works, coupons, checkoutEnabled] = await Promise.all([
    getAuthorCommerceWorks(profile.id),
    listAuthorCoupons(profile.id),
    Promise.resolve(isCommerceCheckoutEnabled()),
  ]);
  const paymentPathReady =
    checkoutEnabled && hasOperationalPaymentProvider();

  const flash = query.durum ? messages[query.durum] ?? query.durum : null;
  const paidWorks = works.filter(
    (work) => work.saleConfiguration?.saleModel === "paid",
  );
  const activeCouponCount = coupons.filter(
    (coupon) => coupon.status === "active",
  ).length;
  const totalCouponUsage = coupons.reduce(
    (total, coupon) => total + coupon.usageCount,
    0,
  );

  return (
    <AppShell profile={profile}>
      <div className={`${styles.page} ${styles.writerCommercePage} ${styles.couponWorkspace}`}>
        <header className={`${styles.hero} ${styles.couponHero}`}>
          <div>
            <span className={styles.eyebrow}>Satış & Erişim</span>
            <h1>Kuponlar</h1>
            <p>
              Ücretli eserlerin için indirim kuponu oluştur, kullanımını izle
              ve gerektiğinde tek tıkla duraklat.
            </p>
          </div>
          <Link className={styles.secondaryAction} href="/satis-erisim">
            Satış & Erişim&apos;e dön
          </Link>
        </header>

        {flash ? <div className={styles.flash}>{flash}</div> : null}

        <section className={styles.couponStats} aria-label="Kupon özeti">
          <div className={styles.couponStat}>
            <span>Ücretli eser</span>
            <strong>{paidWorks.length}</strong>
          </div>
          <div className={styles.couponStat}>
            <span>Toplam kupon</span>
            <strong>{coupons.length}</strong>
          </div>
          <div className={styles.couponStat}>
            <span>Aktif kupon</span>
            <strong>{activeCouponCount}</strong>
          </div>
          <div className={styles.couponStat}>
            <span>Toplam kullanım</span>
            <strong>{totalCouponUsage}</strong>
          </div>
        </section>

        {!paymentPathReady ? (
          <div className={styles.notice}>
            Kupon altyapısı hazır. Gerçek checkout ve operasyonel ödeme
            sağlayıcısı birlikte hazır olmadığı için kuponlar şu anda gerçek
            tahsilatlı sipariş üretmez; ödeme yolu açıldığında aynı kayıtlar
            kullanılacak.
          </div>
        ) : null}

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Yeni kupon</span>
              <h2>Yazar kuponu oluştur</h2>
              <p>
                Yazar kuponundaki indirim yazar tarafından finanse edilir.
                Hakediş, kupon uygulandıktan sonraki satış tutarı üzerinden
                hesaplanır.
              </p>
            </div>
            <span className={styles.badge}>Yazar finansmanlı</span>
          </div>

          {paidWorks.length === 0 ? (
            <div className={styles.empty}>
              Kupon oluşturmak için önce eserini Ücretli modelde hazırlamalısın.
            </div>
          ) : (
            <form action={createAuthorCouponAction} className={styles.formGrid}>
              <label className={styles.field}>
                <span>Eser</span>
                <select name="workId" required>
                  <option value="">Ücretli eser seç</option>
                  {paidWorks.map((work) => (
                    <option key={work.id} value={work.id}>
                      {work.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Kupon kodu</span>
                <input
                  autoCapitalize="characters"
                  maxLength={32}
                  minLength={3}
                  name="code"
                  placeholder="YENIYAZAR20"
                  required
                  type="text"
                />
                <small className={styles.fieldHint}>
                  3–32 karakter · harf, rakam, - ve _ kullanabilirsin.
                </small>
              </label>

              <label className={styles.field}>
                <span>İndirim türü</span>
                <select name="discountType" required>
                  <option value="percent">Yüzde (%)</option>
                  <option value="fixed">Sabit tutar (TL)</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>İndirim değeri</span>
                <input
                  inputMode="decimal"
                  name="discountValue"
                  placeholder="20"
                  required
                  type="text"
                />
                <small className={styles.fieldHint}>
                  Yüzde seçtiysen örn. 20; sabit tutarda TL değeri gir.
                </small>
              </label>

              <label className={styles.field}>
                <span>Başlangıç tarihi</span>
                <input name="startsAt" type="date" />
              </label>

              <label className={styles.field}>
                <span>Bitiş tarihi</span>
                <input name="endsAt" type="date" />
              </label>

              <label className={styles.field}>
                <span>Toplam kullanım limiti</span>
                <input
                  inputMode="numeric"
                  min="1"
                  name="totalUsageLimit"
                  placeholder="Sınırsız"
                  type="number"
                />
              </label>

              <label className={styles.field}>
                <span>Kullanıcı başına</span>
                <input
                  defaultValue="1"
                  inputMode="numeric"
                  min="1"
                  name="perUserUsageLimit"
                  type="number"
                />
              </label>

              <div className={styles.formActions}>
                <button className={styles.action} type="submit">
                  Kupon oluştur
                </button>
              </div>
            </form>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Kupon geçmişi</span>
              <h2>Kuponlarım</h2>
            </div>
            <span className={styles.badge}>{coupons.length} kupon</span>
          </div>

          {coupons.length === 0 ? (
            <div className={styles.empty}>Henüz kupon oluşturmadın.</div>
          ) : (
            <div className={styles.couponList}>
              {coupons.map((coupon) => {
                const workTitle =
                  coupon.workScopes[0]?.work.title ?? "Eser seçilmedi";
                const isActive = coupon.status === "active";

                return (
                  <article
                    className={`${styles.couponCard} ${
                      isActive ? styles.couponCardActive : styles.couponCardPaused
                    }`}
                    key={coupon.id}
                  >
                    <div className={styles.couponCardMain}>
                      <div className={styles.couponCardHeading}>
                        <div>
                          <span className={styles.eyebrow}>{workTitle}</span>
                          <h3>{coupon.code}</h3>
                        </div>
                        <span
                          className={`${styles.couponStatus} ${
                            isActive
                              ? styles.couponStatusActive
                              : styles.couponStatusPaused
                          }`}
                        >
                          {isActive ? "Aktif" : "Pasif"}
                        </span>
                      </div>

                      <div className={styles.couponMetrics}>
                        <div>
                          <span>İndirim</span>
                          <strong>
                            {formatDiscount(
                              coupon.discountType,
                              coupon.discountValue,
                            )}
                          </strong>
                        </div>
                        <div>
                          <span>Kullanım</span>
                          <strong>
                            {coupon.usageCount}
                            {coupon.totalUsageLimit
                              ? "/" + coupon.totalUsageLimit
                              : ""}
                          </strong>
                        </div>
                        <div>
                          <span>Başlangıç</span>
                          <strong>{formatDate(coupon.startsAt)}</strong>
                        </div>
                        <div>
                          <span>Bitiş</span>
                          <strong>{formatDate(coupon.endsAt)}</strong>
                        </div>
                      </div>
                    </div>

                    <form
                      action={toggleAuthorCouponAction}
                      className={styles.couponCardAction}
                    >
                      <input name="couponId" type="hidden" value={coupon.id} />
                      <input
                        name="nextStatus"
                        type="hidden"
                        value={isActive ? "paused" : "active"}
                      />
                      <button
                        className={styles.secondaryAction}
                        type="submit"
                      >
                        {isActive ? "Pasife al" : "Aktif et"}
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
