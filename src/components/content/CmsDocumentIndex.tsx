import Link from "next/link";
import { adoptPublicLegalPagesAction } from "@/features/cms/legal-adoption-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { cmsLegalContentKey, cmsLegalDocuments } from "@/lib/cms-legal";
import type { CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type StatusRow = {
  contentKey: string;
  status: "draft" | "published" | "archived";
};

function statusLabel(status?: StatusRow["status"]) {
  if (status === "published") return "Yayında";
  if (status === "draft") return "Taslak";
  if (status === "archived") return "Arşiv";
  return "Kayıt yok";
}

export async function CmsDocumentIndex({
  locale,
  localeEnabled,
  adopted,
  skipped,
}: {
  locale: CmsLocaleCode;
  localeEnabled: boolean;
  adopted?: number;
  skipped?: number;
}) {
  const access = await requireCmsManager("/icerik/yasal");
  const isEn = locale === "en";
  let rows: StatusRow[] = [];

  try {
    rows = isEn
      ? await prisma.$queryRaw<StatusRow[]>`
          SELECT contentKey, status FROM ContentPage
          WHERE contentKey LIKE 'legal:en:%'
        `
      : await prisma.$queryRaw<StatusRow[]>`
          SELECT contentKey, status FROM ContentPage
          WHERE contentKey LIKE 'legal:%'
            AND contentKey NOT LIKE 'legal:en:%'
        `;
  } catch {}

  const statusMap = new Map(rows.map((row) => [row.contentKey, row.status]));
  const missingCount = cmsLegalDocuments.filter((item) => !statusMap.has(cmsLegalContentKey(item.slug, locale))).length;
  const publishedCount = cmsLegalDocuments.filter((item) => statusMap.get(cmsLegalContentKey(item.slug, locale)) === "published").length;

  return (
    <section>
      <div className="content-page-heading">
        <div>
          <span>Site · {locale.toUpperCase()}</span>
          <h1>Belge Yönetimi</h1>
          <p>Platform belgelerinin dil bazlı sürümlerini hazırlayın ve yönetin.</p>
        </div>
        <div className="content-profile">
          <strong>{publishedCount}/5 yayında</strong>
          <small>{missingCount} kayıt eksik</small>
        </div>
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href="/icerik/yasal?dil=tr">Türkçe</Link>
        <Link href="/icerik/yasal?dil=en">English</Link>
        {isEn ? <Link href="/icerik/diller">Dil Yönetimi</Link> : null}
      </div>

      {typeof adopted === "number" ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Yasal CMS devralma tamamlandı.</strong>
          <p>{adopted} eksik belge CMS’ye alındı; {skipped ?? 0} mevcut kayıt güvenlik için değiştirilmeden bırakıldı.</p>
        </div>
      ) : null}

      {!isEn && missingCount > 0 ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Public yasal metinler henüz tamamen CMS sahipliğinde değil.</strong>
          <p>{missingCount} belge için CMS kaydı yok. Devralma işlemi publicte çalışan mevcut metinleri değiştirmez; yalnız eksik kayıtları ilk CMS yayın sürümü ve revision v1 olarak oluşturur. Mevcut CMS kayıtlarının üzerine yazılmaz.</p>
          {access.canPublish ? (
            <form action={adoptPublicLegalPagesAction} className="content-form-actions">
              <button type="submit">Eksik public yasal metinleri CMS’ye devral</button>
            </form>
          ) : (
            <p>Bu işlem yayın yetkisi olan bir içerik yöneticisi veya admin tarafından yapılabilir.</p>
          )}
        </div>
      ) : null}

      {!isEn && missingCount === 0 && publishedCount === 5 ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>TR yasal sayfalar CMS sahipliğinde.</strong>
          <p>5/5 belge yayın akışı, taslak, revision ve önizleme sistemi üzerinden yönetiliyor.</p>
        </div>
      ) : null}

      {isEn && !localeEnabled ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>İngilizce public yayın kapalı.</strong>
          <p>EN belgeleri taslak olarak hazırlanabilir; İngilizce dili etkinleştirilmeden yayınlanamaz.</p>
        </div>
      ) : null}

      <div className="content-grid">
        {cmsLegalDocuments.map((item) => {
          const key = cmsLegalContentKey(item.slug, locale);
          const status = statusMap.get(key);
          return (
            <article className="content-card" key={item.slug}>
              <small>Durum · {statusLabel(status)}</small>
              <h2>{item.title}</h2>
              <p>{isEn ? "İngilizce sürümü bağımsız taslak olarak hazırlayın." : status === "published" ? "CMS yayını aktif. Yeni değişiklikler güvenli taslak olarak hazırlanır." : "Mevcut public fallback korunur; CMS kaydı hazırlandığında yayın akışına geçer."}</p>
              <Link href={`/icerik/yasal/${item.slug}?dil=${locale}`}>Düzenle →</Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
