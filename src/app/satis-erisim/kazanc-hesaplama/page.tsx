import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { getWriterCommissionPreviewContext } from "@/features/commerce/commission-rates-repository";
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
  const value = (text ?? "0").trim().replace(",", ".");
  if (!/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(value)) {
    return BigInt(0);
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

function formatRate(bps: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(bps / 100) + "%";
}

export default async function WriterEarningIllustrationPage({
  searchParams,
}: {
  searchParams: Promise<{ fiyat?: string; eser?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/satis-erisim/kazanc-hesaplama");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");

  const query = await searchParams;
  const preview = await getWriterCommissionPreviewContext(profile.id, query.eser);
  const price = preview.savedNetPrice ?? parseTryNetPrice(query.fiyat);
  const { commissionRateBps, serviceFeeRateBps } = preview.rate;
  const commissionLabel = formatRate(commissionRateBps);
  const sourceLabel = preview.rate.source === "work" ? "Esere özel"
    : preview.rate.source === "author" ? "Yazara özel" : "Genel";
  const invoiced = calculateIllustrativeSettlement(price, "invoice", commissionRateBps, serviceFeeRateBps);
  const receipt = calculateIllustrativeSettlement(price, "expense_receipt", commissionRateBps, serviceFeeRateBps);

  return (
    <AppShell profile={profile}>
      <div className={`${styles.page} ${styles.writerCommercePage} ${styles.writerEarningsPage}`}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Satış öncesi · Bilgilendirme</span>
            <h1>Yazar kazancı hesaplama örneği</h1>
            <p>Bir kitap satıldığında faturalı ve gider pusulasına uygun
              telif ödemesi arasında nasıl bir fark oluşabileceğini karşılaştır.</p>
          </div>
          <Link className={styles.secondaryAction} href="/satis-erisim">
            Satış &amp; Erişim&apos;e dön
          </Link>
        </header>

        {price === BigInt(0) ? (
          <div className={styles.notice} role="status" data-commerce-zero-screen="writer-earnings">
            Şu anda 0 TL ile kazanç hesaplama ekranı hazır: satış bedeli,
            komisyon ve koşullu aracılık örnekleri 0,00 TL görünür.
            Tutarı değiştirerek ilerideki fiyatlandırmayı önizleyebilirsin.
            Bu ekran sipariş, hakediş veya para transferi oluşturmaz.
          </div>
        ) : null}

        <div className={styles.notice} role="status">
          Bu sayfa yalnızca varsayımsal hesaplamadır. Belge tercihi, vergi
          mükellefiyeti ve gider pusulasına uygunluk henüz sistemde doğrulanmıyor.
          Burada gösterilen tutarlar gerçek hakediş, fatura veya ödeme emri değildir.
        </div>

        <section className={styles.panel}>
          <h2>1. Eser, komisyon ve örnek satış fiyatı</h2>
          {preview.invalidWorkSelection ? (
            <div className={styles.notice} role="alert">
              Seçilen eser bu yazar hesabına ait değil veya önizleme listesinde yok.
              Eser oranı uygulanmadı; yazara özel veya genel oran gösteriliyor.
            </div>
          ) : null}
          <form method="get" className={styles.saleOptions}>
            <label className={styles.priceField}>
              Eser (isteğe bağlı)
              <select name="eser" defaultValue={preview.selectedWork?.id ?? ""} aria-label="Komisyonu incelenecek eser">
                <option value="">Eser seçmeden yazar/genel oranıyla hesapla</option>
                {preview.works.map((work) => (
                  <option key={work.id} value={work.id}>{work.title}</option>
                ))}
              </select>
            </label>
            <label className={styles.priceField}>
              KDV hariç satış bedeli (TL)
              <input
                type="text"
                inputMode="decimal"
                name="fiyat"
                defaultValue={preview.savedNetPrice !== null
                  ? (Number(preview.savedNetPrice) / 100).toFixed(2).replace(".", ",")
                  : query.fiyat && /^(?:0|[1-9]\d{0,5})(?:[,.]\d{1,2})?$/.test(query.fiyat.trim())
                    ? query.fiyat : "0"}
                readOnly={preview.savedNetPrice !== null}
                aria-label="KDV hariç satış bedeli"
                required
              />
            </label>
            <button className={styles.action} type="submit">
              Hesaplamayı yenile
            </button>
          </form>
          <div className={styles.summaryGrid}>
            <div><span>Geçerli komisyon ({sourceLabel})</span><strong>{commissionLabel}</strong></div>
            <div><span>KDV hariç örnek fiyat</span><strong>{money(price)}</strong></div>
            <div><span>Satış KDV&apos;si (örnek %20)</span><strong>{money(invoiced.saleVat)}</strong></div>
            <div><span>Okurun toplam ödemesi</span><strong>{money(invoiced.readerTotal)}</strong></div>
          </div>
          <p className={styles.helper}>
            {preview.savedNetPrice !== null
              ? "Seçilen eserin KDV hariç olarak kaydedilmiş mevcut fiyatı kullanıldı. Bu güncel önizleme, geçmiş siparişin fiyatını veya komisyon oranını değiştirmez."
              : preview.legacyPriceSelection
                ? "Bu eserin kayıtlı fiyatı KDV hariç olarak doğrulanmış değil (veya TRY/pozitif fiyat değil). Bu nedenle kayıtlı fiyat kullanılmadı; yalnız elle girilen varsayımsal tutar hesaplandı."
                : "Henüz bir eser seçilmedi. Yazar/genel komisyon oranı ile elle girilen varsayımsal fiyat hesaplandı. Gerçek checkout tutarı ve sipariş kayıtları etkilenmez."}
          </p>
        </section>

        <div className={styles.grid}>
          {([
            { heading: "Faturalı yazar", detail: commissionLabel + " komisyon + komisyon KDV'si; ek aracılık yok", p: invoiced },
            { heading: "Gider pusulasına uygun yazar", detail: commissionLabel + " gelir paylaşımı + ayrıca " + formatRate(serviceFeeRateBps) + " aracılık hizmeti + KDV", p: receipt },
          ] as const).map(({ heading, detail, p }) => (
            <section className={styles.panel} key={p.mode}>
              <span className={styles.eyebrow}>2. Yazar hakedişi</span>
              <h2>{heading}</h2>
              <p className={styles.helper}>{detail}</p>
              <div className={styles.summaryGrid}>
                <div><span>Komisyon ({commissionLabel})</span><strong>{money(p.commissionNet)}</strong></div>
                <div><span>Komisyon KDV&apos;si</span><strong>{money(p.commissionVat)}</strong></div>
                <div><span>Ek aracılık ({formatRate(serviceFeeRateBps)}; yalnız uygun telifte)</span><strong>{money(p.platformServiceNet)}</strong></div>
                <div><span>Aracılık KDV&apos;si</span><strong>{money(p.platformServiceVat)}</strong></div>
                <div><span>Yazarın brüt telif/fatura matrahı</span><strong>{money(p.authorGross)}</strong></div>
                <div><span>Stopaj (uygun telifte %17)</span><strong>{money(p.withholding)}</strong></div>
                <div><span>Yazara tahmini banka ödemesi</span><strong>{money(p.authorBankPayment)}</strong></div>
              </div>
            </section>
          ))}
        </div>
        <div className={styles.notice}>
          Kesin ödeme yapılmadan önce mali müşavir tarafından yazarın belge
          statüsü, hizmetin vergisel niteliği, KDV indirimi ve stopaj koşulları doğrulanmalıdır.
          İlkOku bu ekrandan fatura veya mali belge düzenlemez.
          0 TL siparişlerde gerçek para tahsilatı veya telif ödemesi oluşturulmaz.
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.secondaryAction} href="/satis-erisim/odeme-vergi-bilgileri">Belge ve vergi açıklamaları</Link>
          <Link className={styles.secondaryAction} href="/gelirler">Gerçek kayıtları Gelirler&apos;de görüntüle</Link>
        </div>
      </div>
    </AppShell>
  );
}
