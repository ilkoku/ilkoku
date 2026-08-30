import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import type { Prisma } from "@/generated/prisma/client";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { countWords } from "@/features/editor-workspace/eligibility";
import {
  ReaderWorksTable,
  type ReaderWorkRow,
} from "@/features/reader/components/ReaderWorksTable";
import "@/features/reader/reader-discovery.css";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { normalizeGenreLabel } from "@/lib/genre-system";
import { GENRE_LABELS } from "@/lib/genres";
import { prisma } from "@/lib/prisma";
import {
  isMemberStoredWorkContentRating,
  workContentRatingDetails,
  type MemberStoredWorkContentRating,
} from "@/lib/work-content-classification";

export const metadata: Metadata = {
  description: "İlkOku'da yayımlanan eserleri keşfedin.",
  title: "Keşfet | İlkOku",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const readingFilters = ["unread", "in_progress", "completed"] as const;
const reviewFilters = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;
const sortFilters = ["newest", "updated"] as const;

type ReadingFilter = (typeof readingFilters)[number];
type ReviewFilter = (typeof reviewFilters)[number];
type SortFilter = (typeof sortFilters)[number];

type ReaderExploreFilters = {
  contentRating?: MemberStoredWorkContentRating;
  favoritesOnly: boolean;
  genre?: string;
  language?: string;
  readingState?: ReadingFilter;
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

function languageLabel(value: string) {
  if (value === "tr") return "Türkçe";
  if (value === "en") return "İngilizce";
  return value.toLocaleUpperCase("tr-TR");
}

function readingLabel(value: ReadingFilter) {
  if (value === "unread") return "Henüz okumadıklarım";
  if (value === "in_progress") return "Okumaya devam";
  return "Tamamladıklarım";
}

function reviewLabel(value: ReviewFilter) {
  switch (value) {
    case "not_requested":
      return "Henüz incelenmedi";
    case "requested":
      return "İnceleme talep edildi";
    case "in_progress":
      return "İlk editörde";
    case "awaiting_second_editor":
      return "İkinci editör bekleniyor";
    case "second_in_progress":
      return "İkinci editörde";
    case "completed":
      return "Editör incelemesi tamamlandı";
  }
}

function pageHref(filters: ReaderExploreFilters, page: number) {
  const params = new URLSearchParams();

  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.language) params.set("dil", filters.language);
  if (filters.contentRating) params.set("hitapYasi", filters.contentRating);
  if (filters.readingState) params.set("okuma", filters.readingState);
  if (filters.reviewStatus) params.set("editor", filters.reviewStatus);
  if (filters.favoritesOnly) params.set("favori", "1");
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
    favori?: string;
    hitapYasi?: string;
    okuma?: string;
    sayfa?: string;
    siralama?: string;
    tur?: string;
  }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/kesfet");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const adultAccess = await getAdultContentAccess(profile.id);
  const visibleRatings = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const parameters = await searchParams;
  const search = parameters.arama?.trim().slice(0, 220);
  const genre = normalizeGenreLabel(parameters.tur);
  const language = parameters.dil?.trim().slice(0, 10);
  const requestedContentRating = isMemberStoredWorkContentRating(
    parameters.hitapYasi,
  )
    ? parameters.hitapYasi
    : undefined;
  const contentRating =
    requestedContentRating && visibleRatings.includes(requestedContentRating)
      ? requestedContentRating
      : undefined;
  const readingState = includesValue(readingFilters, parameters.okuma)
    ? parameters.okuma
    : undefined;
  const reviewStatus = includesValue(reviewFilters, parameters.editor)
    ? parameters.editor
    : undefined;
  const favoritesOnly = parameters.favori === "1";
  const sort = includesValue(sortFilters, parameters.siralama)
    ? parameters.siralama
    : "newest";
  const rawPage = Number.parseInt(parameters.sayfa ?? "", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters: ReaderExploreFilters = {
    contentRating,
    favoritesOnly,
    genre,
    language,
    readingState,
    reviewStatus,
    search,
    sort,
  };

  const where: Prisma.WorkWhereInput = {
    ...commonDiscoveryWorkWhereFor(adultAccess.canAccessAdultContent),
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
    ...(genre ? { genre } : {}),
    ...(language ? { language } : {}),
    ...(contentRating ? { contentRating } : {}),
    ...(reviewStatus ? { editorReviewStatus: reviewStatus } : {}),
    ...(favoritesOnly
      ? { favorites: { some: { userId: profile.id } } }
      : {}),
    ...(readingState === "unread"
      ? { readingProgress: { none: { userId: profile.id } } }
      : readingState === "in_progress"
        ? {
            readingProgress: {
              some: { completed: false, userId: profile.id },
            },
          }
        : readingState === "completed"
          ? {
              readingProgress: {
                some: { completed: true, userId: profile.id },
              },
            }
          : {}),
  };

  const [totalCount, favoriteCount] = await Promise.all([
    prisma.work.count({ where }),
    prisma.favorite.count({ where: { userId: profile.id } }),
  ]);
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
          completed: true,
          completedAt: true,
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
      completedAt: progress?.completedAt?.toISOString() ?? null,
      contentRating: work.contentRating,
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
      readingState: progress
        ? progress.completed
          ? "completed"
          : "in_progress"
        : "unread",
      slug: work.slug,
      title: work.title,
      totalWords: work.chapters.reduce(
        (total, chapter) => total + countWords(chapter.content),
        0,
      ),
      updatedAt: work.updatedAt.toISOString(),
    };
  });

  const activeFilters = [
    search
      ? {
          href: pageHref({ ...filters, search: undefined }, 1),
          label: `Arama: ${search}`,
        }
      : null,
    genre
      ? {
          href: pageHref({ ...filters, genre: undefined }, 1),
          label: `Tür: ${genre}`,
        }
      : null,
    language
      ? {
          href: pageHref({ ...filters, language: undefined }, 1),
          label: `Dil: ${languageLabel(language)}`,
        }
      : null,
    contentRating
      ? {
          href: pageHref({ ...filters, contentRating: undefined }, 1),
          label: `Hitap: ${workContentRatingDetails[contentRating].shortLabel}`,
        }
      : null,
    readingState
      ? {
          href: pageHref({ ...filters, readingState: undefined }, 1),
          label: readingLabel(readingState),
        }
      : null,
    reviewStatus
      ? {
          href: pageHref({ ...filters, reviewStatus: undefined }, 1),
          label: reviewLabel(reviewStatus),
        }
      : null,
    favoritesOnly
      ? {
          href: pageHref({ ...filters, favoritesOnly: false }, 1),
          label: "Yalnız favorilerim",
        }
      : null,
    sort !== "newest"
      ? {
          href: pageHref({ ...filters, sort: "newest" }, 1),
          label: "Son güncellenen",
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const hasFilters = activeFilters.length > 0;
  const returnTo = pageHref(filters, currentPage);
  const first = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const last = totalCount === 0 ? 0 : first + rows.length - 1;

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace reader-discovery-workdesk">
        <section className="reader-discovery-desk">
          <div className="reader-discovery-desk__intro">
            <p className="reader-discovery-desk__eyebrow">Keşif masası</p>
            <h1>Eserleri masaya yatır</h1>
            <p className="reader-discovery-desk__lead">
              Ortak Keşfet havuzunu arayın, filtreleyin; bir eseri detay panelinde inceleyip
              favoriye alın veya doğrudan okumaya geçin.
            </p>
            <nav aria-label="Keşif çalışma alanı" className="reader-discovery-desk__quick-links">
              <span aria-current="page">Eserler</span>
              <Link href="/yazar-kesfet">Yazarlar</Link>
              <Link href="/favorilerim">Favorilerim</Link>
              <Link href="/okumaya-devam">Okumaya Devam</Link>
            </nav>
          </div>

          <div className="reader-discovery-desk__stats" aria-label="Keşif özeti">
            <div>
              <strong>{totalCount}</strong>
              <span>Eşleşen eser</span>
            </div>
            <div>
              <strong>{activeFilters.length}</strong>
              <span>Aktif filtre</span>
            </div>
            <div>
              <strong>{favoriteCount}</strong>
              <span>Favori eser</span>
            </div>
          </div>
        </section>

        {adultAccess.isAdult && !adultAccess.canAccessAdultContent ? (
          <section className="reader-discovery-summary reader-discovery-summary--notice">
            <span>18+ içerik tercihi</span>
            <strong>İkinci onay gerekli</strong>
            <small>18+ eserleri aynı Keşfet havuzunda görmek için açık onay verin.</small>
            <Link
              className="button button--outline"
              href="/yetiskin-icerik-onayi?sonraki=%2Fkesfet"
            >
              18+ içerikleri aç
            </Link>
          </section>
        ) : null}

        <section className="reader-discovery-console" aria-label="Keşif filtre masası">
          <header className="reader-discovery-console__header">
            <div>
              <span>Filtre masası</span>
              <strong>Aradığınız eseri daraltın</strong>
            </div>
            {hasFilters ? <Link href="/kesfet">Tüm filtreleri temizle</Link> : null}
          </header>

          <nav aria-label="Hızlı keşif filtreleri" className="reader-discovery-presets">
            <Link href="/kesfet?okuma=unread">Henüz okumadıklarım</Link>
            <Link href="/kesfet?okuma=in_progress">Okumaya devam</Link>
            <Link href="/kesfet?favori=1">Favorilerim</Link>
            <Link href="/kesfet?editor=completed">Editör incelemesi tamamlananlar</Link>
          </nav>

          <form className="editor-filters reader-discovery-filters">
            <label className="reader-discovery-filter--search">
              <span>Arama</span>
              <input
                defaultValue={search}
                name="arama"
                placeholder="Eser, yazar veya rumuz ara"
                type="search"
              />
            </label>

            <label>
              <span>Tür</span>
              <select defaultValue={genre ?? ""} name="tur">
                <option value="">Tüm türler</option>
                {GENRE_LABELS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Dil</span>
              <select defaultValue={language ?? ""} name="dil">
                <option value="">Tüm diller</option>
                <option value="tr">Türkçe</option>
                <option value="en">İngilizce</option>
              </select>
            </label>

            <label>
              <span>Hitap yaşı</span>
              <select defaultValue={contentRating ?? ""} name="hitapYasi">
                <option value="">Tümü</option>
                {visibleRatings.map((rating) => (
                  <option key={rating} value={rating}>
                    {workContentRatingDetails[rating].shortLabel}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Okuma durumum</span>
              <select defaultValue={readingState ?? ""} name="okuma">
                <option value="">Tümü</option>
                <option value="unread">Henüz okumadıklarım</option>
                <option value="in_progress">Okumaya devam</option>
                <option value="completed">Tamamladıklarım</option>
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
              <span>Favori durumu</span>
              <select defaultValue={favoritesOnly ? "1" : ""} name="favori">
                <option value="">Tümü</option>
                <option value="1">Yalnız favorilerim</option>
              </select>
            </label>

            <label>
              <span>Sıralama</span>
              <select defaultValue={sort} name="siralama">
                <option value="newest">En yeni yayımlanan</option>
                <option value="updated">Son güncellenen</option>
              </select>
            </label>

            <div className="reader-discovery-filter-actions">
              <button className="button button--primary" type="submit">
                Masayı Güncelle
              </button>
              {hasFilters ? (
                <Link className="button button--ghost" href="/kesfet">
                  Temizle
                </Link>
              ) : null}
            </div>
          </form>

          {activeFilters.length > 0 ? (
            <div className="reader-discovery-active-filters" aria-label="Aktif filtreler">
              <span>Aktif</span>
              {activeFilters.map((item) => (
                <Link href={item.href} key={`${item.label}-${item.href}`}>
                  {item.label}
                  <b aria-hidden="true">×</b>
                </Link>
              ))}
            </div>
          ) : (
            <p className="reader-discovery-console__hint">
              Filtre seçmeden tüm keşif havuzunu görüyorsunuz.
            </p>
          )}
        </section>

        <section className="reader-discovery-summary" aria-live="polite">
          <span>Masadaki sonuç</span>
          <strong>{totalCount} eser</strong>
          <small>
            {totalCount === 0
              ? "Filtreleri değiştirerek yeniden deneyin."
              : `${first}–${last} arası gösteriliyor. Eser adına dokunarak detay çekmecesini açabilirsiniz.`}
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
