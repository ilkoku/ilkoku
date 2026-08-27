import type { Metadata } from "next";

const title = "İletişim | İlkOku";
const description = "İlkOku hakkında genel sorularınız, talepleriniz ve platform iletişimi için bize ulaşın.";
const socialImage = "/opengraph-image";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/iletisim" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/iletisim",
    title,
    description,
    images: [{ url: socialImage, alt: "İlkOku İletişim" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const params = await searchParams;
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1>İletişim</h1>
      <p>İlkOku hakkında genel sorularınız ve talepleriniz için bize yazabilirsiniz.</p>
      {params.durum === "alindi" ? <p role="status">Talebiniz alındı. Teşekkür ederiz.</p> : null}
      {params.durum === "eksik" ? <p role="alert">Lütfen zorunlu alanları kontrol edin.</p> : null}
      {params.durum === "hata" ? <p role="alert">Talebiniz kaydedilemedi. Lütfen tekrar deneyin.</p> : null}
      <form action="/api/site-contact" method="post" style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
        <label>Ad Soyad<input name="name" required maxLength={140} style={{ display: "block", width: "100%" }} /></label>
        <label>E-posta<input name="email" type="email" required maxLength={220} style={{ display: "block", width: "100%" }} /></label>
        <label>Konu<input name="subject" maxLength={180} style={{ display: "block", width: "100%" }} /></label>
        <label>Mesaj<textarea name="message" required rows={8} maxLength={4000} style={{ display: "block", width: "100%" }} /></label>
        <button type="submit">Gönder</button>
      </form>
    </main>
  );
}
