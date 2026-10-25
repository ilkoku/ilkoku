import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import {
  calculateIllustrativeSettlement,
} from "@/features/commerce/settlement-preview";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Satış Kazancı Önizlemesi | İlkOku",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function parseTryNetPrice(text: string | undefined): bigint {
  const value = (text ?? "100").trim().replace(",", ".");
  if (!/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(value)) {
    return BigInt(10000);
  }
  const [whole, decimals = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) +
    BigInt((decimals + "00").slice(0, 2));
}

function money(value: bigint) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value) / 100);
}

export default async function WriterEarningIllustrationPage({
  searchParams,
}: {
  searchParams: Promise<{ fiyat?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/satis-erisim/kazanc-hesaplama");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");

  const query = await searchParams;
  const price = parseTryNetPrice(query.fiyat);
  const invoiced = calculateIllustrativeSettlement(price, "invoice");
  const receipt = calculateIllustrativeSettlement(price, "expense_receipt");

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Satış öncesi · Bilgilendirme</span>
            <h1>Yazar kazancı hesaplama örneği</h1>
            <p>Bir kitap satıldığında faturalı ve gider pusulasına uygun
              telif ödemesi arasında nasıl bir fark oluşabileceğini karşılaştır.</p>
          </div>
          <Link className={styles.secondaryAction} href="/satis-erisim">
            Satış & Erişim'e dön
          </Link>
        </header>

        <div className={styles.notice} role="status">
          Bu sayfa yalnızca varsayımsal hesaplamadır. Belge tercihi, vergi
          mükellefiyeti ve gider pusulasına uygunluk henüz sistemde doğrulanmıyor.
          Burada gösterilen tutarlar gerçek hakediş, fatura veya ödeme emri değildir.
        </div>

        <section className={styles.panel}>
          <h2>1. Kitabın satış fiyatı</h2>
          <form method="get" className={styles.saleOptions}>
            <label className={styles.priceField}>
              KDV hariç satış bedeli (TL)
              <input
                type="text"
                inputMode="decimal"
                name="fiyat"
                defaultValue={query.fiyat && /^(?:0|[1-9]\d{0,5})(?:[,.]\d{1,2})?$/.test(query.fiyat.trim())
                  ? query.fiyat : "100"}
                aria-label="KDV hariç satış bedeli"
                required
              />
            </label>
            <button className={styles.action} type="submit">
              Hesaplamayı yenile
            </button>
          </form>
          <div className={styles.summaryGrid}>
            <div><span>KDV hariç fiyat</span><strong>{money(price)}</strong></div>
            <div><span>Satış KDV'si (örnek %20)</span><strong>{money(invoiced.saleVat)}</strong></div>
            <div><span>Okurun toplam ödemesi</span><strong>{money(invoiced.readerTotal)}</strong></div>
          </div>
          <p className={styles.helper}>
            Mevcut eserin satış fiyatı kaydına bağlanmamıştır. Satış sayfasındaki
            kayıtlı fiyatın KDV hariç/dâhil anlamı henüz teknik olarak ayrıştırılmadığından
            bu örnek, gerçek checkout tutarını değiştirmez.
          </p>
        </section>

        <div className={styles.grid}>
          {([
            { heading: "Faturalı yazar", detail: "%15 komisyon + komisyon KDV'si; ek aracılık yok", p: invoiced },
            { heading: "Gider pusulasına uygun yazar", detail: "%15 gelir paylaşımı + ayrıca %5 aracılık hizmeti + KDV", p: receipt },
          ] as const).map(({ heading, detail, p }) => (
            <section className={styles.panel} key={p.mode}>
              <span className={styles.eyebrow}>2. Yazar hakedişi</span>
              <h2>{heading}</h2>
              <p className={styles.helper}>{detail}</p>
              <div className={styles.summaryGrid}>
                <div><span>Komisyon %15</span><strong>{money(p.commissionNet)}</strong></div>
                <div><span>Komisyon KDV'si</span><strong>{money(p.commissionVat)}</strong></div>
                <div><span>Ek aracılık %5</span><strong>{money(p.platformServiceNet)}</strong></div>
                <div><span>Aracılık KDV'si</span><strong>{money(p.platformServiceVat)}</strong></div>
                <div><span>Yazarın brüt telif/fatura matrahı</span><strong>{money(p.authorGross)}</strong></div>
                <div><span>Stopaj (uygun telifte %17)</span><strong>{money(p.withholding)}</strong></div>
                <div><span>Yazara tahmini banka ödemesi</span><strong>{money(p.authorBankPayment)}</strong></div>
              </div>
              <h3>3. Vergiler ve İlkOku kârı</h3>
              <div className={styles.summaryGrid}>
                <div><span>1 No.lu KDV</span><strong>{money(p.vat1Payment)}</strong></div>
                <div><span>2 No.lu KDV</span><strong>{money(p.vat2Payment)}</strong></div>
                <div><span>Stopaj</span><strong>{money(p.withholding)}</strong></div>
                <div><span>Vergi öncesi İlkOku payı</span><strong>{money(p.profitBeforeCorporateTax)}</strong></div>
                <div><span>Kurumlar vergisi karşılığı (%25 örnek)</span><strong>{money(p.corporateTaxIllustration)}</strong></div>
                <div><span>Diğer giderler öncesi örnek net kâr</span><strong>{money(p.profitAfterTax)}</strong></div>
              </div>
              <p className={styles.helper}>
                Kurumlar vergisi tek satış üzerinden beyan edilmez. Banka, ödeme,
                personel ve diğer giderler hesaba dahil edilmedi.
              </p>
            </section>
          ))}
        </div>
        <div className={styles.notice}>
          Kesin ödeme yapılmadan önce mali müşavir tarafından yazarın belge
          statüsü, hizmet faturaları, KDV indirimi ve stopaj koşulları doğrulanmalıdır.
          0 TL siparişlerde gerçek para tahsilatı veya telif ödemesi oluşturulmaz.
        </div>
        <Link className={styles.secondaryAction} href="/gelirler">Gerçek kayıtları Gelirler'de görüntüle</Link>
      </div>
    </AppShell>
  );
}
