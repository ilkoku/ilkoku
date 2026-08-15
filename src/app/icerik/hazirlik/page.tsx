import Link from "next/link";
import { createStarterContentDraftsAction } from "@/features/cms/starter-content-actions";
import { requireCmsManager } from "@/lib/cms-access";
import {
  cmsReadinessTargets,
  getCmsReadinessSummary,
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
      label: "Kurumsal Sayfalar",
      value: `${data.corporate}/${cmsReadinessTargets.corporate}`,
      level: data.corporate >= cmsReadinessTargets.corporate ? "pass" : "warn",
      detail: data.corporate >= cmsReadinessTargets.corporate
        ? "En az bir indexlenebilir TR kurumsal sayfa yayında."
        : "Henüz indexlenebilir TR kurumsal CMS sayfası yok. Sprint 3 içerik kabulü tamamlanmış sayılmaz.",
      href: "/icerik/sayfalar",
    },
    {
      label: "SSS & Yardım",
      value: `${data.faq}/${cmsReadinessTargets.faq}`,
      level: data.faq >= cmsReadinessTargets.faq ? "pass" : "warn",
      detail: data.faq >= cmsReadinessTargets.faq
        ? "Temel TR yardım seti yayında."
        : `Canlı kabul için en az ${cmsReadinessTargets.faq} temel TR SSS yayını hedefleniyor.`,
      href: "/icerik/sss?dil=tr",
    },
    {
      label: "Rehberler",
      value: `${data.guides}/${cmsReadinessTargets.guides}`,
      level: data.guides >= cmsReadinessTargets.guides ? "pass" : "warn",
      detail: data.guides >= cmsReadinessTargets.guides
        ? "Indexlenebilir TR rehber detayı yayında."
        : "Rehber dizini açık ancak henüz yayınlanmış rehber detayı yok.",
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
  searchParams: Promise<{ baslangic?: string; sayfa?: string; sss?: string }>;
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
  const summary = data ? getCmsReadinessSummary(data) : null;
  const blockers = items.filter((item) => item.level === "blocker").length;
  const warnings = items.filter((item) => item.level === "warn").length;
  const passes = items.filter((item) => item.level === "pass").length;
  const ready = summary?.ready ?? false;
  const starterCreated = params.baslangic === "1";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Sprint 3 · Canlı İçerik</span>
          <h1>Yayın Hazırlığı</h1>
          <p>Canlı İlkOku içeriğinin gerçekten doldurulup doldurulmadığını tek ekrandan kontrol edin. Teknik CMS sağlığından farklı olarak bu ekran içerik kabulünü ölçer.</p>
        </div>
        <div className="content-profile">
          <strong>{ready ? "YAYINA HAZIR" : "İÇERİK EKSİĞİ VAR"}</strong>
          <small>{passes} PASS · {warnings} WARN · {blockers} BLOCKER</small>
        </div>
      </div>

      {starterCreated ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="status">
          <strong>Başlangıç taslakları hazırlandı.</strong>
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

          {!ready ? (
            <div className="content-panel" style={{ marginTop: "1rem" }}>
              <div className="content-section-heading">
                <div><span>Başlangıç Seti</span><h2>Eksik içeriklere güvenli taslak oluştur</h2></div>
              </div>
              <p>Yalnız mevcut olmayan kayıtlar için Hakkımızda, İlkOku Nasıl Çalışır rehberi ve dört temel SSS taslağı oluşturulur. Mevcut içerik değiştirilmez. Tüm kayıtlar taslak kalır; inceleme ve yayın işlemi ayrıca yapılır.</p>
              <form action={createStarterContentDraftsAction} className="content-form-actions">
                <button type="submit">Başlangıç taslaklarını oluştur</button>
              </form>
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
