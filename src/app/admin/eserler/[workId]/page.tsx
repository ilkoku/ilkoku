import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
      chapters: { orderBy: { position: "asc" }, select: { id: true, position: true, status: true, title: true } },
      _count: { select: { comments: true, favorites: true, publisherSubmissions: true, readingProgress: true } },
    },
  });

  if (!work) notFound();

  return <div className="admin-directory-page">
    <header className="admin-page-heading"><div><span className="admin-eyebrow">Eser kaydı</span><h1>{work.title}</h1><p>{work.author.fullName} · {work.author.email}</p></div><Link className="admin-button admin-button--ghost" href="/admin/eserler">Eserlere dön</Link></header>
    <section className="admin-detail-grid">
      <article className="admin-panel"><h2>Eser bilgileri</h2><dl className="admin-detail-list"><div><dt>Durum</dt><dd>{work.status}</dd></div><div><dt>Görünürlük</dt><dd>{work.visibility}</dd></div><div><dt>Tür / Dil</dt><dd>{work.genre || "Belirtilmedi"} · {work.language}</dd></div><div><dt>Editör durumu</dt><dd>{work.editorReviewStatus}</dd></div><div><dt>Atanan editör</dt><dd>{work.assignedEditor ? `${work.assignedEditor.fullName} · ${work.assignedEditor.email}` : "Atanmadı"}</dd></div><div><dt>Oluşturma</dt><dd>{formatDate(work.createdAt)}</dd></div><div><dt>Güncelleme</dt><dd>{formatDate(work.updatedAt)}</dd></div></dl></article>
      <article className="admin-panel"><h2>Gerçek etkileşim özeti</h2><dl className="admin-detail-list"><div><dt>Bölüm</dt><dd>{work.chapters.length}</dd></div><div><dt>Favori</dt><dd>{work._count.favorites}</dd></div><div><dt>Okuma ilerlemesi</dt><dd>{work._count.readingProgress}</dd></div><div><dt>Yorum</dt><dd>{work._count.comments}</dd></div><div><dt>Yayınevi başvurusu</dt><dd>{work._count.publisherSubmissions}</dd></div></dl></article>
    </section>
    <section className="admin-panel admin-directory-panel"><h2>Bölümler</h2>{work.chapters.length ? <ul className="admin-record-list">{work.chapters.map((chapter) => <li key={chapter.id}><strong>{chapter.position}. {chapter.title}</strong><span>{chapter.status}</span></li>)}</ul> : <div className="admin-empty-state"><strong>Bölüm bulunmuyor</strong><p>Bu esere henüz bölüm eklenmemiş.</p></div>}</section>
  </div>;
}
