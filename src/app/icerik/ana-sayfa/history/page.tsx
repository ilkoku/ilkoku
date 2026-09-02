import Link from "next/link";
import { publishHomepageHistoryAction, saveHomepageHistoryAction } from "@/features/cms/actions";
import { historyDefaults, type HistoryFieldKey } from "@/features/landing/history-content";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDraftState, homepageDraftKey } from "@/lib/cms-drafts";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace, normalizeCmsLocale, type CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type Row = { valueJson: string; status: "draft" | "published" | "archived" };
type Values = Record<string, string>;

function parse(valueJson: string): Values | null {
  try {
    const raw = JSON.parse(valueJson) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return null;
  }
}

async function load(locale: CmsLocaleCode) {
  const namespace = cmsLocaleNamespace("homepage", locale);
  const [rows, draft, localeEnabled] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT valueJson, status
      FROM SiteContent
      WHERE namespace = ${namespace}
        AND contentKey = 'history'
      LIMIT 1
    `,
    getCmsDraftState<Record<string, string>>(homepageDraftKey(locale, "history")),
    isCmsLocaleEnabled(locale),
  ]);

  if (draft.state === "corrupt") return { state: "corrupt" as const, localeEnabled };
  const live = rows[0];
  const liveValues = live ? parse(live.valueJson) : {};
  if (live && !liveValues) return { state: "corrupt" as const, localeEnabled };
  const values = draft.state === "valid" ? draft.record.payload : liveValues ?? {};
  return {
    state: "valid" as const,
    values,
    liveStatus: live?.status,
    hasDraft: draft.state === "valid",
    localeEnabled,
  };
}

function value(values: Values, key: HistoryFieldKey) {
  return values[key]?.trim() || historyDefaults[key];
}

function Field({ values, name, label, maxLength = 500, rows }: { values: Values; name: HistoryFieldKey; label: string; maxLength?: number; rows?: number }) {
  const defaultValue = value(values, name);
  return (
    <label>
      <span>{label}</span>
      {rows ? <textarea name={name} maxLength={maxLength} rows={rows} defaultValue={defaultValue} /> : <input name={name} maxLength={maxLength} defaultValue={defaultValue} />}
    </label>
  );
}

function ImageField({ values, name, label }: { values: Values; name: HistoryFieldKey; label: string }) {
  return <Field values={values} name={name} label={`${label} · public yol`} maxLength={500} />;
}

export default async function HistoryCmsPage({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const access = await requireCmsManager("/icerik/ana-sayfa/history");
  const result = await load(locale);

  if (result.state === "corrupt") {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Ana Sayfa · History</span><h1>History içerik yönetimi</h1></div></div>
        <div className="content-panel" role="alert"><strong>History CMS kaydı güvenilir biçimde okunamadı.</strong><p>Canlı veya staged içerik doğrulanamadığı için yanlış veri üzerine yazmayı önlemek amacıyla düzenleme durduruldu.</p><div className="content-form-actions"><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/ana-sayfa/history">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const values = result.values;
  const canPublish = access.canPublish && result.localeEnabled;
  const status = result.hasDraft
    ? result.liveStatus === "published" ? "Taslak hazır · canlı sürüm yayında" : "Taslak hazır · henüz canlı değil"
    : result.liveStatus === "published" ? "Yayında · bekleyen taslak yok" : "Henüz yayınlanmış History kaydı yok · kod varsayılanları kullanılıyor";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Ana Sayfa · History · {locale.toUpperCase()}</span><h1>History puzzle içerik yönetimi</h1><p>Metin, görsel, simge ve mühür içerikten yönetilir. Kart ölçüleri, grid ve tipografi geometrisi kodda kilitlidir.</p></div>
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href="/icerik/ana-sayfa/history?dil=tr">Türkçe</Link>
        <Link href="/icerik/ana-sayfa/history?dil=en">English</Link>
        <Link href="/icerik/ana-sayfa">Ana Sayfa İçeriği</Link>
        <Link href="/icerik/medya">Medya Kütüphanesi ↗</Link>
        <Link href="/#hikayenin-yolculugu" target="_blank">Canlı History ↗</Link>
      </div>

      <div className="content-panel" style={{ marginBottom: "1rem" }}>
        <strong>Görsel yönetimi</strong>
        <p>Yeni görseli önce Medya Kütüphanesi’ne yükleyin; oluşan site içi public yolu ilgili görsel alanına yazın. History yalnız “/” ile başlayan site içi asset yollarını kabul eder.</p>
      </div>

      <form action={saveHomepageHistoryAction} className="content-form">
        <input type="hidden" name="locale" value={locale} />

        <div className="content-panel">
          <div className="content-section-heading"><div><span>01</span><h2>History genel zemin</h2></div></div>
          <Field values={values} name="backgroundColor" label="Arka plan rengi" maxLength={20} />
        </div>

        <div className="content-panel">
          <div className="content-section-heading"><div><span>02</span><h2>Hikâyenin Yolculuğu başlık bloğu</h2></div></div>
          <Field values={values} name="headerEyebrow" label="Üst etiket" maxLength={120} />
          <div className="content-form-grid">
            <Field values={values} name="headerTitleBefore" label="Başlık · önce" maxLength={160} />
            <Field values={values} name="headerTitleEmphasis" label="Başlık · mor vurgu" maxLength={80} />
            <Field values={values} name="headerTitleAfter" label="Başlık · sonra" maxLength={160} />
          </div>
          <Field values={values} name="headerDescriptionLine1" label="Açıklama · satır 1" maxLength={500} rows={2} />
          <Field values={values} name="headerDescriptionLine2" label="Açıklama · satır 2" maxLength={500} rows={2} />
        </div>

        {[1, 2, 3, 4].map((index) => {
          const prefix = `card${index}` as "card1" | "card2" | "card3" | "card4";
          return (
            <div className="content-panel" key={prefix}>
              <div className="content-section-heading"><div><span>03.{index}</span><h2>Tarih kartı {index}</h2></div></div>
              <div className="content-form-grid">
                <Field values={values} name={`${prefix}Era` as HistoryFieldKey} label="Dönem / üst etiket" maxLength={120} />
                <Field values={values} name={`${prefix}Title` as HistoryFieldKey} label="Başlık" maxLength={160} />
              </div>
              <Field values={values} name={`${prefix}Body` as HistoryFieldKey} label="Ana metin" maxLength={500} rows={3} />
              <Field values={values} name={`${prefix}Note` as HistoryFieldKey} label="Alt metin" maxLength={500} rows={3} />
              <div className="content-form-grid">
                <ImageField values={values} name={`${prefix}Image` as HistoryFieldKey} label="Görsel" />
                <Field values={values} name={`${prefix}ImageAlt` as HistoryFieldKey} label="Görsel alt metni" maxLength={220} />
              </div>
            </div>
          );
        })}

        <div className="content-panel">
          <div className="content-section-heading"><div><span>04</span><h2>Sol dekor sahnesi</h2></div></div>
          <p>Lavanta + kâğıt + mürekkep + kalem + kitap tek değiştirilebilir görsel olarak yönetilir.</p>
          <div className="content-form-grid">
            <ImageField values={values} name="leftVisual" label="Sol dekor görseli" />
            <Field values={values} name="leftVisualAlt" label="Görsel alt metni" maxLength={220} />
          </div>
        </div>

        <div className="content-panel">
          <div className="content-section-heading"><div><span>05–07</span><h2>2026 kartı ve başlığı</h2></div></div>
          <div className="content-form-grid">
            <label><span>Kart görünürlüğü</span><select name="nowVisible" defaultValue={value(values, "nowVisible")}><option value="true">Göster</option><option value="false">Gizle</option></select></label>
            <ImageField values={values} name="nowBackground" label="Opsiyonel kart arka plan görseli" />
          </div>
          <Field values={values} name="nowEyebrow" label="6. parça · üst yazı" maxLength={140} />
          <Field values={values} name="nowTitleLine1" label="7. parça · ana başlık satır 1" maxLength={220} />
          <Field values={values} name="nowTitleLine2" label="7. parça · ana başlık satır 2" maxLength={220} />
        </div>

        {[1, 2, 3, 4].map((index) => (
          <div className="content-panel" key={`step-${index}`}>
            <div className="content-section-heading"><div><span>{index + 7}</span><h2>2026 adım {index}</h2></div></div>
            <div className="content-form-grid">
              <ImageField values={values} name={`nowStep${index}Image` as HistoryFieldKey} label="Simge / illüstrasyon" />
              <Field values={values} name={`nowStep${index}Text` as HistoryFieldKey} label="Yazı" maxLength={400} rows={3} />
            </div>
          </div>
        ))}

        <div className="content-panel">
          <div className="content-section-heading"><div><span>12–14</span><h2>2026 kapanış metinleri</h2></div></div>
          <Field values={values} name="nowQuestion" label="12. parça · soru" maxLength={260} />
          <Field values={values} name="nowTagline" label="13. parça · alt slogan" maxLength={220} />
          <Field values={values} name="nowBrand" label="14. parça · marka metni" maxLength={100} />
        </div>

        <div className="content-panel">
          <div className="content-section-heading"><div><span>15</span><h2>İlkOku mühürü</h2></div></div>
          <div className="content-form-grid">
            <label><span>Mühür görünürlüğü</span><select name="nowSealVisible" defaultValue={value(values, "nowSealVisible")}><option value="true">Göster</option><option value="false">Gizle</option></select></label>
            <ImageField values={values} name="nowSealImage" label="Mühür görseli" />
            <Field values={values} name="nowSealAlt" label="Mühür alt metni" maxLength={220} />
          </div>
        </div>

        <div className="content-form-actions"><button type="submit">History Taslağını Kaydet</button></div>
      </form>

      <div className="content-publish-box">
        <div><strong>Yayınlama · {status}</strong><p>Yalnız History bölümü yayınlanır; ana sayfanın diğer CMS bölümleri etkilenmez.</p></div>
        {result.hasDraft && canPublish ? <form action={publishHomepageHistoryAction}><input type="hidden" name="locale" value={locale} /><button type="submit">History Taslağını Yayınla</button></form> : null}
      </div>
    </section>
  );
}
