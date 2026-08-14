import { prisma } from "@/lib/prisma";

type SubmissionRow = { contentKey: string; valueJson: string; status: string; updatedAt: Date };
type Submission = { id?: string; name?: string; email?: string; subject?: string; message?: string; state?: string };

export const dynamic = "force-dynamic";

export default async function Page() {
  let rows: SubmissionRow[] = [];
  try {
    rows = await prisma.$queryRaw<SubmissionRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'form_submission'
      ORDER BY updatedAt DESC
      LIMIT 200
    `;
  } catch {}

  const items = rows.map((row) => {
    let data: Submission = {};
    try { data = JSON.parse(row.valueJson) as Submission; } catch {}
    return { ...row, ...data };
  });

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Büyüme</span><h1>Formlar & Talepler</h1><p>Kurumsal iletişim formundan gelen talepleri yönetin.</p></div>
      </div>
      <div className="content-panel">
        {items.length === 0 ? (
          <div className="content-empty-state"><strong>Henüz talep yok.</strong><p>Public iletişim formundan gönderilen kayıtlar burada listelenecek.</p></div>
        ) : (
          <div className="content-table-wrap">
            <table className="content-table">
              <thead><tr><th>Gönderen</th><th>Konu</th><th>Mesaj</th><th>Durum</th><th>Tarih</th><th /></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.contentKey}>
                    <td><strong>{item.name || "—"}</strong><br /><small>{item.email || "—"}</small></td>
                    <td>{item.subject || "Genel talep"}</td>
                    <td>{item.message || "—"}</td>
                    <td>{item.status === "archived" ? "Arşiv" : "Yeni"}</td>
                    <td>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt))}</td>
                    <td>{item.status !== "archived" ? <form action="/api/site-contact-manage" method="post"><input type="hidden" name="key" value={item.contentKey} /><button type="submit">Arşivle</button></form> : null}</td>
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
