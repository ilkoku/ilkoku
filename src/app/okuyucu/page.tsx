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
import {
  getCompletedReading,
  restartReadingAction,
} from "@/features/reading/progress";
import { getAdultContentAccess } from "@/lib/adult-content-access";
import { prisma } from "@/lib/prisma";
import { workContentRatingDetails } from "@/lib/work-content-classification";
import "./reader-workdesk.css";

export const metadata: Metadata = {
  title: "Okuyucu Ana Sayfa | İlkOku",
};

export const dynamic = "force-dynamic";

const emptyMessages = {
  continueReading: {
    description:
      "Bir eseri açtığında son kaldığın bölüm burada masanın üstüne gelir.",
    title:
      "Okuma masan şu an boş",
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
    redirect("/giris?sonraki=/okuyucu");
  }

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
    getContinueReadingForMember(profile.id, 6),
    getCompletedReading(profile.id, 6),
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
        work.editorReviewStatus === "second_in_progress",
    )
    .slice(0, 6);

  const editorCompleted = publishedWorks
    .filter((work) => work.editorReviewStatus === "completed")
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
      empty: emptyMessages.continueReading,
      eyebrow: "Masanın üstünde",
      href: "/okumaya-devam",
      id: "okumaya-devam",
      title: "Okumaya Devam Et",
      works: continueReadingWorks,
    },
    {
      empty: emptyMessages.newWorks,
      eyebrow: "Yeni hikâyeler",
      href: "/kesfet",
      id: "yeni-eserler",
      title: "Yeni Eklenen Eserler",
      works: newWorks,
    },
    {
      empty: emptyMessages.editorInProgress,
      eyebrow: "Profesyonel değerlendirme",
      id: "editor-incelemesinde",
      title: "Profesyonel Editör İncelemesindeki Eserler",
      works: editorInProgress,
    },
    {
      empty: emptyMessages.editorCompleted,
      eyebrow: "Editör seçkisi",
      id: "editor-tarafindan-incelenen",
      title: "Profesyonel Editör Tarafından İncelenen Eserler",
      works: editorCompleted,
    },
    {
      empty: emptyMessages.completed,
      eyebrow: "Okuma arşivin",
      href: "/tamamlanan-eserler",
      id: "tamamlanan-eserler",
      title: "Tamamlanan Eserler",
      works: completedWorks,
    },
  ];

  const firstName =
    profile.fullName.trim().split(/\s+/u)[0] || "Okur";

  return (
    <AppShell profile={profile}>
      <div className="dashboard__main reader-workdesk">
        <header className="reader-workdesk__hero">
          <div className="reader-workdesk__intro">
            <p className="reader-workdesk__eyebrow">
              Okuma masan
            </p>
            <h1>Hoş geldin, {firstName}</h1>
            <p className="reader-workdesk__lead">
              Kaldığın eserler, favorilerin ve yeni keşiflerin aynı
              çalışma alanında. Bir eseri açtığında masanın üstüne gelir;
              ilerledikçe kaldığın yer otomatik güncellenir.
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

        {sections.map((section) => (
          <section
            aria-labelledby={`${section.id}-baslik`}
            className={
              section.id === "okumaya-devam"
                ? "dashboard-section reader-workdesk__continue"
                : "dashboard-section reader-workdesk__shelf"
            }
            key={section.id}
          >
            <div className="section-heading">
              <div>
                <p>{section.eyebrow}</p>
                <h2 id={`${section.id}-baslik`}>
                  {section.title}
                </h2>
              </div>

              <div>
                <span>{section.works.length} eser</span>
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
                {section.works.map((work, index) => (
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
                        {work.genre ?? "Tür belirtilmedi"}
                        {" · "}
                        {work.author.displayName ?? work.author.fullName}
                      </p>

                      <h3>{work.title}</h3>

                      <div className="book-card__status-row">
                        <EditorReviewBadge
                          status={work.editorReviewStatus}
                        />
                        <span>
                          Hitap yaşı:{" "}
                          {
                            workContentRatingDetails[
                              work.contentRating
                            ].shortLabel
                          }
                        </span>
                        <span>{work.chapters.length} bölüm</span>
                      </div>

                      {work.readingProgress && (
                        <ProgressBar
                          label={`${work.title} okuma ilerlemesi`}
                          value={
                            work.readingProgress.progressPercent
                          }
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

                        {work.readingState === "completed" ? (
                          <form action={restartReadingAction}>
                            <input
                              name="workId"
                              type="hidden"
                              value={work.id}
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
                              work.readingState === "in_progress"
                                ? `/oku/${work.slug}/bolum-${
                                    work.readingProgress
                                      ?.chapterPosition ?? 1
                                  }?from=${encodeURIComponent(
                                    "/okuyucu",
                                  )}`
                                : `/kitap/${work.slug}?from=${encodeURIComponent(
                                    "/okuyucu",
                                  )}`
                            }
                          >
                            {work.readingState === "in_progress"
                              ? "Okumaya Devam Et"
                              : "Eseri İncele"}
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="workspace-empty">
                <h3>{section.empty.title}</h3>
                <p>{section.empty.description}</p>
                {section.id === "okumaya-devam" && (
                  <Link
                    className="button button--outline"
                    href="/kesfet"
                  >
                    Masana bir eser seç
                  </Link>
                )}
              </Card>
            )}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
