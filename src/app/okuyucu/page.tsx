import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { getContinueReadingForMember } from "@/features/reading/continue-reading";
import { getCompletedReading } from "@/features/reading/progress";
import { getAdultContentAccess } from "@/lib/adult-content-access";
import { prisma } from "@/lib/prisma";
import { workContentRatingDetails } from "@/lib/work-content-classification";
import { ReaderShelfTabs } from "./ReaderShelfTabs";
import "./reader-workdesk-cleanup.css";
import "./reader-workdesk.css";

export const metadata: Metadata = {
  title: "Okuyucu Ana Sayfa | İlkOku",
};

export const dynamic = "force-dynamic";

const emptyMessages = {
  continueReading: {
    description:
      "Bir eseri açtığında son kaldığın bölüm burada masanın üstüne gelir.",
    title: "Okuma masan şu an boş",
  },
  editorCompleted: {
    description:
      "Profesyonel editör incelemesi tamamlanan eserler burada yer alacak.",
    title: "Henüz incelenmiş eser bulunmuyor",
  },
  editorInProgress: {
    description:
      "Profesyonel editör incelemesine alınan eserler burada yer alacak.",
    title: "Henüz incelemedeki eser bulunmuyor",
  },
  completed: {
    description:
      "Bir eserin son bölümünü tamamladığında eser burada görünecek.",
    title: "Henüz tamamladığın bir eser yok",
  },
  newWorks: {
    description: "Yayımlanan yeni eserler burada yer alacak.",
    title: "Henüz yeni eser bulunmuyor",
  },
} as const;

export default async function ReaderHomePage() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/okuyucu");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const adultAccess = await getAdultContentAccess(profile.id);

  const [publishedRecords, readingProgressRecords, completedReadingRecords] =
    await Promise.all([
      prisma.work.findMany({
        where: commonDiscoveryWorkWhereFor(adultAccess.canAccessAdultContent),
        orderBy: { createdAt: "desc" },
        select: {
          author: {
            select: { displayName: true, fullName: true },
          },
          chapters: {
            where: {
              archivedAt: null,
              publishedAt: { not: null },
              status: "published",
            },
            orderBy: { position: "asc" },
            select: { id: true, position: true },
          },
          contentRating: true,
          editorReviewStatus: true,
          favorites: {
            where: { userId: profile.id },
            select: { id: true },
            take: 1,
          },
          genre: true,
          id: true,
          slug: true,
          title: true,
        },
        take: 24,
      }),
      getContinueReadingForMember(profile.id, 6),
      getCompletedReading(profile.id, 6),
    ]);

  type HomeWork = {
    author: { displayName: string | null; fullName: string };
    chapters: Array<{ id: string; position: number }>;
    contentRating: (typeof publishedRecords)[number]["contentRating"];
    editorReviewStatus:
      (typeof publishedRecords)[number]["editorReviewStatus"];
    genre: string | null;
    id: string;
    isFavorite: boolean;
    readingProgress: {
      chapterPosition: number;
      progressPercent: number;
    } | null;
    readingState: "unread" | "in_progress" | "completed";
    slug: string;
    title: string;
  };

  const progressWorkIds = new Set(
    readingProgressRecords.map((progress) => progress.work.id),
  );
  const completedWorkIds = new Set(
    completedReadingRecords.map((progress) => progress.work.id),
  );

  const publishedWorks: HomeWork[] = publishedRecords
    .filter(
      (work) =>
        !progressWorkIds.has(work.id) && !completedWorkIds.has(work.id),
    )
    .map((work) => ({
      ...work,
      isFavorite: work.favorites.length > 0,
      readingProgress: null,
      readingState: "unread",
    }));

  const continueReadingWorks: HomeWork[] = readingProgressRecords.map(
    (progress) => ({
      author: progress.work.author,
      chapters: progress.work.chapters.map((chapter) => ({
        id: chapter.id,
        position: chapter.position,
      })),
      contentRating: progress.work.contentRating,
      editorReviewStatus: progress.work.editorReviewStatus,
      genre: progress.work.genre,
      id: progress.work.id,
      isFavorite: progress.work.favorites.length > 0,
      readingProgress: {
        chapterPosition: progress.chapter.position,
        progressPercent: progress.progressPercent,
      },
      readingState: "in_progress",
      slug: progress.work.slug,
      title: progress.work.title,
    }),
  );

  const completedWorks: HomeWork[] = completedReadingRecords.map(
    (progress) => ({
      author: progress.work.author,
      chapters: progress.work.chapters.map((chapter) => ({
        id: chapter.id,
        position: chapter.position,
      })),
      contentRating: progress.work.contentRating,
      editorReviewStatus: progress.work.editorReviewStatus,
      genre: progress.work.genre,
      id: progress.work.id,
      isFavorite: progress.work.favorites.length > 0,
      readingProgress: {
        chapterPosition:
          progress.work.chapters[0]?.position ?? progress.chapter.position,
        progressPercent: 100,
      },
      readingState: "completed",
      slug: progress.work.slug,
      title: progress.work.title,
    }),
  );

  const newWorks = publishedWorks.slice(0, 6);
  const editorInProgress = publishedWorks
    .filter(
      (work) =>
        work.editorReviewStatus === "in_progress" ||
        work.editorReviewStatus === "awaiting_second_editor" ||
        work.editorReviewStatus === "second_in_progress",
    )
    .slice(0, 6);
  const editorCompleted = publishedWorks
    .filter((work) => work.editorReviewStatus === "completed")
    .slice(0, 6);

  function shelfWork(work: HomeWork) {
    return {
      authorName: work.author.displayName ?? work.author.fullName,
      chapterCount: work.chapters.length,
      editorReviewStatus: work.editorReviewStatus,
      genre: work.genre,
      id: work.id,
      isFavorite: work.isFavorite,
      ratingLabel: workContentRatingDetails[work.contentRating].shortLabel,
      readingProgress: work.readingProgress,
      readingState: work.readingState,
      slug: work.slug,
      title: work.title,
    };
  }

  const shelfSections = [
    {
      emptyDescription: emptyMessages.newWorks.description,
      emptyTitle: emptyMessages.newWorks.title,
      eyebrow: "Yeni hikâyeler",
      href: "/kesfet",
      id: "yeni-hikayeler",
      label: "Yeni Hikâyeler",
      title: "Yeni Eklenen Eserler",
      works: newWorks.map(shelfWork),
    },
    {
      emptyDescription: emptyMessages.editorInProgress.description,
      emptyTitle: emptyMessages.editorInProgress.title,
      eyebrow: "Profesyonel değerlendirme",
      id: "profesyonel-degerlendirme",
      label: "Profesyonel Değerlendirme",
      title: "Profesyonel Editör İncelemesindeki Eserler",
      works: editorInProgress.map(shelfWork),
    },
    {
      emptyDescription: emptyMessages.editorCompleted.description,
      emptyTitle: emptyMessages.editorCompleted.title,
      eyebrow: "Editör seçkisi",
      id: "editor-seckisi",
      label: "Editör Seçkisi",
      title: "Profesyonel Editör Tarafından İncelenen Eserler",
      works: editorCompleted.map(shelfWork),
    },
    {
      emptyDescription: emptyMessages.completed.description,
      emptyTitle: emptyMessages.completed.title,
      eyebrow: "Okuma arşivin",
      href: "/tamamlanan-eserler",
      id: "okuma-arsivin",
      label: "Okuma Arşivin",
      title: "Tamamlanan Eserler",
      works: completedWorks.map(shelfWork),
    },
  ];

  const firstName = profile.fullName.trim().split(/\s+/u)[0] || "Okur";

  return (
    <AppShell profile={profile}>
      <div className="dashboard__main reader-workdesk">
        <header className="reader-workdesk__hero">
          <div className="reader-workdesk__intro">
            <p className="reader-workdesk__eyebrow">Okuma masan</p>
            <h1>Hoş geldin, {firstName}</h1>
            <p className="reader-workdesk__lead">
              Kaldığın eserler masanın üstünde; diğer içerikler raflarda.
              İhtiyacın olmayan eserleri gizleyip çalışma alanını sade
              tutabilirsin.
            </p>
            <nav
              aria-label="Okuyucu hızlı bağlantıları"
              className="reader-workdesk__quick-links"
            >
              <Link href="/kesfet">Keşfet</Link>
              <Link href="/favorilerim">Favorilerim</Link>
              <Link href="/okumaya-devam">Okumaya Devam Et</Link>
              <Link href="/tamamlanan-eserler">Tamamlananlar</Link>
            </nav>
          </div>

          <div className="reader-workdesk__summary">
            <div className="reader-workdesk__summary-card">
              <strong>{continueReadingWorks.length}</strong>
              <span>Masada bekleyen eser</span>
            </div>
            <div className="reader-workdesk__summary-card">
              <strong>{newWorks.length}</strong>
              <span>Yeni keşif</span>
            </div>
            <div className="reader-workdesk__summary-card">
              <strong>{completedWorks.length}</strong>
              <span>Son tamamlanan</span>
            </div>
          </div>
        </header>

        <ReaderShelfTabs
          continueEmptyDescription={emptyMessages.continueReading.description}
          continueEmptyTitle={emptyMessages.continueReading.title}
          continueWorks={continueReadingWorks.map(shelfWork)}
          sections={shelfSections}
          storageKey={`ilkoku:reader-hidden-works:v2:${profile.id}`}
        />
      </div>
    </AppShell>
  );
}
