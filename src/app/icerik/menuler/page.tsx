import Link from "next/link";
import { FooterNavigationWorkbench } from "@/components/content/FooterNavigationWorkbench";
import { publishFooterNavigationAction } from "@/features/cms/navigation-actions";
import { requireCmsAdmin } from "@/lib/cms-access";
import {
  defaultFooterNavigation,
  FOOTER_DRAFT_KEY,
  FOOTER_LIVE_KEY,
  parseFooterNavigation,
} from "@/lib/cms-footer-navigation";
import { analyzeFooterNavigation } from "@/lib/cms-footer-validation";
import { prisma } from "@/lib/prisma";

type FooterRow = {
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

type PageProps = { searchParams: Promise<{ taslak?: string; yayin?: string; hata?: string }> };

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}

export default async function Page({ searchParams }: PageProps) {
  await requireCmsAdmin("/icerik/menuler");
  const params = await searchParams;

  let rows: FooterRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<FooterRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'site'
        AND contentKey IN (${FOOTER_LIVE_KEY}, ${FOOTER_DRAFT_KEY})
      LIMIT 2
    `;
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Site</span><h1>Menüler & Footer</h1><p>Footer yapılandırması okunmadan çalışma kopyası veya yayın kararı üretilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Footer yapılandırması okunamadı.</strong><p>Bu durum ilk kurulum anlamına gelmez. Canlı footer ve çalışma kopyası doğrulanamadığı için kaydetme/yayınlama aksiyonları durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/menuler">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const liveRow = rows.find((row) => row.contentKey === FOOTER_LIVE_KEY) ?? null;
  const draftRow = rows.find((row) => row.contentKey === FOOTER_DRAFT_KEY && row.status === "draft") ?? null;
  const draftPayload = draftRow ? parseFooterNavigation(draftRow.valueJson) : null;
  const livePayload = liveRow ? parseFooterNavigation(liveRow.valueJson) : null;
  const invalidDraft = Boolean(draftRow && !draftPayload);
  const invalidLive = Boolean(liveRow && !livePayload);

  if (invalidDraft || (invalidLive && !draftPayload)) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Site</span><h1>Menüler & Footer</h1><p>Mevcut footer verisi bozuksa varsayılanlarla üzerine yazılmaz.</p></div></div>
        <div className="content-panel" role="alert"><strong>Footer JSON bütünlüğü doğrulanamadı.</strong><p>{invalidDraft ? "Güvenli çalışma taslağı kaydı parse edilemiyor. Bilinmeyen taslak içeriğinin üzerine yazmamak için düzenleme ve yayın kapatıldı." : "Mevcut footer kaydı parse edilemiyor ve geçerli bir çalışma taslağı yok. Kod varsayılanlarıyla üzerine yazmak veri kaybı yaratabileceği için işlem durduruldu."}</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/menuler">Tekrar dene</Link></div></div>
      </section>
    );
  }

  let payload = defaultFooterNavigation;
  let sourceLabel = "İlk kurulum";
  let sourceDetail = "Henüz footer kaydı yok; kod varsayılanları gösteriliyor.";
  if (draftPayload) {
    payload = draftPayload;
    sourceLabel = "Güvenli çalışma taslağı";
    sourceDetail = `Canlı footer korunuyor · taslak ${formatDate(draftRow!.updatedAt)} güncellendi.`;
  } else if (livePayload && liveRow?.status === "published") {
    payload = livePayload;
    sourceLabel = "Yayındaki footer";
    sourceDetail = `Çalışma alanı canlı değerlerden hazırlandı · ${formatDate(liveRow.updatedAt)} güncellendi.`;
  } else if (livePayload && liveRow?.status === "draft") {
    payload = livePayload;
    sourceLabel = "Legacy taslak";
    sourceDetail = "Eski akıştan kalan footer_navigation taslağı bulundu. Önce güvenli çalışma kopyasına kaydedin, sonra yayınlayın.";
  } else if (livePayload) {
    payload = livePayload;
    sourceLabel = "Pasif footer kaydı";
    sourceDetail = "Arşiv/pasif kayıt düzenleme başlangıcı olarak gösteriliyor; canlı public override aktif değil.";
  }

  const hasSafeDraft = Boolean(draftPayload);
  const linkAnalysis = await analyzeFooterNavigation(payload).catch(() => null);
  const blockers = linkAnalysis?.blocking.length ?? 0;
  const verifiedCount = linkAnalysis?.diagnostics.filter((item) => item.status === "ok").length ?? 0;
  const fallbackCount = linkAnalysis?.fallbackCount ?? 0;
  const canPublish = hasSafeDraft && Boolean(linkAnalysis) && blockers === 0;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Site · Admin</span><h1>Menüler & Footer</h1><p>Footer metinlerini ve hedeflerini bölüm bazlı yönetin; anlık görünümü izleyin ve yalnız server doğrulamasından geçen çalışma taslağını yayınlayın.</p></div>
        <div className="content-profile"><strong>{sourceLabel}</strong><small>{sourceDetail}</small></div>
      </div>

      {params.taslak === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>Çalışma taslağı kaydedildi ve hedefler yeniden denetlendi.</strong><p>Yayındaki footer değişmedi. Sağlık durumu uygunsa ayrıca yayınlayabilirsiniz.</p></div> : null}
      {params.yayin === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>Footer yayınlandı.</strong><p>Doğrulanmış çalışma taslağı canlı footer’a atomik uygulandı ve taslak arşivlendi.</p></div> : null}
      {params.hata === "taslak" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Yayınlama durduruldu.</strong><p>Geçerli bir güvenli çalışma taslağı bulunamadı.</p></div> : null}
      {params.hata === "linkler" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Yayınlama durduruldu.</strong><p>Footer taslağında kırık, güvenli olmayan veya tekrarlı hedef var. Taslak korunuyor; çalışma masasındaki ilgili bölümü düzeltin.</p></div> : null}
      {liveRow?.status === "draft" && !draftPayload ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Legacy footer taslağı algılandı.</strong><p>Mevcut değerler kaybolmadan çalışma alanına taşındı; önce yeni güvenli taslağa kaydedin.</p></div> : null}
      {!linkAnalysis ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Footer hedef denetimi çalıştırılamadı.</strong><p>Public rota/içerik listesi doğrulanamadığı için yayınlama fail-closed olarak kilitlendi. Taslak düzenlemeye devam edebilirsiniz.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className="content-metric-grid" style={{ marginBottom: "1rem" }}>
        <article className="content-metric-card"><span>Bağlantı</span><strong>{linkAnalysis?.diagnostics.length ?? 9}</strong><small>footer hedefi</small></article>
        <article className="content-metric-card"><span>Doğrulandı</span><strong>{verifiedCount}</strong><small>public hedef bulundu</small></article>
        <article className="content-metric-card"><span>Fallback</span><strong>{fallbackCount}</strong><small>güvenli kod hedefi</small></article>
        <article className="content-metric-card"><span>Blokaj</span><strong>{blockers}</strong><small>kırık / duplicate</small></article>
      </div>

      <FooterNavigationWorkbench initial={payload} diagnostics={linkAnalysis?.diagnostics ?? []} hasAnalysis={Boolean(linkAnalysis)} />

      <div className="content-publish-box" style={{ marginTop: "1rem" }}>
        <div><strong>Canlı yayın</strong><p>{!hasSafeDraft ? "Önce çalışma masasından güvenli bir taslak oluşturun." : blockers > 0 ? `${blockers} hedef blokajı düzeltilmeden canlı footer değiştirilemez.` : !linkAnalysis ? "Hedef denetimi tamamlanamadığı için yayın kilitli." : "Kaydedilmiş taslak server-side rota denetiminden geçti. Canlı footer yalnız bu işlemle değişir."}</p></div>
        {canPublish ? <form action={publishFooterNavigationAction}><button type="submit">Doğrulanmış Footer’ı Yayınla</button></form> : <span className="content-form-help">Yayın koşulları tamamlanmadı</span>}
      </div>
    </section>
  );
}
