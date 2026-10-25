import Link from "next/link";

import { recordCommissionRateAction } from "@/features/commerce/commission-rate-actions";
import {
  DEFAULT_COMMISSION_BPS,
  GVK18_SERVICE_FEE_BPS,
  resolveCommissionRate,
} from "@/features/commerce/commission-rates";
import { formatFinanceDate } from "@/features/commerce/finance-ui";
import { prisma } from "@/lib/prisma";

const PAGE = "/sistem-yonetimi/finans-gelirler/komisyon-yonetimi";
const formatRate = (bps: number) => new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 2,
}).format(bps / 100) + "%";

export default async function CommissionManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ yazar?: string; durum?: string }>;
}) {
  const params = await searchParams;
  const publicId = params.yazar?.trim().slice(0, 24) ?? "";
  const [writers, writer] = await Promise.all([
    prisma.user.findMany({
      where: { role: "writer", deletedAt: null },
      take: 35,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, publicId: true, displayName: true, fullName: true },
    }),
    publicId ? prisma.user.findFirst({
      where: { publicId, role: "writer", deletedAt: null },
      select: {
        id: true,
        publicId: true,
        fullName: true,
        displayName: true,
        status: true,
        commissionRulesAsWriter: {
          where: { workId: null },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 15,
          select: {
            id: true, rateBps: true, active: true, createdAt: true,
            actor: { select: { publicId: true } },
          },
        },
        works: {
          take: 50,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true, title: true, publicId: true,
            commissionRateEvents: {
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: 1,
              select: { id: true, rateBps: true, active: true, createdAt: true },
            },
          },
        },
      },
    }) : Promise.resolve(null),
  ]);
  const authorEvent = writer?.commissionRulesAsWriter[0] ?? null;
  const authorEffective = resolveCommissionRate({ authorEvent });

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Finans &amp; Gelirler · Sözleşme ön hazırlığı</span>
          <h1>Komisyon Yönetimi</h1>
          <p>Genel %15 komisyonu koruyun. Yazara özel ve esere özel oranları
            geçmiş olayları silmeden belirleyin; oran yeni siparişte sabitlenir.</p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler">
          Finans &amp; Gelirlere dön
        </Link>
      </header>
      <div className="admin-readonly-notice" role="status">
        <strong>Temel oranlar ve öncelik</strong>
        <p>Genel komisyon: {formatRate(DEFAULT_COMMISSION_BPS)} ·
          Yazara özel oran genel oranı geçersiz kılar · Esere özel oran
          yazar oranını geçersiz kılar. Kapsam sıfırlandığında bir alt
          seviyedeki oran geçerli olur.</p>
        <p>Gider pusulasına uygun telifteki <strong>{formatRate(GVK18_SERVICE_FEE_BPS)}
          {" "}+ KDV aracılık hizmeti ayrı gelir kalemidir.</strong>
          Faturalı yazara uygulanmaz. Bu ekran vergi, tahsilat, ödeme,
          fatura veya hakediş oluşturmaz. Sözleşme ve mali müşavir onayı
          olmadan özel oranlar gerçek ödeme talimatı sayılmaz.</p>
      </div>

      {params.durum ? (
        <div className="admin-panel" role="status">
          {params.durum === "kaydedildi"
            ? "Komisyon değişikliği olay geçmişine kaydedildi. Önceki siparişler değiştirilmedi."
            : "İşlem kaydedilmedi. Oran veya yazar-eser eşleşmesi kontrol edilmeli."}
        </div>
      ) : null}
      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Yazarın herkese açık ID&apos;si</span>
            <input name="yazar" maxLength={24} defaultValue={publicId}
              placeholder="Yazar ID" required />
          </label>
          <button className="admin-button admin-button--primary" type="submit">
            Yazar oranlarını görüntüle
          </button>
        </form>
      </section>

      {publicId && !writer ? (
        <section className="admin-panel" role="alert">Bu yazar ID&apos;si bulunamadı.</section>
      ) : null}

      {writer ? (
        <>
          <section className="admin-panel">
            <div className="admin-panel__heading">
              <div>
                <span>Yazara özel komisyon</span>
                <h2>{writer.displayName ?? writer.fullName} · {writer.publicId}</h2>
              </div>
            </div>
            <p>Etkin yazar oranı: <strong>{formatRate(authorEffective.commissionRateBps)}</strong>
              {" · "}Kaynak: {authorEffective.source === "global" ? "Genel" : "Yazar"}
              {" · "}Hesap: {writer.status}</p>
            {writer.status === "active" ? (
              <form action={recordCommissionRateAction} className="admin-commerce-toolbar">
                <input type="hidden" name="authorId" value={writer.id} />
                <input type="hidden" name="scope" value="author" />
                <label>
                  <span>Komisyon oranı (%) – 0 ile 90 arası, en fazla 2 ondalık</span>
                  <input name="ratePercent" inputMode="decimal" maxLength={5}
                    placeholder="15,00" defaultValue="15" />
                </label>
                <label>
                  <span>İşlem</span>
                  <select name="rateAction" defaultValue="set">
                    <option value="set">Yazara özel oran tanımla</option>
                    <option value="reset">Yazar oranını sıfırla (genel %15)</option>
                  </select>
                </label>
                <button type="submit" className="admin-button admin-button--primary">
                  Kararı olay geçmişine ekle
                </button>
              </form>
            ) : <p>Etkin olmayan yazar için yeni komisyon kararı alınmaz.</p>}
          </section>

          <section className="admin-panel">
            <div className="admin-panel__heading">
              <div><span>Öncelik: eser &gt; yazar &gt; genel</span><h2>Esere özel oranlar</h2></div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-data-table admin-commerce-table">
                <thead><tr><th>Eser</th><th>Etkin oran</th><th>Kaynak</th><th>Yönetim</th></tr></thead>
                <tbody>{writer.works.map((work) => {
                  const effective = resolveCommissionRate({
                    authorEvent,
                    workEvent: work.commissionRateEvents[0] ?? null,
                  });
                  return <tr key={work.id}>
                    <td><strong>{work.title}</strong><div>{work.publicId}</div></td>
                    <td>{formatRate(effective.commissionRateBps)}</td>
                    <td>{effective.source}</td>
                    <td>
                      {writer.status === "active" ? (
                        <form action={recordCommissionRateAction}>
                          <input type="hidden" name="authorId" value={writer.id} />
                          <input type="hidden" name="workId" value={work.id} />
                          <input type="hidden" name="scope" value="work" />
                          <label>Oran (%)
                            <input name="ratePercent" inputMode="decimal" maxLength={5}
                              defaultValue={String(effective.commissionRateBps / 100)} />
                          </label>
                          <label>İşlem
                            <select name="rateAction" defaultValue="set">
                              <option value="set">Eser oranını kaydet</option>
                              <option value="reset">Eser kuralını sıfırla</option>
                            </select>
                          </label>
                          <button className="admin-button" type="submit">Kaydet</button>
                        </form>
                      ) : "Hesap etkin değil"}
                    </td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            {writer.works.length === 0 ? <p>Yazara ait eser bulunamadı.</p> : null}
            <p>İlk 50 eser gösterilir. Yalnız yazarına ait eserler için
              oran tanımlanabilir. Var olan siparişlerin oranı değişmez.</p>
          </section>

          <section className="admin-panel">
            <div className="admin-panel__heading">
              <div><span>Yazara özel karar geçmişi</span><h2>Son 15 kayıt</h2></div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-data-table admin-commerce-table">
                <thead><tr><th>Tarih</th><th>Oran</th><th>Karar</th><th>Yönetici</th></tr></thead>
                <tbody>{writer.commissionRulesAsWriter.map(event => (
                  <tr key={event.id}>
                    <td>{formatFinanceDate(event.createdAt)}</td>
                    <td>{formatRate(event.rateBps)}</td>
                    <td>{event.active ? "Oran tanımlandı" : "Genel orana dönüldü"}</td>
                    <td>{event.actor.publicId}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        !publicId ? <section className="admin-panel">
          <div className="admin-panel__heading">
            <div><span>Son yazarlar</span><h2>Yazar seçimi</h2></div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead><tr><th>Yazar</th><th>Herkese açık ID</th><th>İşlem</th></tr></thead>
              <tbody>{writers.map(item => <tr key={item.id}>
                <td>{item.displayName ?? item.fullName}</td>
                <td>{item.publicId}</td>
                <td><Link href={PAGE+"?yazar="+encodeURIComponent(item.publicId)}>Oranları yönet</Link></td>
              </tr>)}</tbody>
            </table>
          </div>
        </section> : null
      )}
    </>
  );
}
