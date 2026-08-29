import Link from "next/link";
import type {
  EditorReviewStatus,
  Prisma,
  WorkStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isStoredWorkContentRating,
  storedWorkContentRatings,
  workContentRatingDetails,
} from "@/lib/work-content-classification";

const PAGE_SIZE = 20;

const statusLabels: Record<WorkStatus, string> = {
  archived: "Arşivde",
  draft: "Taslak",
  in_review: "İncelemede",
  published: "Yayımlandı",
};

const reviewLabels: Record<EditorReviewStatus, string> = {
  awaiting_second_editor: "İkinci editör bekleniyor",
  completed: "Tamamlandı",
  in_progress: "İnceleniyor",
  not_requested: "Talep edilmedi",
  requested: "Talep edildi",
  second_in_progress: "İkinci inceleme sürüyor",
};

const visibilityLabels = {
  private: "Özel",
  public: "Herkese açık",
  unlisted: "Liste dışı",
} as const;

type SearchParams = Promise<{
  durum?: string;
  hitap?: string;
  page?: string;
  q?: string;
  yazar?: string;
}>;

function isWorkStatus(value: string | undefined): value is WorkStatus {
  return value === "archived" || value === "draft" || value === "in_review" || value === "published";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(value);
}

function pageHref(
  query: string,
  status: string,
  authorId: string,
  contentRating: string,
  page: number,
) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  if (status) params.set("durum", status);
  if (authorId) params.set("yazar", authorId);
  if (contentRating) params.set("hitap", contentRating);
  return `/admin/eserler?${params.toString()}`;
}

export default async function AdminWorksPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const authorId = params.yazar?.trim() ?? "";
  const status = isWorkStatus(params.durum) ? params.durum : "";
  const contentRating = isStoredWorkContentRating(params.hitap) ? params.hitap : "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const where: Prisma.WorkWhereInput = {
    ...(authorId ? { authorId } : {}),
    ...(status ? { status } : {}),
    ...(contentRating ? { contentRating } : {}),
    ...(query ? {
      OR: [
        { title: { contains: query } },
        { author: { is: { displayName: { contains: query } } } },
        { author: { is: { email: { contains: query } } } },
        { author: { is: { fullName: { contains: query } } } },
      ],
    } : {}),
  };

  const filteredCount = await prisma.work.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const works = await prisma.work.findMany({
    where,
    include: { author: { select: { displayName: true, email: true, fullName: true } } },
    orderBy: { updatedAt: "desc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const first = filteredCount ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(safePage * PAGE_SIZE, filteredCount);

  return (
    <div className="admin-directory-page">
      <header className="admin-page-heading">
        <div><span className="admin-eyebrow">İçerik yönetimi</span><h1>Eserler</h1><p>Eserlerin durumunu, görünürlüğünü, hitap yaşını ve editör inceleme sürecini salt okunur olarak izleyin.</p></div>
      </header>

      <section className="admin-panel admin-directory-panel">
        <form className="admin-directory-filters" method="get">
          <label><span>Eser veya yazar ara</span><input defaultValue={query} name="q" placeholder="Eser adı, yazar veya e-posta" type="search" /></label>
          <label><span>Eser durumu</span><select defaultValue={status} name="durum"><option value="">Tüm durumlar</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Hitap yaşı</span><select defaultValue={contentRating} name="hitap"><option value="">Tüm hitap yaşları</option>{storedWorkContentRatings.map((rating) => <option key={rating} value={rating}>{workContentRatingDetails[rating].shortLabel}</option>)}</select></label>
          {authorId ? <input name="yazar" type="hidden" value={authorId} /> : null}
          <button type="submit">Filtrele</button>
          {(query || status || authorId || contentRating) ? <Link href="/admin/eserler">Temizle</Link> : null}
        </form>

        {works.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead><tr><th>Eser</th><th>Hitap Yaşı</th><th>Durum</th><th>Görünürlük</th><th>Editör incelemesi</th><th>Tarihler</th><th>İşlemler</th></tr></thead>
              <tbody>{works.map((work) => <tr key={work.id}>
                <td><strong>{work.title}</strong><span>{work.author.displayName || work.author.fullName}</span><small>{work.author.email}</small></td>
                <td>{workContentRatingDetails[work.contentRating].shortLabel}</td>
                <td><span className="admin-table-badge" data-status={work.status}>{statusLabels[work.status]}</span></td>
                <td>{visibilityLabels[work.visibility]}</td>
                <td>{reviewLabels[work.editorReviewStatus]}</td>
                <td><span>Oluşturma: {formatDate(work.createdAt)}</span><small>Güncelleme: {formatDate(work.updatedAt)}</small></td>
                <td><div><Link href={`/admin/eserler/${work.id}`}>Detaya git</Link><br /><Link href={`/admin/eserler/${work.id}/pasaport`}>Eser Pasaportu</Link></div></td>
              </tr>)}</tbody>
            </table>
          </div>
        ) : <div className="admin-empty-state"><strong>Eser bulunamadı</strong><p>Arama veya filtre ölçütlerini değiştirerek yeniden deneyin.</p></div>}

        <footer className="admin-pagination"><span>{first}–{last} / {filteredCount} eser</span><div>{safePage > 1 ? <Link href={pageHref(query, status, authorId, contentRating, safePage - 1)}>← Önceki</Link> : <span>← Önceki</span>}<b>{safePage} / {totalPages}</b>{safePage < totalPages ? <Link href={pageHref(query, status, authorId, contentRating, safePage + 1)}>Sonraki →</Link> : <span>Sonraki →</span>}</div></footer>
      </section>
    </div>
  );
}
