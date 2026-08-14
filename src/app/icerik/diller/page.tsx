import Link from "next/link";
import { updateCmsLocaleAction } from "@/features/cms/locale-actions";
import { requireCmsAdmin } from "@/lib/cms-access";
import { getCmsLocaleStates } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type CountRow = { total: bigint | number; status: "draft" | "published" | "archived" };

async function counts(namespace: string) {
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

export default async function Page() {
  await requireCmsAdmin("/icerik/diller");
  const locales = await getCmsLocaleStates();
  const enHomepage = await counts(cmsLocaleNamespace("homepage", "en"));
  const enFaq = await counts(cmsLocaleNamespace("faq", "en"));

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
          <p>Türkçe varsayılandır ve kapatılamaz. İngilizce ancak admin tarafından etkinleştirildiğinde public olur.</p>
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

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-section-heading">
          <div><span>02</span><h2>İngilizce içerik kapsamı</h2></div>
          <p>TR kayıtları değişmeden kalır; EN içerikler ayrı namespace içinde bağımsız taslak ve yayın durumuna sahiptir.</p>
        </div>
        <div className="content-metric-grid">
          <article className="content-metric-card"><span>Ana sayfa · Yayında</span><strong>{enHomepage.published ?? 0}</strong><small>EN section</small></article>
          <article className="content-metric-card"><span>Ana sayfa · Taslak</span><strong>{enHomepage.draft ?? 0}</strong><small>Yayın bekliyor</small></article>
          <article className="content-metric-card"><span>SSS · Yayında</span><strong>{enFaq.published ?? 0}</strong><small>EN Yardım Merkezi</small></article>
          <article className="content-metric-card"><span>SSS · Taslak</span><strong>{enFaq.draft ?? 0}</strong><small>Yayın bekliyor</small></article>
        </div>
        <div className="content-form-actions" style={{ marginTop: "1rem", flexWrap: "wrap" }}>
          <Link href="/icerik/ana-sayfa?dil=en">İngilizce Ana Sayfayı Düzenle</Link>
          <Link href="/icerik/sss?dil=en">İngilizce SSS’yi Düzenle</Link>
          <Link href="/en">Public /en</Link>
          <Link href="/en/yardim">Public /en/yardim</Link>
        </div>
      </div>
    </section>
  );
}
