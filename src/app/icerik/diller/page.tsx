import { cmsLocales, defaultCmsLocale } from "@/lib/cms-locales";

export default function Page() {
  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Büyüme</span><h1>Dil Altyapısı</h1><p>İlkOku içeriklerinin dil sözleşmesini yönetin.</p></div>
      </div>
      <div className="content-panel">
        <h2>Aktif Dil</h2>
        <p>Varsayılan dil: <strong>{defaultCmsLocale.toUpperCase()}</strong></p>
        <div className="content-list">
          {cmsLocales.map((locale) => (
            <div className="content-list-row" key={locale.code}>
              <strong>{locale.label}</strong>
              <span>{locale.code}</span>
              <small>{locale.isDefault ? "Varsayılan" : "Hazır bekliyor"}</small>
              <span>{locale.enabled ? "Aktif" : "Kapalı"}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <h2>Mimari Not</h2>
        <p>Bugün yalnız Türkçe yayınlanır. Yeni diller, mevcut içerik kayıtlarını bozmadan locale alanı üzerinden etkinleştirilecektir.</p>
      </div>
    </section>
  );
}
