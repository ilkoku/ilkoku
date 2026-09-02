import type { Metadata } from "next";

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
        <div className="history-card-preview__stage">
          <HistoryNowCardV3 />
        </div>
      </div>

      <p className="history-card-preview__note">
        Bu sayfadaki değişiklikler ana sayfadaki kartı etkilemez. Onaylanan tasarım daha sonra tek bir kontrollü değişiklik olarak ana sayfaya taşınacaktır.
      </p>
    </main>
  );
}
