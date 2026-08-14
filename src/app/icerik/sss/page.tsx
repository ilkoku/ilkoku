import {
  archiveFaqAction,
  publishFaqAction,
  restoreFaqDraftAction,
  saveFaqAction,
  unpublishFaqAction,
} from "@/features/cms/faq-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";

type FaqStatus = "draft" | "published" | "archived";
type FaqRow = {
  contentKey: string;
  valueJson: string;
  status: FaqStatus;
  updatedAt: Date;
};

type FaqItem = {
  id?: string;
  question?: string;
  answer?: string;
  category?: string;
  audience?: string;
  position?: number;
};

const statusLabels: Record<FaqStatus, string> = {
  draft: "Taslak",
  published: "Yayında",
  archived: "Arşivde",
};

const audienceLabels: Record<string, string> = {
  all: "Herkes",
  reader: "Okuyucu",
  writer: "Yazar",
  editor: "Editör",
  publisher: "Yayınevi",
};

function parseFaq(valueJson: string): FaqItem {
  try {
    return JSON.parse(valueJson) as FaqItem;
  } catch {
    return {};
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export default async function Page() {
  const access = await requireCmsManager("/icerik/sss");

  let rows: FaqRow[] = [];
  try {
    rows = await prisma.$queryRaw<FaqRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'faq'
      ORDER BY updatedAt DESC
      LIMIT 300
    `;
  } catch {
    rows = [];
  }

  const items = rows.map((row) => ({ ...row, item: parseFaq(row.valueJson) }));
  const publishedCount = items.filter((item) => item.status === "published").length;
  const draftCount = items.filter((item) => item.status === "draft").length;
  const archivedCount = items.filter((item) => item.status === "archived").length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik</span>
          <h1>SSS & Yardım</h1>
          <p>Yardım Merkezi sorularını taslak, yayın, kategori, hedef kitle ve sıralama ile yönetin.</p>
        </div>
      </div>

      <div className="content-stats-grid">
        <article><span>Toplam</span><strong>{items.length}</strong><small>SSS kaydı</small></article>
        <article><span>Yayında</span><strong>{publishedCount}</strong><small>Public Yardım Merkezi</small></article>
        <article><span>Taslak</span><strong>{draftCount}</strong><small>Yayın bekliyor</small></article>
        <article><span>Arşiv</span><strong>{archivedCount}</strong><small>Publicte görünmüyor</small></article>
      </div>

      <div className="content-panel">
        <div className="content-section-heading">
          <div><span>01</span><h2>Yeni SSS taslağı</h2></div>
          <p>İçerik yöneticisi taslak hazırlayabilir. Canlıya alma yalnız yayın yetkisi olan kullanıcı tarafından yapılır.</p>
        </div>
        <form className="content-form" action={saveFaqAction}>
          <label><span>Soru</span><input name="question" required maxLength={300} /></label>
          <label><span>Cevap</span><textarea name="answer" required rows={7} maxLength={4000} /></label>
          <div className="content-form-grid">
            <label><span>Kategori</span><input name="category" maxLength={80} defaultValue="Genel" /></label>
            <label>
              <span>Hedef kitle</span>
              <select name="audience" defaultValue="all">
                <option value="all">Herkes</option>
                <option value="reader">Okuyucu</option>
                <option value="writer">Yazar</option>
                <option value="editor">Editör</option>
                <option value="publisher">Yayınevi</option>
              </select>
            </label>
            <label><span>Sıra</span><input name="position" type="number" min={0} max={9999} defaultValue={0} /></label>
          </div>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
        {items.length === 0 ? (
          <div className="content-panel">
            <div className="content-empty-state">
              <strong>Henüz SSS kaydı yok.</strong>
              <p>İlk taslağı yukarıdaki formdan oluşturabilirsin.</p>
            </div>
          </div>
        ) : items.map(({ contentKey, status, updatedAt, item }, index) => {
          const canChangeLive = status !== "published" || access.canPublish;
          const canArchive = status !== "published" || access.canPublish;

          return (
            <div className="content-panel" key={contentKey}>
              <div className="content-section-heading">
                <div><span>{String(index + 2).padStart(2, "0")}</span><h2>{item.question || "İsimsiz SSS"}</h2></div>
                <p>{statusLabels[status]} · {item.category || "Genel"} · {audienceLabels[item.audience || "all"] || "Herkes"} · Son değişiklik {formatDate(updatedAt)}</p>
              </div>

              <form className="content-form" action={saveFaqAction}>
                <input type="hidden" name="contentKey" value={contentKey} />
                <label><span>Soru</span><input name="question" required maxLength={300} defaultValue={item.question || ""} disabled={!canChangeLive} /></label>
                <label><span>Cevap</span><textarea name="answer" required rows={6} maxLength={4000} defaultValue={item.answer || ""} disabled={!canChangeLive} /></label>
                <div className="content-form-grid">
                  <label><span>Kategori</span><input name="category" maxLength={80} defaultValue={item.category || "Genel"} disabled={!canChangeLive} /></label>
                  <label>
                    <span>Hedef kitle</span>
                    <select name="audience" defaultValue={item.audience || "all"} disabled={!canChangeLive}>
                      <option value="all">Herkes</option>
                      <option value="reader">Okuyucu</option>
                      <option value="writer">Yazar</option>
                      <option value="editor">Editör</option>
                      <option value="publisher">Yayınevi</option>
                    </select>
                  </label>
                  <label><span>Sıra</span><input name="position" type="number" min={0} max={9999} defaultValue={item.position ?? 0} disabled={!canChangeLive} /></label>
                </div>
                <div className="content-form-actions">
                  {canChangeLive ? <button type="submit">Değişiklikleri Kaydet</button> : <span>Yayındaki içeriği değiştirmek için yayın yetkisi gerekir.</span>}
                </div>
              </form>

              <div className="content-form-actions" style={{ marginTop: ".9rem", flexWrap: "wrap" }}>
                {status === "draft" && access.canPublish ? (
                  <form action={publishFaqAction}><input type="hidden" name="contentKey" value={contentKey} /><button type="submit">Yayınla</button></form>
                ) : null}
                {status === "published" && access.canPublish ? (
                  <form action={unpublishFaqAction}><input type="hidden" name="contentKey" value={contentKey} /><button type="submit">Taslağa Al</button></form>
                ) : null}
                {status !== "archived" && canArchive ? (
                  <form action={archiveFaqAction}><input type="hidden" name="contentKey" value={contentKey} /><button type="submit">Arşivle</button></form>
                ) : null}
                {status === "archived" ? (
                  <form action={restoreFaqDraftAction}><input type="hidden" name="contentKey" value={contentKey} /><button type="submit">Taslağa Geri Al</button></form>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
