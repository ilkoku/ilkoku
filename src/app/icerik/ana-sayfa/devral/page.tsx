import Link from "next/link";
import { adoptHomepageFallbackAction } from "@/features/cms/homepage-adoption-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { homepagePublicFallback, type HomepagePublicSectionKey } from "@/lib/homepage-public-content";
import { prisma } from "@/lib/prisma";

const sectionKeys: HomepagePublicSectionKey[] = ["hero", "roles", "passport", "why", "footer"];
const sectionLabels: Record<HomepagePublicSectionKey, string> = {
  hero: "Hero",
  roles: "Rol seçimi",
  passport: "Eser Pasaportu",
  why: "Neden İlkOku?",
  footer: "Footer",
};

type ExistingRow = { contentKey: string; status: "draft" | "published" | "archived" };

export default async function Page({ searchParams }: { searchParams: Promise<{ devralindi?: string }> }) {
  const access = await requireCmsManager("/icerik/ana-sayfa/devral");
  const params = await searchParams;
  let rows: ExistingRow[] = [];
  try {
    rows = await prisma.$queryRaw<ExistingRow[]>`
      SELECT contentKey, status
      FROM SiteContent
      WHERE namespace = 'homepage'
        AND contentKey IN ('hero', 'roles', 'passport', 'why', 'footer')
    `;
  } catch {}

  const byKey = new Map(rows.map((row) => [row.contentKey, row]));
  const published = sectionKeys.filter((key) => byKey.get(key)?.status === "published").length;
  const missing = sectionKeys.filter((key) => !byKey.has(key));
  const adopted = Number(params.devralindi ?? 0);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>44. İşlem · Ana Sayfa Devralma</span>
          <h1>Canlı ana sayfayı CMS sahipliğine al</h1>
          <p>Mevcut public görünümü ve metinleri değiştirmeden yalnız eksik 5 temel ana sayfa kaydını CMS içinde ilk yayın sürümü olarak oluşturur.</p>
        </div>
        <div className="content-profile">
          <strong>{published}/5 yayında</strong>
          <small>{missing.length} eksik kayıt</small>
        </div>
      </div>

      {adopted > 0 ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>{adopted} ana sayfa bölümü CMS’ye devralındı.</strong>
          <p>Canlı görünüm korunur. Sistem Sağlığı ekranına dönerek kapsamı yeniden kontrol edebilirsiniz.</p>
        </div>
      ) : null}

      <div className="content-panel">
        <strong>Devralma güvenliği</strong>
        <p>İşlem mevcut CMS kayıtlarının üzerine yazmaz. Yalnız hiç kaydı olmayan bölümleri oluşturur. Hero, rol alanı, Eser Pasaportu ve Neden İlkOku metinleri mevcut canlı fallback ile birebir alınır; footer hydrator’ı slogan vurgusunu ve yasal link barını korur.</p>
        <div className="content-list" style={{ marginTop: "1rem" }}>
          {sectionKeys.map((key) => {
            const row = byKey.get(key);
            return (
              <article className="content-list-row" key={key}>
                <div>
                  <strong>{sectionLabels[key]}</strong>
                  <p>{row ? `CMS kaydı mevcut · ${row.status}` : "CMS kaydı yok · canlı kod fallback’i kullanılıyor"}</p>
                </div>
                <small>{homepagePublicFallback[key] ? (row ? "Korunacak" : "Devralınacak") : ""}</small>
              </article>
            );
          })}
        </div>

        <div className="content-form-actions" style={{ marginTop: "1rem", flexWrap: "wrap" }}>
          {missing.length > 0 && access.canPublish ? (
            <form action={adoptHomepageFallbackAction}>
              <button type="submit">Eksik canlı ana sayfa bölümlerini CMS’ye devral</button>
            </form>
          ) : null}
          {missing.length > 0 && !access.canPublish ? <span>Devralma için yayın yetkisi gerekir.</span> : null}
          <Link href="/icerik/ana-sayfa?dil=tr">Ana Sayfa editörüne dön →</Link>
          <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
        </div>
      </div>
    </section>
  );
}
