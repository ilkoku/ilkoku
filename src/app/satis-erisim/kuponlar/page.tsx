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

  const flash = query.durum ? messages[query.durum] ?? query.durum : null;

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Satış & Erişim</span>
            <h1>Kuponlar</h1>
            <p>
              Kendi eserlerin için indirim kuponu oluştur ve kullanım durumunu
              yönet.
            </p>
          </div>
          <Link className={styles.secondaryAction} href="/satis-erisim">
            Satış & Erişim&apos;e dön
          </Link>
        </header>

        {flash ? <div className={styles.flash}>{flash}</div> : null}

        {!checkoutEnabled ? (
          <div className={styles.notice}>
            Kupon altyapısı hazır. Gerçek tahsilat kapalı olduğu için kuponlar
            şu anda sipariş üretmez; ödeme sistemi açıldığında aynı kayıtlar
            kullanılacak.
          </div>
        ) : null}

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Yeni kupon</span>
              <h2>Yazar kuponu oluştur</h2>
              <p>
                Yazar kuponundaki indirim yazar tarafından finanse edilir ve
                hakediş indirimli satış tutarı üzerinden hesaplanır.
              </p>
            </div>
            <span className={styles.badge}>Yazar finansmanlı</span>
          </div>

          {works.length === 0 ? (
            <div className={styles.empty}>
              Kupon oluşturmak için önce bir eserin olmalı.
            </div>
          ) : (
            <form action={createAuthorCouponAction} className={styles.formGrid}>
              <label className={styles.field}>
                <span>Eser</span>
                <select name="workId" required>
                  <option value="">Eser seç</option>
                  {works.map((work) => (
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
                  <article className={styles.couponCard} key={coupon.id}>
                    <div>
                      <span className={styles.eyebrow}>{workTitle}</span>
                      <h3>{coupon.code}</h3>
                      <p>
                        {formatDiscount(
                          coupon.discountType,
                          coupon.discountValue,
                        )}{" "}
                        indirim · {coupon.usageCount}
                        {coupon.totalUsageLimit
                          ? "/" + coupon.totalUsageLimit
                          : ""}{" "}
                        kullanım
                      </p>
                      <small>
                        {formatDate(coupon.startsAt)} — {formatDate(coupon.endsAt)}
                      </small>
                    </div>

                    <form action={toggleAuthorCouponAction}>
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
