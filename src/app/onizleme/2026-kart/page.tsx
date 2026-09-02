import type { Metadata } from "next";
import Image from "next/image";

import "@/app/landing-history.css";
import { HistoryNowCardV3 } from "@/features/landing/history-now-card-v3";
import "./preview.css";

export const metadata: Metadata = {
  title: "2026 Kart Tasarım Önizleme | İlkOku",
  description: "İlkOku 2026 tarih kartı için geçici, indekslenmeyen tasarım çalışma alanı.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function HistoryCardPreviewPage() {
  return (
    <main className="history-card-preview">
      <header className="history-card-preview__header">
        <div>
          <p>GEÇİCİ CANLI ÖNİZLEME</p>
          <h1>2026 kartı çalışma alanı</h1>
        </div>
        <span>Ana sayfadan bağımsız · noindex</span>
      </header>

      <div className="history-card-preview__canvas">
        <figure className="landing-history__stage history-card-preview__stage">
          <Image
            className="landing-history__base"
            src="/landing/history/history-journey-master.png"
            alt="2026 kart tasarım önizleme sahnesi"
            width={1672}
            height={941}
            sizes="(max-width: 1672px) 100vw, 1672px"
            priority
            unoptimized
          />

          <div className="landing-history__now-wipe landing-history__now-wipe--intro" aria-hidden="true" />
          <div className="landing-history__now-wipe landing-history__now-wipe--journey" aria-hidden="true" />
          <div className="landing-history__now-wipe landing-history__now-wipe--closing" aria-hidden="true" />

          <HistoryNowCardV3 />
        </figure>
      </div>

      <p className="history-card-preview__note">
        Bu sayfadaki değişiklikler ana sayfadaki kartı etkilemez. Onaylanan tasarım daha sonra tek bir kontrollü değişiklik olarak ana sayfaya taşınacaktır.
      </p>
    </main>
  );
}
