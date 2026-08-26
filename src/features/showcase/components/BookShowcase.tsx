import Image from "next/image";
import Link from "next/link";

import mobileLogo from "@/assets/brand/ilkoku-logo-mobile.png";
import { Card } from "@/components/ui/Card";
import { readingContent, tr } from "@/content";
import { EditorReviewBadge } from "@/features/editor-workspace/components/EditorReviewBadge";
import type { ReaderCommentFeed } from "@/features/reader/comments";
import { ReaderCommentList } from "@/features/reader/components/ReaderCommentList";
import { toggleFavoriteAction } from "@/features/reader/favorites";
import { WorkShareActions } from "@/features/reading/components/WorkShareActions";
import type { PublicWorkDetail } from "@/features/works/types";
import { publicTaxonomySlug } from "@/lib/public-taxonomy";
import {
  parseWorkContentWarnings,
  workContentRatingDetails,
  workContentWarningDetails,
} from "@/lib/work-content-classification";

import { BookCover } from "./BookCover";

function formatDate(value: string | Date | null) {
  if (!value) {
    return "Henüz yayınlanmadı";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
  }).format(new Date(value));
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr");
}

function countWords(content: string) {
  const normalized = content.trim();

  return normalized ? normalized.split(/\s+/u).length : 0;
}

function getLanguageLabel(language: string) {
  if (language === "tr") return "Türkçe";
  if (language === "en") return "İngilizce";
  return language.toLocaleUpperCase("tr");
}

export function BookShowcase({
  canFavorite = false,
  comments,
  isFavorite = false,
  readingProgress,
  returnTo = "/eserler",
  work,
}: {
  canFavorite?: boolean;
  comments: ReaderCommentFeed;
  isFavorite?: boolean;
  readingProgress?: {
    chapterPosition: number;
    completed: boolean;
    lastPosition: number | null;
    progressPercent: number;
  } | null;
  returnTo?: string;
  work: PublicWorkDetail;
}) {
  const completion = work.isCompleted ? 100 : 75;
  const genreLabel = work.genre ?? "Eser";
  const tags = [genreLabel, "Eser"];
  const firstChapter = work.chapters[0] ?? null;
  const resumeChapter =
    work.chapters.find(
      (chapter) =>
        chapter.position ===
        readingProgress?.chapterPosition,
    ) ?? firstChapter;
  const bookContextPath = `/kitap/${work.slug}?from=${encodeURIComponent(returnTo)}`;
  const encodedBookContextPath = encodeURIComponent(bookContextPath);
  const contentWarnings = parseWorkContentWarnings(work.contentWarnings);
  const rating = workContentRatingDetails[work.contentRating];

  return (
    <div className="showcase-page">
      <a
        className="showcase-skip-link"
        href="#kitap-vitrini"
      >
        {readingContent.showcase.skip}
      </a>

      <header className="showcase-topbar">
        <nav
          className="showcase-topbar__inner"
          aria-label={readingContent.showcase.tools}
        >
          <Link
            className="showcase-back"
            href={returnTo}
          >
            <span aria-hidden="true">←</span>
            <span>{readingContent.common.back}</span>
          </Link>

          <Link
            className="showcase-brand"
            href="/"
            aria-label={readingContent.common.homeLabel}
          >
            <Image
              src={mobileLogo}
              alt=""
              aria-hidden="true"
              width={36}
              height={36}
              priority
            />

            <span>{tr.brand.name}</span>
          </Link>

          <span
            aria-hidden="true"
            className="showcase-topbar__spacer"
          />
        </nav>
      </header>

      <main id="kitap-vitrini">
        <section
          className="showcase-hero"
          aria-labelledby="kitap-basligi"
        >
          <BookCover title={work.title} />

          <div className="showcase-hero__content">
            <p className="showcase-eyebrow">
              {readingContent.showcase.eyebrow}
            </p>

            <h1 id="kitap-basligi">
              {work.title}
            </h1>

            <Link
              className="showcase-author-link"
              href={`/yazarlar/${work.authorPublicId}?from=${encodedBookContextPath}`}
            >
              {work.authorName}
            </Link>

            <dl className="showcase-metadata">
              <div>
                <dt>{readingContent.common.category}</dt>
                <dd>
                  {work.genre ? (
                    <Link
                      href={`/turler/${publicTaxonomySlug(work.genre)}?from=${encodedBookContextPath}`}
                    >
                      {genreLabel}
                    </Link>
                  ) : (
                    genreLabel
                  )}
                </dd>
              </div>

              <div>
                <dt>Dil</dt>
                <dd>{getLanguageLabel(work.language)}</dd>
              </div>

              <div>
                <dt>Tamamlanma durumu</dt>
                <dd>
                  {work.isCompleted ? "Tamamlandı" : "Devam ediyor"}
                </dd>
              </div>

              <div>
                <dt>{readingContent.common.totalChapters}</dt>
                <dd>{work.chapterCount}</dd>
              </div>

              <div>
                <dt>Profesyonel editör</dt>
                <dd>
                  {work.editorReviewStatus === "in_progress" ||
                  work.editorReviewStatus === "completed" ? (
                    <EditorReviewBadge status={work.editorReviewStatus} />
                  ) : (
                    "Henüz incelenmedi"
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  {readingContent.showcase.publicationDate}
                </dt>
                <dd>{formatDate(work.publishedAt)}</dd>
              </div>
            </dl>

            <section
              className="showcase-content-rating"
              data-unrated={work.contentRating === "unrated" ? "true" : undefined}
              aria-labelledby="icerik-sinifi"
            >
              <div>
                <span id="icerik-sinifi">İçerik ve yaş sınıfı</span>
                <strong>{rating.shortLabel}</strong>
              </div>
              {contentWarnings.length > 0 ? (
                <ul aria-label="İçerik uyarıları">
                  {contentWarnings.map((warning) => (
                    <li key={warning}>{workContentWarningDetails[warning].label}</li>
                  ))}
                </ul>
              ) : work.contentRating === "unrated" ? (
                <p>Bu eski eser henüz yazar tarafından sınıflandırılmadı. Okumadan önce eser açıklamasını değerlendirin.</p>
              ) : (
                <p>Yazar ek bir içerik uyarısı belirtmedi.</p>
              )}
              <Link href="/icerik-ve-yas-politikasi">Sınıflandırma ölçütlerini gör →</Link>
            </section>

            <div className="showcase-progress">
              <div>
                <span>
                  {readingContent.common.completion}
                </span>

                <strong>%{completion}</strong>
              </div>

              <progress
                max={100}
                value={completion}
                aria-label={readingContent.common.completionLabel(
                  completion,
                )}
              >
                %{completion}
              </progress>
            </div>

            {readingProgress && (
              <div className="showcase-progress">
                <div>
                  <span>Okuma ilerlemen</span>
                  <strong>%{readingProgress.progressPercent}</strong>
                </div>

                <progress
                  aria-label={`Okuma ilerlemesi yüzde ${readingProgress.progressPercent}`}
                  max={100}
                  value={readingProgress.progressPercent}
                >
                  %{readingProgress.progressPercent}
                </progress>
              </div>
            )}

            <div className="book-card__actions">
              {resumeChapter && (
                <Link
                  className="button button--primary showcase-cta"
                  href={`/oku/${work.slug}/bolum-${resumeChapter.position}?from=${encodedBookContextPath}`}
                >
                  <span className="button__label">
                    <span aria-hidden="true">📖</span>{" "}
                    {readingProgress ? "Okumaya Devam Et" : "Okumaya Başla"}
                  </span>
                </Link>
              )}

              <WorkShareActions
                authorName={work.authorName}
                genre={work.genre}
                title={work.title}
                workSlug={work.slug}
              />

              {canFavorite && (
                <form action={toggleFavoriteAction}>
                  <input name="workId" type="hidden" value={work.id} />

                  <input
                    name="returnPath"
                    type="hidden"
                    value={bookContextPath}
                  />
                  <button className="button button--outline" type="submit">
                    {isFavorite
                      ? "Beğeniyi Kaldır"
                      : "Beğen"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <div className="showcase-content-grid">
          <div className="showcase-main-column">
            <section
              className="showcase-section"
              aria-labelledby="tanitim-basligi"
            >
              <div className="showcase-section__heading">
                <p>
                  {readingContent.showcase.introduction}
                </p>

                <h2 id="tanitim-basligi">
                  {readingContent.showcase.backCover}
                </h2>
              </div>

              <p className="showcase-synopsis">
                {work.description ??
                  "Yazar bu eser için henüz bir tanıtım metni eklemedi."}
              </p>

              <ul
                className="showcase-tags"
                aria-label={readingContent.showcase.tags}
              >
                {Array.from(
                  new Set(
                    tags
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  ),
                ).map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </section>

            <section
              className="showcase-section"
              aria-labelledby="bolumler-basligi"
            >
              <div className="showcase-section__heading">
                <p>Okuma sırası</p>
                <h2 id="bolumler-basligi">Bölümler</h2>
              </div>

              {work.chapters.length > 0 ? (
                <div className="editor-review-list">
                  {work.chapters.map((chapter, index) => {
                    const readingMinutes = Math.max(
                      1,
                      Math.ceil(countWords(chapter.content) / 200),
                    );

                    return (
                      <article
                        className="editor-review-row"
                        key={chapter.id}
                      >
                        <div>
                          <span>{chapter.position}. Bölüm</span>
                          <h2>{chapter.title}</h2>
                          <p>{readingMinutes} dakika okuma</p>
                        </div>

                        <div className="editor-review-row__report">
                          <p>Yayında · Üyelikle okunabilir</p>
                        </div>

                        <Link
                          className="button button--outline"
                          href={`/oku/${work.slug}/bolum-${chapter.position}?from=${encodedBookContextPath}`}
                        >
                          {index === 0 ? "Okumaya Başla" : "Bölümü Oku"}
                        </Link>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <Card className="workspace-empty">
                  <h3>Henüz yayımlanmış bölüm bulunmuyor</h3>
                  <p>
                    Yazar ilk bölümü yayımladığında burada görünecek.
                  </p>
                </Card>
              )}
            </section>

            <section
              className="showcase-section"
              aria-labelledby="yorumlar-basligi"
            >
              <div className="showcase-section__heading showcase-section__heading--row">
                <div>
                  <p>
                    {
                      readingContent.showcase
                        .readerOpinions
                    }
                  </p>

                  <h2 id="yorumlar-basligi">
                    {
                      readingContent.showcase
                        .latestComments
                    }
                  </h2>
                </div>

                <span>
                  {comments.total.toLocaleString(
                    "tr-TR",
                  )} yorum
                </span>
              </div>

              <div
                className="showcase-comments"
                aria-label={
                  readingContent.showcase
                    .latestFiveComments
                }
              >
                <ReaderCommentList
                  emptyText="Bu eser için henüz okur yorumu yok."
                  feed={comments}
                />
              </div>
            </section>
          </div>

          <aside
            className="showcase-aside"
            aria-label={
              readingContent.showcase.authorInfo
            }
          >
            <Card
              className="showcase-author-card"
              id="yazar"
            >
              <p className="showcase-eyebrow">
                {readingContent.showcase.author}
              </p>

              <div className="showcase-author-card__identity">
                <span
                  className="showcase-avatar"
                  role="img"
                  aria-label={`${work.authorName} profil fotoğrafı`}
                >
                  {initials(work.authorName)}
                </span>

                <div>
                  <strong>{work.authorName}</strong>
                  <small>
                    {readingContent.showcase.novelist}
                  </small>
                </div>
              </div>

              <p>
                Yazarın keşfe açık yayımlanan eserlerini
                tek sayfada inceleyin.
              </p>

              <Link
                className="showcase-text-link"
                href={`/yazarlar/${work.authorPublicId}?from=${encodedBookContextPath}`}
              >
                Yazarın tüm eserleri <span aria-hidden="true">→</span>
              </Link>
            </Card>
          </aside>
        </div>

        <section
          className="showcase-similar"
          aria-labelledby="ayni-yazar-basligi"
        >
          <div className="showcase-section__heading">
            <p>Yazarın dünyası</p>
            <h2 id="ayni-yazar-basligi">
              Aynı Yazarın Diğer Eserleri
            </h2>
          </div>

          {work.sameAuthorWorks.length > 0 ? (
            <div className="showcase-similar__grid">
              {work.sameAuthorWorks.map((related, index) => (
                <Card
                  className="showcase-similar-card"
                  key={related.id}
                  variant="hover"
                >
                  <BookCover
                    compact
                    title={related.title}
                    variant={
                      (["one", "two", "three"] as const)[index % 3]
                    }
                  />
                  <div>
                    <span>{related.genre ?? "Tür belirtilmedi"}</span>
                    <h3>{related.title}</h3>
                    <p>{related.authorName}</p>
                    <Link
                      className="showcase-text-link"
                      href={`/kitap/${related.slug}?from=${encodedBookContextPath}`}
                    >
                      Eseri İncele <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="workspace-empty">
              <h3>Yazarın başka yayımlanmış eseri bulunmuyor</h3>
              <p>Yeni eserler yayımlandığında burada yer alacak.</p>
            </Card>
          )}
        </section>

        <section
          className="showcase-similar"
          id="benzer-eserler"
          aria-labelledby="benzer-basligi"
        >
          <div className="showcase-section__heading">
            <p>
              {readingContent.showcase.continueReading}
            </p>

            <h2 id="benzer-basligi">
              {readingContent.showcase.similarWorks}
            </h2>
          </div>

          {work.similarWorks.length > 0 ? (
            <div className="showcase-similar__grid">
              {work.similarWorks.map((related, index) => (
                <Card
                  className="showcase-similar-card"
                  key={related.id}
                  variant="hover"
                >
                  <BookCover
                    compact
                    title={related.title}
                    variant={
                      (["one", "two", "three"] as const)[index % 3]
                    }
                  />
                  <div>
                    <span>{related.genre ?? "Tür belirtilmedi"}</span>
                    <h3>{related.title}</h3>
                    <p>{related.authorName}</p>
                    <Link
                      className="showcase-text-link"
                      href={`/kitap/${related.slug}?from=${encodedBookContextPath}`}
                    >
                      Eseri İncele <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="workspace-empty">
              <h3>Benzer eser bulunmuyor</h3>
              <p>
                Aynı türde yeni eserler yayımlandığında burada yer alacak.
              </p>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
