import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import {
  readingContent,
  validationContent,
} from "@/content";
import {
  createChapterCommentAction,
  type ReaderCommentFeed,
} from "@/features/reader/comments";
import { ReaderCommentList } from "@/features/reader/components/ReaderCommentList";
import {
  estimateReadingMinutes,
  getEstimatedBookPageRange,
} from "@/features/reading/metrics";
import type { PublicChapterDetail } from "@/features/works/types";
import { PagedReadingViewport } from "./PagedReadingViewport";
import { ProtectedChapterContent } from "./ProtectedChapterContent";
import { ReadingProgressTracker } from "./ReadingProgressTracker";
import styles from "./FocusedReadingExperience.module.css";

export function FocusedReadingExperience({
  canComment = false,
  canTrackReading = false,
  chapter,
  comments,
  protectionIdentity,
  readingProgress,
  returnTo = "/kesfet",
  startAtLastPage = false,
}: {
  canComment?: boolean;
  canTrackReading?: boolean;
  chapter: PublicChapterDetail;
  comments: ReaderCommentFeed;
  protectionIdentity: string;
  readingProgress?: number | null;
  returnTo?: string;
  startAtLastPage?: boolean;
}) {
  const readingTime = estimateReadingMinutes(chapter.content);

  const paragraphs = chapter.content
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const publishedChapters = [...chapter.work.chapters]
    .filter(
      (item) =>
        item.status === "published" &&
        item.publishedAt !== null &&
        item.archivedAt === null,
    )
    .sort((left, right) => left.position - right.position);

  const estimatedPages = getEstimatedBookPageRange(
    publishedChapters,
    chapter.id,
  );
  const estimatedPageRange =
    estimatedPages.startPage === estimatedPages.endPage
      ? `${estimatedPages.startPage}`
      : `${estimatedPages.startPage}–${estimatedPages.endPage}`;

  const activeChapterIndex = publishedChapters.findIndex(
    (item) => item.id === chapter.id,
  );

  const previousChapter =
    activeChapterIndex > 0
      ? publishedChapters[activeChapterIndex - 1]
      : null;

  const nextChapter =
    activeChapterIndex >= 0 &&
    activeChapterIndex < publishedChapters.length - 1
      ? publishedChapters[activeChapterIndex + 1]
      : null;

  const encodedReturnTo = encodeURIComponent(returnTo);
  const currentBookPath = `/kitap/${chapter.work.slug}`;
  const bookReturnPath =
    returnTo === currentBookPath ||
    returnTo.startsWith(`${currentBookPath}?`)
      ? returnTo
      : `${currentBookPath}?from=${encodedReturnTo}`;
  const currentChapterPath =
    `/oku/${chapter.work.slug}/bolum-${chapter.position}?from=${encodedReturnTo}`;

  function getChapterHref(position: number, edge?: "last") {
    const edgeParameter = edge === "last" ? "&sayfa=son" : "";
    return `/oku/${chapter.work.slug}/bolum-${position}?from=${encodedReturnTo}${edgeParameter}`;
  }

  return (
    <div className={`reading-page ${styles.page}`}>
      <a className="reader-skip-link" href="#bolum-metni">
        {readingContent.chapter.skip}
      </a>

      <header className={`reader-topbar ${styles.topbar}`}>
        <nav
          className={styles.topbarInner}
          aria-label={readingContent.chapter.tools}
        >
          <Link
            className={`reader-back ${styles.back}`}
            href={bookReturnPath}
          >
            <span aria-hidden="true">←</span>
            <span>Eser Sayfası</span>
          </Link>

          <div className={styles.context}>
            <strong>{chapter.work.title}</strong>
            <span aria-hidden="true">·</span>
            <span>{chapter.position}. Bölüm</span>
            {typeof readingProgress === "number" ? (
              <>
                <span aria-hidden="true">·</span>
                <span>%{readingProgress} okundu</span>
              </>
            ) : null}
          </div>

          <div className="reader-actions">
            <details className="reader-menu">
              <summary>
                <span>Okuma Menüsü</span>
                <span
                  aria-hidden="true"
                  className="reader-menu__chevron"
                >
                  ⌄
                </span>
              </summary>

              <div
                aria-label="Okuma menüsü bağlantıları"
                className="reader-menu__popover"
              >
                <div className="reader-menu__heading">
                  <strong>Okuma Alanı</strong>
                  <small>Hesabındaki okuma alanlarına geç.</small>
                </div>

                <nav aria-label="Okuyucu hızlı menüsü">
                  <Link href="/okuyucu">
                    <span>Okuyucu Ana Sayfası</span>
                    <span aria-hidden="true">→</span>
                  </Link>

                  <Link href="/kesfet">
                    <span>Keşfet</span>
                    <span aria-hidden="true">→</span>
                  </Link>

                  <Link href="/okumaya-devam">
                    <span>Okumaya Devam Et</span>
                    <span aria-hidden="true">→</span>
                  </Link>

                  <Link href="/tamamlanan-eserler">
                    <span>Tamamlanan Eserler</span>
                    <span aria-hidden="true">→</span>
                  </Link>

                  <Link href="/favorilerim">
                    <span>Favorilerim</span>
                    <span aria-hidden="true">→</span>
                  </Link>

                  <Link href="/bildirimler">
                    <span>Bildirimler</span>
                    <span aria-hidden="true">→</span>
                  </Link>

                  <Link href={bookReturnPath}>
                    <span>Eser Sayfasına Dön</span>
                    <span aria-hidden="true">←</span>
                  </Link>
                </nav>
              </div>
            </details>
          </div>
        </nav>
      </header>

      <main className={styles.layout}>
        <article
          className={styles.article}
          aria-labelledby="bolum-basligi"
        >
          <header className={styles.chapterHeader}>
            <p className={styles.chapterMeta}>
              <span>{chapter.position}. Bölüm</span>
              <span aria-hidden="true">·</span>
              <span>{readingTime} dk okuma</span>
              <span aria-hidden="true">·</span>
              <span>
                Tahmini kitap sayfası {estimatedPageRange} / {estimatedPages.totalPages}
              </span>
            </p>

            <h1 id="bolum-basligi">{chapter.title}</h1>

            <ReadingProgressTracker
              chapterId={chapter.id}
              enabled={canTrackReading}
              initialProgress={readingProgress ?? null}
            />
          </header>

          <section
            className={styles.chapterBody}
            id="bolum-metni"
            aria-label={`${chapter.position}. bölüm metni`}
          >
            <PagedReadingViewport
              estimatedBookEndPage={estimatedPages.endPage}
              estimatedBookStartPage={estimatedPages.startPage}
              estimatedBookTotalPages={estimatedPages.totalPages}
              nextChapterHref={
                nextChapter ? getChapterHref(nextChapter.position) : null
              }
              previousChapterHref={
                previousChapter
                  ? getChapterHref(previousChapter.position, "last")
                  : null
              }
              startAtLastPage={startAtLastPage}
            >
              <ProtectedChapterContent
                chapterId={chapter.id}
                identity={protectionIdentity}
                paragraphs={paragraphs}
              />
            </PagedReadingViewport>
          </section>

          <nav
            aria-label="Bölüm geçişleri"
            className={`chapter-navigation ${styles.navigation}`}
          >
            {previousChapter ? (
              <Link
                className="chapter-navigation__button chapter-navigation__button--previous"
                href={getChapterHref(previousChapter.position)}
              >
                <span aria-hidden="true">←</span>
                <span>
                  <small>Önceki Bölüm</small>
                  <strong>{previousChapter.title}</strong>
                </span>
              </Link>
            ) : (
              <span
                aria-hidden="true"
                className="chapter-navigation__spacer"
              />
            )}

            <div className="chapter-navigation__current">
              <small>Bölüm</small>
              <strong>
                {chapter.position} / {publishedChapters.length}
              </strong>
              <small>
                Kitap sayfası ≈ {estimatedPageRange} / {estimatedPages.totalPages}
              </small>
            </div>

            {nextChapter ? (
              <Link
                className="chapter-navigation__button chapter-navigation__button--next"
                href={getChapterHref(nextChapter.position)}
              >
                <span>
                  <small>Sonraki Bölüm</small>
                  <strong>{nextChapter.title}</strong>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span
                aria-hidden="true"
                className="chapter-navigation__spacer"
              />
            )}
          </nav>

          <details className={styles.comments}>
            <summary>
              <span>
                <small>Okur görüşleri</small>
                <strong>Bölüm Yorumları</strong>
              </span>

              <span className={styles.commentCount}>
                {comments.total.toLocaleString("tr-TR")} yorum
                <span aria-hidden="true">⌄</span>
              </span>
            </summary>

            <div className={styles.commentsBody}>
              {canComment ? (
                <form
                  action={createChapterCommentAction}
                  className="comment-form"
                >
                  <h3>{readingContent.chapter.writeOpinion}</h3>

                  <input
                    name="chapterId"
                    type="hidden"
                    value={chapter.id}
                  />

                  <input
                    name="workId"
                    type="hidden"
                    value={chapter.work.id}
                  />

                  <input
                    name="returnPath"
                    type="hidden"
                    value={currentChapterPath}
                  />

                  <Field
                    control="textarea"
                    id="okur-yorumu"
                    label={readingContent.chapter.commentLabel}
                    maxLength={600}
                    message={validationContent.maximumCharacters(600)}
                    minLength={3}
                    name="content"
                    placeholder={readingContent.chapter.commentPlaceholder}
                    required
                    rows={5}
                  />

                  <Button type="submit">
                    {readingContent.chapter.submitComment}
                  </Button>
                </form>
              ) : (
                <p className="comment-login-note">
                  Yorum yazmak için okuyucu hesabınızla giriş
                  yapmanız gerekir.
                </p>
              )}

              <ReaderCommentList
                emptyText="Bu bölüm için henüz okur yorumu yok."
                feed={comments}
              />
            </div>
          </details>
        </article>
      </main>
    </div>
  );
}
