import Link from "next/link";
import {
  publishFooterNavigationAction,
  saveFooterNavigationAction,
} from "@/features/cms/navigation-actions";
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
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: "ok" | "fallback" | "duplicate" | "broken") {
  if (status === "ok") return "Doğrulandı";
  if (status === "fallback") return "Fallback";
  if (status === "duplicate") return "Tekrarlı hedef";
  return "Kırık / geçersiz";
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
    sourceDetail = `Form canlı değerlerden hazırlandı · ${formatDate(liveRow.updatedAt)} güncellendi.`;
  } else if (livePayload && liveRow?.status === "draft") {
    payload = livePayload;
    sourceLabel = "Legacy taslak";
    sourceDetail = "Eski akıştan kalan footer_navigation taslağı bulundu. Önce Taslak Kaydet ile güvenli çalışma kopyasına taşıyın, sonra yayınlayın.";
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
        <div><span>Site</span><h1>Menüler & Footer</h1><p>Footer başlıklarını, link metinlerini ve hedeflerini canlı sürümü bozmadan çalışma kopyasında yönetin.</p></div>
        <div className="content-profile"><strong>{sourceLabel}</strong><small>{sourceDetail}</small></div>
      </div>

      {params.taslak === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Çalışma taslağı kaydedildi.</strong><p>Yayındaki footer değişmedi. Aşağıdaki hedef denetimini tamamladıktan sonra ayrıca yayınlayabilirsiniz.</p></div> : null}
      {params.yayin === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Footer yayınlandı.</strong><p>Çalışma taslağı canlı footer’a atomik uygulandı ve taslak arşivlendi.</p></div> : null}
      {params.hata === "taslak" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Yayınlama durduruldu.</strong><p>Geçerli bir güvenli çalışma taslağı bulunamadı.</p></div> : null}
      {params.hata === "linkler" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Yayınlama durduruldu.</strong><p>Footer çalışma taslağında kırık, güvenli olmayan veya tekrarlı hedef var. Taslak korunuyor; aşağıdaki hedef denetiminden sorunlu bağlantıları düzeltin.</p></div> : null}
      {liveRow?.status === "draft" && !draftPayload ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Legacy footer taslağı algılandı.</strong><p>Bu kayıt eski davranış nedeniyle public override’dan düşmüş olabilir. Mevcut değerler kaybolmadan formda gösteriliyor; önce güvenli taslağa kaydedin.</p></div> : null}
      {!linkAnalysis ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Footer hedef denetimi çalıştırılamadı.</strong><p>Public rota/içerik listesi doğrulanamadığı için yayınlama fail-closed olarak kilitlendi. Taslak düzenlemeye devam edebilirsiniz.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className="content-metric-grid">
        <article className="content-metric-card"><span>Bağlantı</span><strong>{linkAnalysis?.diagnostics.length ?? 9}</strong><small>footer hedefi</small></article>
        <article className="content-metric-card"><span>Doğrulandı</span><strong>{verifiedCount}</strong><small>public hedef bulundu</small></article>
        <article className="content-metric-card"><span>Fallback</span><strong>{fallbackCount}</strong><small>kod hedefi kullanılacak</small></article>
        <article className="content-metric-card"><span>Blokaj</span><strong>{blockers}</strong><small>kırık / duplicate</small></article>
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-section-heading"><div><span>01</span><h2>Çalışma taslağı</h2></div><p>Canlı footer yayın anına kadar değişmez.</p></div>
        <form action={saveFooterNavigationAction} className="content-form">
          <div className="content-section-heading"><div><span>A</span><h2>Platform</h2></div></div>
          <label><span>Sütun başlığı</span><input name="platformTitle" defaultValue={payload.platformTitle} /></label>
          <div className="content-form-grid">
            <label><span>1. link metni</span><input name="platform1Label" defaultValue={payload.platform1Label} /></label><label><span>1. link hedefi</span><input name="platform1Href" defaultValue={payload.platform1Href} /></label>
            <label><span>2. link metni</span><input name="platform2Label" defaultValue={payload.platform2Label} /></label><label><span>2. link hedefi</span><input name="platform2Href" defaultValue={payload.platform2Href} /></label>
            <label><span>3. link metni</span><input name="platform3Label" defaultValue={payload.platform3Label} /></label><label><span>3. link hedefi</span><input name="platform3Href" defaultValue={payload.platform3Href} /></label>
          </div>
          <div className="content-section-heading"><div><span>B</span><h2>Destek</h2></div></div>
          <label><span>Sütun başlığı</span><input name="supportTitle" defaultValue={payload.supportTitle} /></label>
          <div className="content-form-grid"><label><span>Link metni</span><input name="supportLabel" defaultValue={payload.supportLabel} /></label><label><span>Link hedefi</span><input name="supportHref" defaultValue={payload.supportHref} placeholder="Boş bırakılırsa mevcut destek fallback’i korunur" /></label></div>
          <div className="content-section-heading"><div><span>C</span><h2>Yasal bağlantılar</h2></div></div>
          <label><span>Sütun başlığı</span><input name="legalTitle" defaultValue={payload.legalTitle} /></label>
          <div className="content-form-grid">
            <label><span>Kullanım Şartları</span><input name="termsLabel" defaultValue={payload.termsLabel} /></label><label><span>Hedef</span><input name="termsHref" defaultValue={payload.termsHref} placeholder="Boşsa güvenli yasal fallback" /></label>
            <label><span>Gizlilik</span><input name="privacyLabel" defaultValue={payload.privacyLabel} /></label><label><span>Hedef</span><input name="privacyHref" defaultValue={payload.privacyHref} placeholder="Boşsa güvenli yasal fallback" /></label>
            <label><span>KVKK</span><input name="kvkkLabel" defaultValue={payload.kvkkLabel} /></label><label><span>Hedef</span><input name="kvkkHref" defaultValue={payload.kvkkHref} placeholder="Boşsa güvenli yasal fallback" /></label>
            <label><span>Çerez</span><input name="cookieLabel" defaultValue={payload.cookieLabel} /></label><label><span>Hedef</span><input name="cookieHref" defaultValue={payload.cookieHref} placeholder="Boşsa güvenli yasal fallback" /></label>
            <label><span>Telif</span><input name="copyrightLabel" defaultValue={payload.copyrightLabel} /></label><label><span>Hedef</span><input name="copyrightHref" defaultValue={payload.copyrightHref} placeholder="Boşsa güvenli yasal fallback" /></label>
          </div>
          <div className="content-form-actions" style={{ position: "sticky", bottom: "1rem", zIndex: 5 }}><button type="submit">Çalışma Taslağını Kaydet</button></div>
        </form>
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-section-heading"><div><span>02</span><h2>Hedef denetimi</h2></div><p>Yayın öncesi public rota, anchor ve duplicate kontrolü</p></div>
        {!linkAnalysis ? <div className="content-empty"><strong>Hedef denetimi kullanılamıyor.</strong></div> : (
          <div className="content-list">
            <div className="content-list-row content-list-row--head"><span>Bağlantı</span><span>Hedef</span><span>Durum</span><span>Detay</span></div>
            {linkAnalysis.diagnostics.map((item) => (
              <div className="content-list-row" key={item.key}>
                <strong>{item.label}</strong>
                <code>{item.href || item.effectiveHref}</code>
                <span>{statusLabel(item.status)}</span>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="content-publish-box" style={{ marginTop: "1rem" }}>
        <div><strong>Yayınlama</strong><p>{!hasSafeDraft ? "Önce ayrı bir güvenli çalışma kopyası oluşturun." : blockers > 0 ? `${blockers} hedef blokajı düzeltilmeden canlı footer değiştirilemez.` : !linkAnalysis ? "Hedef denetimi tamamlanamadığı için yayın kilitli." : "Çalışma taslağı doğrulandı. Canlı footer yalnız bu işlemle atomik güncellenir."}</p></div>
        {canPublish ? <form action={publishFooterNavigationAction}><button type="submit">Doğrulanmış Footer’ı Yayınla</button></form> : <span className="content-form-help">Yayın koşulları tamamlanmadı</span>}
      </div>
    </section>
  );
}
