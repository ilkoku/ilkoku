import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import {
  getPublicWorkLibrary,
  PUBLIC_WORK_PAGE_SIZE,
  publicWorkSorts,
  type PublicWorkLibraryFilters,
  type PublicWorkSort,
} from "@/features/public-discovery/library";
import { publicTaxonomySlug } from "@/lib/public-taxonomy";
import { workContentRatingDetails } from "@/lib/work-content-classification";

import "./public-library.css";

const baseUrl = "https://ilkoku.com";
const pageTitle = "Eserleri Keşfet | İlkOku";
const pageDescription =
  "İlkOku'da keşfe açık Türkçe eser vitrinlerini tür, yazar ve güncellik bilgileriyle keşfedin.";

type PublicLibraryPageProps = {
  searchParams: Promise<{
    arama?: string;
    sayfa?: string;
    siralama?: string;
    tur?: string;
  }>;
};

function isPublicWorkSort(value: string | undefined): value is PublicWorkSort {
  return Boolean(
    value &&
      publicWorkSorts.includes(value as PublicWorkSort),
  );
}

function normalizeFilters(
  parameters: Awaited<PublicLibraryPageProps["searchParams"]>,
): PublicWorkLibraryFilters {
  const search = parameters.arama?.trim().slice(0, 100);
  const genre = parameters.tur?.trim().slice(0, 120);

  return {
    genre: genre || undefined,
    search: search || undefined,
    sort: isPublicWorkSort(parameters.siralama)
      ? parameters.siralama
      : "newest",
  };
}

function parseRequestedPage(value: string | undefined) {
  const page = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.min(page, 10_000);
}

function pageHref(
  filters: PublicWorkLibraryFilters,
  page: number,
) {
  const parameters = new URLSearchParams();

  if (filters.search) {
    parameters.set("arama", filters.search);
  }

  if (filters.genre) {
    parameters.set("tur", filters.genre);
  }

  if (filters.sort !== "newest") {
    parameters.set("siralama", filters.sort);
  }

  if (page > 1) {
    parameters.set("sayfa", String(page));
  }

  const query = parameters.toString();

  return query ? `/eserler?${query}` : "/eserler";
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Yayın tarihi belirtilmedi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(value);
}

function shortDescription(value: string | null) {
  const description =
    value?.replace(/\s+/gu, " ").trim() ||
    "Eserin tanıtım metni henüz eklenmedi.";

  return description.length > 190
    ? `${description.slice(0, 187).trimEnd()}...`
    : description;
}

function hasDiscoveryParameters(
  parameters: Awaited<PublicLibraryPageProps["searchParams"]>,
) {
  return Boolean(
    parameters.arama ||
      parameters.sayfa ||
      parameters.siralama ||
      parameters.tur,
  );
}

export async function generateMetadata({
  searchParams,
}: PublicLibraryPageProps): Promise<Metadata> {
  const parameters = await searchParams;
  const filtered = hasDiscoveryParameters(parameters);

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: "/eserler",
      languages: {
        "tr-TR": "/eserler",
        "x-default": "/eserler",
      },
      types: {
        "application/rss+xml": `${baseUrl}/eserler/rss.xml`,
      },
    },
    robots: {
      index: !filtered,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: "/eserler",
      title: pageTitle,
      description: pageDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function PublicWorkLibraryPage({
  searchParams,
}: PublicLibraryPageProps) {
  const parameters = await searchParams;
  const filters = normalizeFilters(parameters);
  const requestedPage = parseRequestedPage(parameters.sayfa);
  const library = await getPublicWorkLibrary(
    filters,
    requestedPage,
  );
  const currentPath = pageHref(filters, library.currentPage);
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "İlkOku keşfe açık eserler",
    description: pageDescription,
    url: `${baseUrl}/eserler`,
    inLanguage: "tr-TR",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: library.works.length,
      itemListElement: library.works.map(
        (work, index) => ({
          "@type": "ListItem",
          position:
            (library.currentPage - 1) *
              PUBLIC_WORK_PAGE_SIZE +
            index +
            1,
          url: `${baseUrl}/kitap/${work.slug}`,
          name: work.title,
        }),
      ),
    },
  };

  return (
    <div className="public-library">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />

      <a className="public-library__skip" href="#eser-listesi">
        Eser listesine geç
      </a>

      <header className="public-library__header">
        <div className="public-library__container public-library__header-inner">
          <Link
            className="public-library__logo"
            href="/"
            aria-label="İlkOku ana sayfa"
          >
            <Image
              src={logo}
              alt="İlkOku"
              priority
              sizes="(max-width: 640px) 132px, 164px"
            />
          </Link>

          <nav aria-label="Genel gezinme">
            <Link aria-current="page" href="/eserler">
              Eserler
            </Link>
            <Link href="/yazarlar">Yazarlar</Link>
            <Link href="/turler">Türler</Link>
            <Link href="/nasil-calisir">Nasıl Çalışır</Link>
          </nav>

          <div className="public-library__account">
            <Link href="/giris">Giriş Yap</Link>
            <Link href="/kayit?rol=reader">Üye Ol</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="public-library__hero">
          <div className="public-library__container public-library__hero-grid">
            <div>
              <p className="public-library__eyebrow">
                KEŞFE AÇIK ESER KÜTÜPHANESİ
              </p>
              <h1>Yeni bir hikâyenin ilk okuru ol.</h1>
              <p>
                Yazarların keşfe açtığı eser vitrinlerini
                kayıt olmadan incele ve türüne göre süz.
                Bölüm okumaları ücretsiz üyelik veya giriş
                sonrasında açılır.
              </p>
            </div>

            <aside aria-label="Kütüphane yayın ilkeleri">
              <strong>Gerçek yayın yüzeyi</strong>
              <span>
                Yalnızca aktif yazarlara ait, Türkçe,
                yayımlanmış ve keşfe açık eserler listelenir.
              </span>
              <span>
                Taslak, özel ve arşivlenmiş çalışmalar keşfe
                çıkmaz; bölüm metni okumak için oturum gerekir.
              </span>
            </aside>
          </div>
        </section>

        <nav
          aria-label="Eser keşif yolları"
          className="public-library__routes"
        >
          <div className="public-library__container">
            <Link href="/eserler/yeni">
              <strong>Yeni yayımlananlar</strong>
              <span>Yayın tarihine göre keşfet →</span>
            </Link>
            <Link href="/eserler/guncellenen">
              <strong>Son güncellenenler</strong>
              <span>Yakın zamanda değişen eserler →</span>
            </Link>
            <Link href="/yazarlar">
              <strong>Yazarlar</strong>
              <span>Yazarların keşfe açık eserleri →</span>
            </Link>
            <Link href="/turler">
              <strong>Türler</strong>
              <span>Gerçek yayınların tür dizini →</span>
            </Link>
          </div>
        </nav>

        <section
          className="public-library__catalog"
          id="eser-listesi"
          aria-labelledby="eser-listesi-basligi"
        >
          <div className="public-library__container">
            <div className="public-library__section-heading">
              <div>
                <p className="public-library__eyebrow">
                  KEŞFET
                </p>
                <h2 id="eser-listesi-basligi">
                  Keşfe açık eserler
                </h2>
              </div>
              <span>
                {library.totalCount} eser
              </span>
            </div>

            <form
              action="/eserler"
              className="public-library__filters"
              method="get"
            >
              <label>
                <span>Eser veya yazar ara</span>
                <input
                  defaultValue={filters.search}
                  maxLength={100}
                  name="arama"
                  placeholder="Başlık, tanıtım veya yazar"
                  type="search"
                />
              </label>

              <label>
                <span>Tür</span>
                <select
                  defaultValue={filters.genre ?? ""}
                  name="tur"
                >
                  <option value="">Tüm türler</option>
                  {library.genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
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
                    En yeni yayınlanan
                  </option>
                  <option value="updated">
                    Son güncellenen
                  </option>
                </select>
              </label>

              <button type="submit">Eserleri getir</button>

              {filters.search ||
              filters.genre ||
              filters.sort !== "newest" ? (
                <Link href="/eserler">Filtreleri temizle</Link>
              ) : null}
            </form>

            {library.works.length > 0 ? (
              <div className="public-library__grid">
                {library.works.map((work) => {
                  const authorName =
                    work.author.displayName ??
                    work.author.fullName;
                  const genre = work.genre ?? "Eser";
                  const bookHref = `/kitap/${work.slug}?from=${encodeURIComponent(currentPath)}`;
                  const authorHref = `/yazarlar/${work.author.publicId}?from=${encodeURIComponent(currentPath)}`;
                  const genreHref = work.genre
                    ? `/turler/${publicTaxonomySlug(work.genre)}?from=${encodeURIComponent(currentPath)}`
                    : null;

                  return (
                    <article
                      className="public-library-card"
                      key={work.slug}
                    >
                      <div
                        className="public-library-card__cover"
                        aria-hidden="true"
                      >
                        <span>{genre}</span>
                        <strong>
                          {work.title.slice(0, 1).toLocaleUpperCase(
                            "tr-TR",
                          )}
                        </strong>
                      </div>

                      <div className="public-library-card__body">
                        <div className="public-library-card__meta">
                          {genreHref ? (
                            <Link href={genreHref}>
                              {genre}
                            </Link>
                          ) : (
                            <span>{genre}</span>
                          )}
                          <span>
                            {workContentRatingDetails[work.contentRating].shortLabel}
                          </span>
                          <span>
                            {work._count.chapters} bölüm
                          </span>
                        </div>

                        <h3>
                          <Link href={bookHref}>
                            {work.title}
                          </Link>
                        </h3>

                        {work.subtitle ? (
                          <p className="public-library-card__subtitle">
                            {work.subtitle}
                          </p>
                        ) : null}

                        <p className="public-library-card__author">
                          <Link href={authorHref}>
                            {authorName}
                          </Link>
                        </p>
                        <p className="public-library-card__description">
                          {shortDescription(work.description)}
                        </p>

                        <div className="public-library-card__footer">
                          <time
                            dateTime={
                              work.publishedAt?.toISOString() ??
                              undefined
                            }
                          >
                            {formatDate(work.publishedAt)}
                          </time>
                          <Link
                            className="public-library-card__link"
                            href={bookHref}
                          >
                            Eseri incele
                            <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="public-library__empty">
                <strong>
                  Bu ölçütlerde keşfe açık eser bulunamadı.
                </strong>
                <p>
                  Yeni yayınlar eklendiğinde bu katalog ve
                  sitemap otomatik güncellenir.
                </p>
                {filters.search || filters.genre ? (
                  <Link href="/eserler">
                    Tüm keşfe açık eserleri göster
                  </Link>
                ) : (
                  <Link href="/kayit?rol=writer">
                    İlk eserini yayımlamaya başla
                  </Link>
                )}
              </div>
            )}

            {library.totalPages > 1 ? (
              <nav
                className="public-library__pagination"
                aria-label="Eser sayfaları"
              >
                {library.currentPage > 1 ? (
                  <Link
                    href={pageHref(
                      filters,
                      library.currentPage - 1,
                    )}
                    rel="prev"
                  >
                    ← Önceki
                  </Link>
                ) : (
                  <span aria-disabled="true">← Önceki</span>
                )}

                <strong>
                  {library.currentPage} / {library.totalPages}
                </strong>

                {library.currentPage <
                library.totalPages ? (
                  <Link
                    href={pageHref(
                      filters,
                      library.currentPage + 1,
                    )}
                    rel="next"
                  >
                    Sonraki →
                  </Link>
                ) : (
                  <span aria-disabled="true">Sonraki →</span>
                )}
              </nav>
            ) : null}
          </div>
        </section>

        <section className="public-library__how">
          <div className="public-library__container">
            <p className="public-library__eyebrow">
              İLKOKU’DA KEŞİF
            </p>
            <h2>Eserden bölüme açık ve anlaşılır yol</h2>
            <div>
              <article>
                <span>01</span>
                <h3>Eseri keşfet</h3>
                <p>
                  Başlık, tanıtım, tür, yazar ve yayın
                  tarihini kayıt olmadan gör.
                </p>
              </article>
              <article>
                <span>02</span>
                <h3>Yayımlanan bölümü oku</h3>
                <p>
                  Yazarın yayımladığı bölümlere ücretsiz
                  okuyucu hesabıyla kalıcı eser bağlantısından ulaş.
                </p>
              </article>
              <article>
                <span>03</span>
                <h3>Topluluğa katıl</h3>
                <p>
                  Okuma ilerlemesi, favori ve geri bildirim
                  araçları için okuyucu hesabı oluştur.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="public-library__footer">
        <div className="public-library__container">
          <p>
            <strong>İlkOku</strong>
            <span>
              İlk cümle, ilk okurun, ilk adımın.
            </span>
          </p>
          <nav aria-label="Alt gezinme">
            <Link href="/eserler">Eserler</Link>
            <Link href="/yazarlar">Yazarlar</Link>
            <Link href="/turler">Türler</Link>
            <Link href="/nasil-calisir">Nasıl Çalışır</Link>
            <Link href="/yardim">Yardım</Link>
            <Link href="/yasal/gizlilik-politikasi">
              Gizlilik
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
