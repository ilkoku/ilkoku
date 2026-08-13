import {
  publishHomepageHeroAction,
  saveHomepageHeroAction,
} from "@/features/cms/actions";

export default function Page() {
  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Ana Sayfa</span>
          <h1>Hero içeriği</h1>
          <p>İlkOku ana sayfasının ilk görünen başlık ve açıklama alanını yönetin.</p>
        </div>
      </div>

      <div className="content-panel">
        <form action={saveHomepageHeroAction} className="content-form">
          <label>
            <span>Ana başlık</span>
            <input
              name="title"
              type="text"
              required
              maxLength={220}
              placeholder="İlk cümle, ilk okurun, ilk adımın."
            />
          </label>

          <label>
            <span>Açıklama</span>
            <textarea
              name="description"
              required
              maxLength={1000}
              rows={5}
              placeholder="Yazarları, okuyucuları, editörleri ve yayınevlerini aynı platformda buluşturan dijital edebiyat ekosistemi."
            />
          </label>

          <div className="content-form-actions">
            <button type="submit">Taslak Kaydet</button>
          </div>
        </form>

        <div className="content-publish-box">
          <div>
            <strong>Yayınlama</strong>
            <p>Kaydedilmiş hero taslağını ana sayfa için yayınlanmış duruma getirir.</p>
          </div>
          <form action={publishHomepageHeroAction}>
            <button type="submit">Yayınla</button>
          </form>
        </div>
      </div>
    </section>
  );
}
