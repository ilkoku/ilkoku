import { CmsHistoryList } from "@/components/content/CmsHistoryList";

export default function Page() {
  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Sistem</span>
          <h1>Değişiklik Geçmişi</h1>
          <p>CMS sayfalarında oluşan sürüm kayıtlarını görüntüleyin.</p>
        </div>
      </div>
      <div className="content-panel">
        <CmsHistoryList />
      </div>
    </section>
  );
}
