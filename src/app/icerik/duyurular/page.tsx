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
type OperationalState = {
  key: "active" | "upcoming" | "expired" | "draft" | "archived" | "invalid";
  label: string;
  tone: "success" | "warning" | "info" | "danger";
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

function timestamp(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  const localMinute = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  const localSecond = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
  const parsed = localMinute.test(trimmed)
    ? new Date(`${trimmed}:00+03:00`)
    : localSecond.test(trimmed)
      ? new Date(`${trimmed}+03:00`)
      : new Date(trimmed);
  const milliseconds = parsed.getTime();
  return Number.isFinite(milliseconds) ? milliseconds : Number.NaN;
}

function operationalState(item: Row & Notice, now: number): OperationalState {
  if (item.status === "archived") return { key: "archived", label: "Arşiv", tone: "info" };
  if (item.status === "draft") return { key: "draft", label: "Taslak", tone: "warning" };
  if (item.status !== "published") return { key: "invalid", label: "Bilinmeyen durum", tone: "danger" };

  const startsAt = timestamp(item.startsAt);
  const endsAt = timestamp(item.endsAt);
  if ((item.startsAt && Number.isNaN(startsAt)) || (item.endsAt && Number.isNaN(endsAt))) {
    return { key: "invalid", label: "Zaman verisi geçersiz", tone: "danger" };
  }
  if (typeof endsAt === "number" && endsAt <= now) {
    return { key: "expired", label: "Yayında · bitiş tarihi geçti", tone: "danger" };
  }
  if (typeof startsAt === "number" && startsAt > now) {
    return { key: "upcoming", label: "Yayında · başlangıç ileri tarihli", tone: "info" };
  }
  return { key: "active", label: "Yayında", tone: "success" };
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
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
  const now = Date.now();
  const items = prepared.flatMap(({ row, data }) => data
    ? [{ ...row, ...data, operational: operationalState({ ...row, ...data }, now) }]
    : []);
  const count = (key: OperationalState["key"]) => items.filter((item) => item.operational.key === key).length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading"><div><span>İçerik</span><h1>Duyurular</h1><p>Platform, bakım ve kullanıcı bilgilendirmelerini taslak olarak hazırlayın; durum ve zaman penceresini tek ekrandan izleyin.</p></div></div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href="/icerik/duyurular">Duyurular</Link>
        <Link href="/icerik/yayin-kuyrugu">Yayın Kuyruğu</Link>
        <Link href="/icerik/zamanlama">Zamanlama</Link>
        <Link href="/icerik/gecmis">Geçmiş</Link>
      </div>

      {params.durum ? <div className="cms-editor-notice"><strong>İşlem sonucu:</strong><span>{params.durum}</span></div> : null}
      {invalid.length > 0 ? <div className="cms-editor-status-card" data-tone="danger" role="alert"><div><strong>{invalid.length} duyuru kaydı parse edilemiyor.</strong><p>Bu kayıtlar normal yayın/arşiv akışına sokulmaz; ham anahtarları teşhis için aşağıda görünür.</p></div><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className="cms-operation-grid" aria-label="Duyuru durum özeti">
        <article className="cms-operation-card"><span>Yayında</span><strong>{count("active")}</strong><small>Geçerli zaman penceresi</small></article>
        <article className="cms-operation-card"><span>İleri başlangıç</span><strong>{count("upcoming")}</strong><small>Yayın statüsü açık, başlangıç ileri</small></article>
        <article className="cms-operation-card"><span>Bitişi geçen</span><strong>{count("expired")}</strong><small>Kontrol edilmesi gereken yayın</small></article>
        <article className="cms-operation-card"><span>Taslak</span><strong>{count("draft")}</strong><small>Public sürümü değiştirmez</small></article>
        <article className="cms-operation-card"><span>Arşiv</span><strong>{count("archived")}</strong><small>Normal akış dışında</small></article>
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>01</span><h2>Yeni duyuru</h2></div><p>Taslak kaydedin veya yetkiniz varsa şimdi yayınlayın.</p></div>
        <form className="content-form" action="/api/content-notices" method="post">
          <input type="hidden" name="action" value="create" />
          <label><span>Başlık</span><input name="title" required maxLength={180} placeholder="Örn. Planlı bakım duyurusu" /></label>
          <label><span>Duyuru metni</span><textarea name="body" required rows={6} maxLength={2400} placeholder="Kullanıcıların göreceği kısa ve açık bilgilendirme" /></label>
          <div className="content-form-grid">
            <label><span>Hedef kitle</span><select name="audience" defaultValue="all"><option value="all">Herkes</option><option value="reader">Okurlar</option><option value="writer">Yazarlar</option><option value="editor">Editörler</option><option value="publisher">Yayınevleri</option></select></label>
            <label><span>Duyuru tipi</span><select name="level" defaultValue="info"><option value="info">Bilgi</option><option value="warning">Uyarı</option><option value="maintenance">Bakım</option></select></label>
            <label><span>Başlangıç</span><input name="startsAt" type="datetime-local" /></label>
            <label><span>Bitiş</span><input name="endsAt" type="datetime-local" /></label>
          </div>
          <div className="cms-editor-savebar"><div><strong>Duyuru kaydı</strong><p>Taslak kaydı public görünümü değiştirmez.</p></div><div className="content-form-actions"><button className="cms-editor-button--secondary" type="submit" name="publishNow" value="0">Taslak Kaydet</button>{access.canPublish ? <button type="submit" name="publishNow" value="1">Şimdi Yayınla</button> : null}</div></div>
        </form>
      </div>

      <div className="content-page-heading" style={{ marginTop: "2rem" }}><div><span>Kayıtlar</span><h2>Mevcut duyurular</h2><p>{items.length} geçerli · {invalid.length} bozuk kayıt.</p></div></div>

      {items.length === 0 && invalid.length === 0 ? <div className="content-empty"><strong>Henüz duyuru yok.</strong><p>İlk duyuruyu yukarıdaki formdan oluşturabilirsiniz.</p></div> : (
        <div className="content-grid">
          {invalid.map(({ row }) => <article className="content-card cms-announcement-card" key={`invalid-${row.contentKey}`}><span className="cms-operational-state" data-tone="danger">Bozuk kayıt</span><h2>{row.contentKey}</h2><p>JSON parse edilemiyor. Ham kayıt korunuyor; normal aksiyonlar kilitli.</p><p><strong>Son işlem:</strong> {formatDate(row.updatedAt)}</p></article>)}
          {items.map((item) => (
            <article className="content-card cms-announcement-card" key={item.contentKey}>
              <div className="cms-announcement-meta">
                <span className="cms-operational-state" data-tone={item.operational.tone}>{item.operational.label}</span>
                <small>{statusText[item.status] || item.status} · {item.audience || "all"} · {item.level || "info"}</small>
              </div>
              <h2>{item.title || "Başlıksız duyuru"}</h2>
              <p>{item.body || "—"}</p>
              <p><strong>Zaman:</strong> {item.startsAt || "hemen"} → {item.endsAt || "süresiz"}</p>
              <p><strong>Son işlem:</strong> {formatDate(item.updatedAt)}</p>
              <div className="content-form-actions" style={{ marginTop: "auto" }}>
                {item.status !== "published" && access.canPublish ? <form action="/api/content-notices" method="post"><input type="hidden" name="action" value="publish" /><input type="hidden" name="key" value={item.contentKey} /><button type="submit">Yayınla</button></form> : null}
                {item.status === "published" && access.canPublish ? <form action="/api/content-notices" method="post"><input type="hidden" name="action" value="unpublish" /><input type="hidden" name="key" value={item.contentKey} /><button className="cms-editor-button--secondary" type="submit">Taslağa Al</button></form> : null}
                {item.status !== "archived" ? <form action="/api/content-notices" method="post"><input type="hidden" name="action" value="archive" /><input type="hidden" name="key" value={item.contentKey} /><button className="cms-editor-button--danger" type="submit">Arşivle</button></form> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
