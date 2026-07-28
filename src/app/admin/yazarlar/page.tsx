import Link from "next/link";
import type { Prisma, UserStatus } from "@/generated/prisma/client";
import { updateUserStatusAction } from "@/features/admin/actions";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 12;

const statusLabels: Record<UserStatus, string> = {
  active: "Aktif",
  suspended: "Askıda",
  disabled: "Devre dışı",
};

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
}>;

function isStatus(value: string | undefined): value is UserStatus {
  return value === "active" || value === "suspended" || value === "disabled";
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("") || "YZ";
}

function dateLabel(date: Date | null) {
  if (!date) return "Henüz giriş yok";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function pageHref(q: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return `/admin/yazarlar?${params.toString()}`;
}

export default async function WritersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = isStatus(params.status) ? params.status : "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const where: Prisma.UserWhereInput = {
    role: "writer",
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q } },
            { displayName: { contains: q } },
            { email: { contains: q } },
            { username: { contains: q } },
          ],
        }
      : {}),
  };

  const [totalWriters, activeWriters, suspendedWriters, writersWithWorks, filteredCount] = await Promise.all([
    prisma.user.count({ where: { role: "writer", deletedAt: null } }),
    prisma.user.count({ where: { role: "writer", status: "active", deletedAt: null } }),
    prisma.user.count({ where: { role: "writer", status: "suspended", deletedAt: null } }),
    prisma.user.count({ where: { role: "writer", deletedAt: null, works: { some: {} } } }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const writers = await prisma.user.findMany({
    where,
    orderBy: [{ lastLoginAt: "desc" }, { createdAt: "desc" }],
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      fullName: true,
      displayName: true,
      email: true,
      username: true,
      avatarUrl: true,
      status: true,
      isPremium: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      profile: {
        select: {
          city: true,
          writingGenres: true,
          completionPercentage: true,
        },
      },
      _count: {
        select: {
          works: true,
          feedbackReceived: true,
          ownershipStamps: true,
          publisherSubmissions: true,
        },
      },
    },
  });

  const first = filteredCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const last = Math.min(safePage * PAGE_SIZE, filteredCount);

  return (
    <div className="writers-page">
      <header className="admin-page-heading writers-heading">
        <div>
          <span className="admin-eyebrow">Topluluk yönetimi</span>
          <h1>Yazar Yönetimi</h1>
          <p>Yazarların üretim durumunu, eserlerini ve platform etkinliğini tek ekrandan yönetin.</p>
        </div>
        <div className="admin-heading-actions">
          <Link className="admin-button admin-button--ghost" href="/admin/roller">Rol talepleri</Link>
          <Link className="admin-button admin-button--primary" href="/admin/eserler">Eserleri incele</Link>
        </div>
      </header>

      <section className="writers-kpis" aria-label="Yazar istatistikleri">
        <article><span>Toplam yazar</span><strong>{totalWriters}</strong><small>Kayıtlı yazar hesabı</small></article>
        <article><span>Aktif</span><strong>{activeWriters}</strong><small>Platformu kullanabilen</small></article>
        <article><span>Eser sahibi</span><strong>{writersWithWorks}</strong><small>En az bir eser oluşturan</small></article>
        <article><span>İnceleme gerekli</span><strong>{suspendedWriters}</strong><small>Askıdaki hesaplar</small></article>
      </section>

      <section className="admin-panel writers-panel">
        <div className="writers-toolbar">
          <div>
            <span>Yazar dizini</span>
            <h2>Tüm yazarlar</h2>
          </div>
          <form method="get" className="writers-filters">
            <input name="q" type="search" defaultValue={q} placeholder="Ad, e-posta veya kullanıcı adı ara" aria-label="Yazar ara" />
            <select name="status" defaultValue={status} aria-label="Duruma göre filtrele">
              <option value="">Tüm durumlar</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="submit">Filtrele</button>
            {(q || status) && <Link href="/admin/yazarlar">Temizle</Link>}
          </form>
        </div>

        {writers.length > 0 ? (
          <div className="writers-grid">
            {writers.map((writer) => (
              <article className="writer-card" key={writer.id}>
                <div className="writer-card__head">
                  <div className="writer-avatar" aria-hidden="true">{initials(writer.displayName || writer.fullName)}</div>
                  <div className="writer-identity">
                    <div>
                      <strong>{writer.displayName || writer.fullName}</strong>
                      {writer.isPremium && <b>Premium</b>}
                    </div>
                    <span>{writer.email}</span>
                    <small>@{writer.username || "kullanici-adi-yok"}</small>
                  </div>
                  <span className={`writer-status writer-status--${writer.status}`}>{statusLabels[writer.status]}</span>
                </div>

                <div className="writer-metrics">
                  <div><strong>{writer._count.works}</strong><span>Eser</span></div>
                  <div><strong>{writer._count.feedbackReceived}</strong><span>Geri bildirim</span></div>
                  <div><strong>{writer._count.ownershipStamps}</strong><span>Özgünlük kaydı</span></div>
                  <div><strong>{writer._count.publisherSubmissions}</strong><span>Başvuru</span></div>
                </div>

                <div className="writer-profile-progress">
                  <div><span>Profil doluluğu</span><strong>%{writer.profile?.completionPercentage ?? 0}</strong></div>
                  <i><em style={{ width: `${writer.profile?.completionPercentage ?? 0}%` }} /></i>
                </div>

                <dl className="writer-details">
                  <div><dt>Son giriş</dt><dd>{dateLabel(writer.lastLoginAt)}</dd></div>
                  <div><dt>Kayıt</dt><dd>{dateLabel(writer.createdAt)}</dd></div>
                  <div><dt>Konum</dt><dd>{writer.profile?.city || "Belirtilmedi"}</dd></div>
                  <div><dt>E-posta</dt><dd>{writer.emailVerified ? "Doğrulandı" : "Bekliyor"}</dd></div>
                </dl>

                <div className="writer-card__actions">
                  <Link href={`/admin/eserler?yazar=${encodeURIComponent(writer.id)}`}>Eserleri gör</Link>
                  <form action={updateUserStatusAction}>
                    <input type="hidden" name="userId" value={writer.id} />
                    <select name="status" defaultValue={writer.status} aria-label={`${writer.fullName} hesap durumu`}>
                      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button type="submit">Kaydet</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="writers-empty">
            <strong>Yazar bulunamadı</strong>
            <p>Arama veya filtre ölçütlerini değiştirerek yeniden deneyin.</p>
          </div>
        )}

        <footer className="writers-pagination">
          <span>{first}–{last} / {filteredCount} yazar</span>
          <div>
            {safePage > 1 ? <Link href={pageHref(q, status, safePage - 1)}>← Önceki</Link> : <span>← Önceki</span>}
            <b>{safePage} / {totalPages}</b>
            {safePage < totalPages ? <Link href={pageHref(q, status, safePage + 1)}>Sonraki →</Link> : <span>Sonraki →</span>}
          </div>
        </footer>
      </section>
    </div>
  );
}
