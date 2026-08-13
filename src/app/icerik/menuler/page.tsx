import {
  publishFooterNavigationAction,
  saveFooterNavigationAction,
} from "@/features/cms/navigation-actions";

export default function Page() {
  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Site</span>
          <h1>Menüler & Footer</h1>
          <p>Footer başlıklarını, link metinlerini ve hedeflerini yönetin.</p>
        </div>
      </div>

      <div className="content-panel">
        <form action={saveFooterNavigationAction} className="content-form">
          <div className="content-section-heading"><div><span>01</span><h2>Platform</h2></div></div>
          <label><span>Sütun başlığı</span><input name="platformTitle" defaultValue="Platform" /></label>
          <div className="content-form-grid">
            <label><span>1. link metni</span><input name="platform1Label" defaultValue="Hakkımızda" /></label>
            <label><span>1. link hedefi</span><input name="platform1Href" defaultValue="#hakkimizda" /></label>
            <label><span>2. link metni</span><input name="platform2Label" defaultValue="Eser Pasaportu" /></label>
            <label><span>2. link hedefi</span><input name="platform2Href" defaultValue="#eser-pasaportu" /></label>
            <label><span>3. link metni</span><input name="platform3Label" defaultValue="Neden İlkOku?" /></label>
            <label><span>3. link hedefi</span><input name="platform3Href" defaultValue="#neden-ilkoku" /></label>
          </div>

          <div className="content-section-heading"><div><span>02</span><h2>Destek</h2></div></div>
          <label><span>Sütun başlığı</span><input name="supportTitle" defaultValue="Destek" /></label>
          <div className="content-form-grid">
            <label><span>Link metni</span><input name="supportLabel" defaultValue="Yardım Merkezi" /></label>
            <label><span>Link hedefi</span><input name="supportHref" placeholder="Destek bağlantısı" /></label>
          </div>

          <div className="content-section-heading"><div><span>03</span><h2>Yasal bağlantılar</h2></div></div>
          <label><span>Sütun başlığı</span><input name="legalTitle" defaultValue="Yasal" /></label>
          <div className="content-form-grid">
            <label><span>Kullanım Şartları</span><input name="termsLabel" defaultValue="Kullanım Şartları" /></label>
            <label><span>Hedef</span><input name="termsHref" placeholder="Sayfa yolu" /></label>
            <label><span>Gizlilik</span><input name="privacyLabel" defaultValue="Gizlilik Politikası" /></label>
            <label><span>Hedef</span><input name="privacyHref" placeholder="Sayfa yolu" /></label>
            <label><span>KVKK</span><input name="kvkkLabel" defaultValue="KVKK" /></label>
            <label><span>Hedef</span><input name="kvkkHref" placeholder="Sayfa yolu" /></label>
            <label><span>Çerez</span><input name="cookieLabel" defaultValue="Çerez Politikası" /></label>
            <label><span>Hedef</span><input name="cookieHref" placeholder="Sayfa yolu" /></label>
            <label><span>Telif</span><input name="copyrightLabel" defaultValue="Telif Hakkı Politikası" /></label>
            <label><span>Hedef</span><input name="copyrightHref" placeholder="Sayfa yolu" /></label>
          </div>

          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>

        <div className="content-publish-box">
          <div><strong>Yayınlama</strong><p>Kaydedilmiş footer menü taslağını yayınlanmış duruma getirir.</p></div>
          <form action={publishFooterNavigationAction}><button type="submit">Yayınla</button></form>
        </div>
      </div>
    </section>
  );
}
