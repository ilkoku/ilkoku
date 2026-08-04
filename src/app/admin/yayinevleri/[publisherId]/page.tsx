import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function AdminPublisherDetailPage({ params }: { params: Promise<{ publisherId: string }> }) {
  const { publisherId } = await params;
  const publisher = await prisma.publisher.findUnique({
    where: { id: publisherId },
    include: {
      members: { include: { user: { select: { email: true, fullName: true, role: true, status: true } } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] },
      submissions: { include: { author: { select: { fullName: true } }, work: { select: { title: true } } }, orderBy: { submittedAt: "desc" }, take: 20 },
    },
  });
  if (!publisher) notFound();

  return <div className="admin-directory-page"><header className="admin-page-heading"><div><span className="admin-eyebrow">Yayınevi kaydı</span><h1>{publisher.companyName}</h1><p>{publisher.slug}</p></div><Link className="admin-button admin-button--ghost" href="/admin/yayinevleri">Yayınevlerine dön</Link></header><section className="admin-detail-grid"><article className="admin-panel"><h2>Kurumsal bilgi</h2><dl className="admin-detail-list"><div><dt>Durum</dt><dd>{publisher.active ? "Aktif" : "Pasif"}</dd></div><div><dt>Doğrulama</dt><dd>{publisher.verified ? "Doğrulandı" : "Bekliyor"}</dd></div><div><dt>Başvuru kabulü</dt><dd>{publisher.acceptsSubmissions ? "Açık" : "Kapalı"}</dd></div><div><dt>Web sitesi</dt><dd>{publisher.websiteUrl || "Belirtilmedi"}</dd></div><div><dt>Oluşturma</dt><dd>{formatDate(publisher.createdAt)}</dd></div></dl></article><article className="admin-panel"><h2>Üyeler</h2>{publisher.members.length ? <ul className="admin-record-list">{publisher.members.map((membership) => <li key={membership.id}><strong>{membership.user.fullName}</strong><span>{membership.user.email}</span><small>{membership.role} · {membership.active ? "Etkin" : "Pasif"} · {membership.user.role}/{membership.user.status}</small></li>)}</ul> : <div className="admin-empty-state"><strong>Üye bulunmuyor</strong></div>}</article></section><section className="admin-panel admin-directory-panel"><h2>Son eser başvuruları</h2>{publisher.submissions.length ? <ul className="admin-record-list">{publisher.submissions.map((submission) => <li key={submission.id}><strong>{submission.work.title}</strong><span>{submission.author.fullName} · {submission.status}</span><time>{formatDate(submission.submittedAt)}</time></li>)}</ul> : <div className="admin-empty-state"><strong>Başvuru bulunmuyor</strong><p>Bu yayınevine henüz eser gönderilmemiş.</p></div>}</section></div>;
}
