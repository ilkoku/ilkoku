import Link from "next/link";
import {
  cancelCmsScheduleAction,
  createCmsScheduleAction,
} from "@/features/cms/schedule-actions";
import { runCmsSchedulerNowSafeAction } from "@/features/cms/schedule-integrity-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { parseCmsSchedulePayload } from "@/lib/cms-scheduler";
import { prisma } from "@/lib/prisma";

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
type TargetOption = {
  value: string;
  label: string;
  path: string;
  status: "draft" | "published";
};
type ScheduleData = { targets: TargetOption[]; scheduleRows: ScheduleRow[] };

const homepageLabels: Record<string, string> = {
  hero: "Ana Sayfa · Hero",
  roles: "Ana Sayfa · Rol seçimi",
  passport: "Ana Sayfa · Eser Pasaportu",
  why: "Ana Sayfa · Neden İlkOku",
  footer: "Ana Sayfa · Footer",
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
      })),
      ...pageRows.map((row) => ({
        value: `content_page:${row.id}`,
        label: `${row.contentKey.startsWith("legal:") ? "Yasal" : "Rehber"} · ${row.title}`,
        path: row.slug,
        status: row.status as "draft" | "published",
      })),
    ];
    return { targets, scheduleRows };
  } catch {
    return null;
  }
}

export default async function CmsSchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
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
        <div><span>Yayın</span><h1>Yayın Zamanlama</h1><p>Türkçe CMS içeriklerini ileri bir tarihte yayınlayın veya otomatik olarak taslağa alın. EN bu akışa dahil değildir.</p></div>
        <div className="content-profile"><strong>{active.length} aktif plan</strong><small>Europe/Istanbul · yaklaşık 5 dk kontrol aralığı</small></div>
      </div>

      {params.hata && errorText[params.hata] ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{errorText[params.hata]}</strong></div> : null}
      {params.kayit ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Yayın planı kaydedildi.</strong></div> : null}
      {params.kontrol ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>Zamanlayıcı manuel olarak kontrol edildi.</strong><p>{params.karantina && Number(params.karantina) > 0 ? `${params.karantina} bozuk aktif plan güvenli biçimde karantinaya alındı.` : "Aktif plan bütünlüğü kontrol edildi."}</p></div> : null}

      {invalid.length > 0 ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert">
          <strong>{invalid.length} plan kaydı parse edilemiyor.</strong>
          <p>{invalidActive.length > 0 ? `${invalidActive.length} bozuk kayıt halen aktif statüde. Yeni plan oluşturma kilitlendi; “Şimdi Kontrol Et” bu kayıtları aktif havuzdan çıkarır.` : "Bozuk kayıtlar aktif yayın havuzunda değil; geçmiş teşhisi için görünür tutuluyor."}</p>
          <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
        </div>
      ) : null}

      <div className="content-metric-grid">
        <article className="content-metric-card"><span>Aktif plan</span><strong>{active.length}</strong><small>çalışmayı bekliyor</small></article>
        <article className="content-metric-card"><span>Tamamlanan</span><strong>{history.filter((item) => item.payload.state === "completed").length}</strong><small>otomatik sonuçlandı</small></article>
        <article className="content-metric-card"><span>İptal</span><strong>{history.filter((item) => item.payload.state === "cancelled").length}</strong><small>manuel durduruldu</small></article>
        <article className="content-metric-card"><span>Hata / Bozuk</span><strong>{history.filter((item) => item.payload.state === "failed").length + invalid.length}</strong><small>inceleme gerekiyor</small></article>
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-section-heading"><div><span>01</span><h2>Yeni yayın planı</h2></div><p>Taslak içerik yayınlanabilir; yayındaki içerik için yalnız kaldırma zamanı planlanabilir.</p></div>
        {canCreatePlan ? (
          <form action={createCmsScheduleAction} className="content-form">
            <label><span>İçerik</span><select name="target" required defaultValue=""><option value="" disabled>İçerik seçin</option>{targets.map((target) => <option value={target.value} key={target.value}>{target.label} · {targetStatusLabel(target.status)} · {target.path}</option>)}</select></label>
            <div className="content-form-grid"><label><span>Yayın tarihi / saati</span><input type="datetime-local" name="publishAt" /></label><label><span>Yayından kaldırma tarihi / saati</span><input type="datetime-local" name="unpublishAt" /></label></div>
            <p className="content-form-help">Saat dilimi Europe/Istanbul’dur. İki alan birlikte kullanılabilir. Otomatik scheduler yaklaşık 5 dakikada bir kontrol eder.</p>
            <div className="content-form-actions"><button type="submit">Planı Kaydet</button></div>
          </form>
        ) : invalidActive.length > 0 ? (
          <div className="content-empty"><strong>Yeni plan geçici olarak kilitli.</strong><p>Önce bozuk aktif plan kayıtlarını integrity kontrolüyle karantinaya alın.</p></div>
        ) : (
          <div className="content-empty"><strong>Yayın yetkisi gerekli.</strong><p>Planlı yayın oluşturmak canlı içerik durumunu değiştirdiği için yayın yetkisi ister.</p></div>
        )}
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-section-heading"><div><span>02</span><h2>Aktif planlar</h2></div>{access.canPublish ? <form action={runCmsSchedulerNowSafeAction}><button type="submit">Şimdi Kontrol Et</button></form> : null}</div>
        {active.length === 0 ? <div className="content-empty"><strong>Doğrulanmış aktif yayın planı yok.</strong><p>{invalidActive.length > 0 ? "Bozuk aktif kayıtlar yukarıda ayrıca gösteriliyor." : "Yeni bir plan oluşturulduğunda burada görünecek."}</p></div> : (
          <div className="content-list"><div className="content-list-row content-list-row--head"><span>İçerik</span><span>Yayın</span><span>Kaldırma</span><span>İşlem</span></div>{active.map(({ row, payload }) => <div className="content-list-row" key={row.id}><div><strong>{payload.targetLabel}</strong><br /><small>{payload.targetPath}</small></div><span>{formatDate(payload.publishAt)}</span><span>{formatDate(payload.unpublishAt)}</span>{access.canPublish ? <form action={cancelCmsScheduleAction}><input type="hidden" name="contentKey" value={row.contentKey} /><button type="submit">İptal Et</button></form> : <span>Planlandı</span>}</div>)}</div>
        )}
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-section-heading"><div><span>03</span><h2>Zamanlama geçmişi</h2></div><Link href="/icerik/gecmis">Revizyon geçmişi →</Link></div>
        {history.length === 0 && invalid.length === 0 ? <div className="content-empty"><strong>Henüz tamamlanmış plan yok.</strong></div> : (
          <div className="content-list">
            <div className="content-list-row content-list-row--head"><span>İçerik</span><span>Durum</span><span>Gerçekleşen</span><span>Detay</span></div>
            {invalid.map(({ row }) => <div className="content-list-row" key={`invalid-${row.id}`}><div><strong>{row.contentKey}</strong><br /><small>Ham plan kaydı korunuyor</small></div><span>Bozuk plan</span><span>{formatDate(row.updatedAt)}</span><small>{row.status === "published" ? "Aktif havuzda · integrity kontrolü gerekli" : "Karantina / geçmiş"}</small></div>)}
            {history.slice(0, 100).map(({ row, payload }) => <div className="content-list-row" key={row.id}><div><strong>{payload.targetLabel}</strong><br /><small>{payload.targetPath}</small></div><span>{stateLabel(payload.state)}</span><span>{formatDate(payload.unpublishedExecutedAt || payload.publishedExecutedAt || payload.cancelledAt || payload.failedAt || row.updatedAt)}</span><small>{payload.failureCode || (payload.publishedExecutedAt ? "Yayın adımı işlendi" : payload.cancelledAt ? "Plan iptal edildi" : "Kayıt tamamlandı")}</small></div>)}
          </div>
        )}
      </div>
    </section>
  );
}
