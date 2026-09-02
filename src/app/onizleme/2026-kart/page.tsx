import type { Metadata } from "next";

import { History2026PreviewCard } from "@/features/landing/history-2026-preview-card";
import "./preview.css";

export const metadata: Metadata = {
  title: "2026 Kart Önizleme | İlkOku",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function History2026PreviewPage() {
  return (
    <main className="history-2026-preview-page">
      <header className="history-2026-preview-page__header">
        <p>GEÇİCİ · NOINDEX · ANA SAYFADAN BAĞIMSIZ</p>
        <h1>2026 “Şimdi sıra sende” çalışma alanı</h1>
        <span>Bu sahne eski History master görselini, wipe maskelerini veya V2/V3 katmanlarını kullanmaz.</span>
      </header>

      <section className="history-2026-preview-page__canvas" aria-label="2026 kart tasarım önizlemesi">
        <History2026PreviewCard />
      </section>
    </main>
  );
}
