import Link from "next/link";
import {
  cancelCmsScheduleAction,
  createCmsScheduleAction,
} from "@/features/cms/schedule-actions";
import { runCmsSchedulerNowSafeAction } from "@/features/cms/schedule-integrity-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { parseCmsSchedulePayload } from "@/lib/cms-scheduler";
import { prisma } from "@/lib/prisma";
import styles from "../PublishingOperationsWorkbench.module.css";

export const dynamic = "force-dynamic";

type SiteTargetRow = {
  id: string;
  namespace: string;
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
};
type PageTargetRow = {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
};
type ScheduleRow = {
  id: string;
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};
type TargetKind = "homepage" | "faq" | "legal" | "guide";
type TargetOption = {
  value: string;
  label: string;
  path: string;
  status: "draft" | "published";
  kind: TargetKind;
};
type ScheduleData = { targets: TargetOption[]; scheduleRows: ScheduleRow[] };

type SearchParams = Record<string, string | undefined>;

const homepageLabels: Record<string, string> = {
  hero: "Ana Sayfa · Hero",
  roles: "Ana Sayfa · Rol seçimi",
  passport: "Ana Sayfa · Eser Pasaportu",
  why: "Ana Sayfa · Neden İlkOku",
  footer: "Ana Sayfa · Footer",
};
const targetKindLabels: Record<TargetKind, string> = {
  homepage: "Ana Sayfa",
  faq: "SSS",
  legal: "Yasal",
  guide: "Rehber",
};

function faqLabel(row: SiteTargetRow) {
  try {
    const value = JSON.parse(row.valueJson) as Record<string, unknown>;
    if (typeof value.question === "string" && value.question.trim()) return `SSS · ${value.question.trim().slice(0, 100)}`;
  } catch {}
  return `SSS · ${row.contentKey}`;
}
function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(date);
}
function stateLabel(state: string) {
  if (state === "completed") return "Tamamlandı";
  if (state === "cancelled") return "İptal";
  if (state === "failed") return "Hata";
  return "Planlandı";
}
function targetStatusLabel(status: string) { return status === "published" ? "Yayında" : "Taslak"; }
function targetTone(status: string) { return status === "published" ? "published" : "initial"; }
function targetHref(params: SearchParams, patch: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const key of ["q", "durum", "hedef"] as const) {
    const value = params[key];
    if (value) query.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  const suffix = query.toString();
  return suffix ? `/icerik/zamanlama?${suffix}` : "/icerik/zamanlama";
}

async function loadScheduleData(): Promise<ScheduleData | null> {
  try {
    const [siteRows, pageRows, scheduleRows] = await Promise.all([
      prisma.$queryRaw<SiteTargetRow[]>`
        SELECT id, namespace, contentKey, valueJson, status
        FROM SiteContent
        WHERE namespace IN ('homepage', 'faq')
          AND status IN ('draft', 'published')
        ORDER BY namespace ASC, updatedAt DESC
        LIMIT 500
      `,
      prisma.$queryRaw<PageTargetRow[]>`
        SELECT id, contentKey, slug, title, status
        FROM ContentPage
        WHERE status IN ('draft', 'published')
          AND (
            (contentKey LIKE 'legal:%' AND contentKey NOT LIKE 'legal:en:%')
            OR (contentKey LIKE 'guide:%' AND contentKey NOT LIKE 'guide:en:%')
          )
        ORDER BY updatedAt DESC
        LIMIT 500
      `,
      prisma.$queryRaw<ScheduleRow[]>`
        SELECT id, contentKey, valueJson, status, updatedAt
        FROM SiteContent
        WHERE namespace = 'cms_schedule'
        ORDER BY createdAt DESC
        LIMIT 150
      `,
    ]);

    const targets: TargetOption[] = [
      ...siteRows.map((row) => ({
        value: `site_content:${row.id}`,
        label: row.namespace === "homepage" ? (homepageLabels[row.contentKey] ?? `Ana Sayfa · ${row.contentKey}`) : faqLabel(row),
        path: row.namespace === "homepage" ? "/" : "/yardim",
        status: row.status as "draft" | "published",
        kind: (row.namespace === "homepage" ? "homepage" : "faq") as TargetKind,
      })),
      ...pageRows.map((row) => ({
        value: `content_page:${row.id}`,
        label: `${row.contentKey.startsWith("legal:") ? "Yasal" : "Rehber"} · ${row.title}`,
        path: row.slug,
        status: row.status as "draft" | "published",
        kind: (row.contentKey.startsWith("legal:") ? "legal" : "guide") as TargetKind,
      })),
    ].sort((a, b) => {
      if (a.status !== b.status) return a.status === "draft" ? -1 : 1;
      return a.label.localeCompare(b.label, "tr");
    });
    return { targets, scheduleRows };
  } catch {
    return null;
  }
}

export default async function CmsSchedulePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const access = await requireCmsManager("/icerik/zamanlama");
  const params = await searchParams;
  const data = await loadScheduleData();

  if (!data) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Yayın</span><h1>Yayın Zamanlama</h1><p>Zamanlama verileri doğrulanamadığında sistem yanlış hedef veya boş plan sonucu üretmez.</p></div></div>
        <div className="content-panel" role="alert">
          <strong>Yayın zamanlama verileri okunamadı.</strong>
          <p>Hedef içerikler veya plan kayıtlarından en az biri okunamadı. Yeni plan, iptal ve manuel scheduler aksiyonları güvenli biçimde durduruldu.</p>
          <div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/yayin-kuyrugu">Yayın Kuyruğu →</Link><Link href="/icerik/zamanlama">Tekrar dene</Link></div>
        </div>
      </section>
    );
  }

  const { targets, scheduleRows } = data;
  const parsed = scheduleRows.map((row) => ({ row, payload: parseCmsSchedulePayload(row.valueJson) }));
  const invalid = parsed.filter((item) => !item.payload);
  const invalidActive = invalid.filter((item) => item.row.status === "published");
  const valid = parsed.filter((item): item is { row: ScheduleRow; payload: NonNullable<typeof item.payload> } => Boolean(item.payload));
  const active = valid.filter((item) => item.payload.state === "scheduled" && item.row.status === "published");
  const history = valid.filter((item) => item.payload.state !== "scheduled" || item.row.status !== "published");
  const canCreatePlan = access.canPublish && invalidActive.length === 0;

  const q = (params.q || "").trim().toLocaleLowerCase("tr-TR");
  const statusFilter = params.durum || "all";
  const filteredTargets = targets.filter((target) => {
    if (statusFilter !== "all" && target.status !== statusFilter) return false;
    if (q && !`${target.label} ${target.path} ${targetKindLabels[target.kind]}`.toLocaleLowerCase("tr-TR").includes(q)) return false;
    return true;
  });
  const requestedTarget = params.hedef || "";
  const selectedTarget = filteredTargets.find((target) => target.value === requestedTarget)
    ?? targets.find((target) => target.value === requestedTarget)
    ?? filteredTargets[0]
    ?? targets[0]
    ?? null;
  const activeByTarget = new Map(active.map((item) => [`${item.payload.targetType}:${item.payload.targetId}`, item]));
  const selectedPlan = selectedTarget ? activeByTarget.get(selectedTarget.value) ?? null : null;

  const errorText: Record<string, string> = {
    hedef: "Seçilen içerik zamanlamaya uygun değil.",
    zaman: "En az bir geçerli yayın veya yayından kaldırma zamanı girin.",
    gelecek: "Planlanan zaman gelecekte olmalıdır.",
    sira: "Yayından kaldırma zamanı yayın zamanından sonra olmalıdır.",
    "yayin-durumu": "Yayın zamanı yalnız taslak içerik için planlanabilir.",
    "kaldirma-durumu": "Tek başına yayından kaldırma yalnız yayındaki içerik için planlanabilir.",
    mevcut: "Bu içerik için zaten aktif bir yayın planı var.",
    "plan-veri": "Aktif plan kayıtlarından en az biri bozuk. Yeni plan oluşturmadan önce scheduler integrity kontrolünü çalıştırın.",
  };

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Yayın</span><h1>Yayın Zamanlama</h1><p>İçeriği soldan seçin; sistem yalnız o içeriğin mevcut durumuna uygun planlama kararını gösterir. Saat dilimi Europe/Istanbul’dur.</p></div>
        <div className="content-profile"><strong>{active.length} aktif plan</strong><small>yaklaşık 5 dk scheduler kontrol aralığı</small></div>
      </div>

      {params.hata && errorText[params.hata] ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{errorText[params.hata]}</strong></div> : null}
      {params.kayit ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Yayın planı kaydedildi.</strong></div> : null}
      {params.kontrol ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>Zamanlayıcı manuel olarak kontrol edildi.</strong><p>{params.karantina && Number(params.karantina) > 0 ? `${params.karantina} bozuk aktif plan güvenli biçimde karantinaya alındı.` : "Aktif plan bütünlüğü kontrol edildi."}</p></div> : null}
      {invalid.length > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalid.length} plan kaydı parse edilemiyor.</strong><p>{invalidActive.length > 0 ? `${invalidActive.length} bozuk kayıt aktif statüde; yeni plan oluşturma kilitli.` : "Bozuk kayıtlar yalnız geçmiş teşhisi için tutuluyor."}</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className={styles.workbench}>
        <div className={styles.summaryBar}>
          <article className={styles.summaryCard}><span>Planlanabilir hedef</span><strong>{targets.length}</strong><small>TR CMS kapsamı</small></article>
          <article className={styles.summaryCard}><span>Aktif plan</span><strong>{active.length}</strong><small>çalışmayı bekliyor</small></article>
          <article className={styles.summaryCard}><span>Tamamlanan</span><strong>{history.filter((item) => item.payload.state === "completed").length}</strong><small>otomatik sonuçlandı</small></article>
          <article className={styles.summaryCard}><span>Hata / bozuk</span><strong>{history.filter((item) => item.payload.state === "failed").length + invalid.length}</strong><small>inceleme gerekiyor</small></article>
        </div>

        <div className={styles.layout}>
          <aside className={styles.rail}>
            <div className={styles.railHeader}><span className={styles.railLabel}>Hedefler</span><strong>{filteredTargets.length} içerik gösteriliyor</strong></div>
            <form method="get" className={styles.searchForm}>
              <input type="search" name="q" defaultValue={params.q || ""} placeholder="İçerik veya yol ara" />
              {statusFilter !== "all" ? <input type="hidden" name="durum" value={statusFilter} /> : null}
              <button type="submit">Ara</button>
            </form>
            <div className={styles.filters}>
              <span className={styles.railLabel}>İçerik durumu</span>
              <div className={styles.targetStatusToggle}>
                <Link data-active={statusFilter === "all"} href={targetHref(params, { durum: undefined, hedef: undefined })}>Tümü</Link>
                <Link data-active={statusFilter === "draft"} href={targetHref(params, { durum: "draft", hedef: undefined })}>Taslak</Link>
                <Link data-active={statusFilter === "published"} href={targetHref(params, { durum: "published", hedef: undefined })}>Yayında</Link>
              </div>
            </div>
            {filteredTargets.length === 0 ? <div className={styles.empty}>Bu filtrelerde zamanlanabilir hedef yok.</div> : <div className={styles.targetList}>{filteredTargets.map((target) => {
              const hasPlan = activeByTarget.has(target.value);
              return <Link key={target.value} href={targetHref(params, { hedef: target.value })} className={styles.targetLink} data-active={selectedTarget?.value === target.value}>
                <div className={styles.targetTop}><strong>{target.label}</strong><span className={styles.badge} data-tone={hasPlan ? "scheduled" : targetTone(target.status)}>{hasPlan ? "Planlı" : targetStatusLabel(target.status)}</span></div>
                <p>{target.path}</p>
                <div className={styles.targetMeta}><span>{targetKindLabels[target.kind]}</span><span>{target.status === "draft" ? "Yayın planlanabilir" : "Kaldırma planlanabilir"}</span></div>
              </Link>;
            })}</div>}
          </aside>

          <main className={styles.detail}>
            {!selectedTarget ? <div className={styles.empty}><strong>Zamanlanabilir içerik yok.</strong><p>Yayın Kuyruğu’ndan taslak hazırlayın veya mevcut içerik durumunu kontrol edin.</p></div> : <>
              <div className={styles.detailHeader}>
                <div className={styles.detailTopline}><span className={styles.badge} data-tone={selectedPlan ? "scheduled" : targetTone(selectedTarget.status)}>{selectedPlan ? "Aktif plan var" : targetStatusLabel(selectedTarget.status)}</span><span className={styles.badge}>TR</span></div>
                <div><span className={styles.eyebrow}>{targetKindLabels[selectedTarget.kind]}</span><h2>{selectedTarget.label}</h2><p>{selectedTarget.path}</p></div>
                <div className={styles.detailMetaGrid}>
                  <div className={styles.detailMetaCard}><span className={styles.detailLabel}>Mevcut durum</span><strong>{targetStatusLabel(selectedTarget.status)}</strong><small>canlı içerik durumu</small></div>
                  <div className={styles.detailMetaCard}><span className={styles.detailLabel}>Plan kararı</span><strong>{selectedPlan ? "Zaten planlandı" : selectedTarget.status === "draft" ? "Yayın zamanı" : "Kaldırma zamanı"}</strong><small>duruma göre sınırlandı</small></div>
                  <div className={styles.detailMetaCard}><span className={styles.detailLabel}>Saat dilimi</span><strong>Europe/Istanbul</strong><small>scheduler yaklaşık 5 dk</small></div>
                </div>
              </div>
              <div className={styles.detailBody}>
                {selectedPlan ? <div className={styles.scheduleBox}><strong>Bu içerik için aktif plan var.</strong><p>Yeni ve çakışan plan oluşturulmaz. Mevcut planı iptal edip yeniden planlayabilirsiniz.</p><div className={styles.timeline}>
                  <div className={styles.timelineRow}><div><strong>Yayın</strong><small>{formatDate(selectedPlan.payload.publishAt)}</small></div><span className={styles.badge} data-tone="scheduled">Planlı</span></div>
                  <div className={styles.timelineRow}><div><strong>Yayından kaldırma</strong><small>{formatDate(selectedPlan.payload.unpublishAt)}</small></div><span>{selectedPlan.payload.unpublishAt ? "Otomatik" : "—"}</span></div>
                </div>{access.canPublish ? <form action={cancelCmsScheduleAction}><input type="hidden" name="contentKey" value={selectedPlan.row.contentKey} /><button type="submit">Aktif Planı İptal Et</button></form> : null}</div> : canCreatePlan ? <div className={styles.scheduleBox}>
                  <strong>{selectedTarget.status === "draft" ? "İlk yayını planla" : "Yayından kaldırmayı planla"}</strong>
                  <p>{selectedTarget.status === "draft" ? "Yayın tarihi zorunludur. İsterseniz aynı planda daha ileri bir kaldırma zamanı da belirleyebilirsiniz." : "Bu içerik zaten yayında; güvenli akış yalnız gelecekte otomatik olarak taslağa alma zamanı oluşturur."}</p>
                  <form action={createCmsScheduleAction} className={styles.planner}>
                    <input type="hidden" name="target" value={selectedTarget.value} />
                    {selectedTarget.status === "draft" ? <div className={styles.plannerGrid}><label><span>Yayın tarihi / saati</span><input type="datetime-local" name="publishAt" required /></label><label><span>İsteğe bağlı kaldırma</span><input type="datetime-local" name="unpublishAt" /></label></div> : <label><span>Yayından kaldırma tarihi / saati</span><input type="datetime-local" name="unpublishAt" required /></label>}
                    <div className={styles.actionRow}><button type="submit">Planı Kaydet</button><Link href="/icerik/yayin-kuyrugu">Yayın Kuyruğuna Dön</Link></div>
                  </form>
                </div> : invalidActive.length > 0 ? <div className={`${styles.scheduleBox} ${styles.blocker}`}><strong>Yeni plan geçici olarak kilitli.</strong><p>Bozuk aktif plan kayıtlarını önce integrity kontrolüyle karantinaya alın.</p></div> : <div className={styles.scheduleBox}><strong>Yayın yetkisi gerekli.</strong><p>Plan oluşturmak gelecekte canlı içerik durumunu değiştireceği için yayın yetkisi gerektirir.</p></div>}
                <div className={styles.infoBox}><strong>Bu masanın sınırı</strong><p>EN içerikleri ve mevcut scheduler kapsamı dışındaki modüller burada görünmez. Plan yaratma işlemi mevcut server-side durum ve duplicate kontrollerini bypass etmez.</p></div>
              </div>
            </>}
          </main>

          <aside className={styles.sidePane}>
            <div className={styles.sideHeader}><span className={styles.railLabel}>Aktif planlar</span><strong>{active.length} plan çalışmayı bekliyor</strong></div>
            <div className={styles.sideBody}>
              {access.canPublish ? <form action={runCmsSchedulerNowSafeAction}><button type="submit">Scheduler’ı Şimdi Kontrol Et</button></form> : null}
              {active.length === 0 ? <div className={styles.empty}>Doğrulanmış aktif plan yok.</div> : <div className={styles.planList}>{active.slice(0, 12).map(({ row, payload }) => {
                const targetValue = `${payload.targetType}:${payload.targetId}`;
                return <Link key={row.id} href={targetHref(params, { hedef: targetValue })} className={styles.planLink} data-active={selectedTarget?.value === targetValue}>
                  <div className={styles.planTop}><strong>{payload.targetLabel}</strong><span className={styles.badge} data-tone="scheduled">Planlı</span></div>
                  <p>{payload.publishAt ? `Yayın: ${formatDate(payload.publishAt)}` : `Kaldırma: ${formatDate(payload.unpublishAt)}`}</p>
                  <div className={styles.planMeta}><span>{payload.targetPath}</span></div>
                </Link>;
              })}</div>}
              <div className={styles.infoBox}><strong>Scheduler bütünlüğü</strong><p>{invalidActive.length > 0 ? `${invalidActive.length} bozuk aktif kayıt yeni planları kilitliyor.` : "Aktif plan kayıtları parse edilebilir durumda."}</p></div>
            </div>
          </aside>
        </div>

        <details className={styles.history}>
          <summary>Zamanlama geçmişi · {history.length + invalid.length} kayıt</summary>
          <div className={styles.historyBody}>
            {invalid.map(({ row }) => <div className={styles.historyRow} key={`invalid-${row.id}`}><strong>{row.contentKey}</strong><span className={styles.badge} data-tone="failed">Bozuk plan</span><small>{formatDate(row.updatedAt)}</small><small>{row.status === "published" ? "Aktif havuzda · integrity gerekli" : "Karantina / geçmiş"}</small></div>)}
            {history.slice(0, 100).map(({ row, payload }) => <div className={styles.historyRow} key={row.id}><div><strong>{payload.targetLabel}</strong><br /><small>{payload.targetPath}</small></div><span className={styles.badge} data-tone={payload.state === "failed" ? "failed" : payload.state === "completed" ? "ready" : "initial"}>{stateLabel(payload.state)}</span><small>{formatDate(payload.unpublishedExecutedAt || payload.publishedExecutedAt || payload.cancelledAt || payload.failedAt || row.updatedAt)}</small><small>{payload.failureCode || (payload.publishedExecutedAt ? "Yayın adımı işlendi" : payload.cancelledAt ? "Plan iptal edildi" : "Kayıt tamamlandı")}</small></div>)}
            {history.length === 0 && invalid.length === 0 ? <div className={styles.empty}>Henüz tamamlanmış plan yok.</div> : null}
          </div>
        </details>
      </div>
    </section>
  );
}
