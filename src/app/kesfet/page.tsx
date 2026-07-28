import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { countWords } from "@/features/editor-workspace/eligibility";
import {
  ReaderWorksTable,
  type ReaderWorkRow,
} from "@/features/reader/components/ReaderWorksTable";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  description: "İlkOku'da yayımlanan eserleri keşfedin.",
  title: "Keşfet | İlkOku",
};

export const dynamic = "force-dynamic";

const completionFilters = ["completed", "ongoing"] as const;
const reviewFilters = [
  "not_requested",
  "requested",
  "in_progress",
  "completed",
] as const;

function includesValue<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return Boolean(value && values.includes(value as T));
}

export default async function ReaderExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    arama?: string;
    dil?: string;
    editor?: string;
    siralama?: string;
    tamamlanma?: string;
    tur?: string;
  }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/kesfet");
  if (profile.role !== "reader" && profile.role !== "editor") {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const parameters = await searchParams;
  const search = parameters.arama?.trim().slice(0, 220);
  const genre = parameters.tur?.trim().slice(0, 120);
  const language = parameters.dil?.trim().slice(0, 10);
  const completion = includesValue(completionFilters, parameters.tamamlanma)
    ? parameters.tamamlanma
    : undefined;
  const reviewStatus = includesValue(reviewFilters, parameters.editor)
    ? parameters.editor
    : undefined;

  const where: Prisma.WorkWhereInput = {
    archivedAt: null,
    publishedAt: { not: null },
    status: "published",
    visibility: "public",
    ...(genre ? { genre } : {}),
    ...(language ? { language } : {}),
    ...(reviewStatus ? { editorReviewStatus: reviewStatus } : {}),
    ...(completion === "completed"
      ? {
          chapters: {
            none: {
              archivedAt: null,
              OR: [{ publishedAt: null }, { status: { not: "published" } }],
            },
            some: {
              archivedAt: null,
              publishedAt: { not: null },
              status: "published",
            },
          },
        }
      : completion === "ongoing"
        ? {
            chapters: {
              some: {
                archivedAt: null,
                OR: [{ publishedAt: null }, { status: { not: "published" } }],
              },
            },
          }
        : {}),
  };

  const works = await prisma.work.findMany({
    where,
    include: {
      author: { select: { displayName: true, fullName: true } },
      chapters: {
        where: { archivedAt: null },
        select: { content: true },
      },
      favorites: {
        where: { userId: profile.id },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: search ? undefined : 48,
  });

  const normalizedSearch = search?.toLocaleLowerCase("tr");
  const filteredWorks = normalizedSearch
    ? works.filter((work) => {
        const authorName = work.author.displayName ?? work.author.fullName;
        return (
          work.title.toLocaleLowerCase("tr").includes(normalizedSearch) ||
          authorName.toLocaleLowerCase("tr").includes(normalizedSearch)
        );
      })
    : works;

  const rows: ReaderWorkRow[] = filteredWorks.slice(0, 48).map((work) => ({
    authorName: work.author.displayName ?? work.author.fullName,
    chapterCount: work.chapters.length,
    commentCount: 0,
    coverUrl: work.coverUrl,
    editorReviewStatus: work.editorReviewStatus,
    favoriteCount: 0,
    genre: work.genre,
    id: work.id,
    isFavorite: work.favorites.length > 0,
    progressPercent: null,
    readerCount: 0,
    readingHref: null,
    slug: work.slug,
    title: work.title,
    totalWords: work.chapters.reduce(
      (total, chapter) => total + countWords(chapter.content),
      0,
    ),
  }));

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Yayımlanan eserleri tür, dil ve editör inceleme durumuna göre bulun."
          eyebrow="Okuma dünyası"
          title="Keşfet"
        />

        <form className="editor-filters">
          <label>
            <span>Arama</span>
            <input
              defaultValue={search}
              name="arama"
              placeholder="Eser veya yazar ara"
              type="search"
            />
          </label>

          <label>
            <span>Tür</span>
            <input defaultValue={genre} name="tur" placeholder="Örn. Roman" />
          </label>

          <label>
            <span>Dil</span>
            <select defaultValue={language ?? ""} name="dil">
              <option value="">Tümü</option>
              <option value="tr">Türkçe</option>
              <option value="en">İngilizce</option>
            </select>
          </label>

          <label>
            <span>Tamamlanma durumu</span>
            <select defaultValue={completion ?? ""} name="tamamlanma">
              <option value="">Tümü</option>
              <option value="completed">Tamamlandı</option>
              <option value="ongoing">Devam ediyor</option>
            </select>
          </label>

          <label>
            <span>Editör durumu</span>
            <select defaultValue={reviewStatus ?? ""} name="editor">
              <option value="">Tümü</option>
              <option value="not_requested">Henüz incelenmedi</option>
              <option value="requested">İnceleme talep edildi</option>
              <option value="in_progress">İncelemede</option>
              <option value="completed">İncelendi</option>
            </select>
          </label>

          <label>
            <span>Sıralama</span>
            <select defaultValue="newest" name="siralama">
              <option value="newest">En Yeni</option>
              <option disabled value="popular">En Çok Okunan</option>
            </select>
          </label>

          <button className="button button--primary" type="submit">
            Sonuçları Göster
          </button>
        </form>

        <ReaderWorksTable
          emptyDescription="Arama ifadenizi veya filtreleri değiştirerek yeniden deneyin."
          emptyTitle="Eşleşen eser bulunamadı"
          returnTo="/kesfet"
          rows={rows}
        />
      </div>
    </AppShell>
  );
}
