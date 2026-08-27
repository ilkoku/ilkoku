import Link from "next/link";
import { createStarterContentDraftsAction } from "@/features/cms/starter-content-actions";
import { requireCmsManager } from "@/lib/cms-access";
import {
  cmsReadinessTargets,
  cmsStarterTargets,
  getCmsReadinessSummary,
  getCmsStarterSummary,
  loadCmsReadiness,
  type CmsReadinessSnapshot,
} from "@/lib/cms-readiness";

export const dynamic = "force-dynamic";

type ReadinessLevel = "pass" | "warn" | "blocker" | "info";
type ReadinessItem = {
  label: string;
  value: string;
  level: ReadinessLevel;
  detail: string;
  href: string;
  action: string;
  previewHref?: string;
  liveHref?: string;
};

function levelLabel(level: ReadinessLevel) {
  if (level === "pass") return "PASS";
  if (level === "blocker") return "BLOCKER";
  if (level === "warn") return "WARN";
  return "INFO";
}

function pendingAge(hours: number | null) {
  if (hours === null) return null;
  if (hours < 1) return "1 saatten az";
  if (hours < 24) return `${hours} saat`;
  return `${Math.floor(hours / 24)} gün`;
}

function readinessItems(data: CmsReadinessSnapshot, canPublish: boolean): ReadinessItem[] {
  const corporateHref = data.corporateId ? `/icerik/sayfalar/${data.corporateId}` : "/icerik/sayfalar";
  const corporatePreviewHref = data.corporateId && data.corporateStatus !== "archived" ? `/icerik/onizleme/sayfa/${data.corporateId}` : undefined;
  const faqHref = data.faqFocusKey ? `/icerik/sss?dil=tr#faq-${data.faqFocusKey}` : "/icerik/sss?dil=tr";
  const faqPendingHref = data.faqPendingDraftKey ? `/icerik/sss?dil=tr#faq-${data.faqPendingDraftKey}` : faqHref;
  const publicPageHref = data.guideId ? `/icerik/sayfalar/${data.guideId}` : "/icerik/sayfalar";
  const publicPagePreviewHref = data.guideId && data.guideStatus !== "archived" ? `/icerik/onizleme/sayfa/${data.guideId}` : undefined;
  const publicPageAge = pendingAge(data.guidesPendingAgeHours);

  const publicPageDetail = data.guides >= cmsReadinessTargets.guides
    ? data.guidesPendingDraft > 0
      ? `Sekiz public bilgilendirme ve rol sayfasının tamamı yayında ve indexlenebilir. ${data.guidesPendingDraft} sayfada canlıyı değiştirmeyen değişiklik taslağı var${publicPageAge ? `; en eskisi ${publicPageAge}dır bekliyor` : ""}.`
      : "Sekiz public bilgilendirme ve rol sayfasının tamamı CMS üzerinden yayında ve indexlenebilir."
    : `${data.guidesCreated}/${cmsStarterTargets.guides} public sayfa kayıtlı · ${data.guides}/${cmsReadinessTargets.guides} yayında · ${data.guidesSeoReady}/${cmsStarterTargets.guides} SEO hazır. İlk işlem gerektiren kayıt doğrudan açılır.`;

  return [
    { label: "Ana Sayfa", value: `${data.homepage}/${cmsReadinessTargets.homepage}`, level: data.homepage >= cmsReadinessTargets.homepage ? "pass" : "warn", detail: "Hero, rol seçimi, Eser Pasaportu, Neden İlkOku ve footer CMS yayını.", href: "/icerik/ana-sayfa?dil=tr", action: "Kontrol et" },
    { label: "Yasal Sayfalar", value: `${data.legal}/${cmsReadinessTargets.legal}`, level: data.legal >= cmsReadinessTargets.legal ? "pass" : "blocker", detail: "Kullanım, Gizlilik, KVKK, Çerez ve Telif metinlerinin CMS sahipliği.", href: "/icerik/yasal?dil=tr", action: "Belgeleri aç" },
    {
      label: "Hakkımızda",
      value: `Kayıt ${data.corporateCreated}/${cmsStarterTargets.corporate} · Canlı ${data.corporate}/${cmsReadinessTargets.corporate}`,
      level: data.corporate >= cmsReadinessTargets.corporate ? "pass" : "warn",
      detail: data.corporate >= cmsReadinessTargets.corporate ? "Hakkımızda yayında ve indexlenebilir." : "Hakkımızda kaydını ve temel SEO alanlarını tamamlayın.",
      href: corporateHref,
      action: data.corporate >= cmsReadinessTargets.corporate ? "Kaydı aç" : canPublish ? "İncele ve yayınla" : "Taslağı incele",
      previewHref: corporatePreviewHref,
      liveHref: data.corporate >= cmsReadinessTargets.corporate ? "/hakkimizda" : undefined,
    },
    {
      label: "Temel SSS",
      value: `Kayıt ${data.faqCreated}/${cmsStarterTargets.faq} · Canlı ${data.faq}/${cmsReadinessTargets.faq}${data.faqPendingDrafts > 0 ? ` · Değişiklik ${data.faqPendingDrafts}` : ""}`,
      level: data.faq >= cmsReadinessTargets.faq ? "pass" : "warn",
      detail: data.faq >= cmsReadinessTargets.faq ? "Dört temel TR yardım kaydının tamamı yayında." : "Dört temel yardım kaydını tamamlayın; Yardım Merkezi yayınlanmış kayıtları kullanır.",
      href: data.faqPendingDrafts > 0 ? faqPendingHref : faqHref,
      action: data.faqPendingDrafts > 0 ? canPublish ? "Değişikliği incele/yayınla" : "Değişikliği incele" : "Temel SSS'leri aç",
      previewHref: data.faqCreated > 0 ? "/icerik/onizleme/sss?dil=tr" : undefined,
      liveHref: data.faq > 0 ? "/yardim" : undefined,
    },
    {
      label: "Public Güven ve Rol Sayfaları",
      value: `Kayıt ${data.guidesCreated}/${cmsStarterTargets.guides} · Canlı ${data.guides}/${cmsReadinessTargets.guides} · SEO ${data.guidesSeoReady}/${cmsStarterTargets.guides}${data.guidesPendingDraft > 0 ? ` · Değişiklik ${data.guidesPendingDraft}` : ""}`,
      level: data.guides >= cmsReadinessTargets.guides && data.guidesSeoReady >= cmsStarterTargets.guides ? "pass" : "warn",
      detail: publicPageDetail,
      href: publicPageHref,
      action: data.guides >= cmsReadinessTargets.guides ? data.guidesPendingDraft > 0 ? canPublish ? "İlk değişikliği incele/yayınla" : "İlk değişikliği incele" : "Public sayfaları aç" : "Eksik public sayfayı aç",
      previewHref: publicPagePreviewHref,
    },
    { label: "Medya", value: String(data.media), level: data.media > 0 ? "pass" : "info", detail: data.media > 0 ? "Aktif medya varlıkları mevcut." : "CMS medya kütüphanesinde aktif kayıt yok.", href: "/icerik/medya", action: "Medya'yı aç" },
    { label: "SEO Eksikleri", value: String(data.seoMissing), level: data.seoMissing === 0 ? "pass" : "warn", detail: data.seoMissing === 0 ? "Yayındaki TR CMS sayfalarında temel SEO eksiği yok." : "Yayındaki TR CMS sayfalarında title, description veya canonical eksiği var.", href: "/icerik/seo", action: data.seoMissing === 0 ? "SEO'yu aç" : "Eksikleri düzelt" },
    { label: "Yayın Kuyruğu", value: String(data.queue), level: data.queue === 0 ? "pass" : "info", detail: data.queue === 0 ? "Bekleyen taslak yok." : "Operasyon kuyruğundaki taslaklar mevcut canlı içeriği değiştirmeden ayrıca yönetilir.", href: "/icerik/yayin-kuyrugu", action: data.queue === 0 ? "Kuyruğu aç" : "Taslakları yönet" },
  ];
}

export default async function ContentReadinessPage({ searchParams }: { searchParams: Promise<{ baslangic?: string; sayfa?: string; sss?: string; hata?: string }> }) {
  const access = await requireCmsManager("/icerik/hazirlik");
  const params = await searchParams;
  let data: CmsReadinessSnapshot | null = null;
  try { data = await loadCmsReadiness(); } catch { data = null; }

  const items = data ? readinessItems(data, access.canPublish) : [];
  const summary = data ? getCmsReadinessSummary(data) : { corePassed: 0, coreTotal: 5, blockers: 0, warnings: 0, operationalQueue: 0, ready: false };
  const starter = data ? getCmsStarterSummary(data) : { createdTotal: 0, archivedTotal: 0, accountedTotal: 0, missingTotal: cmsStarterTargets.total, publishedTotal: 0, total: cmsStarterTargets.total, seoReady: 0, seoTotal: cmsStarterTargets.seo, pendingTotal: 0, pendingOldestAgeHours: null, complete: false };
  const blockers = items.filter((item) => item.level === "blocker").length;
  const warnings = items.filter((item) => item.level === "warn").length;
  const infos = items.filter((item) => item.level === "info").length;
  const passes = items.filter((item) => item.level === "pass").length;
  const ready = summary.ready;
  const oldestPendingAge = pendingAge(starter.pendingOldestAgeHours);
  const corporateHref = data?.corporateId ? `/icerik/sayfalar/${data.corporateId}` : "/icerik/sayfalar";
  const publicPageHref = data?.guideId ? `/icerik/sayfalar/${data.guideId}` : "/icerik/sayfalar";
  const faqHref = data?.faqFocusKey ? `/icerik/sss?dil=tr#faq-${data.faqFocusKey}` : "/icerik/sss?dil=tr";
  const faqPendingHref = data?.faqPendingDraftKey ? `/icerik/sss?dil=tr#faq-${data.faqPendingDraftKey}` : faqHref;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>CMS · Canlı İçerik</span><h1>Yayın Hazırlığı</h1><p>Taslak oluşumundan canlı yayına kadar temel CMS içeriklerini tek ekrandan izleyin. Canlı kabul ile operasyon kuyruğu ayrı değerlendirilir.</p></div>
        <div className="content-profile"><strong>{ready ? "YAYINA HAZIR" : "İÇERİK EKSİĞİ VAR"}</strong><small>{passes} PASS · {warnings} WARN · {blockers} BLOCKER · {infos} INFO</small></div>
      </div>

      {params.hata === "baslangic" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Başlangıç taslakları oluşturulamadı.</strong><p>İşlem güvenli biçimde geri alındı; yarım içerik bırakılmadı. Sistem Sağlığını kontrol edip işlemi yeniden deneyin.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}
      {params.baslangic === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>Başlangıç taslakları kontrol edildi.</strong><p>{params.sayfa ?? "0"} sayfa ve {params.sss ?? "0"} SSS taslağı oluşturuldu. Mevcut kayıtların üzerine yazılmadı ve hiçbir içerik otomatik yayınlanmadı.</p></div> : null}

      {!data ? (
        <div className="content-panel" role="alert"><strong>İçerik hazırlık verileri okunamadı.</strong><p>Veritabanı sorguları tamamlanamadı. İçerik yayınlamadan önce Sistem Sağlığı ekranını kontrol edin.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div>
      ) : (
        <>
          <div className="content-metric-grid">
            <article className="content-metric-card"><span>PASS</span><strong>{passes}</strong><small>kabul edilen alan</small></article>
            <article className="content-metric-card"><span>WARN</span><strong>{warnings}</strong><small>canlı içerik tamamlanmalı</small></article>
            <article className="content-metric-card"><span>BLOCKER</span><strong>{blockers}</strong><small>yayın öncesi zorunlu</small></article>
            <article className="content-metric-card"><span>Durum</span><strong>{ready ? "HAZIR" : "AÇIK"}</strong><small>{summary.corePassed}/{summary.coreTotal} temel alan</small></article>
          </div>

          <div className="content-panel" style={{ marginTop: "1rem" }}>
            <div className="content-section-heading"><div><span>CMS Yayın Akışı</span><h2>Taslak → SEO → Yayın</h2></div><p>Hakkımızda, sekiz public güven/rol sayfası ve dört temel SSS aynı kabul çizgisinde izlenir.</p></div>
            <div className="content-metric-grid">
              <article className="content-metric-card"><span>Başlangıç seti</span><strong>{starter.createdTotal}/{starter.total}</strong><small>{starter.archivedTotal > 0 ? `${starter.archivedTotal} arşivde` : "aktif kayıt"}</small></article>
              <article className="content-metric-card"><span>Canlı temel içerik</span><strong>{starter.publishedTotal}/{starter.total}</strong><small>yayında</small></article>
              <article className="content-metric-card"><span>SEO hazır</span><strong>{starter.seoReady}/{starter.seoTotal}</strong><small>Hakkımızda + 8 public sayfa</small></article>
              <article className="content-metric-card"><span>Bekleyen temel değişiklik</span><strong>{starter.pendingTotal}</strong><small>{oldestPendingAge ? `en eskisi ${oldestPendingAge}` : "canlı kabulü bozmaz"}</small></article>
              <article className="content-metric-card"><span>Operasyon kuyruğu</span><strong>{data.queue}</strong><small>tüm bekleyen taslaklar</small></article>
            </div>
          </div>

          {starter.pendingTotal > 0 ? <div className="content-panel" style={{ marginTop: "1rem" }} role="status"><div className="content-section-heading"><div><span>Editoryal Takip</span><h2>Yayındaki içerikte {starter.pendingTotal} bekleyen temel değişiklik var</h2></div><p>{oldestPendingAge ? `En eski değişiklik ${oldestPendingAge}dır bekliyor.` : "Canlı kabul etkilenmiyor."}</p></div><div className="content-form-actions" style={{ flexWrap: "wrap" }}>{data.corporatePendingDraft > 0 ? <Link href={corporateHref}>Hakkımızda değişikliğini incele →</Link> : null}{data.faqPendingDrafts > 0 ? <Link href={faqPendingHref}>SSS değişikliğini incele ({data.faqPendingDrafts}) →</Link> : null}{data.guidesPendingDraft > 0 ? <Link href={publicPageHref}>Public sayfa değişikliğini incele ({data.guidesPendingDraft}) →</Link> : null}</div></div> : null}

          {starter.archivedTotal > 0 ? <div className="content-panel" style={{ marginTop: "1rem" }} role="alert"><div className="content-section-heading"><div><span>Yaşam Döngüsü</span><h2>{starter.archivedTotal} temel içerik arşivde</h2></div></div><p>Arşivdeki başlangıç kayıtlarının üzerine yeni kopya oluşturulmaz. İlgili kaydı açıp taslağa geri alın; içerik anahtarı ve sürüm geçmişi korunur.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}>{data.corporateArchived > 0 ? <Link href={corporateHref}>Hakkımızda kaydını aç →</Link> : null}{data.guidesArchived > 0 ? <Link href={publicPageHref}>Public sayfa kaydını aç →</Link> : null}</div></div> : null}

          {!ready && starter.missingTotal > 0 ? <div className="content-panel" style={{ marginTop: "1rem" }}><div className="content-section-heading"><div><span>Başlangıç Seti</span><h2>{starter.missingTotal} gerçekten eksik kayıt var</h2></div></div><p>Yalnız mevcut olmayan kayıtlar için Hakkımızda, sekiz public güven/rol sayfası ve dört temel SSS taslağı oluşturulur. Arşivdeki içerik yeni kopya sayılmaz ve üzerine yazılmaz.</p><form action={createStarterContentDraftsAction} className="content-form-actions"><button type="submit">{starter.accountedTotal > 0 ? "Eksik başlangıç taslaklarını tamamla" : "Başlangıç taslaklarını oluştur"}</button></form></div> : null}

          {!ready && starter.complete ? <div className="content-panel" style={{ marginTop: "1rem" }}><div className="content-section-heading"><div><span>Sıradaki Adım</span><h2>{starter.total}/{starter.total} başlangıç kaydı hazır</h2></div></div><p>{access.canPublish ? "Metin, SEO ve önizlemeyi kontrol ettikten sonra ilgili editör ekranından yayınlayın." : "Kayıtları ve önizlemeleri kontrol edin. Canlı yayın için yayın yetkili kullanıcı gerekir."}</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href={corporateHref}>Hakkımızda →</Link><Link href="/icerik/sayfalar">8 public sayfa →</Link><Link href={faqHref}>Temel SSS →</Link><Link href="/icerik/seo">SEO Merkezi →</Link></div></div> : null}

          <div className="content-panel" style={{ marginTop: "1rem" }}><div className="content-list">{items.map((item) => <div className="content-list-row" key={item.label} style={{ alignItems: "flex-start", gap: "1rem" }}><div style={{ minWidth: 110 }}><strong>{levelLabel(item.level)}</strong><br /><small>{item.value}</small></div><div style={{ flex: 1 }}><strong>{item.label}</strong><p style={{ margin: ".35rem 0 0" }}>{item.detail}</p></div><div style={{ display: "flex", gap: ".55rem", flexWrap: "wrap", justifyContent: "flex-end" }}><Link href={item.href}>{item.action} →</Link>{item.previewHref ? <Link href={item.previewHref}>Önizle ↗</Link> : null}{item.liveHref ? <Link href={item.liveHref} target="_blank">Canlı ↗</Link> : null}</div></div>)}</div></div>
        </>
      )}
    </section>
  );
}
