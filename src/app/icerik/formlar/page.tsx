import Link from "next/link";
import { prisma } from "@/lib/prisma";

type SubmissionRow = { contentKey: string; valueJson: string; status: string; updatedAt: Date };
type Submission = { id?: string; name?: string; email?: string; subject?: string; message?: string; state?: string };

export const dynamic = "force-dynamic";

function parseSubmission(valueJson: string): Submission | null {
  try {
    const value = JSON.parse(valueJson) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Submission : null;
  } catch {
    return null;
  }
}

export default async function Page() {
  let rows: SubmissionRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<SubmissionRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'form_submission'
      ORDER BY updatedAt DESC
      LIMIT 200
    `;
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Büyüme</span><h1>Formlar & Talepler</h1><p>Talep verileri doğrulanamadığında boş liste sonucu üretilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Form talepleri okunamadı.</strong><p>Bu durum “henüz talep yok” anlamına gelmez. Kayıtlar doğrulanana kadar arşivleme işlemleri durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/formlar">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const prepared = rows.map((row) => ({ row, data: parseSubmission(row.valueJson) }));
  const invalid = prepared.filter((item) => !item.data);
  const items = prepared.flatMap(({ row, data }) => data ? [{ ...row, ...data }] : []);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading"><div><span>Büyüme</span><h1>Formlar & Talepler</h1><p>Kurumsal iletişim formundan gelen talepleri yönetin.</p></div></div>
      {invalid.length > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalid.length} form kaydı parse edilemiyor.</strong><p>Bozuk kayıtlar sessizce kaybolmaz; ham anahtarları aşağıda teşhis için gösterilir ve normal arşiv akışına sokulmaz.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}
      <div className="content-panel">
        {items.length === 0 && invalid.length === 0 ? <div className="content-empty-state"><strong>Henüz talep yok.</strong><p>Public iletişim formundan gönderilen kayıtlar burada listelenecek.</p></div> : (
          <div className="content-table-wrap"><table className="content-table"><thead><tr><th>Gönderen</th><th>Konu</th><th>Mesaj</th><th>Durum</th><th>Tarih</th><th /></tr></thead><tbody>
            {invalid.map(({ row }) => <tr key={`invalid-${row.contentKey}`}><td><strong>Bozuk kayıt</strong><br /><small>{row.contentKey}</small></td><td>Parse edilemiyor</td><td>Ham veri korunuyor</td><td>{row.status}</td><td>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.updatedAt))}</td><td><small>Teşhis gerekli</small></td></tr>)}
            {items.map((item) => <tr key={item.contentKey}><td><strong>{item.name || "—"}</strong><br /><small>{item.email || "—"}</small></td><td>{item.subject || "Genel talep"}</td><td>{item.message || "—"}</td><td>{item.status === "archived" ? "Arşiv" : "Yeni"}</td><td>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt))}</td><td>{item.status !== "archived" ? <form action="/api/site-contact-manage" method="post"><input type="hidden" name="key" value={item.contentKey} /><button type="submit">Arşivle</button></form> : null}</td></tr>)}
          </tbody></table></div>
        )}
      </div>
    </section>
  );
}
