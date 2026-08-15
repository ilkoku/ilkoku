import Link from "next/link";
import { archiveCmsRedirectAction, saveCmsRedirectAction } from "@/features/cms/redirect-actions";
import { requireCmsAdmin } from "@/lib/cms-access";
import { parseCmsRedirectValue } from "@/lib/cms-redirects";
import { prisma } from "@/lib/prisma";

type RedirectRow = {
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const errorMessages: Record<string, string> = {
  yol: "Yalnız site içi ve güvenli yollar kullanılabilir. Yönetim/API alanları yönlendirilemez.",
  ayni: "Eski ve yeni adres aynı olamaz.",
  dongu: "Bu kayıt bir yönlendirme döngüsü oluşturuyor. A→B→A gibi zincirler kaydedilemez.",
  veri: "Aktif yönlendirme kayıtlarından en az biri bozuk. Döngü grafiği güvenilir olmadığı için yeni kayıt oluşturma durduruldu.",
};

export const dynamic = "force-dynamic";

export default async function RedirectsPage({ searchParams }: PageProps) {
  await requireCmsAdmin("/icerik/yonlendirmeler");
  const query = await searchParams;
  const errorCode = typeof query.hata === "string" ? query.hata : "";

  let rows: RedirectRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<RedirectRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'redirect'
      ORDER BY updatedAt DESC
      LIMIT 300
    `;
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Büyüme</span><h1>Yönlendirmeler</h1><p>Yönlendirme verisi doğrulanamadığında yeni 308 kararı üretilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Yönlendirme verileri okunamadı.</strong><p>Bu durum “henüz yönlendirme yok” anlamına gelmez. Mevcut graph okunamadığı için oluşturma ve arşivleme aksiyonları durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/yonlendirmeler">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const prepared = rows.map((row) => ({ row, value: parseCmsRedirectValue(row.valueJson) }));
  const invalid = prepared.filter((item) => !item.value);
  const items = prepared.flatMap(({ row, value }) => value ? [{ ...row, ...value }] : []);
  const activeCount = items.filter((item) => item.status === "published").length;
  const invalidActive = invalid.filter((item) => item.row.status === "published").length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Büyüme</span><h1>Yönlendirmeler</h1><p>Artık kullanılmayan public URL&apos;leri güvenli ve kalıcı 308 yönlendirmeleriyle yeni adreslere taşıyın.</p></div>
        <div className="content-profile"><strong>{activeCount} aktif</strong><small>{items.length} geçerli · {invalid.length} bozuk kayıt</small></div>
      </div>

      {errorCode && errorMessages[errorCode] ? <div className="content-panel" style={{ marginBottom: "1rem", borderColor: "#efc8c8" }} role="alert"><strong>Yönlendirme kaydedilemedi</strong><p style={{ marginBottom: 0 }}>{errorMessages[errorCode]}</p></div> : null}
      {query.kayit === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Yönlendirme kaydedildi.</strong></div> : null}
      {invalid.length > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalid.length} yönlendirme kaydı parse edilemiyor.</strong><p>{invalidActive > 0 ? `${invalidActive} bozuk kayıt aktif statüde. Yeni yönlendirme oluşturma, graph bütünlüğü düzeltilene kadar kilitlidir.` : "Bozuk kayıtlar aktif graph dışında; teşhis için aşağıda görünür tutuluyor."}</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className="content-panel">
        {invalidActive > 0 ? (
          <div className="content-empty"><strong>Yeni yönlendirme oluşturma kilitli.</strong><p>Önce aktif bozuk yönlendirme kaydının veri bütünlüğünü düzeltin.</p></div>
        ) : (
          <form action={saveCmsRedirectAction} className="content-form">
            <label><span>Eski URL yolu</span><input name="source" required maxLength={150} placeholder="/eski-sayfa" autoComplete="off" /></label>
            <label><span>Yeni URL yolu</span><input name="target" required maxLength={150} placeholder="/yeni-sayfa" autoComplete="off" /></label>
            <p className="content-form-help">Yalnız / ile başlayan site içi yollar kabul edilir. Bu katman mevcut çalışan route&apos;ların önüne geçmez; eski/boş URL yakalandığında devreye girer.</p>
            <div className="content-form-actions"><button type="submit">Kalıcı 308 yönlendirmesi kaydet</button></div>
          </form>
        )}
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div style={{ marginBottom: "1rem" }}><h2 style={{ marginBottom: ".35rem" }}>Kayıtlı yönlendirmeler</h2><p style={{ margin: 0 }}>Arşivlenen kayıtlar saklanır ancak public trafikte uygulanmaz.</p></div>

        {items.length === 0 && invalid.length === 0 ? <div className="content-empty"><strong>Henüz yönlendirme yok.</strong><p>İlk eski URL kaydı oluşturulduğunda burada görünecek.</p></div> : (
          <div className="content-list">
            <div className="content-list-row content-list-row--head"><span>Eski adres</span><span>Yeni adres</span><span>Durum</span><span>İşlem</span></div>
            {invalid.map(({ row }) => <div className="content-list-row" key={`invalid-${row.contentKey}`}><strong>{row.contentKey}</strong><span>Parse edilemiyor</span><small>{row.status} · {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.updatedAt))}</small><small>Teşhis gerekli</small></div>)}
            {items.map((item) => <div className="content-list-row" key={item.contentKey}><strong>{item.source}</strong><span>→ {item.target}</span><small>{item.code} · {item.status === "published" ? "Aktif" : "Arşiv"}<br />{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.updatedAt))}</small>{item.status === "published" ? <form action={archiveCmsRedirectAction}><input type="hidden" name="source" value={item.source} /><button type="submit">Arşivle</button></form> : <small>Pasif</small>}</div>)}
          </div>
        )}
      </div>
    </section>
  );
}
