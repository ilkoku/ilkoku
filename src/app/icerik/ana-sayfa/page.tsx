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
import { cmsLocaleNamespace, normalizeCmsLocale, type CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type Row = { contentKey: string; valueJson: string; status: "draft" | "published" | "archived" };
type Section = Record<string, string>;
type PublishAction = (formData: FormData) => Promise<void>;

function parse(valueJson: string): Section {
  try {
    const raw = JSON.parse(valueJson) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

async function load(locale: CmsLocaleCode): Promise<Map<string, Section>> {
  const namespace = cmsLocaleNamespace("homepage", locale);
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT contentKey, valueJson, status
      FROM SiteContent
      WHERE namespace = ${namespace}
    `;
    const sections = new Map<string, Section>();
    for (const row of rows) {
      sections.set(row.contentKey, { ...parse(row.valueJson), _status: row.status });
    }
    return sections;
  } catch {
    return new Map<string, Section>();
  }
}

function status(section?: Section) {
  if (!section?._status) return "Kayıt yok";
  if (section._status === "published") return "Yayında";
  if (section._status === "draft") return "Taslak";
  return "Arşivde";
}

function PublishBox({ action, label, locale, section }: { action: PublishAction; label: string; locale: CmsLocaleCode; section?: Section }) {
  return (
    <div className="content-publish-box">
      <div><strong>Yayınlama · {status(section)}</strong><p>{label} taslağını {locale.toUpperCase()} public ana sayfasına yayınlar.</p></div>
      <form action={action}><input type="hidden" name="locale" value={locale} /><button type="submit">Yayınla</button></form>
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const sections = await load(locale);
  const hero = sections.get("hero");
  const roles = sections.get("roles");
  const passport = sections.get("passport");
  const why = sections.get("why");
  const footer = sections.get("footer");
  const isEn = locale === "en";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Ana Sayfa · {locale.toUpperCase()}</span><h1>Ana sayfa içerik yönetimi</h1><p>TR ve EN içerikleri birbirinden bağımsız taslak/yayın kayıtları olarak yönetin.</p></div>
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem" }}>
        <Link href="/icerik/ana-sayfa?dil=tr">Türkçe</Link>
        <Link href="/icerik/ana-sayfa?dil=en">English</Link>
        {isEn ? <Link href="/icerik/diller">Dil Yönetimi</Link> : null}
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>01</span><h2>Hero</h2></div><p>{status(hero)}</p></div>
        <form action={saveHomepageHeroAction} className="content-form">
          <input type="hidden" name="locale" value={locale} />
          <label><span>Ana başlık</span><textarea name="title" required maxLength={220} rows={3} defaultValue={hero?.title || ""} placeholder={isEn ? "Your first sentence, your first reader, your first step." : "İlk cümle, ilk okurun, ilk adımın."} /></label>
          <label><span>Açıklama</span><textarea name="description" required maxLength={1000} rows={4} defaultValue={hero?.description || ""} placeholder={isEn ? "Write, improve with readers, move to professional review and get discovered by publishers." : "Eserini yaz, okurlarla geliştir, profesyonel editör incelemesine taşı ve yayınevleri tarafından keşfedil."} /></label>
          <div className="content-form-grid">
            <label><span>Birincil CTA</span><input name="primaryCtaLabel" maxLength={80} defaultValue={hero?.primaryCtaLabel || ""} placeholder={isEn ? "Start Writing" : "Eserini Yazmaya Başla"} /></label>
            <label><span>Birincil CTA linki</span><input name="primaryCtaHref" maxLength={300} defaultValue={hero?.primaryCtaHref || ""} placeholder="/kayit?rol=writer" /></label>
            <label><span>İkincil CTA</span><input name="secondaryCtaLabel" maxLength={80} defaultValue={hero?.secondaryCtaLabel || ""} placeholder={isEn ? "Discover Works" : "Eserleri Keşfet"} /></label>
            <label><span>İkincil CTA linki</span><input name="secondaryCtaHref" maxLength={300} defaultValue={hero?.secondaryCtaHref || ""} placeholder="/kesfet" /></label>
          </div>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageHeroAction} label="Hero" locale={locale} section={hero} />
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>02</span><h2>Rol seçimi alanı</h2></div><p>{status(roles)}</p></div>
        <form action={saveHomepageRolesAction} className="content-form">
          <input type="hidden" name="locale" value={locale} />
          <label><span>Üst etiket</span><input name="eyebrow" maxLength={120} defaultValue={roles?.eyebrow || ""} placeholder={isEn ? "Join the community" : "Topluluğa katıl"} /></label>
          <label><span>Başlık</span><input name="title" required maxLength={220} defaultValue={roles?.title || ""} placeholder={isEn ? "How would you like to join İlkOku?" : "İlkOku’ya nasıl katılmak istiyorsun?"} /></label>
          <label><span>Açıklama</span><textarea name="description" maxLength={700} rows={3} defaultValue={roles?.description || ""} /></label>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageRolesAction} label="Rol seçimi alanı" locale={locale} section={roles} />
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>03</span><h2>Eser Pasaportu</h2></div><p>{status(passport)}</p></div>
        <form action={saveHomepagePassportAction} className="content-form">
          <input type="hidden" name="locale" value={locale} />
          <label><span>Üst etiket</span><input name="eyebrow" maxLength={120} defaultValue={passport?.eyebrow || ""} /></label>
          <label><span>Başlık</span><textarea name="title" required maxLength={260} rows={2} defaultValue={passport?.title || ""} /></label>
          <label><span>Açıklama</span><textarea name="description" required maxLength={1200} rows={4} defaultValue={passport?.description || ""} /></label>
          <div className="content-form-grid">
            <label><span>CTA metni</span><input name="ctaLabel" maxLength={80} defaultValue={passport?.ctaLabel || ""} /></label>
            <label><span>CTA linki</span><input name="ctaHref" maxLength={300} defaultValue={passport?.ctaHref || ""} placeholder="#roller" /></label>
          </div>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepagePassportAction} label="Eser Pasaportu" locale={locale} section={passport} />
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>04</span><h2>Neden İlkOku?</h2></div><p>{status(why)}</p></div>
        <form action={saveHomepageWhyAction} className="content-form">
          <input type="hidden" name="locale" value={locale} />
          <label><span>Üst etiket</span><input name="eyebrow" maxLength={120} defaultValue={why?.eyebrow || ""} /></label>
          <label><span>Başlık</span><input name="title" required maxLength={220} defaultValue={why?.title || ""} placeholder={isEn ? "Why İlkOku?" : "Neden İlkOku?"} /></label>
          <label><span>Açıklama</span><textarea name="description" maxLength={700} rows={3} defaultValue={why?.description || ""} /></label>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageWhyAction} label="Neden İlkOku" locale={locale} section={why} />
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>05</span><h2>Footer</h2></div><p>{status(footer)}</p></div>
        <form action={saveHomepageFooterAction} className="content-form">
          <input type="hidden" name="locale" value={locale} />
          <label><span>Slogan</span><input name="slogan" required maxLength={220} defaultValue={footer?.slogan || ""} /></label>
          <label><span>Destek e-postası</span><input name="supportEmail" type="email" maxLength={220} defaultValue={footer?.supportEmail || ""} placeholder="destek@ilkoku.com" /></label>
          <label><span>Copyright metni</span><input name="copyright" maxLength={300} defaultValue={footer?.copyright || ""} /></label>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
        <PublishBox action={publishHomepageFooterAction} label="Footer" locale={locale} section={footer} />
      </div>
    </section>
  );
}
