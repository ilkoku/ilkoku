import { prisma } from "@/lib/prisma";

type ContentPageRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

export const dynamic = "force-dynamic";

export default async function Page() {
  let pages: ContentPageRow[] = [];

  try {
    pages = await prisma.$queryRaw<ContentPageRow[]>`
      SELECT id, slug, title, status, updatedAt
      FROM ContentPage
      ORDER BY updatedAt DESC
      LIMIT 100
    `;
  } catch {
    pages = [];
  }

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik</span>
          <h1>Sayfalar</h1>
          <p>Kurumsal ve bilgilendirme sayfalarını taslak, yayında ve arşiv durumlarına göre yönetin.</p>
        </div>
      </div>

      <div className="content-panel">
        {pages.length === 0 ? (
          <div className="content-empty-state">
            <strong>Henüz CMS sayfası yok.</strong>
            <p>İlk ContentPage kaydı oluşturulduğunda burada listelenecek.</p>
          </div>
        ) : (
          <div className="content-table-wrap">
            <table className="content-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>URL</th>
                  <th>Durum</th>
                  <th>Son güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id}>
                    <td>{page.title}</td>
                    <td>/{page.slug}</td>
                    <td>{page.status === "published" ? "Yayında" : page.status === "archived" ? "Arşiv" : "Taslak"}</td>
                    <td>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(page.updatedAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
