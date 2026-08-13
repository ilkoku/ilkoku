import {
  publishHomepageFooterAction,
  publishHomepageHeroAction,
  publishHomepagePassportAction,
  publishHomepageRolesAction,
  publishHomepageWhyAction,
  saveHomepageFooterAction,
  saveHomepageHeroAction,
  saveHomepagePassportAction,
  saveHomepageRolesAction,
  saveHomepageWhyAction,
} from "@/features/cms/actions";

function PublishBox({
  action,
  label,
}: {
  action: () => Promise<void>;
  label: string;
}) {
  return (
    <div className="content-publish-box">
      <div>
        <strong>Yayınlama</strong>
        <p>{label} için kaydedilmiş taslağı canlı ana sayfaya yayınlar.</p>
      </div>
      <form action={action}>
        <button type="submit">Yayınla</button>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Ana Sayfa</span>
          <h1>Ana sayfa içerik yönetimi</h1>
          <p>Hero, CTA, rol alanı, Eser Pasaportu, Neden İlkOku ve footer metinlerini kod değiştirmeden yönetin.</p>
        </div>
      </div>

      <div className="content-panel">
        <div className="content-section-heading">
          <div><span>01</span><h2>Hero</h2></div>
          <p>Ana sayfanın ilk görünen başlık, açıklama ve CTA alanları.</p>
        </div>
        <form action={saveHomepageHeroAction} className="content-form">
          <label><span>Ana başlık</span><textarea name="title" required maxLength={220} rows={3} placeholder={"İlk cümle,\nilk okurun,\nilk adımın."} /></label>
          <label><span>Açıklama</span><textarea name="description" required maxLength={1000} rows={4} placeholder="Eserini yaz, okurlarla geliştir, profesyonel editör incelemesine taşı ve yayınevleri tarafından keşfedil." /></label>
          <div className="content-form-grid">
            <label><span>Birincil CTA</span><input name="primaryCtaLabel" maxLength={80} placeholder="Eserini Yazmaya Başla" /></label>
            <label><span>Birincil CTA linki</span><input name="primaryCtaHref" maxLength={300} placeholder="/kayit?rol=writer" /></label>
            <label><span>İkincil CTA</span><input name="secondaryCtaLabel" maxLength={80} placeholder="Eserleri Keşfet" /></label>
            <label><span>İkincil CTA linki</span><input name="secondaryCtaHref" maxLength={300} placeholder="/kesfet" /></label>
          </div>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageHeroAction} label="Hero" />
      </div>

      <div className="content-panel">
        <div className="content-section-heading">
          <div><span>02</span><h2>Rol seçimi alanı</h2></div>
          <p>Yazar, okuyucu, editör ve yayınevi kartlarının üst başlık alanı.</p>
        </div>
        <form action={saveHomepageRolesAction} className="content-form">
          <label><span>Üst etiket</span><input name="eyebrow" maxLength={120} placeholder="Topluluğa katıl" /></label>
          <label><span>Başlık</span><input name="title" required maxLength={220} placeholder="İlkOku’ya nasıl katılmak istiyorsun?" /></label>
          <label><span>Açıklama</span><textarea name="description" maxLength={700} rows={3} placeholder="Rolünü seç; kayıt akışını sana uygun şekilde başlatalım." /></label>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageRolesAction} label="Rol seçimi alanı" />
      </div>

      <div className="content-panel">
        <div className="content-section-heading">
          <div><span>03</span><h2>Eser Pasaportu</h2></div>
          <p>Eser Pasaportu tanıtım bölümünün başlık, açıklama ve CTA alanları.</p>
        </div>
        <form action={saveHomepagePassportAction} className="content-form">
          <label><span>Üst etiket</span><input name="eyebrow" maxLength={120} placeholder="Eserin dijital izi" /></label>
          <label><span>Başlık</span><textarea name="title" required maxLength={260} rows={2} placeholder="Bir eserin yalnızca sonucunu değil, oluşum sürecini de görün." /></label>
          <label><span>Açıklama</span><textarea name="description" required maxLength={1200} rows={4} placeholder="Eser Pasaportu; yazım oturumlarını, revizyonları, sürüm geçmişini ve profesyonel inceleme durumunu tek bir kayıt altında birleştirir." /></label>
          <div className="content-form-grid">
            <label><span>CTA metni</span><input name="ctaLabel" maxLength={80} placeholder="Rolünü Seç" /></label>
            <label><span>CTA linki</span><input name="ctaHref" maxLength={300} placeholder="#roller" /></label>
          </div>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepagePassportAction} label="Eser Pasaportu" />
      </div>

      <div className="content-panel">
        <div className="content-section-heading">
          <div><span>04</span><h2>Neden İlkOku?</h2></div>
          <p>Fayda kartları ve istatistiklerin üstündeki bölüm başlığı.</p>
        </div>
        <form action={saveHomepageWhyAction} className="content-form">
          <label><span>Üst etiket</span><input name="eyebrow" maxLength={120} placeholder="Güven, kayıt ve keşif" /></label>
          <label><span>Başlık</span><input name="title" required maxLength={220} placeholder="Neden İlkOku?" /></label>
          <label><span>Açıklama</span><textarea name="description" maxLength={700} rows={3} placeholder="İlkOku’nun yazar, okuyucu, editör ve yayınevi için sunduğu temel avantajlar." /></label>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageWhyAction} label="Neden İlkOku" />
      </div>

      <div className="content-panel">
        <div className="content-section-heading">
          <div><span>05</span><h2>Footer</h2></div>
          <p>Alt bölüm sloganı, destek adresi ve copyright metni.</p>
        </div>
        <form action={saveHomepageFooterAction} className="content-form">
          <label><span>Slogan</span><input name="slogan" required maxLength={220} placeholder="İlk cümle, ilk okurun, ilk adımın." /></label>
          <label><span>Destek e-postası</span><input name="supportEmail" type="email" maxLength={220} placeholder="destek@ilkoku.com" /></label>
          <label><span>Copyright metni</span><input name="copyright" maxLength={300} placeholder="İlkOku. Tüm hakları saklıdır." /></label>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageFooterAction} label="Footer" />
      </div>
    </section>
  );
}
