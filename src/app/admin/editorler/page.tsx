import Link from "next/link";
import type { Prisma, UserStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;
const statusLabels: Record<UserStatus, string> = { active: "Aktif", disabled: "Devre dışı", suspended: "Askıda" };

type SearchParams = Promise<{ durum?: string; page?: string; q?: string }>;

function isStatus(value: string | undefined): value is UserStatus {
  return value === "active" || value === "disabled" || value === "suspended";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(value);
}

function pageHref(query: string, status: string, page: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  if (status) params.set("durum", status);
  return `/admin/editorler?${params.toString()}`;
}

export default async function AdminEditorsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = isStatus(params.durum) ? params.durum : "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    role: "editor",
    ...(status ? { status } : {}),
    ...(query ? { OR: [{ displayName: { contains: query } }, { email: { contains: query } }, { fullName: { contains: query } }, { username: { contains: query } }] } : {}),
  };

  const [filteredCount, pendingCandidates] = await Promise.all([
    prisma.user.count({ where }),
    prisma.roleRequest.count({ where: { requestedRole: "editor", status: "pending" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const editors = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      bio: true,
      createdAt: true,
      displayName: true,
      email: true,
      fullName: true,
      id: true,
      profile: { select: { city: true, completionPercentage: true, website: true } },
      roleRequests: { orderBy: { createdAt: "desc" }, select: { status: true }, take: 1 },
      status: true,
      username: true,
      _count: {
        select: {
          editorReviewAssignments: { where: { status: { in: ["assigned", "in_progress"] } } },
          feedbackWritten: { where: { isProfessionalReview: true, reportStatus: "completed" } },
        },
      },
    },
  });

  const first = filteredCount ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(safePage * PAGE_SIZE, filteredCount);

  return <div className="admin-directory-page">
    <header className="admin-page-heading"><div><span className="admin-eyebrow">Editoryal ağ</span><h1>Editörler</h1><p>Yalnızca onaylanmış editörleri ve gerçek inceleme sayılarını görüntüleyin.</p></div><Link className="admin-button admin-button--primary" href="/admin/roller?durum=pending&rol=editor">{pendingCandidates} bekleyen başvuru</Link></header>
    <section className="admin-panel admin-directory-panel">
      <form className="admin-directory-filters" method="get"><label><span>Editör ara</span><input defaultValue={query} name="q" placeholder="Ad, e-posta veya kullanıcı adı" type="search" /></label><label><span>Hesap durumu</span><select defaultValue={status} name="durum"><option value="">Tüm durumlar</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="submit">Filtrele</button>{(query || status) ? <Link href="/admin/editorler">Temizle</Link> : null}</form>
      {editors.length ? <div className="admin-table-wrap"><table className="admin-data-table"><thead><tr><th>Editör</th><th>Profil</th><th>Aktif inceleme</th><th>Tamamlanan</th><th>Başvuru</th><th>Kayıt</th><th>Detay</th></tr></thead><tbody>{editors.map((editor) => <tr key={editor.id}><td><strong>{editor.displayName || editor.fullName}</strong><span>{editor.email}</span><small>@{editor.username || "kullanıcı-adı-yok"}</small></td><td><span className="admin-table-badge" data-status={editor.status}>{statusLabels[editor.status]}</span><small>Profil %{editor.profile?.completionPercentage ?? 0}</small></td><td>{editor._count.editorReviewAssignments}</td><td>{editor._count.feedbackWritten}</td><td>{editor.roleRequests[0]?.status ? editor.roleRequests[0].status : "Kayıt yok"}</td><td>{formatDate(editor.createdAt)}</td><td><Link href={`/admin/editorler/${editor.id}`}>Detaya git</Link></td></tr>)}</tbody></table></div> : <div className="admin-empty-state"><strong>Editör bulunamadı</strong><p>Pending editör adayları bu listeye dahil edilmez.</p></div>}
      <footer className="admin-pagination"><span>{first}–{last} / {filteredCount} editör</span><div>{safePage > 1 ? <Link href={pageHref(query, status, safePage - 1)}>← Önceki</Link> : <span>← Önceki</span>}<b>{safePage} / {totalPages}</b>{safePage < totalPages ? <Link href={pageHref(query, status, safePage + 1)}>Sonraki →</Link> : <span>Sonraki →</span>}</div></footer>
    </section>
  </div>;
}
