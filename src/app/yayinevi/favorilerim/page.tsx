import Link from "next/link";
import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  requirePublisherAnyDiscoveryAccess,
} from "@/features/publisher-discovery/access";
import {
  getPublisherSavedAuthors,
  normalizePublisherFollowingFilters,
} from "@/features/publisher-discovery/author-saved-query";
import { PublisherFavoriteWorksTable } from "@/features/publisher-discovery/components/PublisherFavoriteWorksTable";
import { PublisherSavedAuthorsTable } from "@/features/publisher-discovery/components/PublisherSavedAuthorsTable";
import {
  getPublisherFavoriteWorks,
  normalizePublisherFavoriteFilters,
} from "@/features/publisher-discovery/work-favorites-query";
import "@/features/publisher-discovery/publisher-discovery.css";

export const metadata: Metadata = {
  description:
    "Yayınevinizin favorilediği public eserleri ve yazarları listeleyin.",
  title: "Yayınevi Favorilerim | İlkOku",
};

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function pageHref(input: {
  page: number;
  query: string;
  type: "author" | "work";
}) {
  const params = new URLSearchParams();
  if (input.type === "author") params.set("tip", "yazar");
  if (input.query) params.set("arama", input.query);
  if (input.page > 1) params.set("sayfa", String(input.page));
  const query = params.toString();
  return query
    ? `/yayinevi/favorilerim?${query}`
    : "/yayinevi/favorilerim";
}

export default async function PublisherFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePublisherAnyDiscoveryAccess(
    "/yayinevi/favorilerim",
    ["favorite_work", "favorite_author"],
  );
  const params = await searchParams;
  const canWork = access.permissions.includes("favorite_work");
  const canAuthor = access.permissions.includes("favorite_author");
  const requestedType = firstValue(params.tip) === "yazar"
    ? "author"
    : "work";
  const type: "author" | "work" =
    requestedType === "author" && canAuthor
      ? "author"
      : canWork
        ? "work"
        : "author";
  const canMutate = !access.profile.adminPublisherView;
  const canViewPassport = access.permissions.includes(
    "view_authorized_passport",
  );

  const workFilters = normalizePublisherFavoriteFilters(params);
  const authorFilters = normalizePublisherFollowingFilters(params);
  const data =
    type === "work"
      ? await getPublisherFavoriteWorks(access.publisherId, workFilters)
      : await getPublisherSavedAuthors(
          access.publisherId,
          authorFilters,
          "favorite",
        );
  const query =
    type === "work"
      ? workFilters.query
      : authorFilters.query;
  const returnTo = pageHref({
    page: data.currentPage,
    query,
    type,
  });

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Yayınevinizin kurumsal favorilerine eklediği public eser ve yazarları ayrı listelerde yönetin."
          eyebrow={access.companyName}
          title="Favorilerim"
        />

        <nav className="publisher-discovery-filter-actions" aria-label="Favori türü">
          {canWork ? (
            <Link
              className={type === "work" ? "button button--primary" : "button button--ghost"}
              href="/yayinevi/favorilerim"
            >
              Eserler
            </Link>
          ) : null}
          {canAuthor ? (
            <Link
              className={type === "author" ? "button button--primary" : "button button--ghost"}
              href="/yayinevi/favorilerim?tip=yazar"
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
          <div className="publisher-discovery-filter-actions">
            <button className="button button--primary" type="submit">
              Filtrele
            </button>
            {query ? (
              <Link
                className="button button--ghost"
                href={type === "author" ? "/yayinevi/favorilerim?tip=yazar" : "/yayinevi/favorilerim"}
              >
                Temizle
              </Link>
            ) : null}
          </div>
        </form>

        <section className="publisher-discovery-summary">
          <div>
            <span>{type === "work" ? "Favori eserler" : "Favori yazarlar"}</span>
            <strong>{data.totalCount} kayıt</strong>
          </div>
          <p>Favoriler beğenilerden ayrı tutulur ve aynı yayınevi adına tekil kaydedilir.</p>
        </section>

        {data.rows.length === 0 ? (
          <section className="publisher-discovery-empty">
            <h2>Favori kayıt bulunmuyor</h2>
            <p>Keşif ekranından favoriye ekleme işlemini kullanın.</p>
            <Link
              className="button button--primary"
              href={type === "work" ? "/yayinevi/kesfet/eserler" : "/yayinevi/kesfet/yazarlar"}
            >
              Keşfe git
            </Link>
          </section>
        ) : type === "work" ? (
          <PublisherFavoriteWorksTable
            canMutate={canMutate}
            canViewPassport={canViewPassport}
            returnTo={returnTo}
            rows={data.rows}
          />
        ) : (
          <PublisherSavedAuthorsTable
            canMutate={canMutate}
            mode="favorite"
            returnTo={returnTo}
            rows={data.rows}
          />
        )}

        <footer className="publisher-discovery-pagination">
          <span>
            {data.totalCount} kayıttan {data.first}–{data.last} arası gösteriliyor.
          </span>
          <div>
            {data.currentPage > 1 ? (
              <Link
                className="button button--ghost"
                href={pageHref({ page: data.currentPage - 1, query, type })}
              >
                Önceki
              </Link>
            ) : null}
            <strong>{data.currentPage} / {data.totalPages}</strong>
            {data.currentPage < data.totalPages ? (
              <Link
                className="button button--ghost"
                href={pageHref({ page: data.currentPage + 1, query, type })}
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
