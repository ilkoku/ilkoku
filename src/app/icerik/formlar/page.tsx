import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import ops from "../PublishingOperationsWorkbench.module.css";
import flow from "../WorkflowOperationsWorkbench.module.css";

type SubmissionRow = { contentKey: string; valueJson: string; status: string; updatedAt: Date };
type Submission = { id?: string; name?: string; email?: string; subject?: string; message?: string; state?: string };
type WorkflowState = "new" | "reviewing" | "resolved" | "archived";
type SearchParams = Record<string, string | string[] | undefined>;
type PreparedItem = SubmissionRow & Submission & { workflowState: WorkflowState; invalid: false };
type InvalidItem = SubmissionRow & { workflowState: "invalid"; invalid: true };
type WorkItem = PreparedItem | InvalidItem;

export const dynamic = "force-dynamic";

function parseSubmission(valueJson: string): Submission | null {
  try {
    const value = JSON.parse(valueJson) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const data = value as Submission;
    if (!data.name || !data.email || !data.message) return null;
    return data;
  } catch {
    return null;
  }
}

function stateOf(row: SubmissionRow, data: Submission): WorkflowState {
  if (row.status === "archived") return "archived";
  if (data.state === "reviewing") return "reviewing";
  if (data.state === "resolved") return "resolved";
  return "new";
}

function stateLabel(state: WorkflowState | "invalid") {
  if (state === "reviewing") return "İnceleniyor";
  if (state === "resolved") return "Çözüldü";
  if (state === "archived") return "Arşiv";
  if (state === "invalid") return "Bozuk";
  return "Yeni";
}

function stateTone(state: WorkflowState | "invalid") {
  if (state === "reviewing") return "working";
  if (state === "resolved") return "ready";
  if (state === "archived") return "initial";
  if (state === "invalid") return "failed";
  return "scheduled";
}

function param(params: SearchParams, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}

function formHref(params: SearchParams, patch: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const key of ["q", "durum", "sec"] as const) {
    const current = param(params, key);
    if (current) query.set(key, current);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  const suffix = query.toString();
  return suffix ? `/icerik/formlar?${suffix}` : "/icerik/formlar";
}

function ManageAction({ item, action, label, filter }: { item: PreparedItem; action: "review" | "resolve" | "reopen" | "archive"; label: string; filter: string }) {
  return (
    <form action="/api/site-contact-manage" method="post">
      <input type="hidden" name="key" value={item.contentKey} />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="filter" value={filter} />
      <button type="submit">{label}</button>
    </form>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireCmsManager("/icerik/formlar");
  const params = await searchParams;

  let rows: SubmissionRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<SubmissionRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'form_submission'
      ORDER BY updatedAt DESC
      LIMIT 300
    `;
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Büyüme</span><h1>Formlar & Talepler</h1><p>Talep verileri doğrulanamadığında boş liste sonucu üretilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Form talepleri okunamadı.</strong><p>Bu durum “henüz talep yok” anlamına gelmez. Kayıtlar doğrulanana kadar durum değiştirme ve arşivleme işlemleri durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/formlar">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const items: WorkItem[] = rows.map((row) => {
    const data = parseSubmission(row.valueJson);
    return data
      ? { ...row, ...data, workflowState: stateOf(row, data), invalid: false as const }
      : { ...row, workflowState: "invalid" as const, invalid: true as const };
  });

  const q = param(params, "q").trim().toLocaleLowerCase("tr-TR");
  const stateFilter = param(params, "durum") || "all";
  const selectedKey = param(params, "sec");
  const filtered = items.filter((item) => {
    if (stateFilter !== "all" && item.workflowState !== stateFilter) return false;
    if (!q) return true;
    if (item.invalid) return item.contentKey.toLocaleLowerCase("tr-TR").includes(q);
    return `${item.name || ""} ${item.email || ""} ${item.subject || ""} ${item.message || ""}`.toLocaleLowerCase("tr-TR").includes(q);
  });
  const selected = filtered.find((item) => item.contentKey === selectedKey) ?? filtered[0] ?? null;

  const newCount = items.filter((item) => item.workflowState === "new").length;
  const reviewingCount = items.filter((item) => item.workflowState === "reviewing").length;
  const resolvedCount = items.filter((item) => item.workflowState === "resolved").length;
  const archivedCount = items.filter((item) => item.workflowState === "archived").length;
  const invalidCount = items.filter((item) => item.invalid).length;
  const activeFilter = ["new", "reviewing", "resolved", "archived", "invalid"].includes(stateFilter) ? stateFilter : "all";
  const operation = param(params, "islem");
  const operationMessage: Record<string, string> = {
    review: "Talep incelemeye alındı.",
    resolve: "Talep çözüldü olarak işaretlendi.",
    reopen: "Talep yeniden açıldı.",
    archive: "Talep arşivlendi.",
    veri: "Talep payload’ı doğrulanamadığı için durum değişikliği uygulanmadı.",
  };

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Büyüme</span><h1>Formlar & Talepler</h1><p>İletişim taleplerini tek tek açın, mesajı okuyun ve Yeni → İnceleniyor → Çözüldü → Arşiv akışında yönetin.</p></div>
        <div className="content-profile"><strong>{newCount + reviewingCount} açık talep</strong><small>{newCount} yeni · {reviewingCount} inceleniyor</small></div>
      </div>

      {operation && operationMessage[operation] ? <div className="content-panel" style={{ marginBottom: "1rem" }} role={operation === "veri" ? "alert" : "status"}><strong>{operationMessage[operation]}</strong></div> : null}
      {invalidCount > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalidCount} form kaydı parse edilemiyor.</strong><p>Bozuk kayıtlar sessizce kaybolmaz ve normal durum akışına sokulmaz. Ham kayıt korunur.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className={ops.workbench}>
        <div className={ops.summaryBar}>
          <article className={ops.summaryCard}><span>Yeni</span><strong>{newCount}</strong><small>henüz ele alınmadı</small></article>
          <article className={ops.summaryCard}><span>İnceleniyor</span><strong>{reviewingCount}</strong><small>aktif işlemde</small></article>
          <article className={ops.summaryCard}><span>Çözüldü</span><strong>{resolvedCount}</strong><small>arşiv öncesi tamamlandı</small></article>
          <article className={ops.summaryCard}><span>Arşiv</span><strong>{archivedCount}</strong><small>kapatılmış talepler</small></article>
        </div>

        <div className={ops.layout}>
          <aside className={ops.rail}>
            <div className={ops.railHeader}><span className={ops.railLabel}>Talep kutusu</span><strong>{filtered.length} kayıt gösteriliyor</strong></div>
            <form method="get" className={ops.searchForm}>
              <input type="search" name="q" defaultValue={param(params, "q")} placeholder="Ad, e-posta, konu veya mesaj ara" />
              {activeFilter !== "all" ? <input type="hidden" name="durum" value={activeFilter} /> : null}
              <button type="submit">Ara</button>
            </form>
            <div className={ops.filters}><span className={ops.railLabel}>Durum</span><div className={ops.filterRow}>
              {[{ key: "all", label: "Tümü" }, { key: "new", label: "Yeni" }, { key: "reviewing", label: "İnceleniyor" }, { key: "resolved", label: "Çözüldü" }, { key: "archived", label: "Arşiv" }, { key: "invalid", label: "Bozuk" }].map((filter) => <Link key={filter.key} data-active={activeFilter === filter.key} href={formHref(params, { durum: filter.key === "all" ? undefined : filter.key, sec: undefined })}>{filter.label}</Link>)}
            </div></div>
            {filtered.length === 0 ? <div className={ops.empty}>Bu filtrelerde talep yok.</div> : <div className={ops.itemList}>{filtered.map((item) => <Link key={item.contentKey} href={formHref(params, { sec: item.contentKey })} className={ops.itemLink} data-active={selected?.contentKey === item.contentKey}>
              <div className={ops.itemTop}><strong>{item.invalid ? "Bozuk talep kaydı" : item.name || "İsimsiz talep"}</strong><span className={ops.badge} data-tone={stateTone(item.workflowState)}>{stateLabel(item.workflowState)}</span></div>
              <p>{item.invalid ? item.contentKey : item.subject || "Genel talep"}</p>
              <div className={ops.itemMeta}><span>{formatDate(item.updatedAt)}</span>{!item.invalid ? <span>{item.email || "E-posta yok"}</span> : null}</div>
            </Link>)}</div>}
          </aside>

          <main className={ops.detail}>
            {!selected ? <div className={ops.empty}><strong>İncelenecek talep yok.</strong><p>Filtreleri temizleyin veya yeni talepleri bekleyin.</p></div> : selected.invalid ? <><div className={ops.detailHeader}><div className={ops.detailTopline}><span className={ops.badge} data-tone="failed">Bozuk kayıt</span></div><div><span className={ops.eyebrow}>Talep teşhisi</span><h2>Payload doğrulanamadı</h2><p>{selected.contentKey}</p></div></div><div className={ops.detailBody}><div className={`${ops.infoBox} ${ops.blocker}`}><strong>Durum değişikliği kilitli.</strong><p>Ad, e-posta ve mesaj alanları güvenilir biçimde parse edilemedi. Ham veri korunuyor.</p></div><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div></> : <>
              <div className={ops.detailHeader}>
                <div className={ops.detailTopline}><span className={ops.badge} data-tone={stateTone(selected.workflowState)}>{stateLabel(selected.workflowState)}</span><span className={ops.badge}>İletişim Formu</span></div>
                <div><span className={ops.eyebrow}>{selected.subject || "Genel talep"}</span><h2>{selected.name || "İsimsiz talep"}</h2><p>{selected.email}</p></div>
                <div className={ops.detailMetaGrid}>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Durum</span><strong>{stateLabel(selected.workflowState)}</strong><small>operasyon akışı</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Son işlem</span><strong>{formatDate(selected.updatedAt)}</strong><small>Europe/Istanbul</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Kanal</span><strong>Public form</strong><small>/iletisim</small></div>
                </div>
              </div>
              <div className={ops.detailBody}>
                <div className={flow.contactGrid}>
                  <div className={flow.contactBlock}><span>Gönderen</span><strong>{selected.name || "—"}</strong></div>
                  <div className={flow.contactBlock}><span>E-posta</span><a href={`mailto:${selected.email}`}>{selected.email || "—"}</a></div>
                </div>
                <div className={flow.messageBox}><span>Mesaj</span><p>{selected.message || "—"}</p></div>
                <div className={flow.piiNotice}>Bu ekran kişisel veri içerir. Talep adı, e-posta adresi ve mesajı yalnız Formlar & Talepler çalışma alanında operasyon amacıyla gösterilir.</div>
              </div>
            </>}
          </main>

          <aside className={ops.sidePane}>
            <div className={ops.sideHeader}><span className={ops.railLabel}>Talep akışı</span><strong>{selected && !selected.invalid ? stateLabel(selected.workflowState) : "İşlem yok"}</strong></div>
            <div className={ops.sideBody}>
              {selected && !selected.invalid ? <>
                <div className={flow.workflowSteps}>
                  {[{ key: "new", label: "Yeni", detail: "Talep alındı" }, { key: "reviewing", label: "İnceleniyor", detail: "Ekip tarafından ele alınıyor" }, { key: "resolved", label: "Çözüldü", detail: "Operasyon tamamlandı" }, { key: "archived", label: "Arşiv", detail: "Aktif kutudan çıkarıldı" }].map((step, index) => {
                    const currentIndex = ["new", "reviewing", "resolved", "archived"].indexOf(selected.workflowState);
                    return <div className={flow.workflowStep} data-active={selected.workflowState === step.key} data-done={currentIndex > index} key={step.key}><span>{currentIndex > index ? "✓" : index + 1}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div></div>;
                  })}
                </div>
                <div className={flow.actionStack}>
                  {selected.workflowState === "new" ? <ManageAction item={selected} action="review" label="İncelemeye Al" filter={activeFilter} /> : null}
                  {selected.workflowState === "new" || selected.workflowState === "reviewing" ? <ManageAction item={selected} action="resolve" label="Çözüldü Olarak İşaretle" filter={activeFilter} /> : null}
                  {selected.workflowState === "resolved" ? <ManageAction item={selected} action="reopen" label="Yeniden Aç" filter={activeFilter} /> : null}
                  {selected.workflowState !== "archived" ? <ManageAction item={selected} action="archive" label="Arşivle" filter={activeFilter} /> : <ManageAction item={selected} action="reopen" label="Arşivden Çıkar" filter={activeFilter} />}
                </div>
              </> : <div className={ops.empty}>İşlem yapılabilir bir talep seçin.</div>}
              <div className={ops.infoBox}><strong>PII sınırı</strong><p>Talep içeriği global CMS araması, medya kullanım haritası ve SEO operasyonlarına dahil edilmez.</p></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
