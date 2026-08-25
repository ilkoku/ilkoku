import type { Metadata } from "next";
import Link from "next/link";

import {
  getPublicAuthors,
} from "@/features/public-discovery/library";
import { PublicHubShell } from "@/features/public-discovery/PublicHubShell";

const baseUrl = "https://ilkoku.com";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yazarlar | İlkOku",
  description:
    "İlkOku’da herkese açık Türkçe eseri bulunan yazarları ve yayımlanmış eserlerini keşfedin.",
  alternates: {
    canonical: "/yazarlar",
  },
};

function initials(value: string) {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr-TR");
}

export default async function PublicAuthorsPage() {
  const authors = await getPublicAuthors();
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
            Bu dizin yalnız en az bir herkese açık Türkçe
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
              Yayımlayan yazarlar
            </h2>
            <span>{authors.length} yazar</span>
          </div>

          {authors.length > 0 ? (
            <div className="public-hub__grid">
              {authors.map((author) => {
                const name =
                  author.displayName ??
                  author.fullName;

                return (
                  <Link
                    className="public-hub-card"
                    href={`/yazarlar/${author.publicId}`}
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
                      Yazarın herkese açık yayımlanan
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
                Henüz public yazar vitrini oluşmadı.
              </strong>
              <p>
                Bir yazar ilk herkese açık eserini
                yayımladığında vitrini otomatik oluşacak.
              </p>
              <Link href="/nasil-calisir#eser-ilkoku-da-nasil-ilerler">
                İlkOku’da eser yolculuğunu öğren
              </Link>
            </div>
          )}
        </section>
      </main>
    </PublicHubShell>
  );
}
