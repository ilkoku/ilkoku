import { archiveRedirect, saveRedirect } from "@/features/cms/redirect-actions";
import { prisma } from "@/lib/prisma";

type Row = { contentKey: string; valueJson: string; status: string; updatedAt: Date };

type RedirectValue = { source?: string; target?: string; code?: number };

export default async function RedirectsPage() {
  let rows: Row[] = [];
  try {
    rows = await prisma.$queryRaw<Row[]>`
      SELECT contentKey, valueJson, status, updatedAt FROM SiteContent
      WHERE namespace = 'redirect' ORDER BY updatedAt DESC LIMIT 300
    `;
  } catch {}

  const items = rows.map((row) => {
    let value: RedirectValue = {};
    try { value = JSON.parse(row.valueJson) as RedirectValue; } catch {}
    return { ...row, source: value.source || row.contentKey, target: value.target || "", code: value.code || 308 };
  });

  return (
    <section className="content-editor-page">
      <div className="content-page-heading"><div><span>Büyüme</span><h1>Yönlendirmeler</h1><p>Eski site içi URL'leri yeni adreslere kalıcı olarak yönlendirin.</p></div></div>
      <div className="content-panel">
        <form action={saveRedirect} className="content-form">
          <label><span>Eski yol</span><input name="source" required placeholder="/eski-sayfa" /></label>
          <label><span>Yeni yol</span><input name="target" required placeholder="/yeni-sayfa" /></label>
          <div className="content-form-actions"><button type="submit">308 yönlendirmesi kaydet</button></div>
        </form>
      </div>
      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <h2>Kayıtlı yönlendirmeler</h2>
        {items.length === 0 ? <div className="content-empty"><strong>Henüz yönlendirme yok.</strong></div> : (
          <div className="content-list">{items.map((item) => (
            <div className="content-list-row" key={item.contentKey}>
              <strong>{item.source}</strong><span>→ {item.target}</span><small>{item.code} · {item.status} · {new Date(item.updatedAt).toLocaleString("tr-TR")}</small>
              {item.status !== "archived" ? <form action={archiveRedirect}><input type="hidden" name="source" value={item.source} /><button type="submit">Arşivle</button></form> : null}
            </div>
          ))}</div>
        )}
      </div>
    </section>
  );
}
