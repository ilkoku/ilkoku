import Link from "next/link";
import { updateCmsLocaleAction } from "@/features/cms/locale-actions";
import { requireCmsAdmin } from "@/lib/cms-access";
import { getCmsLocaleStates } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type CountRow = { total: bigint | number; status: "draft" | "published" | "archived" };

async function siteContentCounts(namespace: string) {
  try {
    const rows = await prisma.$queryRaw<CountRow[]>`
      SELECT status, COUNT(*) AS total
      FROM SiteContent
      WHERE namespace = ${namespace}
      GROUP BY status
    `;
    return Object.fromEntries(rows.map((row) => [row.status, Number(row.total)])) as Record<string, number>;
  } catch {
    return {};
  }
}

async function pageCounts(pattern: string) {
  try {
    const rows = await prisma.$queryRaw<CountRow[]>`
      SELECT status, COUNT(*) AS total
      FROM ContentPage
      WHERE contentKey LIKE ${pattern}
      GROUP BY status
    `;
    return Object.fromEntries(rows.map((row) => [row.status, Number(row.total)])) as Record<string, number>;
  } catch {
    return {};
  }
}

export default async function Page() {
  await requireCmsAdmin("/icerik/diller");
  const locales = await getCmsLocaleStates();
  const enEnabled = locales.some((locale) => locale.code === "en" && locale.enabled);
  const enHomepage = await siteContentCounts(cmsLocaleNamespace("homepage", "en"));
  const enFaq = await siteContentCounts(cmsLocaleNamespace("faq", "en"));
  const enLegal = await pageCounts("legal:en:%");
  const enGuides = await pageCounts("guide:en:%");

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Büyüme</span>
          <h1>Dil Yönetimi</h1>
          <p>Public dilleri açın, içerik kapsamını görün ve dil bazlı yayın akışını yönetin.</p>
        </div>
      </div>

      <div className="content-panel">
        <div className="content-section-heading">
          <div><span>01</span><h2>Public diller</h2></div>
          <p>Türkçe varsayılandır ve kapatılamaz. İngilizce yalnız admin kararıyla etkinleştirilir.</p>
        </div>
        <div className="content-list">
          {locales.map((locale) => (
            <div className="content-list-row" key={locale.code}>
              <strong>{locale.label}</strong>
              <span>{locale.code.toUpperCase()}</span>
              <small>{locale.isDefault ? "Varsayılan dil" : locale.enabled ? "Public açık" : "Hazır bekliyor"}</small>
              {locale.isDefault ? (
                <span>Aktif</span>
              ) : (
                <form action={updateCmsLocaleAction}>
                  <input type="hidden" name="locale" value={locale.code} />
                  <input type="hidden" name="enabled" value={locale.enabled ? "false" : "true"} />
                  <button type="submit">{locale.enabled ? "Public’i Kapat" : "Public’i Aç"}</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>

      {!enEnabled ? (
        <div className="content-panel" style={{ marginTop: "1rem" }}>
          <strong>EN public kapalı.</strong>
          <p>İngilizce içerikler yalnız taslak hazırlık alanıdır. Ana Sayfa, SSS, Yasal Sayfalar ve Rehber modüllerinde yayınlama kilitlidir.</p>
        </div>
      ) : null}

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-section-heading">
          <div><span>02</span><h2>İngilizce içerik kapsamı</h2></div>
          <p>TR kayıtları değişmeden kalır; EN içerikler bağımsız kayıt alanlarında hazırlanır.</p>
        </div>
        <div className="content-metric-grid">
          <article className="content-metric-card"><span>Ana sayfa · Taslak</span><strong>{enHomepage.draft ?? 0}</strong><small>{enHomepage.published ?? 0} published kayıt</small></article>
          <article className="content-metric-card"><span>SSS · Taslak</span><strong>{enFaq.draft ?? 0}</strong><small>{enFaq.published ?? 0} published kayıt</small></article>
          <article className="content-metric-card"><span>Yasal · Taslak</span><strong>{enLegal.draft ?? 0}</strong><small>{enLegal.published ?? 0} published kayıt</small></article>
          <article className="content-metric-card"><span>Rehber · Taslak</span><strong>{enGuides.draft ?? 0}</strong><small>{enGuides.published ?? 0} published kayıt</small></article>
        </div>
        <div className="content-form-actions" style={{ marginTop: "1rem", flexWrap: "wrap" }}>
          <Link href="/icerik/ana-sayfa?dil=en">İngilizce Ana Sayfa</Link>
          <Link href="/icerik/sss?dil=en">İngilizce SSS</Link>
          <Link href="/icerik/yasal?dil=en">İngilizce Yasal Sayfalar</Link>
          <Link href="/icerik/rehber?dil=en">İngilizce Rehber</Link>
          {enEnabled ? <Link href="/en">Public /en</Link> : null}
        </div>
      </div>
    </section>
  );
}
