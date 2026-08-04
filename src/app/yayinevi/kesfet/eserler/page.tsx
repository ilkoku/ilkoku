import Link from "next/link";
import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  requirePublisherDiscoveryAccess,
} from "@/features/publisher-discovery/access";
import { PublisherWorksTable } from "@/features/publisher-discovery/components/PublisherWorksTable";
import { getPublisherWorkLikeIds } from "@/features/publisher-discovery/engagement-query";
import {
  getPublisherWorkDiscovery,
  normalizePublisherWorkDiscoveryFilters,
  type PublisherWorkDiscoveryFilters,
} from "@/features/publisher-discovery/work-query";
import "@/features/publisher-discovery/publisher-discovery.css";

export const metadata: Metadata = {
  description:
    "Yayıneviniz için herkese açık eserleri keşfedin.",
  title:
    "Yayınevi Eser Keşfi | İlkOku",
};

export const dynamic = "force-dynamic";

const reviewLabels = {
  awaiting_second_editor:
    "İkinci editör bekleniyor",
  completed:
    "Editör incelemesi tamamlandı",
  in_progress:
    "İlk editörde",
  not_requested:
    "Henüz incelenmedi",
  requested:
    "İnceleme talep edildi",
  second_in_progress:
    "İkinci editörde",
} as const;

function pageHref(
  filters: PublisherWorkDiscoveryFilters,
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.query) params.set("arama", filters.query);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.language) params.set("dil", filters.language);
  if (filters.completion) {
    params.set("tamamlanma", filters.completion);
  }
  if (filters.reviewStatus) {
    params.set("editor", filters.reviewStatus);
  }
  if (filters.sort !== "newest") {
    params.set("siralama", filters.sort);
  }
  if (page > 1) params.set("sayfa", String(page));

  const query = params.toString();

  return query
    ? `/yayinevi/kesfet/eserler?${query}`
    : "/yayinevi/kesfet/eserler";
}

export default async function PublisherWorkDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}) {
  const access =
    await requirePublisherDiscoveryAccess(
      "/yayinevi/kesfet/eserler",
      "discover_works",
    );
  const filters =
    normalizePublisherWorkDiscoveryFilters(
      await searchParams,
    );
  const data =
    await getPublisherWorkDiscovery(filters);
  const likedWorkIds =
    await getPublisherWorkLikeIds(
      access.publisherId,
      data.rows.map((row) => row.id),
    );
  const canLike =
    !access.profile.adminPublisherView &&
    access.permissions.includes("like_work");
  const hasFilters = Boolean(
    filters.query ||
      filters.genre ||
      filters.language ||
      filters.completion ||
      filters.reviewStatus ||
      filters.sort !== "newest",
  );
  const canViewPassport =
    access.permissions.includes(
      "view_authorized_passport",
    );

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Herkese açık ve yayımlanmış eserleri liste halinde inceleyin; yetkiniz varsa gerçek Eser Pasaportu kayıtlarını workId üzerinden açın."
          eyebrow={access.companyName}
          title="Eser Keşfet"
        />

        <form
          className="publisher-discovery-filters"
          method="get"
        >
          <label>
            <span>Eser veya yazar ara</span>
            <input
              defaultValue={filters.query}
              name="arama"
              placeholder="Eser adı veya yazar"
              type="search"
            />
          </label>

          <label>
            <span>Tür</span>
            <input
              defaultValue={filters.genre}
              name="tur"
              placeholder="Örn. Roman"
            />
          </label>

          <label>
            <span>Dil</span>
            <select
              defaultValue={filters.language}
              name="dil"
            >
              <option value="">Tümü</option>
              <option value="tr">Türkçe</option>
              <option value="en">
                İngilizce
              </option>
            </select>
          </label>

          <label>
            <span>Tamamlanma</span>
            <select
              defaultValue={filters.completion}
              name="tamamlanma"
            >
              <option value="">Tümü</option>
              <option value="completed">
                Tamamlandı
              </option>
              <option value="ongoing">
                Devam ediyor
              </option>
            </select>
          </label>

          <label>
            <span>Editör incelemesi</span>
            <select
              defaultValue={filters.reviewStatus}
              name="editor"
            >
              <option value="">Tümü</option>
              {Object.entries(
                reviewLabels,
              ).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Sıralama</span>
            <select
              defaultValue={filters.sort}
              name="siralama"
            >
              <option value="newest">
                En yeni yayımlanan
              </option>
              <option value="updated">
                Son güncellenen
              </option>
            </select>
          </label>

          <div className="publisher-discovery-filter-actions">
            <button
              className="button button--primary"
              type="submit"
            >
              Filtrele
            </button>

            {hasFilters ? (
              <Link
                className="button button--ghost"
                href="/yayinevi/kesfet/eserler"
              >
                Temizle
              </Link>
            ) : null}
          </div>
        </form>

        <section className="publisher-discovery-summary">
          <div>
            <span>Keşif sonucu</span>
            <strong>
              {data.totalCount} eser
            </strong>
          </div>
          <p>
            Pasaport erişimi özel/tam eser
            içeriği erişiminden ayrıdır.
            Beğeni, favori, takip ve paylaşım
            işlemleri bu revizyonda açılmamıştır.
          </p>
        </section>

        {data.rows.length === 0 ? (
          <section className="publisher-discovery-empty">
            <h2>Eşleşen eser bulunamadı</h2>
            <p>
              Arama veya filtreleri
              değiştirerek yeniden deneyin.
            </p>
          </section>
        ) : (
          <PublisherWorksTable
            canLike={canLike}
            canViewPassport={canViewPassport}
            returnTo={pageHref(
              filters,
              data.currentPage,
            )}
            rows={data.rows}
            likedWorkIds={likedWorkIds}
          />
        )}

        <footer
          aria-label="Eser sayfalama"
          className="publisher-discovery-pagination"
        >
          <span>
            {data.totalCount} eserden{" "}
            {data.first}–{data.last} arası
            gösteriliyor.
          </span>

          <div>
            {data.currentPage > 1 ? (
              <Link
                className="button button--ghost"
                href={pageHref(
                  filters,
                  data.currentPage - 1,
                )}
              >
                Önceki
              </Link>
            ) : null}

            <strong>
              {data.currentPage} /{" "}
              {data.totalPages}
            </strong>

            {data.currentPage <
            data.totalPages ? (
              <Link
                className="button button--ghost"
                href={pageHref(
                  filters,
                  data.currentPage + 1,
                )}
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
