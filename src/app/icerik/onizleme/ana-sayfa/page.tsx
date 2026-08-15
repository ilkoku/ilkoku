import Link from "next/link";
import { getCmsDraftsByPrefix } from "@/lib/cms-drafts";
import { cmsLocaleNamespace, normalizeCmsLocale } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type Row = { contentKey: string; valueJson: string; status: "draft" | "published" | "archived" };
type Values = Record<string, string>;

function parse(valueJson: string): Values {
  try {
    const raw = JSON.parse(valueJson) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch { return {}; }
}

function clean(raw: Record<string, unknown>): Values {
  return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export const dynamic = "force-dynamic";

export default async function HomepagePreview({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const namespace = cmsLocaleNamespace("homepage", locale);
  let rows: Row[] = [];
  try {
    rows = await prisma.$queryRaw<Row[]>`
      SELECT contentKey, valueJson, status FROM SiteContent WHERE namespace = ${namespace}
    `;
  } catch {}

  const live = new Map(rows.filter((row) => row.status === "published").map((row) => [row.contentKey, parse(row.valueJson)]));
  const drafts = await getCmsDraftsByPrefix<Record<string, unknown>>(`homepage:${locale}:`).catch(() => []);
  const staged = new Map(drafts.map((draft) => [draft.contentKey.replace(`homepage:${locale}:`, ""), clean(draft.payload)]));
  const section = (key: string) => staged.get(key) ?? live.get(key) ?? {};

  const hero = section("hero");
  const roles = section("roles");
  const passport = section("passport");
  const why = section("why");
  const footer = section("footer");
  const pending = drafts.length;
  const isEn = locale === "en";
  const statDefaults = isEn
    ? [["2.847+", "Writers"], ["18.592+", "Readers"], ["412+", "Editors"], ["78+", "Publishers"], ["6.215+", "Works"], ["34.760+", "Comments"]]
    : [["2.847+", "Yazar"], ["18.592+", "Okuyucu"], ["412+", "Editör"], ["78+", "Yayınevi"], ["6.215+", "Eser"], ["34.760+", "Yorum"]];

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Önizleme · {locale.toUpperCase()}</span><h1>Ana sayfa taslak önizlemesi</h1><p>Bu ekran yalnız CMS içinde görünür. Bekleyen taslaklar varsa canlı sürümün üzerine uygulanmış gibi gösterilir; public site değişmez.</p></div>
        <div className="content-form-actions"><Link href={`/icerik/ana-sayfa?dil=${locale}`}>← Düzenlemeye dön</Link></div>
      </div>

      <div className="cms-preview-shell">
        <div className="cms-preview-banner"><span>Taslak Önizleme · Public Değil</span><span>{pending} bekleyen ana sayfa taslağı</span></div>
        <div className="cms-preview-home">
          <header><div className="cms-preview-brand">İlkOku</div><small>Dijital edebiyat platformu</small></header>

          <section className="cms-preview-hero">
            <div>
              <span className="cms-preview-eyebrow">İlkOku</span>
              <h1>{hero.title || "İlk cümle, ilk okurun, ilk adımın."}</h1>
              <p>{hero.description || "Eserini yaz, okurlarla geliştir, profesyonel editör incelemesine taşı ve yayınevleri tarafından keşfedil."}</p>
              <div className="cms-preview-actions">
                <span className="cms-preview-button">{hero.primaryCtaLabel || "Eserini Yazmaya Başla"}</span>
                <span className="cms-preview-button secondary">{hero.secondaryCtaLabel || "Eserleri Keşfet"}</span>
              </div>
            </div>
          </section>

          <section className="cms-preview-section">
            <div><span className="cms-preview-eyebrow">{roles.eyebrow || "Topluluğa katıl"}</span><h2>{roles.title || "İlkOku’ya nasıl katılmak istiyorsun?"}</h2><p>{roles.description || "Rolünü seç; kayıt akışını sana uygun şekilde başlatalım."}</p></div>
            <div className="cms-preview-role-grid">
              {["Yazar", "Okuyucu", "Editör", "Yayınevi"].map((role) => <article key={role}><strong>{role}</strong><p>İlkOku çalışma alanına bu rolle katıl.</p></article>)}
            </div>
          </section>

          <section className="cms-preview-section">
            <div className="cms-preview-passport"><span className="cms-preview-eyebrow">{passport.eyebrow || "Eserin dijital izi"}</span><h2>{passport.title || "Bir eserin yalnızca sonucunu değil, oluşum sürecini de görün."}</h2><p>{passport.description || "Eser Pasaportu, yazım ve inceleme sürecini tek kayıtta birleştirir."}</p><div className="cms-preview-actions" style={{ justifyContent: "flex-start" }}><span className="cms-preview-button">{passport.ctaLabel || "Rolünü Seç"}</span></div></div>
          </section>

          <section className="cms-preview-section">
            <div><span className="cms-preview-eyebrow">{why.eyebrow || "Güven, kayıt ve keşif"}</span><h2>{why.title || "Neden İlkOku?"}</h2><p>{why.description || "Yazar, okuyucu, editör ve yayınevlerini kayıtlı bir edebiyat ekosisteminde buluşturur."}</p></div>
            <div className="cms-preview-role-grid" aria-label="Manuel istatistik şeridi önizlemesi">
              {statDefaults.map(([fallbackValue, fallbackLabel], index) => {
                const item = index + 1;
                return <article key={item}><strong>{why[`stat${item}Value`] || fallbackValue}</strong><p>{why[`stat${item}Label`] || fallbackLabel}</p></article>;
              })}
            </div>
          </section>

          <footer className="cms-preview-footer"><strong>İlkOku</strong><p>{footer.slogan || "İlk cümle, ilk okurun, ilk adımın."}</p><small>{footer.copyright || "© 2026 İlkOku. Tüm hakları saklıdır."}</small></footer>
        </div>
      </div>
    </section>
  );
}
