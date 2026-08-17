import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import type { Prisma } from "@/generated/prisma/client";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { countWords } from "@/features/editor-workspace/eligibility";
import {
  ReaderWorksTable,
  type ReaderWorkRow,
} from "@/features/reader/components/ReaderWorksTable";
import "@/features/reader/reader-discovery.css";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  description: "İlkOku'da yayımlanan eserleri keşfedin.",
  title: "Keşfet | İlkOku",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const completionFilters = ["completed", "ongoing"] as const;
const reviewFilters = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;
const sortFilters = ["newest", "updated"] as const;

type CompletionFilter = (typeof completionFilters)[number];
type ReviewFilter = (typeof reviewFilters)[number];
type SortFilter = (typeof sortFilters)[number];

type ReaderExploreFilters = {
  completion?: CompletionFilter;
  genre?: string;
  language?: string;
  reviewStatus?: ReviewFilter;
  search?: string;
  sort: SortFilter;
};

function includesValue<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return Boolean(value && values.includes(value as T));
}

function pageHref(filters: ReaderExploreFilters, page: number) {
  const params = new URLSearchParams();

  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.language) params.set("dil", filters.language);
  if (filters.completion) params.set("tamamlanma", filters.completion);
  if (filters.reviewStatus) params.set("editor", filters.reviewStatus);
  if (filters.sort !== "newest") params.set("siralama", filters.sort);
  if (page > 1) params.set("sayfa", String(page));

  const query = params.toString();
  return query ? `/kesfet?${query}` : "/kesfet";
}

export default async function ReaderExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    arama?: string;
    dil?: string;
    editor?: string;
    sayfa?: string;
    siralama?: string;
    tamamlanma?: string;
    tur?: string;
  }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/kesfet");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const parameters = await searchParams;
  const search = parameters.arama?.trim().slice(0, 220);
  const genre = parameters.tur?.trim().slice(0, 120);
  const language = parameters.dil?.trim().slice(0, 10);
  const completion = includesValue(completionFilters, parameters.tamamlanma)
    ? parameters.tamamlanma
    : undefined;
  const reviewStatus = includesValue(reviewFilters, parameters.editor)
    ? parameters.editor
    : undefined;
  const sort = includesValue(sortFilters, parameters.siralama)
    ? parameters.siralama
    : "newest";
  const rawPage = Number.parseInt(parameters.sayfa ?? "", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters: ReaderExploreFilters = {
    completion,
    genre,
    language,
    reviewStatus,
    search,
    sort,
  };

  const where: Prisma.WorkWhereInput = {
    archivedAt: null,
    publishedAt: { not: null },
    status: "published",
    visibility: "public",
    author: {
      is: {
        deletedAt: null,
        status: "active",
      },
    },
    readingProgress: {
      none: {
        userId: profile.id,
      },
    },
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { subtitle: { contains: search } },
            {
              author: {
                is: {
                  OR: [
                    { displayName: { contains: search } },
                    { fullName: { contains: search } },
                    { username: { contains: search } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
    ...(genre ? { genre: { contains: genre } } : {}),
    ...(language ? { language } : {}),
    ...(reviewStatus ? { editorReviewStatus: reviewStatus } : {}),
    ...(completion === "completed"
      ? {
          chapters: {
            none: {
              archivedAt: null,
              OR: [{ publishedAt: null }, { status: { not: "published" } }],
            },
            some: {
              archivedAt: null,
              publishedAt: { not: null },
              status: "published",
            },
          },
        }
      : completion === "ongoing"
        ? {
            chapters: {
              some: {
                archivedAt: null,
                OR: [{ publishedAt: null }, { status: { not: "published" } }],
              },
            },
          }
        : {}),
  };

  const totalCount = await prisma.work.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  const works = await prisma.work.findMany({
    where,
    include: {
      _count: {
        select: {
          comments: {
            where: {
              deletedAt: null,
              status: "visible",
            },
          },
          favorites: true,
          readingProgress: true,
        },
      },
      author: {
        select: {
          displayName: true,
          fullName: true,
          username: true,
        },
      },
      chapters: {
        where: {
          archivedAt: null,
          publishedAt: {
            not: null,
          },
          status: "published",
        },
        orderBy: {
          position: "asc",
        },
        select: {
          content: true,
          position: true,
          title: true,
        },
      },
      favorites: {
        where: {
          userId: profile.id,
        },
        select: {
          id: true,
        },
      },
      readingProgress: {
        where: {
          userId: profile.id,
          chapter: {
            is: {
              archivedAt: null,
              publishedAt: {
                not: null,
              },
              status: "published",
            },
          },
        },
        orderBy: {
          lastReadAt: "desc",
        },
        select: {
          chapter: {
            select: {
              position: true,
              title: true,
            },
          },
          progressPercent: true,
        },
        take: 1,
      },
    },
    orderBy:
      sort === "updated"
        ? [{ updatedAt: "desc" }, { publishedAt: "desc" }]
        : [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const rows: ReaderWorkRow[] = works.map((work) => {
    const firstChapter = work.chapters[0] ?? null;
    const progress = work.readingProgress[0] ?? null;

    return {
      authorName: work.author.displayName ?? work.author.fullName,
      authorUsername: work.author.username,
      chapterCount: work.chapters.length,
      commentCount: work._count.comments,
      coverUrl: work.coverUrl,
      description: work.description,
      editorReviewStatus: work.editorReviewStatus,
      favoriteCount: work._count.favorites,
      genre: work.genre,
      id: work.id,
      isFavorite: work.favorites.length > 0,
      language: work.language,
      lastReadLabel: progress?.chapter.title ?? null,
      progressPercent: progress?.progressPercent ?? null,
      publishedAt: work.publishedAt?.toISOString() ?? null,
      readerCount: work._count.readingProgress,
      readingHref: progress
        ? `/oku/${work.slug}/bolum-${progress.chapter.position}`
        : firstChapter
          ? `/oku/${work.slug}/bolum-${firstChapter.position}`
          : null,
      slug: work.slug,
      title: work.title,
      totalWords: work.chapters.reduce(
        (total, chapter) => total + countWords(chapter.content),
        0,
      ),
      updatedAt: work.updatedAt.toISOString(),
    };
  });

  const hasFilters = Boolean(
    search || genre || language || completion || reviewStatus || sort !== "newest",
  );
  const returnTo = pageHref(filters, currentPage);
  const first = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const last = totalCount === 0 ? 0 : first + rows.length - 1;

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Yayımlanan eserleri tür, dil ve editör inceleme durumuna göre bulun."
          eyebrow="Okuma dünyası"
          title="Keşfet"
        />

        <form className="editor-filters">
          <label>
            <span>Arama</span>
            <input
              defaultValue={search}
              name="arama"
              placeholder="Eser veya yazar ara"
              type="search"
            />
          </label>

          <label>
            <span>Tür</span>
            <input defaultValue={genre} name="tur" placeholder="Örn. Roman" />
          </label>

          <label>
            <span>Dil</span>
            <select defaultValue={language ?? ""} name="dil">
              <option value="">Tümü</option>
              <option value="tr">Türkçe</option>
              <option value="en">İngilizce</option>
            </select>
          </label>

          <label>
            <span>Tamamlanma durumu</span>
            <select defaultValue={completion ?? ""} name="tamamlanma">
              <option value="">Tümü</option>
              <option value="completed">Tamamlandı</option>
              <option value="ongoing">Devam ediyor</option>
            </select>
          </label>

          <label>
            <span>Editör durumu</span>
            <select defaultValue={reviewStatus ?? ""} name="editor">
              <option value="">Tümü</option>
              <option value="not_requested">Henüz incelenmedi</option>
              <option value="requested">İnceleme talep edildi</option>
              <option value="in_progress">İlk editörde</option>
              <option value="awaiting_second_editor">İkinci editör bekleniyor</option>
              <option value="second_in_progress">İkinci editörde</option>
              <option value="completed">İncelendi</option>
            </select>
          </label>

          <label>
            <span>Sıralama</span>
            <select defaultValue={sort} name="siralama">
              <option value="newest">En Yeni</option>
              <option value="updated">Son Güncellenen</option>
            </select>
          </label>

          <div className="reader-discovery-filter-actions">
            <button className="button button--primary" type="submit">
              Sonuçları Göster
            </button>
            {hasFilters ? (
              <Link className="button button--ghost" href="/kesfet">
                Temizle
              </Link>
            ) : null}
          </div>
        </form>

        <section className="reader-discovery-summary" aria-live="polite">
          <span>Keşif sonucu</span>
          <strong>{totalCount} eser</strong>
          <small>
            {totalCount === 0
              ? "Filtreleri değiştirerek yeniden deneyin."
              : `${first}–${last} arası gösteriliyor.`}
          </small>
        </section>

        <ReaderWorksTable
          emptyDescription="Arama ifadenizi veya filtreleri değiştirerek yeniden deneyin."
          emptyTitle="Eşleşen eser bulunamadı"
          returnTo={returnTo}
          rows={rows}
        />

        {totalCount > 0 ? (
          <footer aria-label="Keşif sayfalama" className="reader-discovery-pagination">
            <span>
              Sayfa {currentPage} / {totalPages}
            </span>
            <div>
              {currentPage > 1 ? (
                <Link className="button button--ghost" href={pageHref(filters, currentPage - 1)}>
                  Önceki
                </Link>
              ) : (
                <span aria-disabled="true">Önceki</span>
              )}
              {currentPage < totalPages ? (
                <Link className="button button--ghost" href={pageHref(filters, currentPage + 1)}>
                  Sonraki
                </Link>
              ) : (
                <span aria-disabled="true">Sonraki</span>
              )}
            </div>
          </footer>
        ) : null}
      </div>
    </AppShell>
  );
}
