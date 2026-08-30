import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { ProgressBar } from "@/features/dashboard/components/ProgressBar";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { EditorReviewBadge } from "@/features/editor-workspace/components/EditorReviewBadge";
import { getContinueReadingForMember } from "@/features/reading/continue-reading";
import { getCompletedReading } from "@/features/reading/progress";
import { getAdultContentAccess } from "@/lib/adult-content-access";
import { prisma } from "@/lib/prisma";
import { workContentRatingDetails } from "@/lib/work-content-classification";
import { ReaderShelfTabs } from "./ReaderShelfTabs";
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

  const [
    publishedRecords,
    readingProgressRecords,
    completedReadingRecords,
  ] = await Promise.all([
    prisma.work.findMany({
      where: commonDiscoveryWorkWhereFor(
        adultAccess.canAccessAdultContent,
      ),
      orderBy: { createdAt: "desc" },
      select: {
        author: {
          select: {
            displayName: true,
            fullName: true,
          },
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
    author: {
      displayName: string | null;
      fullName: string;
    };
    chapters: Array<{ id: string; position: number }>;
    contentRating:
      (typeof publishedRecords)[number]["contentRating"];
    editorReviewStatus:
      (typeof publishedRecords)[number]["editorReviewStatus"];
    genre: string | null;
    id: string;
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
        !progressWorkIds.has(work.id) &&
        !completedWorkIds.has(work.id),
    )
    .map((work) => ({
      ...work,
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
      readingProgress: {
        chapterPosition:
          progress.work.chapters[0]?.position ??
          progress.chapter.position,
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
      ratingLabel:
        workContentRatingDetails[work.contentRating].shortLabel,
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

  const firstName =
    profile.fullName.trim().split(/\s+/u)[0] || "Okur";

  return (
    <AppShell profile={profile}>
      <div className="dashboard__main reader-workdesk">
        <header className="reader-workdesk__hero">
          <div className="reader-workdesk__intro">
            <p className="reader-workdesk__eyebrow">Okuma masan</p>
            <h1>Hoş geldin, {firstName}</h1>
            <p className="reader-workdesk__lead">
              Kaldığın eserler masanın üstünde; diğer içerikler raflarda.
              İhtiyacın olmayan rafları gizleyip çalışma alanını sade
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

        <section
          aria-labelledby="okumaya-devam-baslik"
          className="dashboard-section reader-workdesk__continue"
        >
          <div className="section-heading">
            <div>
              <p>Masanın üstünde</p>
              <h2 id="okumaya-devam-baslik">Okumaya Devam Et</h2>
            </div>
            <div>
              <span>{continueReadingWorks.length} eser</span>
              <Link
                className="button button--ghost"
                href="/okumaya-devam"
              >
                Tümünü Gör
              </Link>
            </div>
          </div>

          {continueReadingWorks.length > 0 ? (
            <div className="books-grid">
              {continueReadingWorks.map((work, index) => (
                <Card
                  className="book-card"
                  key={work.id}
                  variant="hover"
                >
                  <div
                    aria-hidden="true"
                    className={`book-cover book-cover--${
                      (["one", "two", "three"] as const)[
                        index % 3
                      ]
                    }`}
                  >
                    <span className="book-cover__ornament">✦</span>
                    <strong>{work.title}</strong>
                    <small>İlkOku</small>
                  </div>

                  <div className="book-card__content">
                    <p className="book-card__genre">
                      {work.genre ?? "Tür belirtilmedi"} ·{" "}
                      {work.author.displayName ?? work.author.fullName}
                    </p>
                    <h3>{work.title}</h3>

                    <div className="reader-workdesk__card-meta">
                      <EditorReviewBadge
                        status={work.editorReviewStatus}
                      />
                      <div className="reader-workdesk__meta-chips">
                        <span className="reader-workdesk__meta-chip reader-workdesk__meta-chip--age">
                          Hitap{" "}
                          {
                            workContentRatingDetails[
                              work.contentRating
                            ].shortLabel
                          }
                        </span>
                        <span className="reader-workdesk__meta-chip">
                          {work.chapters.length} bölüm
                        </span>
                      </div>
                    </div>

                    {work.readingProgress && (
                      <ProgressBar
                        label={`${work.title} okuma ilerlemesi`}
                        value={work.readingProgress.progressPercent}
                      />
                    )}

                    <div className="book-card__actions">
                      <Link
                        className="button button--ghost"
                        href={`/kitap/${work.slug}/pasaport?from=${encodeURIComponent(
                          "/okuyucu",
                        )}`}
                      >
                        Eser Pasaportu
                      </Link>
                      <Link
                        className="button button--outline"
                        href={`/oku/${work.slug}/bolum-${
                          work.readingProgress?.chapterPosition ?? 1
                        }?from=${encodeURIComponent("/okuyucu")}`}
                      >
                        Okumaya Devam Et
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="workspace-empty">
              <h3>{emptyMessages.continueReading.title}</h3>
              <p>{emptyMessages.continueReading.description}</p>
              <Link className="button button--outline" href="/kesfet">
                Masana bir eser seç
              </Link>
            </Card>
          )}
        </section>

        <ReaderShelfTabs
          sections={shelfSections}
          storageKey={`ilkoku:reader-shelves:v1:${profile.id}`}
        />
      </div>
    </AppShell>
  );
}
