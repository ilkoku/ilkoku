import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  DiscoveryPagination,
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import "@/components/discovery/discovery-filter-desk.css";
import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { requirePublisherDiscoveryAccess } from "@/features/publisher-discovery/access";
import { PublisherSharedItemsList } from "@/features/publisher-discovery/components/PublisherSharedItemsList";
import {
  getPublisherSharedItemsPage,
  normalizePublisherSharedListFilters,
  type PublisherSharedListFilters,
} from "@/features/publisher-discovery/sharing-list-query";
import { getDiscoverySurfaceFilterIds } from "@/lib/discovery-filter-config";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import "@/features/publisher-discovery/publisher-discovery.css";
import "@/features/publisher-discovery/publisher-sharing.css";

export const metadata: Metadata = {
  description:
    "Yayınevi ekibinin sizinle paylaştığı eser ve yazar kayıtlarını görüntüleyin.",
  title: "Benimle Paylaşılanlar | İlkOku",
};

export const dynamic = "force-dynamic";

function pageHref(filters: PublisherSharedListFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("arama", filters.query);
  if (filters.kind === "work") params.set("tip", "eser");
  if (filters.kind === "author") params.set("tip", "yazar");
  if (filters.unreadOnly) params.set("okunma", "okunmamis");
  if (page > 1) params.set("sayfa", String(page));
  const query = params.toString();
  return query ? `/yayinevi/paylasilanlar?${query}` : "/yayinevi/paylasilanlar";
}

export default async function PublisherSharedItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePublisherDiscoveryAccess(
    "/yayinevi/paylasilanlar",
    "view_shared_items",
  );
  const enabledFilterIds = new Set(
    await getDiscoverySurfaceFilterIds("publisher-shared-items"),
  );
  const filters = normalizePublisherSharedListFilters(await searchParams);
  if (!enabledFilterIds.has("search")) filters.query = "";
  if (!enabledFilterIds.has("entityKind")) filters.kind = "all";
  if (!enabledFilterIds.has("unreadOnly")) filters.unreadOnly = false;
  if (access.profile.adminPublisherView) filters.unreadOnly = false;
  const data = await getPublisherSharedItemsPage(access.profile.id, filters);

  if (!data) {
    redirect("/erisim-reddedildi?gerekli=view_shared_items");
  }

  const canViewPassport = access.permissions.includes(
    "view_authorized_passport",
  );
  const activeFilters = [
    filters.query
      ? {
          href: pageHref({ ...filters, page: 1, query: "" }, 1),
          label: `Arama: ${filters.query}`,
        }
      : null,
    filters.kind !== "all"
      ? {
          href: pageHref({ ...filters, kind: "all", page: 1 }, 1),
          label: filters.kind === "work" ? "Tür: Eser" : "Tür: Yazar",
        }
      : null,
    filters.unreadOnly
      ? {
          href: pageHref({ ...filters, page: 1, unreadOnly: false }, 1),
          label: "Yalnız okunmamışlar",
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const hasFilters = activeFilters.length > 0;

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Yayınevi ekibinin size yönlendirdiği ortak Eser ve Yazar Havuzu kayıtlarını tek çalışma masasında inceleyin."
          eyebrow={data.companyName}
          title="Benimle Paylaşılanlar"
        />

        <section aria-label="Paylaşılanlar filtre masası" className="role-filter-desk">
          <header className="role-filter-desk__header">
            <div>
              <span>Filtre masası</span>
              <strong>Paylaşılan kayıtları daraltın</strong>
            </div>
            {hasFilters ? <Link href="/yayinevi/paylasilanlar">Tüm filtreleri temizle</Link> : null}
          </header>

          {enabledFilterIds.size > 0 ? (
            <form className="role-filter-desk__form" method="get">
              {enabledFilterIds.has("search") ? (
                <label className="role-filter-field--search">
                  <span>Arama</span>
                  <input
                    defaultValue={filters.query}
                    name="arama"
                    placeholder="Eser, yazar, paylaşan kişi veya not"
                    type="search"
                  />
                </label>
              ) : null}

              {enabledFilterIds.has("entityKind") ? (
                <label>
                  <span>Kayıt türü</span>
                  <select
                    defaultValue={
                      filters.kind === "work"
                        ? "eser"
                        : filters.kind === "author"
                          ? "yazar"
                          : ""
                    }
                    name="tip"
                  >
                    <option value="">Tümü</option>
                    <option value="eser">Eser</option>
                    <option value="yazar">Yazar</option>
                  </select>
                </label>
              ) : null}

              {!data.adminReadOnly && enabledFilterIds.has("unreadOnly") ? (
                <label>
                  <span>Okunma durumu</span>
                  <select defaultValue={filters.unreadOnly ? "okunmamis" : ""} name="okunma">
                    <option value="">Tümü</option>
                    <option value="okunmamis">Yalnız okunmamışlar</option>
                  </select>
                </label>
              ) : null}

              <div className="role-filter-desk__actions">
                <button className="button button--primary" type="submit">
                  Masayı Güncelle
                </button>
                {hasFilters ? (
                  <Link className="button button--ghost" href="/yayinevi/paylasilanlar">
                    Temizle
                  </Link>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="role-filter-desk__hint">
              Bu yüzeyde Filtre Masası alanları İçerik Yönetimi&apos;nden kapatıldı.
            </p>
          )}

          {hasFilters ? (
            <div aria-label="Aktif filtreler" className="role-filter-desk__active">
              <span>Aktif</span>
              {activeFilters.map((item) => (
                <Link href={item.href} key={`${item.label}-${item.href}`}>
                  {item.label}<b aria-hidden="true">×</b>
                </Link>
              ))}
            </div>
          ) : enabledFilterIds.size > 0 ? (
            <p className="role-filter-desk__hint">
              {data.adminReadOnly
                ? "Admin görünümünde yayınevinin ekip paylaşımları salt okunur gösterilir."
                : "Tüm ekip paylaşımlarınızı görüyorsunuz."}
            </p>
          ) : null}
        </section>

        <DiscoveryResultSummary
          currentPage={data.currentPage}
          noun="paylaşım"
          pageSize={DISCOVERY_PAGE_SIZE}
          totalCount={data.totalCount}
          visibleCount={data.items.length}
        />

        {data.items.length ? (
          <PublisherSharedItemsList
            adminReadOnly={data.adminReadOnly}
            canViewPassport={canViewPassport}
            items={data.items}
          />
        ) : (
          <section className="publisher-discovery-empty">
            <h2>Eşleşen paylaşım bulunmuyor</h2>
            <p>
              Filtreleri değiştirin; ekip üyeleri bir eser veya yazarı sizinle paylaştığında burada görünür.
            </p>
          </section>
        )}

        <DiscoveryPagination
          ariaLabel="Yayınevi paylaşılanlar sayfalama"
          currentPage={data.currentPage}
          hrefForPage={(page) => pageHref(filters, page)}
          totalPages={data.totalPages}
        />
      </div>
    </AppShell>
  );
}
