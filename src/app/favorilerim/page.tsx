import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  getReaderFavoriteAuthors,
  toggleReaderAuthorFavoriteAction,
} from "@/features/reader/author-favorites";
import { ReaderWorksTable } from "@/features/reader/components/ReaderWorksTable";
import { getFavoriteWorks } from "@/features/reader/favorites";
import "../yazarlar/reader-author-favorites.css";

export const metadata: Metadata = {
  description: "Favori eserlerinizi ve yazarlarınızı görüntüleyin.",
  title: "Favorilerim | İlkOku",
};

export const dynamic = "force-dynamic";

export default async function ReaderFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ tip?: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/favorilerim");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const params = await searchParams;
  const type = params.tip === "yazar" ? "author" : "work";
  const works = type === "work" ? await getFavoriteWorks(profile.id) : [];
  const authors =
    type === "author" ? await getReaderFavoriteAuthors(profile.id) : [];
  const rows = works.map((work) => ({
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
  const authorReturnPath = "/favorilerim?tip=yazar";

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
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

        {type === "work" ? (
          <ReaderWorksTable
            emptyDescription="Keşfet veya eser sayfasından eserleri favorilerine ekleyerek okuma listeni oluşturabilirsin."
            emptyTitle="Henüz favori eserin yok"
            returnTo="/favorilerim"
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
                      {` · ${author._count.works} keşfe açık eser`}
                    </p>
                    {latest ? (
                      <small className="reader-favorite-author__latest">
                        Son eser: {latest.title}
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
            <h2>Henüz favori yazarın yok</h2>
            <p>
              Bir yazarı favorilediğinde burada görünür; yeni bir eser yayımladığında Bildirimler alanında haber alırsın.
            </p>
            <Link className="button button--outline" href="/yazar-kesfet">
              Yazarları keşfet
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
