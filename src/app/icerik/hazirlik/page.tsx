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
};

function levelLabel(level: ReadinessLevel) {
  if (level === "pass") return "PASS";
  if (level === "blocker") return "BLOCKER";
  if (level === "warn") return "WARN";
  return "INFO";
}

function readinessItems(data: CmsReadinessSnapshot): ReadinessItem[] {
  const corporateDetail = data.corporate >= cmsReadinessTargets.corporate
    ? "Hakkımızda yayında ve indexlenebilir."
    : data.corporateCreated >= cmsStarterTargets.corporate
      ? data.corporateSeoReady >= cmsStarterTargets.corporate
        ? "Hakkımızda taslağı ve temel SEO alanları hazır. Önizleme ve yayın bekliyor."
        : "Hakkımızda taslağı hazır. Yayından önce SEO alanlarını kontrol edin."
      : "Hakkımızda kaydı henüz yok. Sprint 3 başlangıç setinden güvenli taslak oluşturabilirsiniz.";

  const faqDetail = data.faq >= cmsReadinessTargets.faq
    ? "Dört temel TR yardım kaydının tamamı yayında."
    : data.faqCreated >= cmsStarterTargets.faq
      ? `${data.faqCreated}/${cmsStarterTargets.faq} temel SSS kayıtlı; ${data.faq}/${cmsReadinessTargets.faq} yayında. Taslakları inceleyip yayınlayın.`
      : `${data.faqCreated}/${cmsStarterTargets.faq} temel SSS kayıtlı. Eksik başlangıç kayıtlarını tamamlayın.`;

  const guideDetail = data.guides >= cmsReadinessTargets.guides
    ? "İlkOku Nasıl Çalışır rehberi yayında ve indexlenebilir."
    : data.guidesCreated >= cmsStarterTargets.guides
      ? data.guidesSeoReady >= cmsStarterTargets.guides
        ? "İlkOku Nasıl Çalışır taslağı ve temel SEO alanları hazır. Önizleme ve yayın bekliyor."
        : "İlkOku Nasıl Çalışır taslağı hazır. Yayından önce SEO alanlarını kontrol edin."
      : "İlkOku Nasıl Çalışır rehber kaydı henüz yok.";

  return [
    {
      label: "Ana Sayfa",
      value: `${data.homepage}/${cmsReadinessTargets.homepage}`,
      level: data.homepage >= cmsReadinessTargets.homepage ? "pass" : "warn",
      detail: "Hero, rol seçimi, Eser Pasaportu, Neden İlkOku ve footer CMS yayını.",
      href: "/icerik/ana-sayfa?dil=tr",
    },
    {
      label: "Yasal Sayfalar",
      value: `${data.legal}/${cmsReadinessTargets.legal}`,
      level: data.legal >= cmsReadinessTargets.legal ? "pass" : "blocker",
      detail: "Kullanım, Gizlilik, KVKK, Çerez ve Telif metinlerinin CMS sahipliği.",
      href: "/icerik/yasal?dil=tr",
    },
    {
      label: "Hakkımızda",
      value: `Kayıt ${data.corporateCreated}/${cmsStarterTargets.corporate} · Canlı ${data.corporate}/${cmsReadinessTargets.corporate}`,
      level: data.corporate >= cmsReadinessTargets.corporate ? "pass" : "warn",
      detail: corporateDetail,
      href: "/icerik/sayfalar",
    },
    {
      label: "Temel SSS",
      value: `Kayıt ${data.faqCreated}/${cmsStarterTargets.faq} · Canlı ${data.faq}/${cmsReadinessTargets.faq}`,
      level: data.faq >= cmsReadinessTargets.faq ? "pass" : "warn",
      detail: faqDetail,
      href: "/icerik/sss?dil=tr",
    },
    {
      label: "İlkOku Nasıl Çalışır",
      value: `Kayıt ${data.guidesCreated}/${cmsStarterTargets.guides} · Canlı ${data.guides}/${cmsReadinessTargets.guides}`,
      level: data.guides >= cmsReadinessTargets.guides ? "pass" : "warn",
      detail: guideDetail,
      href: "/icerik/rehber?dil=tr",
    },
    {
      label: "Medya",
      value: String(data.media),
      level: data.media > 0 ? "pass" : "info",
      detail: data.media > 0 ? "Aktif medya varlıkları mevcut." : "CMS medya kütüphanesinde aktif kayıt yok.",
      href: "/icerik/medya",
    },
    {
      label: "SEO Eksikleri",
      value: String(data.seoMissing),
      level: data.seoMissing === 0 ? "pass" : "warn",
      detail: data.seoMissing === 0
        ? "Yayındaki TR CMS sayfalarında temel SEO eksiği yok."
        : "Yayındaki TR CMS sayfalarında title, description veya canonical eksiği var.",
      href: "/icerik/seo",
    },
    {
      label: "Yayın Kuyruğu",
      value: String(data.queue),
      level: data.queue === 0 ? "pass" : "warn",
      detail: data.queue === 0 ? "Bekleyen taslak yok." : "İnceleme veya ilk yayın bekleyen içerikler var.",
      href: "/icerik/yayin-kuyrugu",
    },
  ];
}

export default async function ContentReadinessPage({
  searchParams,
}: {
  searchParams: Promise<{ baslangic?: string; sayfa?: string; sss?: string; hata?: string }>;
}) {
  await requireCmsManager("/icerik/hazirlik");
  const params = await searchParams;

  let data: CmsReadinessSnapshot | null = null;
  try {
    data = await loadCmsReadiness();
  } catch {
    data = null;
  }

  const items = data ? readinessItems(data) : [];
  const summary = data
    ? getCmsReadinessSummary(data)
    : { corePassed: 0, coreTotal: 5, blockers: 0, warnings: 0, ready: false };
  const starter = data
    ? getCmsStarterSummary(data)
    : { createdTotal: 0, publishedTotal: 0, total: cmsStarterTargets.total, seoReady: 0, seoTotal: cmsStarterTargets.seo, complete: false };
  const blockers = items.filter((item) => item.level === "blocker").length;
  const warnings = items.filter((item) => item.level === "warn").length;
  const passes = items.filter((item) => item.level === "pass").length;
  const ready = summary.ready;
  const starterCreated = params.baslangic === "1";
  const starterError = params.hata === "baslangic";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Sprint 3 · Canlı İçerik</span>
          <h1>Yayın Hazırlığı</h1>
          <p>Taslak oluşumundan canlı yayına kadar temel Sprint 3 içeriklerini tek ekrandan izleyin. Teknik CMS sağlığından farklı olarak bu ekran içerik kabulünü ölçer.</p>
        </div>
        <div className="content-profile">
          <strong>{ready ? "YAYINA HAZIR" : "İÇERİK EKSİĞİ VAR"}</strong>
          <small>{passes} PASS · {warnings} WARN · {blockers} BLOCKER</small>
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
            <article className="content-metric-card"><span>WARN</span><strong>{warnings}</strong><small>içerik tamamlanmalı</small></article>
            <article className="content-metric-card"><span>BLOCKER</span><strong>{blockers}</strong><small>yayın öncesi zorunlu</small></article>
            <article className="content-metric-card"><span>Durum</span><strong>{ready ? "HAZIR" : "AÇIK"}</strong><small>{summary.corePassed}/{summary.coreTotal} temel alan</small></article>
          </div>

          <div className="content-panel" style={{ marginTop: "1rem" }}>
            <div className="content-section-heading">
              <div><span>Sprint 3 Akışı</span><h2>Taslak → SEO → Yayın</h2></div>
              <p>Başlangıç setinin oluşturulması ile canlı yayın birbirinden ayrı izlenir.</p>
            </div>
            <div className="content-metric-grid">
              <article className="content-metric-card"><span>Başlangıç seti</span><strong>{starter.createdTotal}/{starter.total}</strong><small>kayıt mevcut</small></article>
              <article className="content-metric-card"><span>Canlı temel içerik</span><strong>{starter.publishedTotal}/{starter.total}</strong><small>yayında</small></article>
              <article className="content-metric-card"><span>SEO hazır</span><strong>{starter.seoReady}/{starter.seoTotal}</strong><small>Hakkımızda + Rehber</small></article>
              <article className="content-metric-card"><span>Yayın kuyruğu</span><strong>{data.queue}</strong><small>bekleyen taslak</small></article>
            </div>
          </div>

          {!ready && !starter.complete ? (
            <div className="content-panel" style={{ marginTop: "1rem" }}>
              <div className="content-section-heading">
                <div><span>Başlangıç Seti</span><h2>Eksik içeriklere güvenli taslak oluştur</h2></div>
              </div>
              <p>Yalnız mevcut olmayan kayıtlar için Hakkımızda, İlkOku Nasıl Çalışır rehberi ve dört temel SSS taslağı oluşturulur. Mevcut içerik değiştirilmez. Tüm kayıtlar taslak kalır; inceleme ve yayın işlemi ayrıca yapılır.</p>
              <form action={createStarterContentDraftsAction} className="content-form-actions">
                <button type="submit">{starter.createdTotal > 0 ? "Eksik başlangıç taslaklarını tamamla" : "Başlangıç taslaklarını oluştur"}</button>
              </form>
            </div>
          ) : null}

          {!ready && starter.complete ? (
            <div className="content-panel" style={{ marginTop: "1rem" }}>
              <div className="content-section-heading">
                <div><span>Sıradaki Adım</span><h2>6/6 başlangıç kaydı hazır</h2></div>
              </div>
              <p>Başlangıç içeriği artık yeniden oluşturulmayacak. Sıradaki iş taslakları gözden geçirmek, önizlemek ve yayın yetkisiyle canlıya almak.</p>
              <div className="content-form-actions" style={{ flexWrap: "wrap" }}>
                <Link href="/icerik/sayfalar">Hakkımızda →</Link>
                <Link href="/icerik/rehber?dil=tr">Rehber →</Link>
                <Link href="/icerik/sss?dil=tr">4 temel SSS →</Link>
                <Link href="/icerik/yayin-kuyrugu">Yayın Kuyruğu →</Link>
              </div>
            </div>
          ) : null}

          <div className="content-panel" style={{ marginTop: "1rem" }}>
            <div className="content-list">
              {items.map((item) => (
                <div className="content-list-row" key={item.label} style={{ alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ minWidth: 110 }}><strong>{levelLabel(item.level)}</strong><br /><small>{item.value}</small></div>
                  <div style={{ flex: 1 }}><strong>{item.label}</strong><p style={{ margin: ".35rem 0 0" }}>{item.detail}</p></div>
                  <Link href={item.href}>Yönet →</Link>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
