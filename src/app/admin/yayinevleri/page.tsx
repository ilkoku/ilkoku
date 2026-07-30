import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;
type SearchParams = Promise<{ aktif?: string; page?: string; q?: string }>;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(value);
}

function pageHref(query: string, active: string, page: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  if (active) params.set("aktif", active);
  return `/admin/yayinevleri?${params.toString()}`;
}

export default async function AdminPublishersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const active = params.aktif === "true" || params.aktif === "false" ? params.aktif : "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const where: Prisma.PublisherWhereInput = {
    archivedAt: null,
    ...(active ? { active: active === "true" } : {}),
    ...(query ? { OR: [{ companyName: { contains: query } }, { slug: { contains: query } }] } : {}),
  };

  const [filteredCount, orphanPublisherUsers] = await Promise.all([
    prisma.publisher.count({ where }),
    prisma.user.findMany({
      where: { deletedAt: null, role: "publisher", publisherMemberships: { none: { active: true } } },
      select: { email: true, fullName: true, id: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const publishers = await prisma.publisher.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      members: { where: { active: true, role: "owner" }, orderBy: { createdAt: "asc" }, select: { user: { select: { email: true, fullName: true } } }, take: 1 },
      _count: { select: { members: { where: { active: true } }, submissions: { where: { archivedAt: null } } } },
    },
  });
  const first = filteredCount ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(safePage * PAGE_SIZE, filteredCount);

  return <div className="admin-directory-page">
    <header className="admin-page-heading"><div><span className="admin-eyebrow">Kurumsal ağ</span><h1>Yayınevleri</h1><p>Yayınevi, owner üyeliği ve eser başvurusu ilişkilerini gerçek kayıtlardan izleyin.</p></div><Link className="admin-button admin-button--primary" href="/admin/roller?durum=pending&rol=publisher">Başvuruları aç</Link></header>
    {orphanPublisherUsers.length ? <section className="admin-warning" role="alert"><strong>{orphanPublisherUsers.length} üyeliksiz yayınevi kullanıcısı bulundu</strong><p>Bu hesaplar publisher rolünde fakat etkin PublisherMembership kaydı taşımıyor.</p><ul>{orphanPublisherUsers.map((user) => <li key={user.id}>{user.fullName} · {user.email}</li>)}</ul></section> : null}
    <section className="admin-panel admin-directory-panel"><form className="admin-directory-filters" method="get"><label><span>Yayınevi ara</span><input defaultValue={query} name="q" placeholder="Yayınevi adı veya slug" type="search" /></label><label><span>Aktiflik</span><select defaultValue={active} name="aktif"><option value="">Tümü</option><option value="true">Aktif</option><option value="false">Pasif</option></select></label><button type="submit">Filtrele</button>{(query || active) ? <Link href="/admin/yayinevleri">Temizle</Link> : null}</form>
      {publishers.length ? <div className="admin-table-wrap"><table className="admin-data-table"><thead><tr><th>Yayınevi</th><th>Sahibi</th><th>Üye</th><th>Başvuru</th><th>Durum</th><th>Oluşturma</th><th>Detay</th></tr></thead><tbody>{publishers.map((publisher) => <tr key={publisher.id}><td><strong>{publisher.companyName}</strong><span>{publisher.slug}</span></td><td>{publisher.members[0]?.user.fullName || "Owner atanmamış"}<small>{publisher.members[0]?.user.email || "—"}</small></td><td>{publisher._count.members}</td><td>{publisher._count.submissions}</td><td><span className="admin-table-badge" data-status={publisher.active ? "active" : "disabled"}>{publisher.active ? "Aktif" : "Pasif"}</span></td><td>{formatDate(publisher.createdAt)}</td><td><Link href={`/admin/yayinevleri/${publisher.id}`}>Detay ve üyeler</Link></td></tr>)}</tbody></table></div> : <div className="admin-empty-state"><strong>Yayınevi bulunamadı</strong><p>Arama veya filtre ölçütlerini değiştirin.</p></div>}
      <footer className="admin-pagination"><span>{first}–{last} / {filteredCount} yayınevi</span><div>{safePage > 1 ? <Link href={pageHref(query, active, safePage - 1)}>← Önceki</Link> : <span>← Önceki</span>}<b>{safePage} / {totalPages}</b>{safePage < totalPages ? <Link href={pageHref(query, active, safePage + 1)}>Sonraki →</Link> : <span>Sonraki →</span>}</div></footer>
    </section>
  </div>;
}
