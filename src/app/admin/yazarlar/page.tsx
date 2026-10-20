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
  works?: string;
  verification?: string;
  premium?: string;
  sort?: string;
  page?: string;
}>;

type WriterFilterState = {
  q: string;
  status: string;
  works: string;
  verification: string;
  premium: string;
  sort: string;
};

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

function pageHref(filters: WriterFilterState, page: number) {
  const params = new URLSearchParams();
  for (const field of ["q", "status", "works", "verification", "premium", "sort"] as const) {
    const value = filters[field];
    if (value && !(field === "sort" && value === "last_login")) {
      params.set(field, value);
    }
  }
  params.set("page", String(page));
  return `/sistem-yonetimi/yazarlar?${params.toString()}`;
}

export default async function WritersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 120) ?? "";
  const status = isStatus(params.status) ? params.status : "";
  const works = params.works === "yes" || params.works === "no" ? params.works : "";
  const verification = params.verification === "yes" || params.verification === "no" ? params.verification : "";
  const premium = params.premium === "yes" || params.premium === "no" ? params.premium : "";
  const sort = ["last_login", "joined_newest", "joined_oldest", "most_works"].includes(params.sort ?? "")
    ? params.sort!
    : "last_login";
  const filters: WriterFilterState = { q, status, works, verification, premium, sort };
  const hasActiveFilters = Boolean(q || status || works || verification || premium);
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const where: Prisma.UserWhereInput = {
    role: "writer",
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(works ? { works: works === "yes" ? { some: {} } : { none: {} } } : {}),
    ...(verification ? { emailVerified: verification === "yes" } : {}),
    ...(premium ? { isPremium: premium === "yes" } : {}),
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

  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    sort === "joined_newest"
      ? [{ createdAt: "desc" }, { id: "desc" }]
      : sort === "joined_oldest"
        ? [{ createdAt: "asc" }, { id: "asc" }]
        : sort === "most_works"
          ? [{ works: { _count: "desc" } }, { createdAt: "desc" }, { id: "desc" }]
          : [{ lastLoginAt: "desc" }, { createdAt: "desc" }, { id: "desc" }];

  const writers = await prisma.user.findMany({
    where,
    orderBy,
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
          <form action="/sistem-yonetimi/yazarlar" method="get" className="writers-filters" role="search">
            <label className="writers-filter writers-filter--search">
              <span>Yazar ara</span>
              <input name="q" type="search" defaultValue={q} maxLength={120} placeholder="Ad, e-posta veya kullanıcı adı" />
            </label>
            <label className="writers-filter">
              <span>Hesap durumu</span>
              <select name="status" defaultValue={status}>
                <option value="">Tüm durumlar</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="writers-filter">
              <span>Eser durumu</span>
              <select name="works" defaultValue={works}>
                <option value="">Tüm yazarlar</option>
                <option value="yes">Eseri olanlar</option>
                <option value="no">Eseri olmayanlar</option>
              </select>
            </label>
            <label className="writers-filter">
              <span>E-posta doğrulama</span>
              <select name="verification" defaultValue={verification}>
                <option value="">Tümü</option>
                <option value="yes">Doğrulananlar</option>
                <option value="no">Bekleyenler</option>
              </select>
            </label>
            <label className="writers-filter">
              <span>Üyelik</span>
              <select name="premium" defaultValue={premium}>
                <option value="">Tümü</option>
                <option value="yes">Premium</option>
                <option value="no">Standart</option>
              </select>
            </label>
            <label className="writers-filter">
              <span>Sıralama</span>
              <select name="sort" defaultValue={sort}>
                <option value="last_login">Son giriş (en yeni)</option>
                <option value="joined_newest">En yeni kayıt</option>
                <option value="joined_oldest">En eski kayıt</option>
                <option value="most_works">En çok eser</option>
              </select>
            </label>
            <div className="writers-filter-actions">
              <button type="submit">Filtrele</button>
              <Link href="/sistem-yonetimi/yazarlar">Temizle</Link>
            </div>
          </form>
        </div>

        <div className="writers-results" role="status">
          <strong>{filteredCount.toLocaleString("tr-TR")} yazar</strong>
          <span>{hasActiveFilters ? "Filtre sonucunda bulundu" : "Toplam listelenebilir yazar"}</span>
          {hasActiveFilters && <Link href="/sistem-yonetimi/yazarlar">Tüm yazarları göster</Link>}
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
            {safePage > 1 ? <Link href={pageHref(filters, safePage - 1)}>← Önceki</Link> : <span>← Önceki</span>}
            <b>{safePage} / {totalPages}</b>
            {safePage < totalPages ? <Link href={pageHref(filters, safePage + 1)}>Sonraki →</Link> : <span>Sonraki →</span>}
          </div>
        </footer>
      </section>
    </div>
  );
}
