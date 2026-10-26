import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { prisma } from "@/lib/prisma";
import styles from "@/features/commerce/commerce.module.css";
import { WriterBillingForm } from "./WriterBillingForm";

export const metadata: Metadata = {
  title: "Fatura ve Vergi Bilgilerim | İlkOku",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function WriterTaxPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=%2Fsatis-erisim%2Fodeme-vergi-bilgileri");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");

  const query = await searchParams;
  const declared = await prisma.authorBillingProfile.findUnique({
    where: { authorId: profile.id },
    select: {
      invoiceStatus: true,
      billingName: true,
      taxIdentifier: true,
      taxOffice: true,
      billingAddress: true,
      updatedAt: true,
    },
  });
  const notice =
    query.durum === "kaydedildi"
      ? "Fatura durumun ve bilgilerin kaydedildi."
      : query.durum === "durum-sec"
        ? "Faturalı veya faturasız durumunu seç."
        : query.durum === "fatura-bilgisi-eksik"
          ? "Faturalı seçeneği için unvan, geçerli vergi/kimlik numarası, vergi dairesi ve adres bilgilerini tamamla."
          : null;
  return (
    <AppShell profile={profile}>
      <div className={`${styles.page} ${styles.writerCommercePage}`}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Yazar · Ödeme öncesi bilgiler</span>
            <h1>Fatura ve Vergi Bilgilerim</h1>
            <p>Faturalı mı faturasız mı çalıştığını seç ve varsa fatura bilgilerini kaydet.</p>
          </div>
          <Link className={styles.secondaryAction} href="/satis-erisim">
            Satış &amp; Erişim&apos;e dön
          </Link>
        </header>
        {notice ? <div className={styles.flash} role="status">{notice}</div> : null}
        {declared ? (
          <div className={styles.notice} role="status">
            Son kayıt: {new Intl.DateTimeFormat("tr-TR", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Europe/Istanbul",
            }).format(declared.updatedAt)}.
            {" "}Beyan edilen durum: <strong>{declared.invoiceStatus === "invoicing" ? "Faturalı" : "Faturasız"}</strong>.
          </div>
        ) : null}
        <section className={styles.panel} aria-label="Yazarın fatura beyanı">
          <WriterBillingForm initial={{
            invoiceStatus: declared?.invoiceStatus ?? null,
            billingName: declared?.billingName ?? "",
            taxIdentifier: declared?.taxIdentifier ?? "",
            taxOffice: declared?.taxOffice ?? "",
            billingAddress: declared?.billingAddress ?? "",
          }} />
        </section>
      </div>
    </AppShell>
  );
}
