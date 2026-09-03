import Link from "next/link";
import { publishHomepageHistoryAction, saveHomepageHistoryAction } from "@/features/cms/history-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDraftState } from "@/lib/cms-drafts";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace, normalizeCmsLocale, type CmsLocaleCode } from "@/lib/cms-locales";
import { historyDefaults, mergeHistoryContent, type HistoryContent } from "@/lib/history-content";
import { prisma } from "@/lib/prisma";

type LiveRow = { valueJson: string; status: "draft" | "published" | "archived" };

async function load(locale: CmsLocaleCode) {
  const namespace = cmsLocaleNamespace("homepage", locale);
  const [draft, rows, enabled] = await Promise.all([
    getCmsDraftState<Record<string, string>>(`history:${locale}`),
    prisma.$queryRaw<LiveRow[]>`
      SELECT valueJson, status FROM SiteContent
      WHERE namespace = ${namespace} AND contentKey = 'history'
      LIMIT 1
    `,
    isCmsLocaleEnabled(locale),
  ]);

  let live: HistoryContent | null = null;
  try {
    const parsed = rows[0]?.valueJson ? JSON.parse(rows[0].valueJson) as Record<string, unknown> : null;
    live = parsed ? mergeHistoryContent(parsed) : null;
  } catch {
    live = null;
  }

  const values = draft.state === "valid"
    ? mergeHistoryContent(draft.record.payload)
    : live ?? { ...historyDefaults };

  return {
    values,
    hasDraft: draft.state === "valid",
    liveStatus: rows[0]?.status,
    enabled,
  };
}

function TextField({ name, label, value, maxLength = 220 }: { name: string; label: string; value: string; maxLength?: number }) {
  return <label><span>{label}</span><input name={name} maxLength={maxLength} defaultValue={value} /></label>;
}

function TextArea({ name, label, value, maxLength = 600, rows = 3 }: { name: string; label: string; value: string; maxLength?: number; rows?: number }) {
  return <label><span>{label}</span><textarea name={name} maxLength={maxLength} rows={rows} defaultValue={value} /></label>;
}

function ImageField({ name, altName, value, alt, label }: { name: string; altName: string; value: string; alt: string; label: string }) {
  return (
    <div className="content-form-grid">
      <TextField name={name} label={`${label} · görsel yolu / URL`} value={value} maxLength={600} />
      <TextField name={altName} label={`${label} · alt metin`} value={alt} maxLength={220} />
    </div>
  );
}

export default async function HistoryContentPage({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const access = await requireCmsManager("/icerik/ana-sayfa/history");
  const state = await load(locale);
  const v = state.values;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Ana Sayfa → History · {locale.toUpperCase()}</span>
          <h1>History içerik yönetimi</h1>
          <p>Metin, görsel, simge ve mühür değişir; geometri, kart ölçüleri, grid, tipografi ve hizalama kodda kilitli kalır.</p>
        </div>
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href="/icerik/ana-sayfa">← Ana Sayfa</Link>
        <Link href="/icerik/ana-sayfa/history?dil=tr">Türkçe</Link>
        <Link href="/icerik/ana-sayfa/history?dil=en">English</Link>
        <Link href="/icerik/medya">Medya Kütüphanesi</Link>
        <Link href="/onizleme/ana-sayfa-yeni" target="_blank">Yeni Ana Sayfa Çalışması ↗</Link>
      </div>

      <div className="content-panel" style={{ marginBottom: "1rem" }}>
        <strong>Tasarım koruması aktif</strong>
        <p>CMS yalnız içerik alanlarını kaydeder. Width, height, padding, kolon oranı, kart yerleşimi, font boyutu, parşömen çerçevesi ve dekoratif geometri bu ekrandan değiştirilemez.</p>
        <p><strong>Durum:</strong> {state.hasDraft ? "Yayın bekleyen History taslağı var." : state.liveStatus === "published" ? "History içerikleri yayınlandı; bekleyen taslak yok." : "Varsayılan referans içerikleri kullanılıyor."}</p>
      </div>

      <form action={saveHomepageHistoryAction} className="content-form">
        <input type="hidden" name="locale" value={locale} />

        <div className="content-panel">
          <div className="content-section-heading"><div><span>01</span><h2>Genel</h2></div><p>1. parça</p></div>
          <TextField name="backgroundColor" label="History arka plan rengi" value={v.backgroundColor} maxLength={32} />
          <p style={{ margin: 0 }}>Varsayılan ve önerilen değer: <code>#F5F2FA</code>. Geometri bu alandan etkilenmez.</p>
        </div>

        <div className="content-panel">
          <div className="content-section-heading"><div><span>02</span><h2>Giriş Başlığı</h2></div><p>2. parça</p></div>
          <TextField name="introEyebrow" label="Üst başlık" value={v.introEyebrow} maxLength={120} />
          <TextField name="introTitle" label="Ana başlık" value={v.introTitle} maxLength={220} />
          <TextArea name="introDescription1" label="Açıklama satır 1" value={v.introDescription1} maxLength={500} rows={2} />
          <TextArea name="introDescription2" label="Açıklama satır 2" value={v.introDescription2} maxLength={500} rows={2} />
        </div>

        <div className="content-panel">
          <div className="content-section-heading"><div><span>03</span><h2>Tarih Kartları</h2></div><p>3. parça · 4 sabit kart</p></div>
          {[1, 2, 3, 4].map((index) => (
            <div className="content-panel" key={index} style={{ margin: ".75rem 0" }}>
              <strong>Kart {index}</strong>
              <div className="content-form-grid">
                <TextField name={`card${index}Period`} label="Dönem" value={v[`card${index}Period`]} maxLength={120} />
                <TextField name={`card${index}Title`} label="Başlık" value={v[`card${index}Title`]} maxLength={180} />
              </div>
              <TextArea name={`card${index}Lead`} label="Ana açıklama" value={v[`card${index}Lead`]} maxLength={420} rows={3} />
              <TextArea name={`card${index}Body`} label="Alt açıklama" value={v[`card${index}Body`]} maxLength={420} rows={3} />
              <ImageField name={`card${index}Image`} altName={`card${index}Alt`} label={`Kart ${index}`} value={v[`card${index}Image`]} alt={v[`card${index}Alt`]} />
            </div>
          ))}
        </div>

        <div className="content-panel">
          <div className="content-section-heading"><div><span>04</span><h2>Sol Dekor</h2></div><p>4. parça</p></div>
          <ImageField name="leftDecorImage" altName="leftDecorAlt" label="Birleşik dekor" value={v.leftDecorImage} alt={v.leftDecorAlt} />
          <p style={{ margin: 0 }}>Kitap + mürekkep + kalem + kâğıt + lavanta tek görsel olarak değiştirilir.</p>
        </div>

        <div className="content-panel">
          <div className="content-section-heading"><div><span>05–15</span><h2>2026 Kartı</h2></div><p>Kabuk + 10 bağımsız içerik parçası</p></div>

          <div className="content-panel" style={{ margin: ".75rem 0" }}>
            <strong>Kart Ayarları · 5. parça</strong>
            <label><span>Görünürlük</span><select name="cardVisible" defaultValue={v.cardVisible}><option value="1">Görünür</option><option value="0">Gizli</option></select></label>
            <TextField name="cardBackgroundImage" label="Opsiyonel kart arka plan / doku URL" value={v.cardBackgroundImage} maxLength={600} />
          </div>

          <div className="content-panel" style={{ margin: ".75rem 0" }}>
            <strong>Üst Etiket · 6. parça</strong>
            <TextField name="cardEyebrow" label="Metin" value={v.cardEyebrow} maxLength={120} />
          </div>

          <div className="content-panel" style={{ margin: ".75rem 0" }}>
            <strong>Ana Başlık · 7. parça</strong>
            <div className="content-form-grid">
              <TextField name="cardTitleLine1" label="Satır 1" value={v.cardTitleLine1} maxLength={180} />
              <TextField name="cardTitleLine2" label="Satır 2" value={v.cardTitleLine2} maxLength={180} />
            </div>
          </div>

          {[1, 2, 3, 4].map((index) => (
            <div className="content-panel" key={`step-${index}`} style={{ margin: ".75rem 0" }}>
              <strong>Adım {index} · {index + 7}. parça</strong>
              <ImageField name={`step${index}Image`} altName={`step${index}Alt`} label={`Adım ${index}`} value={v[`step${index}Image`]} alt={v[`step${index}Alt`]} />
              <TextArea name={`step${index}Text`} label="Metin" value={v[`step${index}Text`]} maxLength={420} rows={2} />
            </div>
          ))}

          <div className="content-panel" style={{ margin: ".75rem 0" }}>
            <strong>Kapanış Sorusu · 12. parça</strong>
            <TextField name="closingQuestion" label="Metin" value={v.closingQuestion} maxLength={220} />
          </div>
          <div className="content-panel" style={{ margin: ".75rem 0" }}>
            <strong>Alt Slogan · 13. parça</strong>
            <TextField name="bottomSlogan" label="Metin" value={v.bottomSlogan} maxLength={180} />
          </div>
          <div className="content-panel" style={{ margin: ".75rem 0" }}>
            <strong>Marka Metni · 14. parça</strong>
            <TextField name="brandText" label="Metin" value={v.brandText} maxLength={100} />
          </div>
          <div className="content-panel" style={{ margin: ".75rem 0" }}>
            <strong>Mühür · 15. parça</strong>
            <label><span>Görünürlük</span><select name="sealVisible" defaultValue={v.sealVisible}><option value="1">Görünür</option><option value="0">Gizli</option></select></label>
            <ImageField name="sealImage" altName="sealAlt" label="Mühür" value={v.sealImage} alt={v.sealAlt} />
          </div>
        </div>

        <div className="content-form-actions"><button type="submit">History Taslağını Kaydet</button></div>
      </form>

      <div className="content-publish-box" style={{ marginTop: "1rem" }}>
        <div><strong>History yayınlama</strong><p>Bu işlem yalnız History CMS kaydını günceller; public ana sayfa renderer yapısı yeni tasarım onaylanana kadar değiştirilmez.</p></div>
        {access.canPublish && state.enabled && state.hasDraft ? (
          <form action={publishHomepageHistoryAction}><input type="hidden" name="locale" value={locale} /><button type="submit">History Taslağını Yayınla</button></form>
        ) : null}
      </div>
    </section>
  );
}
