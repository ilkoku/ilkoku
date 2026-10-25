import Link from "next/link";

import { recordAuthorTaxReviewAction } from "@/features/commerce/tax-review-actions";
import { resolveLatestAuthorTaxReview } from "@/features/commerce/tax-review-policy";
import { formatFinanceDate } from "@/features/commerce/finance-ui";
import { prisma } from "@/lib/prisma";

const BASE = "/sistem-yonetimi/finans-gelirler/yazar-vergi-inceleme";

const kindLabels = {
  commercial_invoice: "Ticari fatura",
  self_employed_receipt: "e-Serbest meslek makbuzu (ayrı vergi hesabı gerekir)",
  gvk18_expense_receipt: "GVK 18 koşullarına uygun gider pusulası",
};
const decisionLabels = {
  verified: "Belge incelemesi kaydedildi",
  needs_revision: "Eksik belge / yeniden inceleme",
  revoked: "Önceki inceleme geri çekildi",
};

export default async function AuthorTaxReviewAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ yazar?: string; durum?: string }>;
}) {
  const params = await searchParams;
  const publicId = params.yazar?.trim().slice(0, 24) ?? "";
  const [writers, selected] = await Promise.all([
    prisma.user.findMany({
      where: { role: "writer", deletedAt: null },
      select: {
        id: true,
        publicId: true,
        displayName: true,
        fullName: true,
        taxReviewsAsWriter: {
          orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            decision: true,
            documentKind: true,
            reviewedAt: true,
            validUntil: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    publicId ? prisma.user.findFirst({
      where: { publicId, role: "writer", deletedAt: null },
      select: {
        id: true,
        publicId: true,
        fullName: true,
        displayName: true,
        status: true,
        taxReviewsAsWriter: {
          orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
          take: 20,
          select: {
            id: true,
            documentKind: true,
            decision: true,
            evidenceReference: true,
            reviewedAt: true,
            validUntil: true,
            reviewer: { select: { publicId: true } },
          },
        },
      },
    }) : Promise.resolve(null),
  ]);
  const latest = selected?.taxReviewsAsWriter[0] ?? null;
  const current = resolveLatestAuthorTaxReview(latest ?? null);
  const stateText = {
    missing: "Henüz kayıt yok",
    verified: "Belge incelemesi kayıtlı (ödeme onayı değildir)",
    needs_revision: "Yeniden inceleme gerekiyor",
    revoked: "İnceleme geri çekildi",
    expired: "İnceleme süresi dolmuş",
    invalid: "Belge türü belirsiz",
  }[current.state];

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Finans &amp; Gelirler · Yazar incelemesi</span>
          <h1>Yazar Vergi / Belge İncelemesi</h1>
          <p>Fatura, e-SMM ve uygun telif gider pusulası statüsünü inceleme
            geçmişiyle izleyin. Bu alan hiçbir yazar hakedişi veya ödeme açmaz.</p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler">
          Finans &amp; Gelirlere dön
        </Link>
      </header>
      <div className="admin-readonly-notice admin-commerce-readonly">
        <strong>Haricî doğrulama gerekir</strong>
        <p>Bu kayıt Gelir İdaresi veya mali müşavir sistemine bağlanarak
          otomatik doğrulama yapmaz. Yönetici, haricî incelemenin sonucunu
          ve kişisel bilgi içermeyen kurum içi referansını kaydeder.
          Vergi numarası, TC kimlik numarası, IBAN veya belge görseli
          bu ekrana girilmemelidir. İnceleme kararı ödeme, fatura,
          stopaj ya da KDV beyannamesi oluşturmaz.</p>
      </div>
      {params.durum ? (
        <div className="admin-panel" role="status">
          {params.durum === "kaydedildi"
            ? "İnceleme olayı kaydedildi. Önceki olaylar saklanıyor."
            : "İnceleme kaydedilmedi. Belge türü, geçerlilik tarihi ve kanıt referansını kontrol edin."}
        </div>
      ) : null}

      <section className="admin-panel admin-commerce-toolbar">
        <form method="get">
          <label>
            <span>Yazarın herkese açık ID&apos;si</span>
            <input name="yazar" type="search" maxLength={24}
              placeholder="Yazar ID" defaultValue={publicId} required />
          </label>
          <button className="admin-button admin-button--primary" type="submit">
            Yazarı incele
          </button>
        </form>
      </section>

      {publicId && !selected ? (
        <div className="admin-readonly-notice" role="alert">Bu ID ile yazar bulunamadı.</div>
      ) : null}

      {selected ? (
        <>
          <section className="admin-panel">
            <div className="admin-panel__heading">
              <div><span>İncelenen yazar</span>
                <h2>{selected.displayName ?? selected.fullName} · {selected.publicId}</h2>
              </div>
            </div>
            <p>Hesap durumu: {selected.status} · Son inceleme: {stateText}</p>
            {latest ? <p>Son kayıt: {decisionLabels[latest.decision]} · {kindLabels[latest.documentKind]}
              {" · "}{formatFinanceDate(latest.reviewedAt)}
              {latest.validUntil ? " · Son geçerlilik: " + formatFinanceDate(latest.validUntil) : ""}
            </p> : null}
            {selected.status === "active" ? (
              <form action={recordAuthorTaxReviewAction} className="admin-commerce-toolbar">
                <input type="hidden" name="authorId" value={selected.id} />
                <label>
                  <span>İncelenen belge türü</span>
                  <select name="documentKind" required defaultValue="">
                    <option value="" disabled>Belge türünü seçin</option>
                    {Object.entries(kindLabels).map(([value,label]) =>
                      <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <span>İnceleme kararı</span>
                  <select name="decision" required defaultValue="needs_revision">
                    {Object.entries(decisionLabels).map(([value,label]) =>
                      <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Haricî inceleme referansı (kişisel veri değil)</span>
                  <input name="evidenceReference" maxLength={64}
                    pattern="[A-Za-z0-9][A-Za-z0-9_-]{4,63}"
                    placeholder="MUH-2026-0001" autoComplete="off" />
                </label>
                <label>
                  <span>Onay geçerlilik bitişi (yalnız onay kararında)</span>
                  <input name="validUntil" type="date" />
                </label>
                <label>
                  <input name="attested" type="checkbox" value="yes" />
                  Belgenin haricî yetkili incelemesinin yapıldığını
                  teyit ediyorum (yalnız onay için zorunlu).
                </label>
                <button type="submit" className="admin-button admin-button--primary">
                  İnceleme olayını kaydet
                </button>
              </form>
            ) : <p>Etkin olmayan hesap için yeni inceleme kaydı alınmaz.</p>}
          </section>
          <section className="admin-panel">
            <div className="admin-panel__heading">
              <div><span>Değiştirilemez olay geçmişi</span><h2>Son 20 inceleme</h2></div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-data-table admin-commerce-table">
                <thead><tr>
                  <th>Tarih</th><th>Belge türü</th><th>Karar</th><th>Referans</th><th>İnceleyen</th><th>Bitiş</th>
                </tr></thead>
                <tbody>
                  {selected.taxReviewsAsWriter.map(event => (
                    <tr key={event.id}>
                      <td>{formatFinanceDate(event.reviewedAt)}</td>
                      <td>{kindLabels[event.documentKind]}</td>
                      <td>{decisionLabels[event.decision]}</td>
                      <td>{event.evidenceReference ?? "—"}</td>
                      <td>{event.reviewer.publicId}</td>
                      <td>{formatFinanceDate(event.validUntil)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!selected.taxReviewsAsWriter.length ? <p>Henüz inceleme geçmişi yok.</p> : null}
          </section>
        </>
      ) : null}

      {!publicId ? (
        <section className="admin-panel">
          <div className="admin-panel__heading">
            <div><span>Son yazarlar</span><h2>İncelenecek hesaplar</h2></div><b>{writers.length}</b>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-commerce-table">
              <thead><tr><th>Yazar</th><th>İnceleme</th><th>İşlem</th></tr></thead>
              <tbody>
                {writers.map((writer) => {
                  const state = resolveLatestAuthorTaxReview(writer.taxReviewsAsWriter[0] ?? null);
                  return <tr key={writer.id}>
                    <td><strong>{writer.displayName ?? writer.fullName}</strong><small>{writer.publicId}</small></td>
                    <td>{state.state === "verified" ? "Belge incelemesi kayıtlı" : "İnceleme gerekli: " + state.state}</td>
                    <td><Link href={BASE + "?yazar=" + encodeURIComponent(writer.publicId)}>Yazarın belge kaydı</Link></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
