import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CountRow = { total: bigint | number };
type ReadinessLevel = "pass" | "warn" | "blocker" | "info";

type ReadinessItem = {
  label: string;
  value: string;
  level: ReadinessLevel;
  detail: string;
  href: string;
};

function count(rows: CountRow[]) {
  return Number(rows[0]?.total ?? 0);
}

function levelLabel(level: ReadinessLevel) {
  if (level === "pass") return "PASS";
  if (level === "blocker") return "BLOCKER";
  if (level === "warn") return "WARN";
  return "INFO";
}

async function loadReadiness() {
  const [homepageRows, legalRows, faqRows, guideRows, corporateRows, mediaRows, seoRows, queueRows] = await Promise.all([
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent
      WHERE namespace = 'homepage'
        AND status = 'published'
        AND contentKey IN ('hero', 'roles', 'passport', 'why', 'footer')
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM ContentPage
      WHERE status = 'published'
        AND contentKey IN (
          'legal:kullanim-sartlari',
          'legal:gizlilik-politikasi',
          'legal:kvkk',
          'legal:cerez-politikasi',
          'legal:telif-hakki-politikasi'
        )
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent
      WHERE namespace = 'faq' AND status = 'published'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM ContentPage
      WHERE status = 'published'
        AND contentKey LIKE 'guide:%'
        AND contentKey NOT LIKE 'guide:en:%'
        AND noIndex = false
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM ContentPage
      WHERE status = 'published'
        AND contentKey LIKE 'page:tr:%'
        AND noIndex = false
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM SiteContent
      WHERE namespace = 'media' AND status <> 'archived'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM ContentPage
      WHERE status = 'published'
        AND contentKey NOT LIKE 'legal:en:%'
        AND contentKey NOT LIKE 'guide:en:%'
        AND contentKey NOT LIKE 'page:en:%'
        AND (
          COALESCE(TRIM(seoTitle), '') = ''
          OR COALESCE(TRIM(seoDescription), '') = ''
          OR COALESCE(TRIM(canonicalUrl), '') = ''
        )
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT (
        (SELECT COUNT(*) FROM SiteContent WHERE namespace = 'cms_draft' AND status = 'draft')
        +
        (SELECT COUNT(*) FROM ContentPage WHERE status = 'draft' AND (
          contentKey LIKE 'legal:%'
          OR contentKey LIKE 'guide:%'
          OR contentKey LIKE 'page:tr:%'
          OR contentKey LIKE 'page:en:%'
        ))
        +
        (SELECT COUNT(*) FROM SiteContent WHERE namespace IN ('faq', 'faq_en') AND status = 'draft')
      ) AS total
    `,
  ]);

  return {
    homepage: count(homepageRows),
    legal: count(legalRows),
    faq: count(faqRows),
    guides: count(guideRows),
    corporate: count(corporateRows),
    media: count(mediaRows),
    seoMissing: count(seoRows),
    queue: count(queueRows),
  };
}

export default async function ContentReadinessPage() {
  await requireCmsManager("/icerik/hazirlik");

  let data: Awaited<ReturnType<typeof loadReadiness>> | null = null;
  try {
    data = await loadReadiness();
  } catch {
    data = null;
  }

  const items: ReadinessItem[] = data
    ? [
        {
          label: "Ana Sayfa",
          value: `${data.homepage}/5`,
          level: data.homepage === 5 ? "pass" : "warn",
          detail: "Hero, rol seçimi, Eser Pasaportu, Neden İlkOku ve footer CMS yayını.",
          href: "/icerik/ana-sayfa?dil=tr",
        },
        {
          label: "Yasal Sayfalar",
          value: `${data.legal}/5`,
          level: data.legal === 5 ? "pass" : "blocker",
          detail: "Kullanım, Gizlilik, KVKK, Çerez ve Telif metinlerinin CMS sahipliği.",
          href: "/icerik/yasal?dil=tr",
        },
        {
          label: "Kurumsal Sayfalar",
          value: String(data.corporate),
          level: data.corporate > 0 ? "pass" : "warn",
          detail: data.corporate > 0
            ? "En az bir indexlenebilir TR kurumsal sayfa yayında."
            : "Henüz indexlenebilir TR kurumsal CMS sayfası yok. Sprint 3 içerik kabulü tamamlanmış sayılmaz.",
          href: "/icerik/sayfalar",
        },
        {
          label: "SSS & Yardım",
          value: String(data.faq),
          level: data.faq > 0 ? "pass" : "warn",
          detail: data.faq > 0 ? "TR yardım kayıtları yayında." : "Henüz TR SSS yayını yok; Yardım Merkezi içerik olarak boş kalabilir.",
          href: "/icerik/sss?dil=tr",
        },
        {
          label: "Rehberler",
          value: String(data.guides),
          level: data.guides > 0 ? "pass" : "warn",
          detail: data.guides > 0 ? "Indexlenebilir TR rehber detayı yayında." : "Rehber dizini açık ancak henüz yayınlanmış rehber detayı yok.",
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
          detail: data.seoMissing === 0 ? "Yayındaki TR CMS sayfalarında temel SEO eksiği yok." : "Yayındaki TR CMS sayfalarında title, description veya canonical eksiği var.",
          href: "/icerik/seo",
        },
        {
          label: "Yayın Kuyruğu",
          value: String(data.queue),
          level: data.queue === 0 ? "pass" : "warn",
          detail: data.queue === 0 ? "Bekleyen taslak yok." : "İnceleme veya ilk yayın bekleyen içerikler var.",
          href: "/icerik/yayin-kuyrugu",
        },
      ]
    : [];

  const blockers = items.filter((item) => item.level === "blocker").length;
  const warnings = items.filter((item) => item.level === "warn").length;
  const passes = items.filter((item) => item.level === "pass").length;
  const ready = Boolean(data && blockers === 0 && warnings === 0);

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

      {!data ? (
        <div className="content-panel">
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
            <article className="content-metric-card"><span>Durum</span><strong>{ready ? "HAZIR" : "AÇIK"}</strong><small>Sprint 3 içerik kabulü</small></article>
          </div>

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
