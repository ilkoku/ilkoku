import type { Metadata } from "next";
import Link from "next/link";

import {
  getPublicAuthors,
} from "@/features/public-discovery/library";
import { PublicHubShell } from "@/features/public-discovery/PublicHubShell";

const baseUrl = "https://ilkoku.com";
const title = "Yazarlar | İlkOku";
const description =
  "İlkOku’da keşfe açık Türkçe eseri bulunan yazarları ve yayımlanmış eser vitrinlerini keşfedin.";
const socialImage = "/opengraph-image";

type PublicAuthorsPageProps = {
  searchParams: Promise<{
    arama?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: PublicAuthorsPageProps): Promise<Metadata> {
  const query = await searchParams;

  return {
    title,
    description,
    alternates: {
      canonical: "/yazarlar",
    },
    robots: {
      index: !query.arama,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: "/yazarlar",
      title,
      description,
      images: [{ url: socialImage, alt: "İlkOku yazar keşfi" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

function initials(value: string) {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr-TR");
}

export default async function PublicAuthorsPage({
  searchParams,
}: PublicAuthorsPageProps) {
  const query = await searchParams;
  const search = query.arama?.trim().slice(0, 100) || undefined;
  const authors = await getPublicAuthors(search);
  const returnPath = search
    ? `/yazarlar?arama=${encodeURIComponent(search)}`
    : "/yazarlar";
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "İlkOku yazarları",
    url: `${baseUrl}/yazarlar`,
    inLanguage: "tr-TR",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: authors.map(
        (author, index) => {
          const name =
            author.displayName ?? author.fullName;

          return {
            "@type": "ListItem",
            position: index + 1,
            name,
            url: `${baseUrl}/yazarlar/${author.publicId}`,
          };
        },
      ),
    },
  };

  return (
    <PublicHubShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />

      <main className="public-hub__container">
        <header className="public-hub__hero">
          <p className="public-hub__eyebrow">
            YAZAR VİTRİNLERİ
          </p>
          <h1>Eserden yazara uzanan açık keşif ağı.</h1>
          <p>
            Bu dizin yalnız en az bir keşfe açık Türkçe
            eseri bulunan aktif yazarları gösterir. Boş hesap,
            özel profil ve taslak eser listelenmez.
          </p>
        </header>

        <section
          aria-labelledby="yazar-listesi"
          className="public-hub__section"
        >
          <div className="public-hub__section-heading">
            <h2 id="yazar-listesi">
              Keşfe açık yazarlar
            </h2>
            <span>{authors.length} yazar</span>
          </div>

          <form
            action="/yazarlar"
            className="public-hub__filters public-hub__filters--single"
            method="get"
          >
            <label>
              <span>Yazar ara</span>
              <input
                defaultValue={search}
                maxLength={100}
                name="arama"
                placeholder="Yazar adı veya kullanıcı adı"
                type="search"
              />
            </label>
            <button type="submit">Yazarları getir</button>
            {search ? (
              <Link href="/yazarlar">Aramayı temizle</Link>
            ) : null}
          </form>

          {authors.length > 0 ? (
            <div className="public-hub__grid">
              {authors.map((author) => {
                const name =
                  author.displayName ??
                  author.fullName;

                return (
                  <Link
                    className="public-hub-card"
                    href={`/yazarlar/${author.publicId}?from=${encodeURIComponent(returnPath)}`}
                    key={author.publicId}
                  >
                    <div className="public-hub-card__meta">
                      <span>{initials(name)}</span>
                      <span>
                        {author._count.works} eser
                      </span>
                    </div>
                    <h2>{name}</h2>
                    <p className="public-hub-card__description">
                      Yazarın keşfe açık yayımlanan
                      eserlerini tek vitrinde inceleyin.
                    </p>
                    <span className="public-hub-card__footer">
                      <span />
                      <strong>Yazar vitrini →</strong>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="public-hub__empty">
              <strong>
                {search
                  ? "Bu aramada yayımlayan yazar bulunamadı."
                  : "Henüz keşfe açık yazar vitrini oluşmadı."}
              </strong>
              <p>
                {search
                  ? "Aramayı temizleyerek tüm aktif yazar vitrinlerine dönebilirsiniz."
                  : "Bir yazar ilk keşfe açık eserini yayımladığında vitrini otomatik oluşacak."}
              </p>
              {search ? (
                <Link href="/yazarlar">Tüm yazarları göster</Link>
              ) : (
                <Link href="/nasil-calisir#eser-ilkoku-da-nasil-ilerler">
                  İlkOku’da eser yolculuğunu öğren
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
    </PublicHubShell>
  );
}
