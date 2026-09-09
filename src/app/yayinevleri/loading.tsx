export default function LoadingPublishers() {
  return (
    <section
      className="editor-workspace"
      aria-busy="true"
      aria-live="polite"
    >
      <header className="editor-page-header">
        <p>Yazar alanı</p>
        <h1>Yayınevleri</h1>
        <span>Yayınevi ve başvuru bilgileri hazırlanıyor.</span>
      </header>

      <div className="editor-empty">
        <p role="status">Yayınevleri yükleniyor…</p>
      </div>
    </section>
  );
}
