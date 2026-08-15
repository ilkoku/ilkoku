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

function readinessItems(data: CmsReadinessSnapshot, canPublish: boolean): ReadinessItem[] {
  const corporateHref = data.corporateId ? `/icerik/sayfalar/${data.corporateId}` : "/icerik/hazirlik";
  const corporatePreviewHref = data.corporateId && data.corporateStatus !== "archived"
    ? `/icerik/onizleme/sayfa/${data.corporateId}`
    : undefined;
  const faqHref = data.faqFocusKey ? `/icerik/sss?dil=tr#faq-${data.faqFocusKey}` : "/icerik/sss?dil=tr";
  const guideHref = data.guideId ? `/icerik/rehber/${data.guideId}?dil=tr` : "/icerik/hazirlik";
  const guidePreviewHref = data.guideId && data.guideStatus !== "archived"
    ? `/icerik/onizleme/rehber/${data.guideId}?dil=tr`
    : undefined;

  const corporateDetail = data.corporate >= cmsReadinessTargets.corporate
    ? "Hakkımızda yayında ve indexlenebilir."
    : data.corporateCreated >= cmsStarterTargets.corporate
      ? data.corporateSeoReady >= cmsStarterTargets.corporate
        ? "Hakkımızda taslağı ve temel SEO alanları hazır. Önizleme ve yayın bekliyor."
        : "Hakkımızda taslağı hazır. Yayından önce SEO alanlarını kontrol edin."
      : data.corporateArchived > 0
        ? "Hakkımızda kaydı arşivde. Mevcut kaydı açıp taslak olarak kaydedin; yeni kopya oluşturulmayacak."
        : "Hakkımızda kaydı henüz yok. Sprint 3 başlangıç setinden güvenli taslak oluşturabilirsiniz.";

  const faqDetail = data.faq >= cmsReadinessTargets.faq
    ? "Dört temel TR yardım kaydının tamamı yayında."
    : data.faqCreated >= cmsStarterTargets.faq
      ? `${data.faqCreated}/${cmsStarterTargets.faq} temel SSS kayıtlı; ${data.faq}/${cmsReadinessTargets.faq} yayında. Panel ilk işlem gerektiren temel SSS'ye gider.`
      : data.faqArchived > 0
        ? `${data.faqCreated}/${cmsStarterTargets.faq} aktif kayıt · ${data.faqArchived} arşivde. Arşivdeki temel SSS'leri geri alın; yalnız gerçekten eksik kayıtlar yeniden oluşturulabilir.`
        : `${data.faqCreated}/${cmsStarterTargets.faq} temel SSS kayıtlı. Eksik başlangıç kayıtlarını tamamlayın.`;

  const guideDetail = data.guides >= cmsReadinessTargets.guides
    ? "İlkOku Nasıl Çalışır rehberi yayında ve indexlenebilir."
    : data.guidesCreated >= cmsStarterTargets.guides
      ? data.guidesSeoReady >= cmsStarterTargets.guides
        ? "İlkOku Nasıl Çalışır taslağı ve temel SEO alanları hazır. Önizleme ve yayın bekliyor."
        : "İlkOku Nasıl Çalışır taslağı hazır. Yayından önce SEO alanlarını kontrol edin."
      : data.guidesArchived > 0
        ? "İlkOku Nasıl Çalışır rehberi arşivde. Mevcut kaydı açıp taslağa geri alın; yeni kopya oluşturulmayacak."
        : "İlkOku Nasıl Çalışır rehber kaydı henüz yok.";

  return [
    {
      label: "Ana Sayfa",
      value: `${data.homepage}/${cmsReadinessTargets.homepage}`,
      level: data.homepage >= cmsReadinessTargets.homepage ? "pass" : "warn",
      detail: "Hero, rol seçimi, Eser Pasaportu, Neden İlkOku ve footer CMS yayını.",
      href: "/icerik/ana-sayfa?dil=tr",
      action: "Kontrol et",
    },
    {
      label: "Yasal Sayfalar",
      value: `${data.legal}/${cmsReadinessTargets.legal}`,
      level: data.legal >= cmsReadinessTargets.legal ? "pass" : "blocker",
      detail: "Kullanım, Gizlilik, KVKK, Çerez ve Telif metinlerinin CMS sahipliği.",
      href: "/icerik/yasal?dil=tr",
      action: "Belgeleri aç",
    },
    {
      label: "Hakkımızda",
      value: `Kayıt ${data.corporateCreated}/${cmsStarterTargets.corporate} · Canlı ${data.corporate}/${cmsReadinessTargets.corporate}`,
      level: data.corporate >= cmsReadinessTargets.corporate ? "pass" : "warn",
      detail: corporateDetail,
      href: corporateHref,
      action: data.corporate >= cmsReadinessTargets.corporate
        ? "Kaydı aç"
        : data.corporateCreated >= cmsStarterTargets.corporate
          ? canPublish ? "İncele ve yayınla" : "Taslağı incele"
          : data.corporateArchived > 0 ? "Arşiv kaydını aç" : "Başlangıç setini aç",
      previewHref: corporatePreviewHref,
      liveHref: data.corporate >= cmsReadinessTargets.corporate ? "/hakkimizda" : undefined,
    },
    {
      label: "Temel SSS",
      value: `Kayıt ${data.faqCreated}/${cmsStarterTargets.faq} · Canlı ${data.faq}/${cmsReadinessTargets.faq}`,
      level: data.faq >= cmsReadinessTargets.faq ? "pass" : "warn",
      detail: faqDetail,
      href: faqHref,
      action: data.faq >= cmsReadinessTargets.faq
        ? "Temel SSS'leri aç"
        : data.faqCreated > 0 || data.faqArchived > 0
          ? canPublish ? "İncele ve yayınla" : "Taslakları incele"
          : "SSS modülünü aç",
      previewHref: data.faqCreated > 0 ? "/icerik/onizleme/sss?dil=tr" : undefined,
      liveHref: data.faq > 0 ? "/yardim" : undefined,
    },
    {
      label: "İlkOku Nasıl Çalışır",
      value: `Kayıt ${data.guidesCreated}/${cmsStarterTargets.guides} · Canlı ${data.guides}/${cmsReadinessTargets.guides}`,
      level: data.guides >= cmsReadinessTargets.guides ? "pass" : "warn",
      detail: guideDetail,
      href: guideHref,
      action: data.guides >= cmsReadinessTargets.guides
        ? "Kaydı aç"
        : data.guidesCreated >= cmsStarterTargets.guides
          ? canPublish ? "İncele ve yayınla" : "Taslağı incele"
          : data.guidesArchived > 0 ? "Arşiv kaydını aç" : "Başlangıç setini aç",
      previewHref: guidePreviewHref,
      liveHref: data.guides >= cmsReadinessTargets.guides ? "/rehber/ilkoku-nasil-calisir" : undefined,
    },
    {
      label: "Medya",
      value: String(data.media),
      level: data.media > 0 ? "pass" : "info",
      detail: data.media > 0 ? "Aktif medya varlıkları mevcut." : "CMS medya kütüphanesinde aktif kayıt yok.",
      href: "/icerik/medya",
      action: "Medya'yı aç",
    },
    {
      label: "SEO Eksikleri",
      value: String(data.seoMissing),
      level: data.seoMissing === 0 ? "pass" : "warn",
      detail: data.seoMissing === 0
        ? "Yayındaki TR CMS sayfalarında temel SEO eksiği yok."
        : "Yayındaki TR CMS sayfalarında title, description veya canonical eksiği var.",
      href: "/icerik/seo",
      action: data.seoMissing === 0 ? "SEO'yu aç" : "Eksikleri düzelt",
    },
    {
      label: "Yayın Kuyruğu",
      value: String(data.queue),
      level: data.queue === 0 ? "pass" : "info",
      detail: data.queue === 0
        ? "Bekleyen taslak yok."
        : "Operasyon kuyruğunda taslaklar var. Bu kayıtlar mevcut canlı içeriğin yayın kabulünü bozmaz; ayrı olarak incelenip planlanır.",
      href: "/icerik/yayin-kuyrugu",
      action: data.queue === 0 ? "Kuyruğu aç" : "Taslakları yönet",
    },
  ];
}

export default async function ContentReadinessPage({
  searchParams,
}: {
  searchParams: Promise<{ baslangic?: string; sayfa?: string; sss?: string; hata?: string }>;
}) {
  const access = await requireCmsManager("/icerik/hazirlik");
  const params = await searchParams;

  let data: CmsReadinessSnapshot | null = null;
  try {
    data = await loadCmsReadiness();
  } catch {
    data = null;
  }

  const items = data ? readinessItems(data, access.canPublish) : [];
  const summary = data
    ? getCmsReadinessSummary(data)
    : { corePassed: 0, coreTotal: 5, blockers: 0, warnings: 0, operationalQueue: 0, ready: false };
  const starter = data
    ? getCmsStarterSummary(data)
    : {
        createdTotal: 0,
        archivedTotal: 0,
        accountedTotal: 0,
        missingTotal: cmsStarterTargets.total,
        publishedTotal: 0,
        total: cmsStarterTargets.total,
        seoReady: 0,
        seoTotal: cmsStarterTargets.seo,
        complete: false,
      };
  const blockers = items.filter((item) => item.level === "blocker").length;
  const warnings = items.filter((item) => item.level === "warn").length;
  const infos = items.filter((item) => item.level === "info").length;
  const passes = items.filter((item) => item.level === "pass").length;
  const ready = summary.ready;
  const starterCreated = params.baslangic === "1";
  const starterError = params.hata === "baslangic";

  const corporateHref = data?.corporateId ? `/icerik/sayfalar/${data.corporateId}` : "/icerik/sayfalar";
  const guideHref = data?.guideId ? `/icerik/rehber/${data.guideId}?dil=tr` : "/icerik/rehber?dil=tr";
  const faqHref = data?.faqFocusKey ? `/icerik/sss?dil=tr#faq-${data.faqFocusKey}` : "/icerik/sss?dil=tr";
  const faqArchivedHref = data?.faqArchivedKey ? `/icerik/sss?dil=tr#faq-${data.faqArchivedKey}` : "/icerik/sss?dil=tr";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Sprint 3 · Canlı İçerik</span>
          <h1>Yayın Hazırlığı</h1>
          <p>Taslak oluşumundan canlı yayına kadar temel Sprint 3 içeriklerini tek ekrandan izleyin. Canlı kabul ile operasyon kuyruğu ayrı değerlendirilir.</p>
        </div>
        <div className="content-profile">
          <strong>{ready ? "YAYINA HAZIR" : "İÇERİK EKSİĞİ VAR"}</strong>
          <small>{passes} PASS · {warnings} WARN · {blockers} BLOCKER · {infos} INFO</small>
        </div>
      </div>

      {starterError ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert">
          <strong>Başlangıç taslakları oluşturulamadı.</strong>
          <p>İşlem güvenli biçimde geri alındı; yarım içerik bırakılmadı. Sistem Sağlığını kontrol edip işlemi yeniden deneyin.</p>
          <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
        </div>
      ) : null}

      {starterCreated ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="status">
          <strong>Başlangıç taslakları kontrol edildi.</strong>
          <p>{params.sayfa ?? "0"} sayfa/rehber ve {params.sss ?? "0"} SSS taslağı oluşturuldu. Mevcut kayıtların üzerine yazılmadı ve hiçbir içerik otomatik yayınlanmadı.</p>
        </div>
      ) : null}

      {!data ? (
        <div className="content-panel" role="alert">
          <strong>İçerik hazırlık verileri okunamadı.</strong>
          <p>Veritabanı sorguları tamamlanamadı. İçerik yayınlamadan önce Sistem Sağlığı ekranını kontrol edin.</p>
          <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
        </div>
      ) : (
        <>
          <div className="content-metric-grid">
            <article className="content-metric-card"><span>PASS</span><strong>{passes}</strong><small>kabul edilen alan</small></article>
            <article className="content-metric-card"><span>WARN</span><strong>{warnings}</strong><small>canlı içerik tamamlanmalı</small></article>
            <article className="content-metric-card"><span>BLOCKER</span><strong>{blockers}</strong><small>yayın öncesi zorunlu</small></article>
            <article className="content-metric-card"><span>Durum</span><strong>{ready ? "HAZIR" : "AÇIK"}</strong><small>{summary.corePassed}/{summary.coreTotal} temel alan</small></article>
          </div>

          <div className="content-panel" style={{ marginTop: "1rem" }}>
            <div className="content-section-heading">
              <div><span>Sprint 3 Akışı</span><h2>Taslak → SEO → Yayın</h2></div>
              <p>Başlangıç setinin oluşturulması ile canlı yayın birbirinden ayrı izlenir.</p>
            </div>
            <div className="content-metric-grid">
              <article className="content-metric-card"><span>Başlangıç seti</span><strong>{starter.createdTotal}/{starter.total}</strong><small>{starter.archivedTotal > 0 ? `${starter.archivedTotal} arşivde` : "aktif kayıt"}</small></article>
              <article className="content-metric-card"><span>Canlı temel içerik</span><strong>{starter.publishedTotal}/{starter.total}</strong><small>yayında</small></article>
              <article className="content-metric-card"><span>SEO hazır</span><strong>{starter.seoReady}/{starter.seoTotal}</strong><small>Hakkımızda + Rehber</small></article>
              <article className="content-metric-card"><span>Operasyon kuyruğu</span><strong>{data.queue}</strong><small>canlı kabulden bağımsız</small></article>
            </div>
          </div>

          {starter.archivedTotal > 0 ? (
            <div className="content-panel" style={{ marginTop: "1rem" }} role="alert">
              <div className="content-section-heading">
                <div><span>Yaşam Döngüsü</span><h2>{starter.archivedTotal} temel içerik arşivde</h2></div>
              </div>
              <p>Arşivdeki başlangıç kayıtlarının üzerine yeni kopya oluşturulmaz. İlgili kaydı doğrudan açıp taslağa geri alın; böylece içerik anahtarı ve sürüm geçmişi korunur.</p>
              <div className="content-form-actions" style={{ flexWrap: "wrap" }}>
                {data.corporateArchived > 0 ? <Link href={corporateHref}>Hakkımızda kaydını aç →</Link> : null}
                {data.guidesArchived > 0 ? <Link href={guideHref}>Rehber kaydını aç →</Link> : null}
                {data.faqArchived > 0 ? <Link href={faqArchivedHref}>Arşiv SSS kaydına git →</Link> : null}
              </div>
            </div>
          ) : null}

          {!ready && starter.missingTotal > 0 ? (
            <div className="content-panel" style={{ marginTop: "1rem" }}>
              <div className="content-section-heading">
                <div><span>Başlangıç Seti</span><h2>{starter.missingTotal} gerçekten eksik kayıt var</h2></div>
              </div>
              <p>Yalnız mevcut olmayan kayıtlar için Hakkımızda, İlkOku Nasıl Çalışır rehberi ve dört temel SSS taslağı oluşturulur. Arşivdeki içerik yeni kopya sayılmaz ve üzerine yazılmaz.</p>
              <form action={createStarterContentDraftsAction} className="content-form-actions">
                <button type="submit">{starter.accountedTotal > 0 ? "Eksik başlangıç taslaklarını tamamla" : "Başlangıç taslaklarını oluştur"}</button>
              </form>
            </div>
          ) : null}

          {!ready && starter.complete ? (
            <div className="content-panel" style={{ marginTop: "1rem" }}>
              <div className="content-section-heading">
                <div><span>Sıradaki Adım</span><h2>6/6 başlangıç kaydı hazır</h2></div>
              </div>
              <p>{access.canPublish
                ? "Doğrudan ilgili kayda gidin; metin ve önizlemeyi kontrol ettikten sonra aynı editör ekranından yayınlayabilirsiniz."
                : "Doğrudan ilgili kayda gidip metin ve önizlemeyi kontrol edin. Bu hesap taslak hazırlayabilir; canlı yayın için yayın yetkili kullanıcı gerekir."}</p>
              <div className="content-form-actions" style={{ flexWrap: "wrap" }}>
                <Link href={corporateHref}>{access.canPublish ? "Hakkımızda · incele/yayınla" : "Hakkımızda · incele"} →</Link>
                <Link href={guideHref}>{access.canPublish ? "Rehber · incele/yayınla" : "Rehber · incele"} →</Link>
                <Link href={faqHref}>{access.canPublish ? "Temel SSS · incele/yayınla" : "Temel SSS · incele"} →</Link>
                <Link href="/icerik/yayin-kuyrugu">Operasyon Kuyruğu →</Link>
              </div>
            </div>
          ) : null}

          <div className="content-panel" style={{ marginTop: "1rem" }}>
            <div className="content-list">
              {items.map((item) => (
                <div className="content-list-row" key={item.label} style={{ alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ minWidth: 110 }}><strong>{levelLabel(item.level)}</strong><br /><small>{item.value}</small></div>
                  <div style={{ flex: 1 }}><strong>{item.label}</strong><p style={{ margin: ".35rem 0 0" }}>{item.detail}</p></div>
                  <div style={{ display: "flex", gap: ".55rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Link href={item.href}>{item.action} →</Link>
                    {item.previewHref ? <Link href={item.previewHref}>Önizle ↗</Link> : null}
                    {item.liveHref ? <Link href={item.liveHref} target="_blank">Canlı ↗</Link> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
