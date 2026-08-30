import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import type { Prisma } from "@/generated/prisma/client";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  getReaderFavoriteAuthors,
  toggleReaderAuthorFavoriteAction,
} from "@/features/reader/author-favorites";
import { ReaderWorksTable } from "@/features/reader/components/ReaderWorksTable";
import { getFavoriteWorks } from "@/features/reader/favorites";
import "@/features/reader/reader-discovery.css";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { normalizeGenreLabel } from "@/lib/genre-system";
import { GENRE_LABELS } from "@/lib/genres";
import {
  isMemberStoredWorkContentRating,
  isPublicStoredWorkContentRating,
  publicStoredWorkContentRatings,
  workContentRatingDetails,
} from "@/lib/work-content-classification";
import "../yazarlar/reader-author-favorites.css";

export const metadata: Metadata = {
  description: "Favori eserlerinizi ve yazarlarınızı görüntüleyin.",
  title: "Favorilerim | İlkOku",
};

export const dynamic = "force-dynamic";

const reviewFilters = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;
const workSortFilters = ["newest", "updated"] as const;
const authorSortFilters = ["recent", "most_works", "az"] as const;

type FavoriteType = "work" | "author";
type ReviewFilter = (typeof reviewFilters)[number];
type WorkSort = (typeof workSortFilters)[number];
type AuthorSort = (typeof authorSortFilters)[number];
type FavoriteFilters = {
  contentRating?: string;
  genre?: string;
  reviewStatus?: ReviewFilter;
  search?: string;
  sort: string;
};

function includesValue<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return Boolean(value && values.includes(value as T));
}

function reviewLabel(status: ReviewFilter) {
  switch (status) {
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
      return "İncelendi";
  }
}

function favoriteHref(type: FavoriteType, filters: FavoriteFilters) {
  const params = new URLSearchParams();
  const defaultSort = type === "author" ? "recent" : "newest";

  if (type === "author") params.set("tip", "yazar");
  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitapYasi", filters.contentRating);
  if (filters.reviewStatus) params.set("editor", filters.reviewStatus);
  if (filters.sort !== defaultSort) params.set("siralama", filters.sort);

  const query = params.toString();
  return query ? `/favorilerim?${query}` : "/favorilerim";
}

function matchesSearch(search: string | undefined, values: Array<string | null | undefined>) {
  if (!search) return true;
  const needle = search.toLocaleLowerCase("tr-TR");
  return values.some((value) =>
    value?.toLocaleLowerCase("tr-TR").includes(needle),
  );
}

export default async function ReaderFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{
    arama?: string;
    editor?: string;
    hitapYasi?: string;
    siralama?: string;
    tip?: string;
    tur?: string;
  }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/favorilerim");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const params = await searchParams;
  const type: FavoriteType = params.tip === "yazar" ? "author" : "work";
  const search = params.arama?.trim().slice(0, 220);
  const genre = normalizeGenreLabel(params.tur);
  const reviewStatus = includesValue(reviewFilters, params.editor)
    ? params.editor
    : undefined;
  const adultAccess = await getAdultContentAccess(profile.id);
  const workRatingOptions = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const authorRatingOptions = publicStoredWorkContentRatings.filter(
    (rating) => rating !== "adult_18",
  );
  const workContentRating =
    type === "work" &&
    isMemberStoredWorkContentRating(params.hitapYasi) &&
    workRatingOptions.includes(params.hitapYasi)
      ? params.hitapYasi
      : undefined;
  const authorContentRating =
    type === "author" &&
    isPublicStoredWorkContentRating(params.hitapYasi) &&
    params.hitapYasi !== "adult_18"
      ? params.hitapYasi
      : undefined;
  const contentRating = workContentRating ?? authorContentRating;
  const workSort: WorkSort = includesValue(workSortFilters, params.siralama)
    ? params.siralama
    : "newest";
  const authorSort: AuthorSort = includesValue(authorSortFilters, params.siralama)
    ? params.siralama
    : "recent";
  const sort = type === "author" ? authorSort : workSort;
  const filters: FavoriteFilters = {
    contentRating,
    genre,
    reviewStatus,
    search,
    sort,
  };

  const allWorks = type === "work" ? await getFavoriteWorks(profile.id) : [];
  const filteredWorks = allWorks
    .filter(
      (work) =>
        matchesSearch(search, [work.title, work.authorName, work.authorUsername]) &&
        (!genre || work.genre === genre) &&
        (!workContentRating || work.contentRating === workContentRating) &&
        (!reviewStatus || work.editorReviewStatus === reviewStatus),
    )
    .sort((left, right) => {
      const leftDate = workSort === "updated" ? left.updatedAt : left.publishedAt;
      const rightDate = workSort === "updated" ? right.updatedAt : right.publishedAt;
      return (rightDate?.getTime() ?? 0) - (leftDate?.getTime() ?? 0);
    });

  const authorWorkFilters: Prisma.WorkWhereInput = {
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
    ...(authorContentRating ? { contentRating: authorContentRating } : {}),
    ...(reviewStatus ? { editorReviewStatus: reviewStatus } : {}),
  };
  const authorResults =
    type === "author"
      ? await getReaderFavoriteAuthors(profile.id, authorWorkFilters)
      : [];
  const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });
  const authors = [...authorResults].sort((left, right) => {
    if (authorSort === "most_works") {
      const difference = right._count.works - left._count.works;
      if (difference !== 0) return difference;
    }

    if (authorSort === "recent") {
      const leftTime = left.works[0]?.publishedAt?.getTime() ?? 0;
      const rightTime = right.works[0]?.publishedAt?.getTime() ?? 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
    }

    return collator.compare(
      left.displayName ?? left.fullName,
      right.displayName ?? right.fullName,
    );
  });

  const rows = filteredWorks.map((work) => ({
    authorName: work.authorName,
    authorUsername: work.authorUsername,
    chapterCount: work.chapterCount,
    commentCount: work.commentCount,
    contentRating: work.contentRating,
    coverUrl: work.coverUrl,
    description: work.description,
    editorReviewStatus: work.editorReviewStatus,
    favoriteCount: work.favoriteCount,
    genre: work.genre,
    id: work.id,
    isFavorite: work.isFavorite,
    language: work.language,
    lastReadLabel: work.lastReadLabel,
    progressPercent: work.progressPercent,
    publishedAt: work.publishedAt?.toISOString() ?? null,
    readerCount: work.readerCount,
    readingHref: work.readingHref,
    readingState: work.readingState,
    slug: work.slug,
    title: work.title,
    totalWords: work.totalWords,
    updatedAt: work.updatedAt.toISOString(),
  }));
  const activeFilters = [
    search
      ? {
          href: favoriteHref(type, { ...filters, search: undefined }),
          label: `Arama: ${search}`,
        }
      : null,
    genre
      ? {
          href: favoriteHref(type, { ...filters, genre: undefined }),
          label: `Tür: ${genre}`,
        }
      : null,
    contentRating
      ? {
          href: favoriteHref(type, { ...filters, contentRating: undefined }),
          label: `Hitap: ${workContentRatingDetails[contentRating].shortLabel}`,
        }
      : null,
    reviewStatus
      ? {
          href: favoriteHref(type, { ...filters, reviewStatus: undefined }),
          label: reviewLabel(reviewStatus),
        }
      : null,
    type === "work" && workSort === "updated"
      ? {
          href: favoriteHref(type, { ...filters, sort: "newest" }),
          label: "Son güncellenen",
        }
      : type === "author" && authorSort === "most_works"
        ? {
            href: favoriteHref(type, { ...filters, sort: "recent" }),
            label: "En çok eşleşen eser",
          }
        : type === "author" && authorSort === "az"
          ? {
              href: favoriteHref(type, { ...filters, sort: "recent" }),
              label: "A–Z sıralama",
            }
          : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const hasFilters = activeFilters.length > 0;
  const returnTo = favoriteHref(type, filters);
  const authorReturnPath = returnTo;
  const ratingOptions = type === "author" ? authorRatingOptions : workRatingOptions;
  const resultCount = type === "author" ? authors.length : rows.length;

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace reader-discovery-workdesk">
        <EditorPageHeader
          description="Sonra dönmek istediğiniz eserleri ve yeni yayınlarını takip etmek istediğiniz yazarları burada yönetin."
          eyebrow="Okuma listeniz"
          title="Favorilerim"
        />

        <nav aria-label="Favori türü" className="reader-favorites-tabs">
          <Link
            className={type === "work" ? "button button--primary" : "button button--ghost"}
            href="/favorilerim"
          >
            Eserler
          </Link>
          <Link
            className={type === "author" ? "button button--primary" : "button button--ghost"}
            href="/favorilerim?tip=yazar"
          >
            Yazarlar
          </Link>
        </nav>

        <section className="reader-discovery-console" aria-label="Favoriler filtre masası">
          <header className="reader-discovery-console__header">
            <div>
              <span>Filtre masası</span>
              <strong>
                {type === "author"
                  ? "Favori yazarlarınızı daraltın"
                  : "Favori eserlerinizi daraltın"}
              </strong>
            </div>
            {hasFilters ? <Link href={type === "author" ? "/favorilerim?tip=yazar" : "/favorilerim"}>Tüm filtreleri temizle</Link> : null}
          </header>

          <form className="editor-filters reader-discovery-filters">
            {type === "author" ? <input name="tip" type="hidden" value="yazar" /> : null}
            <label className="reader-discovery-filter--search">
              <span>Arama</span>
              <input
                defaultValue={search}
                name="arama"
                placeholder={type === "author" ? "Yazar, rumuz veya eser ara" : "Eser, yazar veya rumuz ara"}
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
              <span>Hitap yaşı</span>
              <select defaultValue={contentRating ?? ""} name="hitapYasi">
                <option value="">Tümü</option>
                {ratingOptions.map((rating) => (
                  <option key={rating} value={rating}>
                    {workContentRatingDetails[rating].shortLabel}
                  </option>
                ))}
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
              {type === "author" ? (
                <select defaultValue={authorSort} name="siralama">
                  <option value="recent">Son eser yayımlayan</option>
                  <option value="most_works">En çok eşleşen eser</option>
                  <option value="az">A–Z</option>
                </select>
              ) : (
                <select defaultValue={workSort} name="siralama">
                  <option value="newest">En yeni yayımlanan</option>
                  <option value="updated">Son güncellenen</option>
                </select>
              )}
            </label>

            <div className="reader-discovery-filter-actions">
              <button className="button button--primary" type="submit">
                Masayı Güncelle
              </button>
              {hasFilters ? (
                <Link
                  className="button button--ghost"
                  href={type === "author" ? "/favorilerim?tip=yazar" : "/favorilerim"}
                >
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
              {type === "author"
                ? "Tüm favori yazarlarınızı görüyorsunuz."
                : "Tüm favori eserlerinizi görüyorsunuz."}
            </p>
          )}
        </section>

        <section className="reader-discovery-summary" aria-live="polite">
          <span>Masadaki sonuç</span>
          <strong>{resultCount} {type === "author" ? "yazar" : "eser"}</strong>
        </section>

        {type === "work" ? (
          <ReaderWorksTable
            emptyDescription={
              hasFilters
                ? "Filtreleri değiştirerek favori eserleriniz içinde yeniden deneyin."
                : "Keşfet veya eser sayfasından eserleri favorilerinize ekleyerek okuma listenizi oluşturabilirsiniz."
            }
            emptyTitle={hasFilters ? "Eşleşen favori eser bulunamadı" : "Henüz favori eserin yok"}
            returnTo={returnTo}
            rows={rows}
          />
        ) : authors.length > 0 ? (
          <section className="reader-favorite-authors" aria-label="Favori yazarlar">
            {authors.map((author) => {
              const name = author.displayName ?? author.fullName;
              const latest = author.works[0] ?? null;

              return (
                <article className="reader-favorite-author" key={author.publicId}>
                  <div className="reader-favorite-author__identity">
                    <h3>{name}</h3>
                    <p>
                      {author.username ? `@${author.username.replace(/^@/u, "")}` : "İlkOku yazarı"}
                      {` · ${author._count.works} eşleşen eser`}
                    </p>
                    {latest ? (
                      <small className="reader-favorite-author__latest">
                        Son eşleşen eser: {latest.title}
                        {latest.genre ? ` · ${latest.genre}` : ""}
                      </small>
                    ) : null}
                  </div>

                  <div className="reader-favorite-author__actions">
                    <Link
                      className="button button--outline"
                      href={`/yazarlar/${author.publicId}?from=${encodeURIComponent(authorReturnPath)}`}
                    >
                      Yazar vitrini
                    </Link>
                    <form action={toggleReaderAuthorFavoriteAction}>
                      <input
                        name="authorPublicId"
                        type="hidden"
                        value={author.publicId}
                      />
                      <input
                        name="returnPath"
                        type="hidden"
                        value={authorReturnPath}
                      />
                      <button className="button button--ghost" type="submit">
                        Favoriden Çıkar
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="workspace-list-empty">
            <h2>{hasFilters ? "Eşleşen favori yazar bulunamadı" : "Henüz favori yazarın yok"}</h2>
            <p>
              {hasFilters
                ? "Filtreleri değiştirerek favori yazarlarınız içinde yeniden deneyin."
                : "Bir yazarı favorilediğinizde burada görünür; yeni bir eser yayımladığında Bildirimler alanında haber alırsınız."}
            </p>
            {!hasFilters ? (
              <Link className="button button--outline" href="/yazar-kesfet">
                Yazarları keşfet
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
