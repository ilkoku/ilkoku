import Link from "next/link";
import { cmsLegalDocuments } from "@/lib/cms-legal";

export function CmsDocumentIndex() {
  return (
    <section>
      <div className="content-page-heading">
        <div>
          <span>Site</span>
          <h1>Belge Yönetimi</h1>
          <p>Platform belgelerinin yeni sürümlerini hazırlayın ve yönetin.</p>
        </div>
      </div>
      <div className="content-grid">
        {cmsLegalDocuments.map((item) => (
          <article className="content-card" key={item.slug}>
            <h2>{item.title}</h2>
            <p>Mevcut canlı sürüm korunur; yeni sürüm yayınlanana kadar taslak olarak kalır.</p>
            <Link href={`/icerik/yasal/${item.slug}`}>Düzenle →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
