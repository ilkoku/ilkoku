import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import styles from "@/features/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Ödeme ve Vergi Bilgileri | İlkOku",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function WriterTaxPaymentPreparationPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/satis-erisim/odeme-vergi-bilgileri");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Yazar · Satış öncesi · Vergi hazırlığı</span>
            <h1>Ödeme ve vergi bilgileri</h1>
            <p>Yazar telif ödemelerinde belge türü, kimlik ve vergi statüsü
              kontrol edildikten sonra net hakediş belirlenir.</p>
          </div>
          <Link className={styles.secondaryAction} href="/satis-erisim">
            Satış &amp; Erişim&apos;e dön
          </Link>
        </header>
        <div className={styles.notice} role="status">
          Bu bölüm bilgilendirme ve ön hazırlıktır. Belge türü seçimi, kimlik,
          vergi numarası veya IBAN kaydı bu sürümde alınmıyor. Vergi
          doğrulama sistemi ve güvenli saklama altyapısı tamamlanana kadar
          gerçek ödeme talebi oluşturulamaz. Bu ekran fatura veya mali belge düzenlemez.
        </div>
        <div className={styles.grid}>
          <section className={styles.panel}>
            <span className={styles.eyebrow}>Belge türü · 1</span>
            <h2>Fatura / e-serbest meslek makbuzu</h2>
            <p>Vergi mükellefiyetine uygun belge düzenleyen yazar için
              gelir ve KDV işlemleri belgenin niteliğine göre yapılır.</p>
            <div className={styles.summaryGrid}>
              <div><span>İlkOku komisyonu</span><strong>Genel %15 veya özel oran + komisyon KDV&apos;si</strong></div>
              <div><span>Ek aracılık hizmet bedeli</span><strong>Yok</strong></div>
              <div><span>Yazar belgesi</span><strong>Fatura veya uygun makbuz</strong></div>
              <div><span>Stopaj</span><strong>Belge ve statüye göre</strong></div>
            </div>
            <p className={styles.helper}>
              Fatura düzenleyebilmek ve serbest meslek makbuzu düzenleyebilmek
              aynı hukukî statü değildir. Vergi numarası, faaliyet türü ve
              belge uygunluğu doğrulanacaktır.
            </p>
          </section>
          <section className={styles.panel}>
            <span className={styles.eyebrow}>Belge türü · 2</span>
            <h2>Gider pusulasına uygun telif</h2>
            <p>Gider pusulasıyla ödeme talep eden kişinin ilgili mevzuata
              göre uygunluğu muhasebe tarafından değerlendirilecektir.</p>
            <div className={styles.summaryGrid}>
              <div><span>İlkOku komisyon payı</span><strong>Genel %15 veya özel oran</strong></div>
              <div><span>Ayrı aracılık hizmet bedeli</span><strong>%5 + KDV</strong></div>
              <div><span>Stopaj örneği</span><strong>GVK 18 uygunsa %17</strong></div>
              <div><span>Telif alış KDV&apos;si</span><strong>2 No.lu KDV koşullarına göre</strong></div>
            </div>
            <p className={styles.helper}>
              Gider pusulası yalnızca yazarın isteğiyle seçilemez. Kimlik,
              eser sahipliği ve vergi statüsü incelenmelidir.
            </p>
          </section>
        </div>
        <section className={styles.panel}>
          <h2>Ödeme öncesi kontrol sırası</h2>
          <div className={styles.summaryGrid}>
            <div><span>1. Belge</span><strong>Vergi statüsü doğrulanır</strong></div>
            <div><span>2. Satış</span><strong>Sipariş ve kupon kesinleşir</strong></div>
            <div><span>3. Vergiler</span><strong>KDV ve stopaj ayrıştırılır</strong></div>
            <div><span>4. Hakediş</span><strong>Net banka ödeme tutarı onaylanır</strong></div>
          </div>
          <Link className={styles.action} href="/satis-erisim/kazanc-hesaplama">
            Örnek kazancımı hesapla
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
