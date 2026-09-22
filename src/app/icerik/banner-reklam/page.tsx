import {
  advertisingPlacementPlan,
  creativeToHtml,
  defaultHomepageAfterRolesAd,
  getAdvertisingSlotState,
  homepageAfterRolesSlotKey,
} from "@/lib/cms-advertising";
import { requireCmsManager } from "@/lib/cms-access";
import { saveHomepageAdvertisingAction } from "@/features/cms/advertising-actions";

export const dynamic = "force-dynamic";

function statusLabel(state: Awaited<ReturnType<typeof getAdvertisingSlotState>>, active: boolean) {
  if (state.state === "missing") return "Varsayılan Magzter kreatifi · " + (active ? "Aktif" : "Pasif");
  if (state.state === "valid") return active ? "Aktif · canlı sitede gösteriliyor" : "Pasif · canlı sitede gizli";
  if (state.state === "corrupt") return "Veri bozuk · güvenlik için gösterim kapalı";
  return "Veri okunamadı · güvenlik için gösterim kapalı";
}

export default async function BannerAdvertisingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const access = await requireCmsManager("/icerik/banner-reklam");
  const state = await getAdvertisingSlotState(homepageAfterRolesSlotKey);
  const dataUnavailable = state.state === "unavailable" || state.state === "corrupt";
  const config = state.state === "valid" ? state.config : defaultHomepageAfterRolesAd;

  const errorCode = typeof params.hata === "string" ? params.hata : "";
  const errorMessages: Record<string, string> = {
    kreatif: "Banner HTML kodu veya metin alanlarından biri doğrulanamadı. CJ kodunu eksiksiz yapıştırın.",
    boyut: "Ana sayfa slotu için masaüstü kreatifi 728×90, mobil kreatifi 300×250 olmalıdır.",
  };

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Yayın & Görünürlük</span>
          <h1>Banner / Reklam Alanları</h1>
          <p>Affiliate ve sponsorlu kreatifleri tek merkezden açıp kapatın; yeni reklam geldiğinde mevcut kodu değiştirin.</p>
        </div>
        <div className="content-profile">
          <strong>{statusLabel(state, config.active)}</strong>
          <small>Ana sayfa · Rol kartları sonrası</small>
        </div>
      </div>

      {params.kayit === "1" ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Banner ayarları güncellendi.</strong>
          <p>Aktif/Pasif durumu ve kreatifler canlı ana sayfa için kaydedildi.</p>
        </div>
      ) : null}

      {errorCode && errorMessages[errorCode] ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert">
          <strong>İşlem tamamlanamadı.</strong>
          <p>{errorMessages[errorCode]}</p>
        </div>
      ) : null}

      {dataUnavailable ? (
        <div className="content-panel" role="alert">
          <strong>Reklam alanı verisi güvenilir biçimde okunamadı.</strong>
          <p>Yanlış bir kaydın üzerine yazmamak için düzenleme durduruldu. Public tarafta reklam güvenlik amacıyla gösterilmez.</p>
        </div>
      ) : (
        <div className="content-panel">
          <div className="content-section-heading">
            <div><span>01</span><h2>Ana Sayfa · Rol kartları sonrası</h2></div>
            <p>Masaüstü 728×90 · Mobil 300×250</p>
          </div>

          <p style={{ marginTop: 0 }}>
            Bu alan rol kartlarının hemen altında ve Eser Pasaportu bölümünden önce gösterilir.
            İlkOku'nun kendi ana CTA'larının önüne geçmez.
          </p>

          {access.canPublish ? (
            <form action={saveHomepageAdvertisingAction} className="content-form">
              <fieldset className="content-panel" style={{ margin: 0 }}>
                <legend><strong>Gösterim durumu</strong></legend>
                <div className="content-form-actions" style={{ flexWrap: "wrap" }}>
                  <label>
                    <input type="radio" name="status" value="active" defaultChecked={config.active} /> Aktif
                  </label>
                  <label>
                    <input type="radio" name="status" value="passive" defaultChecked={!config.active} /> Pasif
                  </label>
                </div>
              </fieldset>

              <div className="content-form-grid">
                <label>
                  <span>Reklamveren / marka</span>
                  <input name="advertiser" required maxLength={120} defaultValue={config.advertiser} />
                </label>
                <label>
                  <span>Bilgilendirme etiketi</span>
                  <input name="disclosure" required maxLength={120} defaultValue={config.disclosure} />
                </label>
              </div>

              <label>
                <span>Alan başlığı</span>
                <input name="heading" required maxLength={160} defaultValue={config.heading} />
              </label>

              <label>
                <span>Kısa açıklama</span>
                <input name="description" required maxLength={320} defaultValue={config.description} />
              </label>

              <label>
                <span>Masaüstü CJ HTML · 728×90</span>
                <textarea
                  name="desktopHtml"
                  required
                  rows={5}
                  spellCheck={false}
                  defaultValue={creativeToHtml(config.desktop)}
                />
              </label>

              <label>
                <span>Mobil / tablet CJ HTML · 300×250</span>
                <textarea
                  name="mobileHtml"
                  required
                  rows={5}
                  spellCheck={false}
                  defaultValue={creativeToHtml(config.mobile)}
                />
              </label>

              <div className="content-form-actions">
                <button type="submit">Reklam Alanını Kaydet</button>
              </div>
            </form>
          ) : (
            <div className="content-panel" style={{ margin: 0 }}>
              <strong>Görüntüleme modu</strong>
              <p>Bu hesap reklam alanını görüntüleyebilir; canlı Aktif/Pasif değişikliği için yayın yetkisi gerekir.</p>
            </div>
          )}
        </div>
      )}

      <div className="content-panel">
        <div className="content-section-heading">
          <div><span>02</span><h2>Yerleşim planı</h2></div>
          <p>Unutulmaması gereken reklam alanları</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">Alan</th>
                <th align="left">Konum</th>
                <th align="left">Masaüstü</th>
                <th align="left">Mobil</th>
                <th align="left">Durum</th>
              </tr>
            </thead>
            <tbody>
              {advertisingPlacementPlan.map((slot) => (
                <tr key={slot.key}>
                  <td><strong>{slot.label}</strong></td>
                  <td>{slot.detail}</td>
                  <td>{slot.desktop}</td>
                  <td>{slot.mobile}</td>
                  <td>{slot.connected ? "Bağlı" : "Planlandı"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
