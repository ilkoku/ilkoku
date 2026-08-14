import { PublishedFaqList } from "@/components/content/PublishedFaqList";
import { requireCmsManager } from "@/lib/cms-access";

export default async function Page() {
  const access = await requireCmsManager("/icerik/sss");

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>İçerik</span><h1>SSS & Yardım</h1><p>Yardım Merkezi için soru ve cevap yayınlayın.</p></div>
      </div>
      <div className="content-panel">
        {access.canPublish ? (
          <form className="content-form" action="/api/content-faq" method="post">
            <input type="hidden" name="category" value="Genel" />
            <input type="hidden" name="audience" value="all" />
            <label><span>Soru</span><input name="question" required maxLength={300} /></label>
            <label><span>Cevap</span><textarea name="answer" required rows={8} maxLength={4000} /></label>
            <div className="content-form-actions"><button type="submit">Yayınla</button></div>
          </form>
        ) : (
          <div className="content-empty-state">
            <strong>Yayın yetkisi gerekli.</strong>
            <p>Yayınlama yetkisi olmayan içerik yöneticileri mevcut SSS kayıtlarını görüntüleyebilir; yeni içeriği doğrudan yayınlayamaz.</p>
          </div>
        )}
      </div>
      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <PublishedFaqList />
      </div>
    </section>
  );
}
