import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/features/dashboard/components/ProgressBar";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorReviewBadge } from "@/features/editor-workspace/components/EditorReviewBadge";
import { getContinueReading } from "@/features/reading/progress";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Okuyucu Ana Sayfa | İlkOku",
};

export const dynamic = "force-dynamic";

const emptyMessages = {
  continueReading: {
    description:
      "Bir eseri okumaya başladığında kaldığın yer burada görünecek.",
    title: "Henüz devam eden bir okuman yok",
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
      "Tüm bölümleri yayımlanmış eserler burada yer alacak.",
    title: "Henüz tamamlanan eser bulunmuyor",
  },
  newWorks: {
    description:
      "Yayımlanan yeni eserler burada yer alacak.",
    title: "Henüz yeni eser bulunmuyor",
  },
} as const;

export default async function ReaderHomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/okuyucu");
  }

  if (profile.role !== "reader" && profile.role !== "editor") {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const [publishedRecords, readingProgressRecords] = await Promise.all([
    prisma.work.findMany({
      where: {
        archivedAt: null,
        publishedAt: {
          not: null,
        },
        status: "published",
        visibility: "public",
      },
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
          },
          select: {
            id: true,
            publishedAt: true,
            status: true,
          },
        },
        editorReviewStatus: true,
        genre: true,
        id: true,
        slug: true,
        title: true,
      },
      take: 24,
    }),
    getContinueReading(profile.id),
  ]);

  type HomeWork = (typeof publishedRecords)[number] & {
    readingProgress: {
      chapterPosition: number;
      chapterTitle: string;
      progressPercent: number;
    } | null;
  };

  const publishedWorks: HomeWork[] = publishedRecords.map((work) => ({
    ...work,
    readingProgress: null,
  }));
  const continueReadingWorks: HomeWork[] = readingProgressRecords.map(
    (progress) => ({
      ...progress.work,
      readingProgress: {
        chapterPosition: progress.chapter.position,
        chapterTitle: progress.chapter.title,
        progressPercent: progress.progressPercent,
      },
    }),
  );

  const newWorks = publishedWorks.slice(0, 6);
  const editorInProgress = publishedWorks
    .filter((work) => work.editorReviewStatus === "in_progress")
    .slice(0, 6);
  const editorCompleted = publishedWorks
    .filter((work) => work.editorReviewStatus === "completed")
    .slice(0, 6);
  const completedWorks = publishedWorks
    .filter(
      (work) =>
        work.chapters.length > 0 &&
        work.chapters.every(
          (chapter) =>
            chapter.status === "published" &&
            chapter.publishedAt !== null,
        ),
    )
    .slice(0, 6);

  const sections: Array<{
    empty: (typeof emptyMessages)[keyof typeof emptyMessages];
    eyebrow: string;
    id: string;
    title: string;
    works: typeof publishedWorks;
  }> = [
    {
      empty: emptyMessages.continueReading,
      eyebrow: "Kaldığın yer",
      id: "okumaya-devam",
      title: "Okumaya Devam Et",
      works: continueReadingWorks,
    },
    {
      empty: emptyMessages.newWorks,
      eyebrow: "Yeni hikâyeler",
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
      eyebrow: "Baştan sona hazır",
      id: "tamamlanan-eserler",
      title: "Tamamlanan Eserler",
      works: completedWorks,
    },
  ];

  const firstName = profile.fullName.trim().split(/\s+/u)[0] || "Okur";

  return (
    <AppShell profile={profile}>
      <div className="dashboard__main">
        <header className="dashboard-hero">
          <div className="dashboard-hero__heading">
            <div>
              <p className="dashboard-hero__eyebrow">Okuyucu alanı</p>
              <h1>Hoş Geldin, {firstName}</h1>
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
                <h2 id={`${section.id}-baslik`}>{section.title}</h2>
              </div>

              <span>{section.works.length} eser</span>
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
                        (["one", "two", "three"] as const)[index % 3]
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

                      <div className="book-card__status-row">
                        <EditorReviewBadge
                          status={work.editorReviewStatus}
                        />
                        <span>{work.chapters.length} bölüm</span>
                      </div>

                      {work.readingProgress && (
                        <ProgressBar
                          label={`${work.title} okuma ilerlemesi`}
                          value={work.readingProgress.progressPercent}
                        />
                      )}

                      <div className="book-card__actions">
                        <Link
                          className="button button--outline"
                          href={
                            work.readingProgress
                              ? `/oku/${work.slug}/bolum-${work.readingProgress.chapterPosition}`
                              : `/kitap/${work.slug}`
                          }
                        >
                          {work.readingProgress
                            ? "Okumaya Devam Et"
                            : "Eseri İncele"}
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="workspace-empty">
                <h3>{section.empty.title}</h3>
                <p>{section.empty.description}</p>
              </Card>
            )}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
