import type { Metadata } from "next";
import Link from "next/link";

import { getPublicGenres } from "@/features/public-discovery/library";
import { normalizeGenreLabel } from "@/lib/genre-system";
import { publicTaxonomySlug } from "@/lib/public-taxonomy";
import { SITE_MAP_PAGES, type SiteMapPage } from "@/lib/cms-header-navigation";
import { loadPublishedCmsSiteMapPages } from "@/lib/cms-header-navigation-server";
import { prisma } from "@/lib/prisma";
import { isSearchIndexExcludedPublicWorkSlug } from "@/lib/public-content-safety";
import { publicLegalLinks } from "@/lib/public-site-navigation";

const baseUrl = "https://ilkoku.com";
const title = "Site Haritası | İlkOku";
const description =
  "İlkOku'nun herkese açık platform, Kitap Endeksi, eğitim, güven, destek, yasal ve yayımlanmış eser sayfalarına tek yerden ulaşın.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/site-haritasi" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/site-haritasi",
    title,
    description,
    images: [{ url: "/og/ilkoku-social-selected-2026.webp", alt: "İlkOku Site Haritası" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og/ilkoku-social-selected-2026.webp"],
  },
};

export const revalidate = 300;

type PublicWorkLink = {
  href: string;
  label: string;
};

type LinkGroup = {
  id: string;
  title: string;
  links: Array<{ href: string; label: string }>;
};

// The published registration agreement is an indexable public legal page.
const siteMapLegalLinks = [
  ...publicLegalLinks,
  { href: "/uyelik-sozlesmesi", label: "Üyelik Sözleşmesi" },
] as const;

function groupedSitePages(pages: readonly SiteMapPage[]): LinkGroup[] {
  const groups = new Map<string, LinkGroup>();

  for (const page of pages) {
    if (page.indexable === false) continue;
    const id = `${page.area}:${page.group}`;
    const existing = groups.get(id);
    const link = { href: page.href, label: page.label };

    if (existing) {
      if (!existing.links.some((item) => item.href === page.href)) existing.links.push(link);
      continue;
    }

    groups.set(id, {
      id,
      title: page.group === page.area ? page.area : `${page.area} · ${page.group}`,
      links: [link],
    });
  }

  return [...groups.values()];
}

type PublicDiscoveryLinks = {
  works: PublicWorkLink[];
  authors: PublicWorkLink[];
  genres: PublicWorkLink[];
};

async function getPublicDiscoveryLinks(): Promise<PublicDiscoveryLinks> {
  try {
    const [works, genres] = await Promise.all([
      prisma.work.findMany({
        where: {
          archivedAt: null,
          contentRating: { not: "adult_18" },
          author: { is: { deletedAt: null, status: "active" } },
          isActive: true,
          language: "tr",
          publishedAt: { not: null },
          status: "published",
          visibility: "public",
        },
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
        select: {
          slug: true,
          title: true,
          genre: true,
          author: { select: { publicId: true, displayName: true, fullName: true } },
        },
        take: 5_000,
      }),
      getPublicGenres(),
    ]);

    // Mirror the XML sitemap: demo/test-only works must not seed crawlable
    // author or genre landing links, even when the public fixtures remain readable.
    const eligibleWorks = works.filter(
      (work) => !isSearchIndexExcludedPublicWorkSlug(work.slug),
    );
    const authors = new Map<string, string>();
    const eligibleGenreSlugs = new Set<string>();

    for (const work of eligibleWorks) {
      if (!authors.has(work.author.publicId)) {
        authors.set(
          work.author.publicId,
          work.author.displayName?.trim() || work.author.fullName?.trim() || work.author.publicId,
        );
      }
      const label = normalizeGenreLabel(work.genre);
      if (label) eligibleGenreSlugs.add(publicTaxonomySlug(label));
    }

    return {
      works: eligibleWorks.map((work) => ({
        href: "/kitap/" + work.slug,
        label: work.title,
      })),
      authors: [...authors].map(([publicId, label]) => ({
        href: "/yazarlar/" + publicId,
        label,
      })),
      genres: genres
        .filter((genre) => eligibleGenreSlugs.has(genre.slug))
        .map((genre) => ({
          href: "/turler/" + genre.slug,
          label: genre.label,
        })),
    };
  } catch {
    return { works: [], authors: [], genres: [] };
  }
}

export default async function PublicSiteMapPage() {
  const [cmsPages, publicDiscovery] = await Promise.all([
    loadPublishedCmsSiteMapPages(),
    getPublicDiscoveryLinks(),
  ]);
  const publicWorks = publicDiscovery.works;

  const codeOwnedPages = SITE_MAP_PAGES.filter(
    (page) => page.indexable !== false,
  );
  const knownHrefs = new Set([
    ...codeOwnedPages.map((page) => page.href),
    ...siteMapLegalLinks.map((link) => link.href),
  ]);

  const cmsOnlyPages = cmsPages
    .filter(
      (page) =>
        page.indexable !== false
        && !knownHrefs.has(page.href),
    )
    .map((page) => ({ href: page.href, label: page.label }));

  const groups = groupedSitePages(codeOwnedPages);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    inLanguage: "tr-TR",
    url: `${baseUrl}/site-haritasi`,
    isPartOf: { "@type": "WebSite", name: "İlkOku", url: baseUrl },
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />

      <header className="max-w-4xl">
        <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">
          Herkese açık keşif merkezi
        </span>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.04em] text-[#211746] sm:text-5xl">
          Site Haritası
        </h1>
        <p className="mt-5 text-base leading-8 text-[#625b6d] sm:text-lg">
          İlkOku&apos;nun herkese açık platform sayfalarına, Kitap Endeksi&apos;ne, yazarlık ve
          okurluk eğitimlerine, editörlük okuluna, güven, destek ve yasal bilgilere tek yerden ulaş.
          Aşağıdaki bağlantılar güncel herkese açık içerik alanlarını doğrudan birbirine bağlar.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {groups.map((group) => (
          <section
            className="rounded-[1.8rem] border border-black/[0.07] bg-white p-6 shadow-[0_14px_44px_rgba(34,23,70,0.05)] sm:p-7"
            key={group.id}
          >
            <h2 className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#211746]">
              {group.title}
            </h2>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    className="block rounded-xl border border-[#6b52c7]/12 bg-[#f7f4ff] px-4 py-3 text-sm font-bold leading-6 transition hover:border-[#6b52c7]/30 hover:bg-[#ebe5ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b52c7]"
                    style={{ color: "#3f3657" }}
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="rounded-[1.8rem] border border-black/[0.07] bg-white p-6 shadow-[0_14px_44px_rgba(34,23,70,0.05)] sm:p-7">
          <h2 className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#211746]">Yasal</h2>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {siteMapLegalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  className="block rounded-xl border border-[#6b52c7]/12 bg-[#f7f4ff] px-4 py-3 text-sm font-bold leading-6 transition hover:border-[#6b52c7]/30 hover:bg-[#ebe5ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b52c7]"
                    style={{ color: "#3f3657" }}
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {cmsOnlyPages.length > 0 ? (
          <section className="rounded-[1.8rem] border border-black/[0.07] bg-white p-6 shadow-[0_14px_44px_rgba(34,23,70,0.05)] sm:p-7">
            <h2 className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#211746]">
              Diğer yayımlanmış sayfalar
            </h2>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {cmsOnlyPages.map((link) => (
                <li key={link.href}>
                  <Link
                    className="block rounded-xl border border-[#6b52c7]/12 bg-[#f7f4ff] px-4 py-3 text-sm font-bold leading-6 transition hover:border-[#6b52c7]/30 hover:bg-[#ebe5ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b52c7]"
                    style={{ color: "#3f3657" }}
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {publicDiscovery.authors.length > 0 ? (
          <section className="rounded-[1.8rem] border border-black/[0.07] bg-white p-6 shadow-[0_14px_44px_rgba(34,23,70,0.05)] sm:p-7">
            <h2 className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#211746]">Yazarlar</h2>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {publicDiscovery.authors.map((link) => (
                <li key={link.href}>
                  <Link prefetch={false} href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {publicDiscovery.genres.length > 0 ? (
          <section className="rounded-[1.8rem] border border-black/[0.07] bg-white p-6 shadow-[0_14px_44px_rgba(34,23,70,0.05)] sm:p-7">
            <h2 className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#211746]">Türler</h2>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {publicDiscovery.genres.map((link) => (
                <li key={link.href}>
                  <Link prefetch={false} href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {publicWorks.length > 0 ? (
          <section className="rounded-[1.8rem] border border-[#6b52c7]/12 bg-[#f2efff] p-6 shadow-[0_14px_44px_rgba(91,53,221,0.06)] sm:p-7 lg:col-span-2">
            <h2 className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#211746]">
              Yayımlanmış eserler
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#625b6d]">
              Arama motorlarına açık, yayında olan eser sayfaları.
            </p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {publicWorks.map((link) => (
                <li key={link.href}>
                  <Link
                    className="block rounded-xl border border-[#6b52c7]/14 bg-white px-4 py-3 text-sm font-bold leading-6 transition hover:border-[#6b52c7]/35 hover:bg-[#f8f6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b52c7]"
                    style={{ color: "#3f3657" }}
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
