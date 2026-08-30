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
import { getCompletedReadingForMember } from "@/features/reading/completed-reading";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { discoveryAdvancedFilterChips } from "@/lib/discovery-advanced-filters";
import { workContentRatingDetails } from "@/lib/work-content-classification";

export const metadata: Metadata = {
  description: "Okumayı tamamladığınız eserleri görüntüleyin.",
  title: "Tamamlanan Eserler | İlkOku",
};

export const dynamic = "force-dynamic";

const sortOptions = [
  { label: "Son tamamlanan", value: "completed" },
  { label: "Son güncellenen", value: "updated" },
  { label: "A–Z", value: "az" },
] as const satisfies readonly ReaderSortOption[];

function countWords(content: string) {
  const normalized = content.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

export default async function CompletedWorksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/tamamlanan-eserler");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const adultAccess = await getAdultContentAccess(profile.id);
  const ratingOptions = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const params = await searchParams;
  const { enabledFilterIds, filters } = await parseManagedReaderStandardFilters(
    "reader-completed-works",
    params,
    ratingOptions,
    sortOptions,
    "completed",
  );
  const records = await getCompletedReadingForMember(profile.id);

  const mappedRows = records.map((progress) => {
    const publishedChapters = progress.work.chapters.filter(
      (chapter) => chapter.status === "published" && chapter.publishedAt !== null,
    );
    const firstChapter = publishedChapters[0] ?? null;
    const hasPendingChapter = progress.work.chapters.some(
      (chapter) => chapter.status !== "published" || chapter.publishedAt === null,
    );

    return {
      completedAt: progress.completedAt,
      row: {
        authorName:
          progress.work.author.displayName ?? progress.work.author.fullName,
        authorUsername: progress.work.author.username,
        chapterCount: publishedChapters.length,
        commentCount: progress.work._count.comments,
        completedAt: progress.completedAt?.toISOString() ?? null,
        completionStatus:
          publishedChapters.length > 0 && !hasPendingChapter ? "completed" : "ongoing",
        contentRating: progress.work.contentRating,
        coverUrl: progress.work.coverUrl,
        description: progress.work.description,
        editorReviewStatus: progress.work.editorReviewStatus,
        favoriteCount: progress.work._count.favorites,
        genre: progress.work.genre,
        hasPassport:
          progress.work._count.ownershipStamps > 0 ||
          progress.work._count.versions > 0,
        id: progress.work.id,
        isFavorite: progress.work.favorites.length > 0,
        language: progress.work.language,
        lastReadAt: progress.lastReadAt.toISOString(),
        lastReadLabel: progress.chapter.title,
        progressPercent: 100,
        publishedAt: progress.work.publishedAt?.toISOString() ?? null,
        readerCount: progress.work._count.readingProgress,
        readingHref: firstChapter
          ? `/oku/${progress.work.slug}/bolum-${firstChapter.position}`
          : null,
        readingState: "completed" as const,
        slug: progress.work.slug,
        title: progress.work.title,
        totalWords: publishedChapters.reduce(
          (total, chapter) => total + countWords(chapter.content),
          0,
        ),
        updatedAt: progress.work.updatedAt.toISOString(),
        versionCount: progress.work._count.versions,
      } satisfies ReaderWorkRow,
    };
  });

  const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });
  const filteredRows = mappedRows
    .filter(({ row }) => readerWorkMatches(row, filters))
    .sort((left, right) => {
      if (filters.sort === "updated") {
        return (
          new Date(right.row.updatedAt ?? 0).getTime() -
          new Date(left.row.updatedAt ?? 0).getTime()
        );
      }
      if (filters.sort === "az") {
        return collator.compare(left.row.title, right.row.title);
      }
      return (
        (right.completedAt?.getTime() ?? 0) -
        (left.completedAt?.getTime() ?? 0)
      );
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
    readerListHref("/tamamlanan-eserler", normalizedFilters, page);
  const activeFilters: ReaderActiveFilter[] = [
    filters.search
      ? {
          href: readerListHref(
            "/tamamlanan-eserler",
            { ...normalizedFilters, search: undefined },
            1,
          ),
          label: `Arama: ${filters.search}`,
        }
      : null,
    filters.genre
      ? {
          href: readerListHref(
            "/tamamlanan-eserler",
            { ...normalizedFilters, genre: undefined },
            1,
          ),
          label: `Tür: ${filters.genre}`,
        }
      : null,
    filters.contentRating
      ? {
          href: readerListHref(
            "/tamamlanan-eserler",
            { ...normalizedFilters, contentRating: undefined },
            1,
          ),
          label: `Hitap: ${workContentRatingDetails[filters.contentRating].shortLabel}`,
        }
      : null,
    filters.reviewStatus
      ? {
          href: readerListHref(
            "/tamamlanan-eserler",
            { ...normalizedFilters, reviewStatus: undefined },
            1,
          ),
          label: readerReviewLabel(filters.reviewStatus),
        }
      : null,
    filters.sort !== "completed"
      ? {
          href: readerListHref(
            "/tamamlanan-eserler",
            { ...normalizedFilters, sort: "completed" },
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
          description="Tamamladığınız eserleri aynı çalışma masasında filtreleyin veya yeniden okumaya başlayın."
          eyebrow="Okuma arşiviniz"
          title="Tamamlanan Eserler"
        />

        <ReaderFilterDesk
          activeFilters={activeFilters}
          advancedFilters={filters.advanced}
          clearHref="/tamamlanan-eserler"
          contentRating={filters.contentRating}
          genre={filters.genre}
          heading="Tamamlanan eserleri daraltın"
          hint="Tüm tamamlanan eserlerinizi görüyorsunuz."
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
              ? "Filtreleri değiştirerek tamamlanan eserleriniz içinde yeniden deneyin."
              : "Bir eserin son bölümünü tamamladığınızda eser burada görünecek."
          }
          emptyTitle={
            hasFilters
              ? "Eşleşen eser bulunamadı"
              : "Henüz tamamladığınız bir eser yok"
          }
          returnTo={returnTo}
          rows={pageRows}
        />

        <ReaderPagination
          ariaLabel="Tamamlanan eserler sayfalama"
          currentPage={currentPage}
          hrefForPage={pageHref}
          totalPages={totalPages}
        />
      </div>
    </AppShell>
  );
}
