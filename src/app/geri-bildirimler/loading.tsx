import { feedbackContent } from "@/content";

export default function FeedbackLoading() {
  return (
    <section
      className="editor-workspace"
      aria-busy="true"
      aria-live="polite"
    >
      <header className="editor-page-header">
        <p>Yazar alanı</p>
        <h1>Geri Bildirimler</h1>
        <span>Editör geri bildirimleri hazırlanıyor.</span>
      </header>

      <div className="editor-empty">
        <p role="status">{feedbackContent.labels.loading}</p>
      </div>
    </section>
  );
}
