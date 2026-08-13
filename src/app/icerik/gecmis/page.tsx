export default function Page() {
  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Sistem</span>
          <h1>Değişiklik Geçmişi</h1>
          <p>CMS sürüm hareketleri burada görüntülenecek.</p>
        </div>
      </div>
      <div className="content-panel">
        <div className="content-empty">
          <strong>Sürüm geçmişi hazırlanıyor.</strong>
          <p>Mevcut ContentRevision kayıtları bu ekrana bağlanacak.</p>
        </div>
      </div>
    </section>
  );
}
