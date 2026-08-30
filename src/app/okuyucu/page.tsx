import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/features/dashboard/components/ProgressBar";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { EditorReviewBadge } from "@/features/editor-workspace/components/EditorReviewBadge";
import {
  getCompletedReading,
  getContinueReading,
  restartReadingAction,
} from "@/features/reading/progress";
import { getAdultContentAccess } from "@/lib/adult-content-access";
import { prisma } from "@/lib/prisma";
import { workContentRatingDetails } from "@/lib/work-content-classification";

export const metadata: Metadata = {
  title: "Okuyucu Ana Sayfa | İlkOku",
};

export const dynamic = "force-dynamic";

const emptyMessages = {
  continueReading: {
    description:
      "Bir eseri okumaya başladığında kaldığın yer burada görünecek.",
    title:
      "Henüz devam eden bir okuman yok",
  },
  editorCompleted: {
    description:
      "Profesyonel editör incelemesi tamamlanan eserler burada yer alacak.",
    title:
      "Henüz incelenmiş eser bulunmuyor",
  },
  editorInProgress: {
    description:
      "Profesyonel editör incelemesine alınan eserler burada yer alacak.",
    title:
      "Henüz incelemedeki eser bulunmuyor",
  },
  completed: {
    description:
      "Bir eserin son bölümünü tamamladığında eser burada görünecek.",
    title:
      "Henüz tamamladığın bir eser yok",
  },
  newWorks: {
    description:
      "Yayımlanan yeni eserler burada yer alacak.",
    title:
      "Henüz yeni eser bulunmuyor",
  },
} as const;

export default async function ReaderHomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(
      "/giris?sonraki=/okuyucu",
    );
  }

  if (
    !canAccessReaderWorkspace(
      profile.role,
    )
  ) {
    redirect(
      "/erisim-reddedildi?kaynak=reader",
    );
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
      orderBy: {
        createdAt: "desc",
      },
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
            publishedAt: {
              not: null,
            },
            status: "published",
          },
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
            position: true,
          },
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
    getContinueReading(
      profile.id,
      6,
    ),
    getCompletedReading(
      profile.id,
      6,
    ),
  ]);

  type HomeWork = {
    author: {
      displayName: string | null;
      fullName: string;
    };
    chapters: Array<{
      id: string;
      position: number;
    }>;
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
    readingState:
      | "unread"
      | "in_progress"
      | "completed";
    slug: string;
    title: string;
  };

  const progressWorkIds = new Set(
    readingProgressRecords.map(
      (progress) =>
        progress.work.id,
    ),
  );

  const completedWorkIds = new Set(
    completedReadingRecords.map(
      (progress) =>
        progress.work.id,
    ),
  );

  const publishedWorks: HomeWork[] =
    publishedRecords
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

  const continueReadingWorks: HomeWork[] =
    readingProgressRecords.map(
      (progress) => ({
        author:
          progress.work.author,
        chapters:
          progress.work.chapters.map(
            (chapter) => ({
              id: chapter.id,
              position:
                chapter.position,
            }),
          ),
        contentRating:
          progress.work.contentRating,
        editorReviewStatus:
          progress.work
            .editorReviewStatus,
        genre:
          progress.work.genre,
        id:
          progress.work.id,
        readingProgress: {
          chapterPosition:
            progress.chapter.position,
          progressPercent:
            progress.progressPercent,
        },
        readingState:
          "in_progress",
        slug:
          progress.work.slug,
        title:
          progress.work.title,
      }),
    );

  const completedWorks: HomeWork[] =
    completedReadingRecords.map(
      (progress) => ({
        author:
          progress.work.author,
        chapters:
          progress.work.chapters.map(
            (chapter) => ({
              id: chapter.id,
              position:
                chapter.position,
            }),
          ),
        contentRating:
          progress.work.contentRating,
        editorReviewStatus:
          progress.work
            .editorReviewStatus,
        genre:
          progress.work.genre,
        id:
          progress.work.id,
        readingProgress: {
          chapterPosition:
            progress.work.chapters[0]
              ?.position ??
            progress.chapter.position,
          progressPercent: 100,
        },
        readingState:
          "completed",
        slug:
          progress.work.slug,
        title:
          progress.work.title,
      }),
    );

  const newWorks =
    publishedWorks.slice(0, 6);

  const editorInProgress =
    publishedWorks
      .filter(
        (work) =>
          work.editorReviewStatus ===
            "in_progress" ||
          work.editorReviewStatus ===
            "second_in_progress",
      )
      .slice(0, 6);

  const editorCompleted =
    publishedWorks
      .filter(
        (work) =>
          work.editorReviewStatus ===
          "completed",
      )
      .slice(0, 6);

  const sections: Array<{
    empty:
      (typeof emptyMessages)[keyof typeof emptyMessages];
    eyebrow: string;
    href?: string;
    id: string;
    title: string;
    works: HomeWork[];
  }> = [
    {
      empty:
        emptyMessages.continueReading,
      eyebrow:
        "Kaldığın yer",
      href:
        "/okumaya-devam",
      id:
        "okumaya-devam",
      title:
        "Okumaya Devam Et",
      works:
        continueReadingWorks,
    },
    {
      empty:
        emptyMessages.newWorks,
      eyebrow:
        "Yeni hikâyeler",
      href:
        "/kesfet",
      id:
        "yeni-eserler",
      title:
        "Yeni Eklenen Eserler",
      works:
        newWorks,
    },
    {
      empty:
        emptyMessages.editorInProgress,
      eyebrow:
        "Profesyonel değerlendirme",
      id:
        "editor-incelemesinde",
      title:
        "Profesyonel Editör İncelemesindeki Eserler",
      works:
        editorInProgress,
    },
    {
      empty:
        emptyMessages.editorCompleted,
      eyebrow:
        "Editör seçkisi",
      id:
        "editor-tarafindan-incelenen",
      title:
        "Profesyonel Editör Tarafından İncelenen Eserler",
      works:
        editorCompleted,
    },
    {
      empty:
        emptyMessages.completed,
      eyebrow:
        "Okuma arşivin",
      href:
        "/tamamlanan-eserler",
      id:
        "tamamlanan-eserler",
      title:
        "Tamamlanan Eserler",
      works:
        completedWorks,
    },
  ];

  const firstName =
    profile.fullName
      .trim()
      .split(/\s+/u)[0] ||
    "Okur";

  return (
    <AppShell profile={profile}>
      <div className="dashboard__main">
        <header className="dashboard-hero">
          <div className="dashboard-hero__heading">
            <div>
              <p className="dashboard-hero__eyebrow">
                Okuyucu alanı
              </p>

              <h1>
                Hoş Geldin, {firstName}
              </h1>
            </div>
          </div>
        </header>

        {sections.map((section) => (
          <section
            aria-labelledby={`${section.id}-baslik`}
            className="dashboard-section"
            key={section.id}
          >
            <div className="section-heading">
              <div>
                <p>{section.eyebrow}</p>

                <h2
                  id={`${section.id}-baslik`}
                >
                  {section.title}
                </h2>
              </div>

              <div>
                <span>
                  {section.works.length} eser
                </span>

                {section.href && (
                  <Link
                    className="button button--ghost"
                    href={section.href}
                  >
                    Tümünü Gör
                  </Link>
                )}
              </div>
            </div>

            {section.works.length > 0 ? (
              <div className="books-grid">
                {section.works.map(
                  (work, index) => (
                    <Card
                      className="book-card"
                      key={work.id}
                      variant="hover"
                    >
                      <div
                        aria-hidden="true"
                        className={`book-cover book-cover--${
                          (
                            [
                              "one",
                              "two",
                              "three",
                            ] as const
                          )[index % 3]
                        }`}
                      >
                        <span className="book-cover__ornament">
                          ✦
                        </span>

                        <strong>
                          {work.title}
                        </strong>

                        <small>
                          İlkOku
                        </small>
                      </div>

                      <div className="book-card__content">
                        <p className="book-card__genre">
                          {work.genre ??
                            "Tür belirtilmedi"}
                          {" · "}
                          {work.author
                            .displayName ??
                            work.author
                              .fullName}
                        </p>

                        <h3>
                          {work.title}
                        </h3>

                        <div className="book-card__status-row">
                          <EditorReviewBadge
                            status={
                              work.editorReviewStatus
                            }
                          />

                          <span>
                            Hitap yaşı: {workContentRatingDetails[work.contentRating].shortLabel}
                          </span>

                          <span>
                            {
                              work.chapters
                                .length
                            }{" "}
                            bölüm
                          </span>
                        </div>

                        {work.readingProgress && (
                          <ProgressBar
                            label={`${work.title} okuma ilerlemesi`}
                            value={
                              work
                                .readingProgress
                                .progressPercent
                            }
                          />
                        )}

                        <div className="book-card__actions">
                          <Link
                            className="button button--ghost"
                            href={`/kitap/${work.slug}/pasaport?from=${encodeURIComponent("/okuyucu")}`}
                          >
                            Eser Pasaportu
                          </Link>

                          {work.readingState ===
                          "completed" ? (
                            <form
                              action={
                                restartReadingAction
                              }
                            >
                              <input
                                name="workId"
                                type="hidden"
                                value={
                                  work.id
                                }
                              />

                              <input
                                name="returnTo"
                                type="hidden"
                                value="/okuyucu"
                              />

                              <button
                                className="button button--outline"
                                type="submit"
                              >
                                Yeniden Oku
                              </button>
                            </form>
                          ) : (
                            <Link
                              className="button button--outline"
                              href={
                                work.readingState ===
                                "in_progress"
                                  ? `/oku/${work.slug}/bolum-${work.readingProgress?.chapterPosition ?? 1}?from=${encodeURIComponent("/okuyucu")}`
                                  : `/kitap/${work.slug}?from=${encodeURIComponent("/okuyucu")}`
                              }
                            >
                              {work.readingState ===
                              "in_progress"
                                ? "Okumaya Devam Et"
                                : "Eseri İncele"}
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  ),
                )}
              </div>
            ) : (
              <Card className="workspace-empty">
                <h3>
                  {section.empty.title}
                </h3>

                <p>
                  {
                    section.empty
                      .description
                  }
                </p>
              </Card>
            )}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
