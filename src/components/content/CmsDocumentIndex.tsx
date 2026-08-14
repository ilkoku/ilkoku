import Link from "next/link";
import { cmsLegalDocuments } from "@/lib/cms-legal";
import type { CmsLocaleCode } from "@/lib/cms-locales";

export function CmsDocumentIndex({
  locale,
  localeEnabled,
}: {
  locale: CmsLocaleCode;
  localeEnabled: boolean;
}) {
  const isEn = locale === "en";

  return (
    <section>
      <div className="content-page-heading">
        <div>
          <span>Site · {locale.toUpperCase()}</span>
          <h1>Belge Yönetimi</h1>
          <p>Platform belgelerinin dil bazlı sürümlerini hazırlayın ve yönetin.</p>
        </div>
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href="/icerik/yasal?dil=tr">Türkçe</Link>
        <Link href="/icerik/yasal?dil=en">English</Link>
        {isEn ? <Link href="/icerik/diller">Dil Yönetimi</Link> : null}
      </div>

      {isEn && !localeEnabled ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>İngilizce public yayın kapalı.</strong>
          <p>EN belgeleri taslak olarak hazırlanabilir; İngilizce dili etkinleştirilmeden yayınlanamaz.</p>
        </div>
      ) : null}

      <div className="content-grid">
        {cmsLegalDocuments.map((item) => (
          <article className="content-card" key={item.slug}>
            <h2>{item.title}</h2>
            <p>{isEn ? "İngilizce sürümü bağımsız taslak olarak hazırlayın." : "Mevcut canlı sürüm korunur; yeni sürüm yayınlanana kadar taslak olarak kalır."}</p>
            <Link href={`/icerik/yasal/${item.slug}?dil=${locale}`}>Düzenle →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
