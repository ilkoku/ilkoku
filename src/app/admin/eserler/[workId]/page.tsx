import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { describeWorkSaleModel, resolveEffectiveCommerceState } from "@/features/commerce/effective-state";
import { workContentRatingDetails } from "@/lib/work-content-classification";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(value) : "—";
}

export default async function AdminWorkDetailPage({ params }: { params: Promise<{ workId: string }> }) {
  const { workId } = await params;
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: {
      assignedEditor: { select: { email: true, fullName: true } },
      author: { select: { email: true, fullName: true } },
      chapters: { orderBy: { position: "asc" }, select: { id: true, position: true, status: true, title: true, commerceAccess: { select: { accessType: true } } } },
      saleConfiguration: { select: { saleModel: true, priceAmount: true, currency: true, status: true, activatedAt: true } },
      publicationConsents: { orderBy: { confirmedAt: "desc" }, take: 1, select: { publicationModel: true, priceAmount: true, currency: true, accessPlanSnapshot: true } },
      _count: { select: { comments: true, favorites: true, publisherSubmissions: true, readingProgress: true } },
    },
  });

  if (!work) notFound();
  const disclosure = describeWorkSaleModel({ configuration: work.saleConfiguration, latestConsent: work.publicationConsents[0] ?? null });
  const effectiveSale = resolveEffectiveCommerceState({ configuration: work.saleConfiguration, latestConsent: work.publicationConsents[0] ?? null });

  return <div className="admin-directory-page">
    <header className="admin-page-heading"><div><span className="admin-eyebrow">Eser kaydı</span><h1>{work.title}</h1><p>{work.author.fullName} · {work.author.email}</p></div><Link className="admin-button admin-button--ghost" href="/admin/eserler">Eserlere dön</Link></header>
    <div className="admin-page-actions">
      <Link
        className="admin-button admin-button--ghost"
        href={`/admin/eserler/${work.id}/pasaport`}
      >
        Eser Pasaportunu Aç
      </Link>
    </div>

    <section className="admin-detail-grid">
      <article className="admin-panel"><h2>Eser bilgileri</h2><dl className="admin-detail-list"><div><dt>Durum</dt><dd>{work.status}</dd></div><div><dt>Görünürlük</dt><dd>{work.visibility}</dd></div><div><dt>Hitap yaşı</dt><dd>{workContentRatingDetails[work.contentRating].label}</dd></div><div><dt>Tür / Dil</dt><dd>{work.genre || "Belirtilmedi"} · {work.language}</dd></div><div><dt>Editör durumu</dt><dd>{work.editorReviewStatus}</dd></div><div><dt>Atanan editör</dt><dd>{work.assignedEditor ? `${work.assignedEditor.fullName} · ${work.assignedEditor.email}` : "Atanmadı"}</dd></div><div><dt>Oluşturma</dt><dd>{formatDate(work.createdAt)}</dd></div><div><dt>Güncelleme</dt><dd>{formatDate(work.updatedAt)}</dd></div></dl></article>
      <article className="admin-panel"><h2>Gerçek etkileşim özeti</h2><dl className="admin-detail-list"><div><dt>Bölüm</dt><dd>{work.chapters.length}</dd></div><div><dt>Favori</dt><dd>{work._count.favorites}</dd></div><div><dt>Okuma ilerlemesi</dt><dd>{work._count.readingProgress}</dd></div><div><dt>Yorum</dt><dd>{work._count.comments}</dd></div><div><dt>Yayınevi başvurusu</dt><dd>{work._count.publisherSubmissions}</dd></div></dl></article>
    </section>
    <section className="admin-panel admin-directory-panel">
      <h2>Satış ve okur erişimi · Salt okunur</h2>
      <dl className="admin-detail-list">
        <div><dt>Satış modeli</dt><dd>{disclosure.label}</dd></div>
        <div><dt>Okura yansıyan durum</dt><dd>{disclosure.detail}</dd></div>
        <div><dt>Yazarın son kaydı</dt><dd>{work.saleConfiguration?.status ?? "Ayarlanmadı"}</dd></div>
        <div><dt>Aktif ücretli fiyat</dt><dd>{effectiveSale.saleModel === "paid" && effectiveSale.priceAmount !== null && effectiveSale.priceAmount > BigInt(0) && effectiveSale.status === "active" ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: effectiveSale.currency }).format(Number(effectiveSale.priceAmount) / 100) : "Aktif ücretli fiyat yok"}</dd></div>
      </dl>
      <p>0 TL hazırlık fiyatı gerçek tahsilat veya aktif ücretli satış anlamına gelmez.</p>
      <Link href="/sistem-yonetimi/odeme-sistemi/ayarlar">Ödeme ve sözleşme durumunu incele</Link>
    </section>
    <section className="admin-panel admin-directory-panel"><h2>Bölümler</h2>{work.chapters.length ? <ul className="admin-record-list">{work.chapters.map((chapter) => <li key={chapter.id}><strong>{chapter.position}. {chapter.title}</strong><span>{chapter.status} · {chapter.commerceAccess?.accessType === "preview" ? "Ön İzleme" : chapter.commerceAccess?.accessType === "locked" ? "Kilitli" : "Erişim planı yok"}</span></li>)}</ul> : <div className="admin-empty-state"><strong>Bölüm bulunmuyor</strong><p>Bu esere henüz bölüm eklenmemiş.</p></div>}</section>
  </div>;
}
