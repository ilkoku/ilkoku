import Image from "next/image";
import Link from "next/link";
import mobileLogo from "@/assets/brand/ilkoku-logo-mobile.png";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import {
  readingContent,
  tr,
  validationContent,
} from "@/content";
import { EditorReviewBadge } from "@/features/editor-workspace/components/EditorReviewBadge";
import { ProfessionalReviewTools } from "@/features/editor-workspace/components/ProfessionalReviewTools";
import {
  createChapterCommentAction,
  type ReaderCommentFeed,
} from "@/features/reader/comments";
import { ReaderCommentList } from "@/features/reader/components/ReaderCommentList";
import { toggleFavoriteAction } from "@/features/reader/favorites";
import type { PublicChapterDetail } from "@/features/works/types";
import { ProtectedChapterContent } from "./ProtectedChapterContent";
import { ReadingProgressTracker } from "./ReadingProgressTracker";
import { WorkShareActions } from "./WorkShareActions";

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
  }).format(
    typeof value === "string"
      ? new Date(value)
      : value,
  );
}

function countWords(content: string) {
  return content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function ReadingExperience({
  canComment = false,
  canFavorite = false,
  canTrackReading = false,
  chapter,
  comments,
  isFavorite = false,
  professionalReview,
  protectionIdentity,
  readingProgress,
  returnTo = "/kesfet",
}: {
  canComment?: boolean;
  canFavorite?: boolean;
  canTrackReading?: boolean;
  chapter: PublicChapterDetail;
  comments: ReaderCommentFeed;
  isFavorite?: boolean;
  professionalReview?: {
    draft: {
      category: string;
      content: string;
      priority: "normal" | "important";
      title: string;
    } | null;
    stage: "first" | "second";
    workId: string;
  } | null;
  protectionIdentity: string;
  readingProgress?: number | null;
  returnTo?: string;
}) {
  const wordCount = countWords(chapter.content);

  const readingTime = Math.max(
    1,
    Math.ceil(wordCount / 200),
  );

  const paragraphs = chapter.content
    .split(/\n{2,}/u)
    .map((paragraph: string) =>
      paragraph.trim(),
    )
    .filter(Boolean);

  const authorInitials: string = chapter.work.authorName
    .split(" ")
    .filter((part: string) => part.length > 0)
    .map((part: string) => part.charAt(0))
    .join("");

  const publishedChapters = [
    ...chapter.work.chapters,
  ]
    .filter(
      (item) =>
        item.status === "published" &&
        item.publishedAt !== null &&
        item.archivedAt === null,
    )
    .sort(
      (left, right) =>
        left.position - right.position,
    );

  const activeChapterIndex =
    publishedChapters.findIndex(
      (item) => item.id === chapter.id,
    );

  const previousChapter =
    activeChapterIndex > 0
      ? publishedChapters[
          activeChapterIndex - 1
        ]
      : null;

  const nextChapter =
    activeChapterIndex >= 0 &&
    activeChapterIndex <
      publishedChapters.length - 1
      ? publishedChapters[
          activeChapterIndex + 1
        ]
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

  function getChapterHref(position: number) {
    return `/oku/${chapter.work.slug}/bolum-${position}?from=${encodedReturnTo}`;
  }

  return (
    <div className="reading-page">
      <a
        className="reader-skip-link"
        href="#bolum-metni"
      >
        {readingContent.chapter.skip}
      </a>

      <header className="reader-topbar">
        <nav
          className="reader-topbar__inner"
          aria-label={
            readingContent.chapter.tools
          }
        >
          <Link
            className="reader-back"
            href={bookReturnPath}
          >
            <span aria-hidden="true">←</span>

            <span>
              {readingContent.common.back}
            </span>
          </Link>

          <Link
            className="reader-brand"
            href="/"
            aria-label={
              readingContent.common.homeLabel
            }
          >
            <Image
              src={mobileLogo}
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              priority
            />

            <span>{tr.brand.name}</span>
          </Link>

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
                  <small>
                    Okuma listelerinize ve hesabınıza geçin.
                  </small>
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

      <main className="reading-layout">
        <article
          className="reading-article"
          aria-labelledby="kitap-basligi"
        >
          <header className="book-intro">
            <div
              className="reading-cover"
              role="img"
              aria-label={readingContent.common.bookCover(
                chapter.work.title,
              )}
            >
              <span
                className="reading-cover__mark"
                aria-hidden="true"
              >
                ✦
              </span>

              <div>
                <span>
                  {chapter.work.genre ??
                    "Tür belirtilmedi"}
                </span>

                <strong>
                  {chapter.work.title}
                </strong>

                <small>{tr.brand.name}</small>
              </div>
            </div>

            <div className="book-intro__content">
              <p className="book-intro__eyebrow">
                {
                  readingContent.chapter
                    .experience
                }
              </p>

              <h1 id="kitap-basligi">
                {chapter.work.title}
              </h1>

              <p className="book-intro__author">
                {chapter.work.authorName}
              </p>

              <EditorReviewBadge status={chapter.work.editorReviewStatus} />

              <dl className="book-meta">
                <div>
                  <dt>
                    {
                      readingContent.common
                        .category
                    }
                  </dt>

                  <dd>
                    {chapter.work.genre ??
                      "Tür belirtilmedi"}
                  </dd>
                </div>

                <div>
                  <dt>
                    {
                      readingContent.chapter
                        .readingTime
                    }
                  </dt>

                  <dd>
                    {readingTime} dakika
                  </dd>
                </div>
              </dl>

              <div className="book-intro__actions">
                <WorkShareActions
                  authorName={chapter.work.authorName}
                  genre={chapter.work.genre}
                  title={chapter.work.title}
                  workSlug={chapter.work.slug}
                />

                {canFavorite && (
                  <form action={toggleFavoriteAction}>
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

                    <button
                      className="button button--outline"
                      type="submit"
                    >
                      {isFavorite
                        ? "Beğeniyi Kaldır"
                        : "Beğen"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </header>

          <section
            className="chapter"
            id="bolum-metni"
            aria-labelledby="bolum-basligi"
          >
            <p className="chapter__label">
              {chapter.position}. Bölüm
            </p>

            <h2 id="bolum-basligi">
              {chapter.title}
            </h2>

            <ProtectedChapterContent
              chapterId={chapter.id}
              identity={protectionIdentity}
              paragraphs={paragraphs}
            />
          </section>

          <nav
            aria-label="Bölüm geçişleri"
            className="chapter-navigation"
          >
            {previousChapter ? (
              <Link
                className="chapter-navigation__button chapter-navigation__button--previous"
                href={getChapterHref(
                  previousChapter.position,
                )}
              >
                <span aria-hidden="true">←</span>

                <span>
                  <small>Önceki Bölüm</small>
                  <strong>
                    {previousChapter.title}
                  </strong>
                </span>
              </Link>
            ) : (
              <span
                aria-hidden="true"
                className="chapter-navigation__spacer"
              />
            )}

            <div className="chapter-navigation__current">
              <small>Şu anda okunuyor</small>
              <strong>
                {chapter.position}. Bölüm
              </strong>
            </div>

            {nextChapter ? (
              <Link
                className="chapter-navigation__button chapter-navigation__button--next"
                href={getChapterHref(
                  nextChapter.position,
                )}
              >
                <span>
                  <small>Sonraki Bölüm</small>
                  <strong>
                    {nextChapter.title}
                  </strong>
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

          <section
            className="reader-comments"
            aria-labelledby="yorumlar-basligi"
          >
            <div className="reader-section-heading">
              <div>
                <p>
                  {
                    readingContent.chapter
                      .readerOpinions
                  }
                </p>

                <h2 id="yorumlar-basligi">
                  {
                    readingContent.chapter
                      .comments
                  }
                </h2>
              </div>

              <span>
                {comments.total.toLocaleString(
                  "tr-TR",
                )} yorum
              </span>
            </div>

            {canComment ? (
              <form
                action={
                  createChapterCommentAction
                }
                className="comment-form"
              >
                <h3>
                  {
                    readingContent.chapter
                      .writeOpinion
                  }
                </h3>

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
                  label={
                    readingContent.chapter
                      .commentLabel
                  }
                  maxLength={600}
                  message={
                    validationContent.maximumCharacters(
                      600,
                    )
                  }
                  minLength={3}
                  name="content"
                  placeholder={
                    readingContent.chapter
                      .commentPlaceholder
                  }
                  required
                  rows={5}
                />

                <Button type="submit">
                  {
                    readingContent.chapter
                      .submitComment
                  }
                </Button>
              </form>
            ) : (
              <p className="comment-login-note">
                Yorum yazmak için okuyucu
                hesabınızla giriş yapmanız
                gerekir.
              </p>
            )}

            <ReaderCommentList
              emptyText="Bu bölüm için henüz okur yorumu yok."
              feed={comments}
            />
          </section>
        </article>

        <aside
          className="reading-aside"
          aria-label={
            readingContent.chapter
              .bookAndAuthorInfo
          }
        >
          <Card className="author-card">
            <p className="author-card__label">
              {
                readingContent.chapter
                  .authorInfo
              }
            </p>

            <div className="author-card__identity">
              <span aria-hidden="true">
                {authorInitials}
              </span>

              <div>
                <strong>
                  {chapter.work.authorName}
                </strong>

                <small>
                  {
                    readingContent.chapter
                      .author
                  }
                </small>
              </div>
            </div>

            <p className="author-card__biography">
              Yazarın profil bilgileri
              yayınlandığında burada görünecek.
            </p>
          </Card>

          <Card className="chapters-card">
            <div className="chapters-card__heading">
              <div>
                <p>Bölüm listesi</p>
                <h2>Bölümler</h2>
              </div>

              <span>
                {publishedChapters.length} bölüm
              </span>
            </div>

            <nav
              aria-label={`${chapter.work.title} bölümleri`}
            >
              <ol className="chapters-list">
                {publishedChapters.map(
                  (item) => {
                    const isActive =
                      item.id === chapter.id;

                    return (
                      <li key={item.id}>
                        <Link
                          aria-current={
                            isActive
                              ? "page"
                              : undefined
                          }
                          className={
                            isActive
                              ? "chapter-link chapter-link--active"
                              : "chapter-link"
                          }
                          href={getChapterHref(
                            item.position,
                          )}
                        >
                          <span className="chapter-link__number">
                            {item.position}
                          </span>

                          <span className="chapter-link__content">
                            <strong>
                              {item.title}
                            </strong>

                            <small>
                              {isActive
                                ? "Okunuyor"
                                : "Bölümü aç"}
                            </small>
                          </span>

                          <span
                            aria-hidden="true"
                            className="chapter-link__arrow"
                          >
                            {isActive ? "•" : "→"}
                          </span>
                        </Link>
                      </li>
                    );
                  },
                )}
              </ol>
            </nav>
          </Card>

          <Card className="reading-stats">
            <dl>
              <div>
                <dt>
                  {
                    readingContent.common
                      .totalChapters
                  }
                </dt>

                <dd>
                  {chapter.work.chapterCount}
                </dd>
              </div>

              <div>
                <dt>
                  {
                    readingContent.chapter
                      .lastUpdate
                  }
                </dt>

                <dd>
                  {formatDate(
                    chapter.updatedAt,
                  )}
                </dd>
              </div>
            </dl>

            <ReadingProgressTracker
              chapterId={chapter.id}
              enabled={canTrackReading}
              initialProgress={readingProgress ?? null}
            />
          </Card>

          {professionalReview && (
            <ProfessionalReviewTools
              draft={professionalReview.draft}
              stage={professionalReview.stage}
              workId={professionalReview.workId}
            />
          )}
        </aside>
      </main>
    </div>
  );
}
