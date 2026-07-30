import Link from "next/link";
import { prisma } from "@/lib/prisma";

const tabs = [
  { key: "rol", label: "Rol başvuruları" },
  { key: "editor", label: "Editör başvuruları" },
  { key: "publisher", label: "Yayınevi başvuruları" },
  { key: "eser", label: "Yayınevine gönderilen eserler" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function isTab(value: string | undefined): value is TabKey {
  return tabs.some((tab) => tab.key === value);
}

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
}

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<{ sekme?: string }> }) {
  const params = await searchParams;
  const activeTab = isTab(params.sekme) ? params.sekme : "rol";
  const isWorkSubmissions = activeTab === "eser";

  const roleRequests = isWorkSubmissions ? [] : await prisma.roleRequest.findMany({
    where: activeTab === "editor" ? { requestedRole: "editor" } : activeTab === "publisher" ? { requestedRole: "publisher" } : undefined,
    include: { reviewedBy: { select: { fullName: true } }, user: { select: { email: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const submissions = isWorkSubmissions ? await prisma.publisherSubmission.findMany({
    where: { archivedAt: null },
    include: { author: { select: { email: true, fullName: true } }, publisher: { select: { companyName: true } }, work: { select: { id: true, title: true } } },
    orderBy: { submittedAt: "desc" },
    take: 100,
  }) : [];

  return <div className="admin-directory-page">
    <header className="admin-page-heading"><div><span className="admin-eyebrow">Başvuru merkezi</span><h1>Başvurular</h1><p>Mevcut rol ve yayınevi başvuru kayıtlarını tek merkezden izleyin.</p></div><Link className="admin-button admin-button--primary" href="/admin/roller">Rol kararlarını yönet</Link></header>
    <nav className="admin-tabs" aria-label="Başvuru türleri">{tabs.map((tab) => <Link aria-current={activeTab === tab.key ? "page" : undefined} className={activeTab === tab.key ? "is-active" : ""} href={`/admin/basvurular?sekme=${tab.key}`} key={tab.key}>{tab.label}</Link>)}</nav>
    <section className="admin-panel admin-directory-panel">
      {isWorkSubmissions ? submissions.length ? <div className="admin-table-wrap"><table className="admin-data-table"><thead><tr><th>Başvuru sahibi</th><th>Eser</th><th>Yayınevi</th><th>Durum</th><th>Tarih</th><th>Son işlem</th><th>Detay</th></tr></thead><tbody>{submissions.map((submission) => <tr key={submission.id}><td><strong>{submission.author.fullName}</strong><span>{submission.author.email}</span></td><td>{submission.work.title}</td><td>{submission.publisher.companyName}</td><td><span className="admin-table-badge" data-status={submission.status}>{submission.status}</span></td><td>{formatDate(submission.submittedAt)}</td><td>{formatDate(submission.updatedAt)}</td><td><Link href={`/admin/eserler/${submission.work.id}`}>Eseri incele</Link></td></tr>)}</tbody></table></div> : <div className="admin-empty-state"><strong>Yayınevi eser başvurusu yok</strong><p>Gerçek bir başvuru oluştuğunda bu listede görünecek.</p></div> : roleRequests.length ? <div className="admin-table-wrap"><table className="admin-data-table"><thead><tr><th>Başvuru sahibi</th><th>Tür</th><th>Durum</th><th>Başvuru tarihi</th><th>Son işlem</th><th>Değerlendiren</th><th>Detay</th></tr></thead><tbody>{roleRequests.map((request) => <tr key={request.id}><td><strong>{request.user.fullName}</strong><span>{request.user.email}</span></td><td>{request.requestedRole}</td><td><span className="admin-table-badge" data-status={request.status}>{request.status}</span></td><td>{formatDate(request.createdAt)}</td><td>{formatDate(request.reviewedAt || request.updatedAt)}</td><td>{request.reviewedBy?.fullName || "—"}</td><td><Link href={`/admin/roller?arama=${encodeURIComponent(request.user.email)}`}>Rol kaydını aç</Link></td></tr>)}</tbody></table></div> : <div className="admin-empty-state"><strong>Başvuru bulunmuyor</strong><p>Bu sekmede gerçek bir kayıt bulunmadı.</p></div>}
    </section>
  </div>;
}
