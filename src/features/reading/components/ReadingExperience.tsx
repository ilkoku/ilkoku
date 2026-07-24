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
import type { PublicChapterDetail } from "@/features/works/types";

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
  chapter,
}: {
  chapter: PublicChapterDetail;
}) {
  const wordCount = countWords(chapter.content);

  const readingTime = Math.max(
    1,
    Math.ceil(wordCount / 200),
  );

  const completion =
    chapter.work.status === "published"
      ? 100
      : 0;

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
            href={`/kitap/${chapter.work.slug}`}
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
            <Button
              variant="ghost"
              aria-label={
                readingContent.chapter.shareLabel
              }
            >
              {readingContent.common.share}
            </Button>

            <Button
              variant="outline"
              aria-label={
                readingContent.chapter.saveLabel
              }
            >
              {readingContent.common.save}
            </Button>
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

            <div className="chapter__body">
              {paragraphs.map(
                (paragraph: string, index: number) => (
                  <p key={`${chapter.id}-${index}`}>
                  {paragraph}
                </p>
              ),
            )}
            </div>
          </section>

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

              <span>0 yorum</span>
            </div>

            <form className="comment-form">
              <h3>
                {
                  readingContent.chapter
                    .writeOpinion
                }
              </h3>

              <Field
                control="textarea"
                id="okur-yorumu"
                label={
                  readingContent.chapter
                    .commentLabel
                }
                placeholder={
                  readingContent.chapter
                    .commentPlaceholder
                }
                rows={5}
                maxLength={600}
                message={validationContent.maximumCharacters(
                  600,
                )}
              />

              <Button type="button">
                {
                  readingContent.chapter
                    .submitComment
                }
              </Button>
            </form>

            <div
              className="comment-list"
              aria-label={
                readingContent.chapter
                  .readerComments
              }
            >
              <p>
                Bu bölüm için henüz okur
                yorumu yok.
              </p>
            </div>
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
                    readingContent.common
                      .completion
                  }
                </dt>

                <dd>%{completion}</dd>
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

            <progress
              aria-label={readingContent.common.completionLabel(
                completion,
              )}
              max={100}
              value={completion}
            >
              %{completion}
            </progress>
          </Card>
        </aside>
      </main>
    </div>
  );
}