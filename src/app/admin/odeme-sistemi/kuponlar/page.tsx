import Link from "next/link";

import {
  createPlatformCouponAction,
  togglePlatformCouponAction,
} from "@/features/commerce/admin-actions";
import {
  listPlatformCouponPaidWorks,
  listPlatformCoupons,
  listPlatformCouponWriters,
} from "@/features/commerce/repository";
import styles from "@/features/commerce/commerce.module.css";

const messages: Record<string, string> = {
  "eksik-bilgi": "Kampanya için gerekli alanları tamamlayın.",
  "gecersiz-kod": "Kupon kodu geçerli değil.",
  "gecersiz-indirim": "İndirim değeri geçerli değil.",
  "gecersiz-tarih": "Bitiş tarihi başlangıç tarihinden önce olamaz.",
  "kapsam-gerekli": "Seçilen kapsam için en az bir eser veya yazar seçin.",
  "gecersiz-kapsam": "Kampanya kapsamında geçersiz kayıt bulundu.",
  "kupon-kodu-kullaniliyor": "Bu kupon kodu zaten kullanılıyor.",
  "kupon-olusturuldu": "İlkOku kampanya kuponu oluşturuldu.",
  "kupon-guncellendi": "Kupon durumu güncellendi.",
  "kupon-bulunamadi": "Kupon bulunamadı.",
};

function formatDiscount(type: "percent" | "fixed", value: bigint) {
  if (type === "percent") return "%" + value.toString();
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value) / 100);
}

function scopeLabel(scope: "all_paid_works" | "selected_works" | "selected_authors") {
  if (scope === "all_paid_works") return "Tüm ücretli eserler";
  if (scope === "selected_works") return "Seçili eserler";
  return "Seçili yazarlar";
}

export default async function PlatformCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const query = await searchParams;
  const [coupons, paidWorks, writers] = await Promise.all([
    listPlatformCoupons(),
    listPlatformCouponPaidWorks(),
    listPlatformCouponWriters(),
  ]);

  const flash = query.durum ? messages[query.durum] ?? query.durum : null;

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Ödeme Sistemi</span>
          <h1>Kuponlar & Kampanyalar</h1>
          <p>
            İlkOku tarafından finanse edilen kampanyaları yönetin. Platform
            kuponları yazarın normal hakediş matrahını azaltmaz.
          </p>
        </div>
        <Link
          className="admin-button"
          href="/sistem-yonetimi/odeme-sistemi"
        >
          Ödeme Sistemine dön
        </Link>
      </header>

      {flash ? <div className={styles.flash}>{flash}</div> : null}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Yeni kampanya</span>
            <h2>İlkOku kuponu oluştur</h2>
            <p>
              İndirim İlkOku tarafından karşılanır; yazar hakedişi eserin
              kuponsuz/orijinal fiyatı üzerinden korunur.
            </p>
          </div>
          <span className={styles.badge}>Platform finansmanlı</span>
        </div>

        <form action={createPlatformCouponAction} className={styles.formGrid}>
          <label className={styles.field}>
            <span>Kupon kodu</span>
            <input
              autoCapitalize="characters"
              maxLength={32}
              minLength={3}
              name="code"
              placeholder="ILKOKU20"
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
            <span>Kapsam</span>
            <select name="scope" required>
              <option value="all_paid_works">Tüm ücretli eserler</option>
              <option value="selected_works">Seçili eserler</option>
              <option value="selected_authors">Seçili yazarlar</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Seçili eserler</span>
            <select multiple name="workIds" size={6}>
              {paidWorks.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.title} — {work.author.displayName ?? work.author.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Seçili yazarlar</span>
            <select multiple name="authorIds" size={6}>
              {writers.map((writer) => (
                <option key={writer.id} value={writer.id}>
                  {writer.displayName ?? writer.fullName}
                </option>
              ))}
            </select>
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
            <input min="1" name="totalUsageLimit" type="number" />
          </label>

          <label className={styles.field}>
            <span>Kullanıcı başına</span>
            <input defaultValue="1" min="1" name="perUserUsageLimit" type="number" />
          </label>

          <div className={styles.formActions}>
            <button className={styles.action} type="submit">
              Kampanyayı oluştur
            </button>
          </div>
        </form>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Platform kampanyaları</span>
            <h2>İlkOku kuponları</h2>
          </div>
          <span className={styles.badge}>{coupons.length} kupon</span>
        </div>

        {coupons.length === 0 ? (
          <div className={styles.empty}>Henüz İlkOku kuponu oluşturulmadı.</div>
        ) : (
          <div className={styles.couponList}>
            {coupons.map((coupon) => {
              const isActive = coupon.status === "active";
              const details =
                coupon.scope === "selected_works"
                  ? coupon.workScopes.map((item) => item.work.title).join(", ")
                  : coupon.scope === "selected_authors"
                    ? coupon.authorScopes
                        .map(
                          (item) =>
                            item.author.displayName ?? item.author.fullName,
                        )
                        .join(", ")
                    : "Tüm ücretli eserler";

              return (
                <article className={styles.couponCard} key={coupon.id}>
                  <div>
                    <span className={styles.eyebrow}>
                      {scopeLabel(coupon.scope)}
                    </span>
                    <h3>{coupon.code}</h3>
                    <p>
                      {formatDiscount(coupon.discountType, coupon.discountValue)}
                      {" "}indirim · {coupon.usageCount}
                      {coupon.totalUsageLimit
                        ? "/" + coupon.totalUsageLimit
                        : ""}{" "}
                      kullanım
                    </p>
                    <small>{details || "Kapsam seçilmedi"}</small>
                  </div>

                  <form action={togglePlatformCouponAction}>
                    <input name="couponId" type="hidden" value={coupon.id} />
                    <input
                      name="nextStatus"
                      type="hidden"
                      value={isActive ? "paused" : "active"}
                    />
                    <button className={styles.secondaryAction} type="submit">
                      {isActive ? "Pasife al" : "Aktif et"}
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
