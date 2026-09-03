import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ana Sayfa Yeniden Tasarım Çalışması | İlkOku",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function HomepageRedesignWorkspacePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "#f7f5fb",
        color: "#241f38",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <section
        style={{
          width: "min(760px, 100%)",
          padding: "clamp(2rem, 6vw, 4rem)",
          border: "1px solid rgba(83, 59, 150, 0.14)",
          borderRadius: "24px",
          background: "#fff",
          boxShadow: "0 24px 70px rgba(45, 31, 103, 0.08)",
        }}
      >
        <p style={{ margin: "0 0 .75rem", color: "#6847e8", fontSize: ".78rem", fontWeight: 800, letterSpacing: ".14em" }}>
          İLKOKU · YENİ ANA SAYFA
        </p>
        <h1 style={{ margin: "0 0 1rem", fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.06 }}>
          Yeniden tasarım çalışma alanı
        </h1>
        <p style={{ margin: 0, maxWidth: "58ch", color: "#655f75", fontSize: "1rem", lineHeight: 1.75 }}>
          Teknik harita ve içerik mimarisi doğrulanıyor. Görsel tasarım henüz başlamadı. Bu çalışma alanı public ana sayfadan tamamen bağımsızdır.
        </p>
        <div style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(83, 59, 150, 0.12)", color: "#494359", fontSize: ".9rem" }}>
          Durum: <strong>Rapor / mimari aşaması</strong>
        </div>
      </section>
    </main>
  );
}
