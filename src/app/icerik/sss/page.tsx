export default function Page() {
  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>İçerik</span><h1>SSS & Yardım</h1><p>Yardım Merkezi için soru ve cevap yayınlayın.</p></div>
      </div>
      <div className="content-panel">
        <form className="content-form" action="/api/content-faq" method="post">
          <input type="hidden" name="category" value="Genel" />
          <input type="hidden" name="audience" value="all" />
          <label><span>Soru</span><input name="question" required maxLength={300} /></label>
          <label><span>Cevap</span><textarea name="answer" required rows={8} maxLength={4000} /></label>
          <div className="content-form-actions"><button type="submit">Yayınla</button></div>
        </form>
      </div>
    </section>
  );
}
