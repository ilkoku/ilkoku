import Link from "next/link";
import { prisma } from "@/lib/prisma";

type GuideRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

export const dynamic = "force-dynamic";

export default async function GuideCmsPage() {
  let guides: GuideRow[] = [];

  try {
    guides = await prisma.$queryRaw<GuideRow[]>`
      SELECT id, slug, title, status, updatedAt
      FROM ContentPage
      WHERE slug LIKE 'rehber/%'
      ORDER BY updatedAt DESC
      LIMIT 100
    `;
  } catch {
    guides = [];
  }

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik</span>
          <h1>Rehber & İçerikler</h1>
          <p>İlkOku adına yayınlanan editoryal rehberleri ve kurumsal içerikleri tek merkezden izleyin.</p>
        </div>
        <Link className="content-button" href="/rehber" target="_blank">
          Public rehberi aç
        </Link>
      </div>

      <div className="content-panel">
        {guides.length === 0 ? (
          <div className="content-empty-state">
            <strong>Henüz rehber içeriği yok.</strong>
            <p>Slug değeri <code>rehber/...</code> ile başlayan ContentPage kayıtları burada listelenecek.</p>
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
                {guides.map((guide) => (
                  <tr key={guide.id}>
                    <td>{guide.title}</td>
                    <td>/{guide.slug}</td>
                    <td>
                      {guide.status === "published"
                        ? "Yayında"
                        : guide.status === "archived"
                          ? "Arşiv"
                          : "Taslak"}
                    </td>
                    <td>
                      {new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(guide.updatedAt))}
                    </td>
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
