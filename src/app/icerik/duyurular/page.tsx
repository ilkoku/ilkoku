import { createAnnouncementAction } from "@/features/cms/announcement-actions";

export default function Page() {
  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>İçerik</span><h1>Duyurular</h1><p>Platform duyurularını taslak olarak hazırlayın.</p></div>
      </div>
      <div className="content-panel">
        <form action={createAnnouncementAction} className="content-form">
          <label><span>Başlık</span><input name="title" required maxLength={220} /></label>
          <label><span>Mesaj</span><textarea name="body" required rows={5} maxLength={2000} /></label>
          <div className="content-form-grid">
            <label><span>Tür</span><select name="type" defaultValue="info"><option value="info">Bilgi</option><option value="warning">Uyarı</option><option value="feature">Yeni özellik</option><option value="maintenance">Bakım</option></select></label>
            <label><span>Hedef</span><select name="audience" defaultValue="all"><option value="all">Herkes</option><option value="writer">Yazar</option><option value="reader">Okuyucu</option><option value="editor">Editör</option><option value="publisher">Yayınevi</option></select></label>
          </div>
          <div className="content-form-actions"><button type="submit">Taslak Oluştur</button></div>
        </form>
      </div>
    </section>
  );
}
