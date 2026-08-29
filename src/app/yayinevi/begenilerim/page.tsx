import Link from "next/link";
import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { requirePublisherAnyDiscoveryAccess } from "@/features/publisher-discovery/access";
import {
  getPublisherSavedAuthors,
  normalizePublisherFollowingFilters,
} from "@/features/publisher-discovery/author-saved-query";
import { PublisherLikedWorksTable } from "@/features/publisher-discovery/components/PublisherLikedWorksTable";
import { PublisherSavedAuthorsTable } from "@/features/publisher-discovery/components/PublisherSavedAuthorsTable";
import {
  getPublisherLikedWorks,
  normalizePublisherFavoriteFilters,
} from "@/features/publisher-discovery/favorites-query";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { workContentRatingDetails } from "@/lib/work-content-classification";
import "@/features/publisher-discovery/publisher-discovery.css";

export const metadata: Metadata = {
  description: "Yayınevinizin beğendiği public eserleri ve yazarları listeleyin.",
  title: "Yayınevi Beğendiklerim | İlkOku",
};

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function pageHref(input: {
  contentRating?: string;
  page: number;
  query: string;
  type: "author" | "work";
}) {
  const params = new URLSearchParams();
  if (input.type === "author") params.set("tip", "yazar");
  if (input.query) params.set("arama", input.query);
  if (input.type === "work" && input.contentRating) {
    params.set("hitap", input.contentRating);
  }
  if (input.page > 1) params.set("sayfa", String(input.page));
  const query = params.toString();
  return query
    ? `/yayinevi/begenilerim?${query}`
    : "/yayinevi/begenilerim";
}

export default async function PublisherLikesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePublisherAnyDiscoveryAccess(
    "/yayinevi/begenilerim",
    ["like_work", "like_author"],
  );
  const adultAccess = access.profile.adminPublisherView
    ? { canAccessAdultContent: true, isAdult: true }
    : await getAdultContentAccess(access.profile.id);
  const visibleRatings = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const params = await searchParams;
  const canWork = access.permissions.includes("like_work");
  const canAuthor = access.permissions.includes("like_author");
  const requestedType = firstValue(params.tip) === "yazar" ? "author" : "work";
  const type: "author" | "work" =
    requestedType === "author" && canAuthor
      ? "author"
      : canWork
        ? "work"
        : "author";
  const canMutate = !access.profile.adminPublisherView;
  const canViewPassport = access.permissions.includes("view_authorized_passport");

  const workFilters = normalizePublisherFavoriteFilters(params);
  if (
    workFilters.contentRating === "adult_18" &&
    !adultAccess.canAccessAdultContent
  ) {
    workFilters.contentRating = undefined;
  }
  const authorFilters = normalizePublisherFollowingFilters(params);
  const workData =
    type === "work"
      ? await getPublisherLikedWorks(
          access.publisherId,
          workFilters,
          adultAccess.canAccessAdultContent,
        )
      : null;
  const authorData =
    type === "author"
      ? await getPublisherSavedAuthors(
          access.publisherId,
          authorFilters,
          "like",
        )
      : null;
  const data = workData ?? authorData;

  if (!data) throw new Error("BEGENI_LISTESI_HAZIRLANAMADI");

  const query = type === "work" ? workFilters.query : authorFilters.query;
  const contentRating = type === "work" ? workFilters.contentRating : undefined;
  const returnTo = pageHref({
    contentRating,
    page: data.currentPage,
    query,
    type,
  });

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Yayıneviniz adına beğenilen public eser ve yazarları ayrı listelerde yönetin."
          eyebrow={access.companyName}
          title="Beğendiklerim"
        />

        <nav className="publisher-discovery-filter-actions" aria-label="Beğeni türü">
          {canWork ? (
            <Link
              className={type === "work" ? "button button--primary" : "button button--ghost"}
              href="/yayinevi/begenilerim"
            >
              Eserler
            </Link>
          ) : null}
          {canAuthor ? (
            <Link
              className={type === "author" ? "button button--primary" : "button button--ghost"}
              href="/yayinevi/begenilerim?tip=yazar"
            >
              Yazarlar
            </Link>
          ) : null}
        </nav>

        <form
          className="publisher-discovery-filters publisher-saved-list__filters"
          method="get"
        >
          {type === "author" ? (
            <input name="tip" type="hidden" value="yazar" />
          ) : null}
          <label>
            <span>{type === "work" ? "Eser veya yazar ara" : "Yazar veya eser ara"}</span>
            <input
              defaultValue={query}
              name="arama"
              placeholder={type === "work" ? "Eser adı, tür veya yazar" : "Yazar, public kimlik veya eser"}
              type="search"
            />
          </label>
          {type === "work" ? (
            <label>
              <span>Hitap yaşı</span>
              <select defaultValue={contentRating ?? ""} name="hitap">
                <option value="">Tüm hitap yaşları</option>
                {visibleRatings.map((rating) => (
                  <option key={rating} value={rating}>
                    {workContentRatingDetails[rating].shortLabel}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="publisher-discovery-filter-actions">
            <button className="button button--primary" type="submit">
              Filtrele
            </button>
            {query || contentRating ? (
              <Link
                className="button button--ghost"
                href={type === "author" ? "/yayinevi/begenilerim?tip=yazar" : "/yayinevi/begenilerim"}
              >
                Temizle
              </Link>
            ) : null}
          </div>
        </form>

        <section className="publisher-discovery-summary">
          <div>
            <span>{type === "work" ? "Beğenilen eserler" : "Beğenilen yazarlar"}</span>
            <strong>{data.totalCount} kayıt</strong>
          </div>
          <p>Beğeni kayıtları yayınevi adına tekildir; aynı ekipte ikinci bir beğeni kaydı oluşmaz.</p>
        </section>

        {data.rows.length === 0 ? (
          <section className="publisher-discovery-empty">
            <h2>Beğenilen kayıt bulunmuyor</h2>
            <p>Keşif ekranından beğeni işlemini kullanın.</p>
            <Link
              className="button button--primary"
              href={type === "work" ? "/yayinevi/kesfet/eserler" : "/yayinevi/kesfet/yazarlar"}
            >
              Keşfe git
            </Link>
          </section>
        ) : workData ? (
          <PublisherLikedWorksTable
            canMutate={canMutate}
            canViewPassport={canViewPassport}
            returnTo={returnTo}
            rows={workData.rows}
          />
        ) : authorData ? (
          <PublisherSavedAuthorsTable
            canMutate={canMutate}
            mode="like"
            returnTo={returnTo}
            rows={authorData.rows}
          />
        ) : null}

        <footer className="publisher-discovery-pagination">
          <span>
            {data.totalCount} kayıttan {data.first}–{data.last} arası gösteriliyor.
          </span>
          <div>
            {data.currentPage > 1 ? (
              <Link
                className="button button--ghost"
                href={pageHref({ contentRating, page: data.currentPage - 1, query, type })}
              >
                Önceki
              </Link>
            ) : null}
            <strong>{data.currentPage} / {data.totalPages}</strong>
            {data.currentPage < data.totalPages ? (
              <Link
                className="button button--ghost"
                href={pageHref({ contentRating, page: data.currentPage + 1, query, type })}
              >
                Sonraki
              </Link>
            ) : null}
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
