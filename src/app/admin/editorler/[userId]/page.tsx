import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminEditorDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const editor = await prisma.user.findFirst({
    where: { deletedAt: null, id: userId, role: "editor" },
    include: {
      editorReviewAssignments: { include: { work: { select: { id: true, title: true } } }, orderBy: { updatedAt: "desc" }, take: 20 },
      profile: true,
      roleRequests: { include: { reviewedBy: { select: { fullName: true } } }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!editor) notFound();

  return <div className="admin-directory-page"><header className="admin-page-heading"><div><span className="admin-eyebrow">Editör kaydı</span><h1>{editor.displayName || editor.fullName}</h1><p>{editor.email}</p></div><Link className="admin-button admin-button--ghost" href="/admin/editorler">Editörlere dön</Link></header><section className="admin-detail-grid"><article className="admin-panel"><h2>Mesleki profil</h2><dl className="admin-detail-list"><div><dt>Hesap durumu</dt><dd>{editor.status}</dd></div><div><dt>Kullanıcı adı</dt><dd>{editor.username || "Belirtilmedi"}</dd></div><div><dt>Şehir</dt><dd>{editor.profile?.city || "Belirtilmedi"}</dd></div><div><dt>Web sitesi</dt><dd>{editor.profile?.website || "Belirtilmedi"}</dd></div><div><dt>Biyografi</dt><dd>{editor.bio || "Belirtilmedi"}</dd></div></dl></article><article className="admin-panel"><h2>Rol geçmişi</h2>{editor.roleRequests.length ? <ul className="admin-record-list">{editor.roleRequests.map((request) => <li key={request.id}><strong>{request.requestedRole} · {request.status}</strong><span>{request.reviewedBy?.fullName || "Değerlendirilmedi"}</span><small>{request.reviewNote || "Not yok"}</small></li>)}</ul> : <div className="admin-empty-state"><strong>Rol geçmişi yok</strong></div>}</article></section><section className="admin-panel admin-directory-panel"><h2>Son inceleme görevleri</h2>{editor.editorReviewAssignments.length ? <ul className="admin-record-list">{editor.editorReviewAssignments.map((assignment) => <li key={assignment.id}><strong>{assignment.work.title}</strong><span>{assignment.stage} · {assignment.status}</span><Link href={`/admin/eserler/${assignment.work.id}`}>Eseri aç</Link></li>)}</ul> : <div className="admin-empty-state"><strong>İnceleme görevi bulunmuyor</strong></div>}</section></div>;
}
