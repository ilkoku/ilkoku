import Link from "next/link";
import {
  archiveFaqAction,
  publishFaqAction,
  restoreFaqDraftAction,
  saveFaqAction,
  unpublishFaqAction,
} from "@/features/cms/faq-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace, normalizeCmsLocale } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type FaqStatus = "draft" | "published" | "archived";
type FaqRow = { contentKey: string; valueJson: string; status: FaqStatus; updatedAt: Date };
type FaqItem = { id?: string; question?: string; answer?: string; category?: string; audience?: string; position?: number };

const statusLabels: Record<FaqStatus, string> = { draft: "Taslak", published: "Yayında", archived: "Arşivde" };
const audienceLabels: Record<string, string> = { all: "Herkes", reader: "Okuyucu", writer: "Yazar", editor: "Editör", publisher: "Yayınevi" };

function parseFaq(valueJson: string): FaqItem {
  try { return JSON.parse(valueJson) as FaqItem; } catch { return {}; }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(value);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const access = await requireCmsManager("/icerik/sss");
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const namespace = cmsLocaleNamespace("faq", locale);
  const localeEnabled = await isCmsLocaleEnabled(locale);
  const isEn = locale === "en";
  const canPublishLocale = access.canPublish && localeEnabled;

  let rows: FaqRow[] = [];
  try {
    rows = await prisma.$queryRaw<FaqRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = ${namespace}
      ORDER BY updatedAt DESC
      LIMIT 300
    `;
  } catch { rows = []; }

  const items = rows.map((row) => ({ ...row, item: parseFaq(row.valueJson) }));
  const publishedCount = items.filter((item) => item.status === "published").length;
  const draftCount = items.filter((item) => item.status === "draft").length;
  const archivedCount = items.filter((item) => item.status === "archived").length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading"><div><span>İçerik · {locale.toUpperCase()}</span><h1>SSS & Yardım</h1><p>Her dilin Yardım Merkezi kayıtları birbirinden bağımsızdır.</p></div></div>

      <div className="content-form-actions" style={{ marginBottom: "1rem" }}>
        <Link href="/icerik/sss?dil=tr">Türkçe</Link>
        <Link href="/icerik/sss?dil=en">English</Link>
        {isEn ? <Link href="/icerik/diller">Dil Yönetimi</Link> : null}
      </div>

      {isEn && !localeEnabled ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>İngilizce public yayın kapalı.</strong>
          <p>EN SSS kayıtları taslak olarak hazırlanabilir; dil açılmadan yeni bir kayıt yayınlanamaz.</p>
        </div>
      ) : null}

      <div className="content-metric-grid">
        <article className="content-metric-card"><span>Toplam</span><strong>{items.length}</strong><small>{locale.toUpperCase()} SSS</small></article>
        <article className="content-metric-card"><span>Yayında</span><strong>{publishedCount}</strong><small>{localeEnabled ? "Public Yardım Merkezi" : "Public dil kapalı"}</small></article>
        <article className="content-metric-card"><span>Taslak</span><strong>{draftCount}</strong><small>Yayın bekliyor</small></article>
        <article className="content-metric-card"><span>Arşiv</span><strong>{archivedCount}</strong><small>Publicte görünmüyor</small></article>
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>01</span><h2>Yeni SSS taslağı</h2></div><p>{locale.toUpperCase()} kayıt kümesine eklenir.</p></div>
        <form className="content-form" action={saveFaqAction}>
          <input type="hidden" name="locale" value={locale} />
          <label><span>Soru</span><input name="question" required maxLength={300} /></label>
          <label><span>Cevap</span><textarea name="answer" required rows={7} maxLength={4000} /></label>
          <div className="content-form-grid">
            <label><span>Kategori</span><input name="category" maxLength={80} defaultValue={isEn ? "General" : "Genel"} /></label>
            <label><span>Hedef kitle</span><select name="audience" defaultValue="all"><option value="all">Herkes</option><option value="reader">Okuyucu</option><option value="writer">Yazar</option><option value="editor">Editör</option><option value="publisher">Yayınevi</option></select></label>
            <label><span>Sıra</span><input name="position" type="number" min={0} max={9999} defaultValue={0} /></label>
          </div>
          <div className="content-form-actions"><button type="submit">Taslak Kaydet</button></div>
        </form>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
        {items.length === 0 ? <div className="content-panel"><div className="content-empty-state"><strong>Bu dilde henüz SSS yok.</strong><p>İlk taslağı yukarıdaki formdan oluşturabilirsin.</p></div></div> : items.map(({ contentKey, status, updatedAt, item }, index) => {
          const canChangeLive = status !== "published" || access.canPublish;
          const canArchive = status !== "published" || access.canPublish;
          const hiddenLocale = <input type="hidden" name="locale" value={locale} />;
          return (
            <div className="content-panel" key={contentKey}>
              <div className="content-section-heading"><div><span>{String(index + 2).padStart(2, "0")}</span><h2>{item.question || "İsimsiz SSS"}</h2></div><p>{statusLabels[status]} · {item.category || (isEn ? "General" : "Genel")} · {audienceLabels[item.audience || "all"] || "Herkes"} · {formatDate(updatedAt)}</p></div>
              <form className="content-form" action={saveFaqAction}>
                {hiddenLocale}<input type="hidden" name="contentKey" value={contentKey} />
                <label><span>Soru</span><input name="question" required maxLength={300} defaultValue={item.question || ""} disabled={!canChangeLive} /></label>
                <label><span>Cevap</span><textarea name="answer" required rows={6} maxLength={4000} defaultValue={item.answer || ""} disabled={!canChangeLive} /></label>
                <div className="content-form-grid">
                  <label><span>Kategori</span><input name="category" maxLength={80} defaultValue={item.category || (isEn ? "General" : "Genel")} disabled={!canChangeLive} /></label>
                  <label><span>Hedef kitle</span><select name="audience" defaultValue={item.audience || "all"} disabled={!canChangeLive}><option value="all">Herkes</option><option value="reader">Okuyucu</option><option value="writer">Yazar</option><option value="editor">Editör</option><option value="publisher">Yayınevi</option></select></label>
                  <label><span>Sıra</span><input name="position" type="number" min={0} max={9999} defaultValue={item.position ?? 0} disabled={!canChangeLive} /></label>
                </div>
                <div className="content-form-actions">{canChangeLive ? <button type="submit">Değişiklikleri Kaydet</button> : <span>Yayındaki içeriği değiştirmek için yayın yetkisi gerekir.</span>}</div>
              </form>
              <div className="content-form-actions" style={{ marginTop: ".9rem", flexWrap: "wrap" }}>
                {status === "draft" && canPublishLocale ? <form action={publishFaqAction}>{hiddenLocale}<input type="hidden" name="contentKey" value={contentKey} /><button type="submit">Yayınla</button></form> : null}
                {status === "published" && access.canPublish ? <form action={unpublishFaqAction}>{hiddenLocale}<input type="hidden" name="contentKey" value={contentKey} /><button type="submit">Taslağa Al</button></form> : null}
                {status !== "archived" && canArchive ? <form action={archiveFaqAction}>{hiddenLocale}<input type="hidden" name="contentKey" value={contentKey} /><button type="submit">Arşivle</button></form> : null}
                {status === "archived" ? <form action={restoreFaqDraftAction}>{hiddenLocale}<input type="hidden" name="contentKey" value={contentKey} /><button type="submit">Taslağa Geri Al</button></form> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
