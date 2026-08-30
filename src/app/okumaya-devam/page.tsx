import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  ReaderWorksTable,
  type ReaderWorkRow,
} from "@/features/reader/components/ReaderWorksTable";
import {
  READER_LIST_PAGE_SIZE,
  ReaderFilterDesk,
  ReaderPagination,
  ReaderResultSummary,
  parseManagedReaderStandardFilters,
  readerListHref,
  readerReviewLabel,
  readerWorkMatches,
  type ReaderActiveFilter,
  type ReaderSortOption,
} from "@/features/reader/discovery-standard";
import "@/features/reader/reader-discovery.css";
import { getContinueReadingForMember } from "@/features/reading/continue-reading";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { discoveryAdvancedFilterChips } from "@/lib/discovery-advanced-filters";
import { workContentRatingDetails } from "@/lib/work-content-classification";

export const metadata: Metadata = {
  description: "Başladığınız eserlere kaldığınız yerden devam edin.",
  title: "Okumaya Devam Et | İlkOku",
};

export const dynamic = "force-dynamic";

const sortOptions = [
  { label: "Son okunan", value: "recent" },
  { label: "En çok ilerlenen", value: "progress" },
  { label: "A–Z", value: "az" },
] as const satisfies readonly ReaderSortOption[];

function countWords(content: string) {
  const normalized = content.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

export default async function ContinueReadingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/okumaya-devam");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const adultAccess = await getAdultContentAccess(profile.id);
  const ratingOptions = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const params = await searchParams;
  const { enabledFilterIds, filters } = await parseManagedReaderStandardFilters(
    "reader-continue-reading",
    params,
    ratingOptions,
    sortOptions,
    "recent",
  );
  const progressRecords = await getContinueReadingForMember(profile.id, null);

  const mappedRows = progressRecords.map((progress) => ({
    lastReadAt: progress.lastReadAt,
    row: {
      authorName:
        progress.work.author.displayName ?? progress.work.author.fullName,
      authorUsername: progress.work.author.username,
      chapterCount: progress.work.chapters.length,
      commentCount: progress.work._count.comments,
      contentRating: progress.work.contentRating,
      coverUrl: progress.work.coverUrl,
      description: progress.work.description,
      editorReviewStatus: progress.work.editorReviewStatus,
      favoriteCount: progress.work._count.favorites,
      genre: progress.work.genre,
      id: progress.work.id,
      isFavorite: progress.work.favorites.length > 0,
      language: progress.work.language,
      lastReadLabel: progress.chapter.title,
      progressPercent: progress.progressPercent,
      publishedAt: progress.work.publishedAt?.toISOString() ?? null,
      readerCount: progress.work._count.readingProgress,
      readingHref: `/oku/${progress.work.slug}/bolum-${progress.chapter.position}`,
      readingState: "in_progress" as const,
      slug: progress.work.slug,
      title: progress.work.title,
      totalWords: progress.work.chapters.reduce(
        (total, chapter) => total + countWords(chapter.content),
        0,
      ),
      updatedAt: progress.work.updatedAt.toISOString(),
    } satisfies ReaderWorkRow,
  }));

  const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });
  const filteredRows = mappedRows
    .filter(({ row }) => readerWorkMatches(row, filters))
    .sort((left, right) => {
      if (filters.sort === "progress") {
        const difference =
          (right.row.progressPercent ?? 0) - (left.row.progressPercent ?? 0);
        if (difference !== 0) return difference;
      }
      if (filters.sort === "az") {
        return collator.compare(left.row.title, right.row.title);
      }
      return right.lastReadAt.getTime() - left.lastReadAt.getTime();
    });

  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / READER_LIST_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const pageRows = filteredRows
    .slice(
      (currentPage - 1) * READER_LIST_PAGE_SIZE,
      currentPage * READER_LIST_PAGE_SIZE,
    )
    .map(({ row }) => row);
  const normalizedFilters = { ...filters, page: currentPage };
  const pageHref = (page: number) =>
    readerListHref("/okumaya-devam", normalizedFilters, page);
  const activeFilters: ReaderActiveFilter[] = [
    filters.search
      ? {
          href: readerListHref(
            "/okumaya-devam",
            { ...normalizedFilters, search: undefined },
            1,
          ),
          label: `Arama: ${filters.search}`,
        }
      : null,
    filters.genre
      ? {
          href: readerListHref(
            "/okumaya-devam",
            { ...normalizedFilters, genre: undefined },
            1,
          ),
          label: `Tür: ${filters.genre}`,
        }
      : null,
    filters.contentRating
      ? {
          href: readerListHref(
            "/okumaya-devam",
            { ...normalizedFilters, contentRating: undefined },
            1,
          ),
          label: `Hitap: ${workContentRatingDetails[filters.contentRating].shortLabel}`,
        }
      : null,
    filters.reviewStatus
      ? {
          href: readerListHref(
            "/okumaya-devam",
            { ...normalizedFilters, reviewStatus: undefined },
            1,
          ),
          label: readerReviewLabel(filters.reviewStatus),
        }
      : null,
    filters.sort !== "recent"
      ? {
          href: readerListHref(
            "/okumaya-devam",
            { ...normalizedFilters, sort: "recent" },
            1,
          ),
          label: `Sıralama: ${sortOptions.find((option) => option.value === filters.sort)?.label ?? filters.sort}`,
        }
      : null,
  ].filter((item): item is ReaderActiveFilter => item !== null);
  const advancedFilterCount = discoveryAdvancedFilterChips(
    filters.advanced,
    enabledFilterIds,
  ).length;
  const hasFilters = activeFilters.length + advancedFilterCount > 0;
  const returnTo = pageHref(currentPage);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace reader-discovery-workdesk">
        <EditorPageHeader
          description="Başladığınız eserleri aynı çalışma masasında filtreleyin ve kaldığınız yerden devam edin."
          eyebrow="Okuma listeniz"
          title="Okumaya Devam Et"
        />

        <ReaderFilterDesk
          activeFilters={activeFilters}
          advancedFilters={filters.advanced}
          clearHref="/okumaya-devam"
          contentRating={filters.contentRating}
          genre={filters.genre}
          heading="Devam ettiğiniz eserleri daraltın"
          hint="Tüm devam eden okumalarınızı görüyorsunuz."
          ratingOptions={ratingOptions}
          reviewStatus={filters.reviewStatus}
          search={filters.search}
          searchPlaceholder="Eser, yazar veya rumuz ara"
          sort={filters.sort}
          sortOptions={sortOptions}
          standardFilters={normalizedFilters}
        />

        <ReaderResultSummary
          currentPage={currentPage}
          noun="eser"
          totalCount={totalCount}
          visibleCount={pageRows.length}
        />

        <ReaderWorksTable
          emptyDescription={
            hasFilters
              ? "Filtreleri değiştirerek devam eden okumalarınız içinde yeniden deneyin."
              : "Bir eseri açtığınızda son kaldığınız bölüm burada görünecek."
          }
          emptyTitle={
            hasFilters
              ? "Eşleşen eser bulunamadı"
              : "Henüz devam eden bir okumanız yok"
          }
          returnTo={returnTo}
          rows={pageRows}
        />

        <ReaderPagination
          ariaLabel="Okumaya devam sayfalama"
          currentPage={currentPage}
          hrefForPage={pageHref}
          totalPages={totalPages}
        />
      </div>
    </AppShell>
  );
}
