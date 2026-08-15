import Link from "next/link";
import { getCmsAccess } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";

type Row = { contentKey: string; valueJson: string; status: string; updatedAt: Date };
type Notice = {
  title?: string;
  body?: string;
  audience?: string;
  level?: string;
  startsAt?: string | null;
  endsAt?: string | null;
};

export const dynamic = "force-dynamic";

const statusText: Record<string, string> = { draft: "Taslak", published: "Yayında", archived: "Arşiv" };

function parseNotice(valueJson: string): Notice | null {
  try {
    const value = JSON.parse(valueJson) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Notice : null;
  } catch {
    return null;
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const params = await searchParams;
  const access = await getCmsAccess();
  let rows: Row[] | null = null;

  try {
    rows = await prisma.$queryRaw<Row[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'announcement'
      ORDER BY updatedAt DESC
      LIMIT 200
    `;
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>İçerik</span><h1>Duyurular</h1><p>Duyuru verisi doğrulanamadığında yeni yayın kararı üretilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Duyuru kayıtları okunamadı.</strong><p>Bu durum “henüz duyuru yok” anlamına gelmez. Mevcut durum görülmeden oluşturma, yayınlama, taslağa alma veya arşivleme aksiyonları durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/duyurular">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const prepared = rows.map((row) => ({ row, data: parseNotice(row.valueJson) }));
  const invalid = prepared.filter((item) => !item.data);
  const items = prepared.flatMap(({ row, data }) => data ? [{ ...row, ...data }] : []);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading"><div><span>İçerik</span><h1>Duyurular</h1><p>Platform, bakım ve kullanıcı bilgilendirmelerini taslak olarak hazırlayın; yayın zamanı ve hedef kitle belirleyin.</p></div></div>
      {params.durum ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>İşlem sonucu:</strong> {params.durum}</div> : null}
      {invalid.length > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalid.length} duyuru kaydı parse edilemiyor.</strong><p>Bu kayıtlar normal yayın/arşiv akışına sokulmaz; ham anahtarları teşhis için aşağıda görünür.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className="content-panel">
        <form className="content-form" action="/api/content-notices" method="post">
          <input type="hidden" name="action" value="create" />
          <label><span>Başlık</span><input name="title" required maxLength={180} placeholder="Örn. Planlı bakım duyurusu" /></label>
          <label><span>Duyuru metni</span><textarea name="body" required rows={6} maxLength={2400} placeholder="Kullanıcıların göreceği kısa ve açık bilgilendirme" /></label>
          <div className="content-form-grid">
            <label><span>Hedef kitle</span><select name="audience" defaultValue="all"><option value="all">Herkes</option><option value="reader">Okurlar</option><option value="writer">Yazarlar</option><option value="editor">Editörler</option><option value="publisher">Yayınevleri</option></select></label>
            <label><span>Duyuru tipi</span><select name="level" defaultValue="info"><option value="info">Bilgi</option><option value="warning">Uyarı</option><option value="maintenance">Bakım</option></select></label>
            <label><span>Başlangıç</span><input name="startsAt" type="datetime-local" /></label><label><span>Bitiş</span><input name="endsAt" type="datetime-local" /></label>
          </div>
          <div className="content-form-actions"><button type="submit" name="publishNow" value="0">Taslak Kaydet</button>{access.canPublish ? <button type="submit" name="publishNow" value="1">Şimdi Yayınla</button> : null}</div>
        </form>
      </div>

      <div className="content-page-heading" style={{ marginTop: "2rem" }}><div><span>Kayıtlar</span><h2>Mevcut duyurular</h2><p>{items.length} geçerli · {invalid.length} bozuk kayıt.</p></div></div>

      {items.length === 0 && invalid.length === 0 ? <div className="content-empty"><strong>Henüz duyuru yok.</strong><p>İlk duyuruyu yukarıdaki formdan oluşturabilirsiniz.</p></div> : (
        <div className="content-grid">
          {invalid.map(({ row }) => <article className="content-card" key={`invalid-${row.contentKey}`}><small>BOZUK KAYIT · {row.status}</small><h2>{row.contentKey}</h2><p>JSON parse edilemiyor. Ham kayıt korunuyor; normal aksiyonlar kilitli.</p><p><strong>Son işlem:</strong> {new Date(row.updatedAt).toLocaleString("tr-TR")}</p></article>)}
          {items.map((item) => <article className="content-card" key={item.contentKey}><small>{statusText[item.status] || item.status} · {item.audience || "all"} · {item.level || "info"}</small><h2>{item.title || "Başlıksız duyuru"}</h2><p>{item.body || "—"}</p><p><strong>Zaman:</strong> {item.startsAt || "hemen"} → {item.endsAt || "süresiz"}</p><p><strong>Son işlem:</strong> {new Date(item.updatedAt).toLocaleString("tr-TR")}</p><div className="content-form-actions" style={{ marginTop: "auto" }}>{item.status !== "published" && access.canPublish ? <form action="/api/content-notices" method="post"><input type="hidden" name="action" value="publish" /><input type="hidden" name="key" value={item.contentKey} /><button type="submit">Yayınla</button></form> : null}{item.status === "published" && access.canPublish ? <form action="/api/content-notices" method="post"><input type="hidden" name="action" value="unpublish" /><input type="hidden" name="key" value={item.contentKey} /><button type="submit">Taslağa Al</button></form> : null}{item.status !== "archived" ? <form action="/api/content-notices" method="post"><input type="hidden" name="action" value="archive" /><input type="hidden" name="key" value={item.contentKey} /><button type="submit">Arşivle</button></form> : null}</div></article>)}
        </div>
      )}
    </section>
  );
}
