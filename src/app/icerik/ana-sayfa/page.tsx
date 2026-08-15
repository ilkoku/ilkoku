import Link from "next/link";
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
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDraftsByPrefix } from "@/lib/cms-drafts";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace, normalizeCmsLocale, type CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type Row = { contentKey: string; valueJson: string; status: "draft" | "published" | "archived" };
type SectionValues = Record<string, string>;
type SectionState = { values: SectionValues; liveStatus?: Row["status"]; hasDraft: boolean };
type PublishAction = (formData: FormData) => Promise<void>;

const sectionKeys = ["hero", "roles", "passport", "why", "footer"] as const;

function parse(valueJson: string): SectionValues {
  try {
    const raw = JSON.parse(valueJson) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

function cleanDraft(raw: Record<string, unknown>): SectionValues {
  return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

async function load(locale: CmsLocaleCode): Promise<Map<string, SectionState>> {
  const namespace = cmsLocaleNamespace("homepage", locale);
  const live = new Map<string, Row>();
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT contentKey, valueJson, status
      FROM SiteContent
      WHERE namespace = ${namespace}
    `;
    for (const row of rows) live.set(row.contentKey, row);
  } catch {}

  const drafts = await getCmsDraftsByPrefix<Record<string, unknown>>(`homepage:${locale}:`).catch(() => []);
  const draftMap = new Map(drafts.map((draft) => [draft.contentKey.replace(`homepage:${locale}:`, ""), draft.payload]));
  const sections = new Map<string, SectionState>();

  for (const key of sectionKeys) {
    const liveRow = live.get(key);
    const draft = draftMap.get(key);
    sections.set(key, {
      values: draft ? cleanDraft(draft) : liveRow ? parse(liveRow.valueJson) : {},
      liveStatus: liveRow?.status,
      hasDraft: Boolean(draft),
    });
  }
  return sections;
}

function status(section?: SectionState) {
  if (!section) return "Kayıt yok";
  if (section.hasDraft && section.liveStatus === "published") return "Taslak hazır · canlı sürüm yayında";
  if (section.hasDraft) return "Taslak hazır · henüz canlı değil";
  if (section.liveStatus === "published") return "Yayında · bekleyen taslak yok";
  if (section.liveStatus === "archived") return "Arşivde";
  if (section.liveStatus === "draft") return "Eski taslak kayıt";
  return "Kayıt yok";
}

function PublishBox({ action, label, locale, section, enabled, canPublish }: {
  action: PublishAction;
  label: string;
  locale: CmsLocaleCode;
  section?: SectionState;
  enabled: boolean;
  canPublish: boolean;
}) {
  const detail = !section?.hasDraft
    ? "Yayınlanmayı bekleyen yeni taslak yok."
    : !enabled
      ? `${locale.toUpperCase()} public dili kapalı; taslak canlıya aktarılamaz.`
      : !canPublish
        ? "Bu hesap taslak hazırlayabilir ancak yayın yetkisine sahip değildir. Yayınlama işlemini yetkili bir kullanıcı tamamlamalıdır."
        : `${label} çalışma taslağını canlı ${locale.toUpperCase()} ana sayfaya aktarır.`;

  return (
    <div className="content-publish-box">
      <div>
        <strong>Yayınlama · {status(section)}</strong>
        <p>{detail}</p>
      </div>
      {enabled && canPublish && section?.hasDraft ? <form action={action}><input type="hidden" name="locale" value={locale} /><button type="submit">Taslağı Yayınla</button></form> : null}
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const access = await requireCmsManager("/icerik/ana-sayfa");
  const localeEnabled = await isCmsLocaleEnabled(locale);
  const sections = await load(locale);
  const hero = sections.get("hero");
  const roles = sections.get("roles");
  const passport = sections.get("passport");
  const why = sections.get("why");
  const footer = sections.get("footer");
  const isEn = locale === "en";

  const statDefaults = isEn
    ? [
        ["2.847+", "Writers"],
        ["18.592+", "Readers"],
        ["412+", "Editors"],
        ["78+", "Publishers"],
        ["6.215+", "Works"],
        ["34.760+", "Comments"],
      ]
    : [
        ["2.847+", "Yazar"],
        ["18.592+", "Okuyucu"],
        ["412+", "Editör"],
        ["78+", "Yayınevi"],
        ["6.215+", "Eser"],
        ["34.760+", "Yorum"],
      ];

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Ana Sayfa · {locale.toUpperCase()}</span><h1>Ana sayfa içerik yönetimi</h1><p>Taslak üzerinde çalışırken mevcut canlı sürüm korunur. Yalnız açıkça yayınladığınız bölüm public siteye aktarılır.</p></div>
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href="/icerik/ana-sayfa?dil=tr">Türkçe</Link>
        <Link href="/icerik/ana-sayfa?dil=en">English</Link>
        <Link href={`/icerik/onizleme/ana-sayfa?dil=${locale}`}>Taslağı Önizle ↗</Link>
        {isEn ? <Link href="/icerik/diller">Dil Yönetimi</Link> : null}
      </div>

      {!access.canPublish ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Taslak yönetim yetkisi</strong>
          <p>Bu hesap içerik hazırlayabilir ve önizleyebilir. Canlı yayınlama için ayrıca yayın yetkisi gerekir.</p>
        </div>
      ) : null}

      {isEn && !localeEnabled ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>İngilizce public yayın kapalı.</strong>
          <p>EN ana sayfa alanları hazırlanabilir ve önizlenebilir; dil açılmadan yayınlanamaz.</p>
        </div>
      ) : null}

      <div className="content-panel">
        <div className="content-section-heading"><div><span>01</span><h2>Hero</h2></div><p>{status(hero)}</p></div>
        <form action={saveHomepageHeroAction} className="content-form">
          <input type="hidden" name="locale" value={locale} />
          <label><span>Ana başlık</span><textarea name="title" required maxLength={220} rows={3} defaultValue={hero?.values.title || ""} placeholder={isEn ? "Your first sentence, your first reader, your first step." : "İlk cümle, ilk okurun, ilk adımın."} /></label>
          <label><span>Açıklama</span><textarea name="description" required maxLength={1000} rows={4} defaultValue={hero?.values.description || ""} placeholder={isEn ? "Write, improve with readers, move to professional review and get discovered by publishers." : "Eserini yaz, okurlarla geliştir, profesyonel editör incelemesine taşı ve yayınevleri tarafından keşfedil."} /></label>
          <div className="content-form-grid">
            <label><span>Birincil CTA</span><input name="primaryCtaLabel" maxLength={80} defaultValue={hero?.values.primaryCtaLabel || ""} placeholder={isEn ? "Start Writing" : "Eserini Yazmaya Başla"} /></label>
            <label><span>Birincil CTA linki</span><input name="primaryCtaHref" maxLength={300} defaultValue={hero?.values.primaryCtaHref || ""} placeholder="/kayit?rol=writer" /></label>
            <label><span>İkincil CTA</span><input name="secondaryCtaLabel" maxLength={80} defaultValue={hero?.values.secondaryCtaLabel || ""} placeholder={isEn ? "Discover Works" : "Eserleri Keşfet"} /></label>
            <label><span>İkincil CTA linki</span><input name="secondaryCtaHref" maxLength={300} defaultValue={hero?.values.secondaryCtaHref || ""} placeholder="/kesfet" /></label>
          </div>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageHeroAction} label="Hero" locale={locale} section={hero} enabled={localeEnabled} canPublish={access.canPublish} />
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>02</span><h2>Rol seçimi alanı</h2></div><p>{status(roles)}</p></div>
        <form action={saveHomepageRolesAction} className="content-form">
          <input type="hidden" name="locale" value={locale} />
          <label><span>Üst etiket</span><input name="eyebrow" maxLength={120} defaultValue={roles?.values.eyebrow || ""} placeholder={isEn ? "Join the community" : "Topluluğa katıl"} /></label>
          <label><span>Başlık</span><input name="title" required maxLength={220} defaultValue={roles?.values.title || ""} placeholder={isEn ? "How would you like to join İlkOku?" : "İlkOku’ya nasıl katılmak istiyorsun?"} /></label>
          <label><span>Açıklama</span><textarea name="description" maxLength={700} rows={3} defaultValue={roles?.values.description || ""} /></label>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageRolesAction} label="Rol seçimi alanı" locale={locale} section={roles} enabled={localeEnabled} canPublish={access.canPublish} />
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>03</span><h2>Eser Pasaportu</h2></div><p>{status(passport)}</p></div>
        <form action={saveHomepagePassportAction} className="content-form">
          <input type="hidden" name="locale" value={locale} />
          <label><span>Üst etiket</span><input name="eyebrow" maxLength={120} defaultValue={passport?.values.eyebrow || ""} /></label>
          <label><span>Başlık</span><textarea name="title" required maxLength={260} rows={2} defaultValue={passport?.values.title || ""} /></label>
          <label><span>Açıklama</span><textarea name="description" required maxLength={1200} rows={4} defaultValue={passport?.values.description || ""} /></label>
          <div className="content-form-grid">
            <label><span>CTA metni</span><input name="ctaLabel" maxLength={80} defaultValue={passport?.values.ctaLabel || ""} /></label>
            <label><span>CTA linki</span><input name="ctaHref" maxLength={300} defaultValue={passport?.values.ctaHref || ""} placeholder="#roller" /></label>
          </div>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepagePassportAction} label="Eser Pasaportu" locale={locale} section={passport} enabled={localeEnabled} canPublish={access.canPublish} />
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>04</span><h2>Neden İlkOku?</h2></div><p>{status(why)}</p></div>
        <form action={saveHomepageWhyAction} className="content-form">
          <input type="hidden" name="locale" value={locale} />
          <label><span>Üst etiket</span><input name="eyebrow" maxLength={120} defaultValue={why?.values.eyebrow || ""} /></label>
          <label><span>Başlık</span><input name="title" required maxLength={220} defaultValue={why?.values.title || ""} placeholder={isEn ? "Why İlkOku?" : "Neden İlkOku?"} /></label>
          <label><span>Açıklama</span><textarea name="description" maxLength={700} rows={3} defaultValue={why?.values.description || ""} /></label>

          <div className="content-panel" style={{ margin: ".5rem 0" }}>
            <strong>İstatistik şeridi · manuel yönetim</strong>
            <p>Bu değerler gerçek zamanlı veritabanı sayacı değildir. Site tam faaliyete geçene kadar başlık ve rakamlar buradan manuel yönetilir; daha sonra aynı görünüm korunarak otomatik veri kaynağına bağlanabilir.</p>
          </div>

          <div className="content-form-grid">
            {statDefaults.map(([fallbackValue, fallbackLabel], index) => {
              const item = index + 1;
              return (
                <div key={item} className="content-panel" style={{ margin: 0 }}>
                  <strong>Kart {item}</strong>
                  <label><span>Rakam</span><input name={`stat${item}Value`} maxLength={40} defaultValue={why?.values[`stat${item}Value`] || fallbackValue} /></label>
                  <label><span>Başlık</span><input name={`stat${item}Label`} maxLength={80} defaultValue={why?.values[`stat${item}Label`] || fallbackLabel} /></label>
                </div>
              );
            })}
          </div>

          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageWhyAction} label="Neden İlkOku ve istatistik şeridi" locale={locale} section={why} enabled={localeEnabled} canPublish={access.canPublish} />
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>05</span><h2>Footer</h2></div><p>{status(footer)}</p></div>
        <form action={saveHomepageFooterAction} className="content-form">
          <input type="hidden" name="locale" value={locale} />
          <label><span>Slogan</span><input name="slogan" required maxLength={220} defaultValue={footer?.values.slogan || ""} /></label>
          <label><span>Destek e-postası</span><input name="supportEmail" type="email" maxLength={220} defaultValue={footer?.values.supportEmail || ""} placeholder="destek@ilkoku.com" /></label>
          <label><span>Copyright metni</span><input name="copyright" maxLength={300} defaultValue={footer?.values.copyright || ""} /></label>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageFooterAction} label="Footer" locale={locale} section={footer} enabled={localeEnabled} canPublish={access.canPublish} />
      </div>
    </section>
  );
}