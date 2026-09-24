"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { writerContent } from "@/content";
import { PublishedManuscriptViewport } from "@/features/reading/components/PublishedManuscriptViewport";
import type {
  PublishedBookItem,
  PublishedBookSnapshot,
} from "@/features/works/book-publication";
import { bookSectionDetails } from "@/features/works/book-structure";
import {
  PUBLICATION_LAYOUT_INPUT_NAME,
  parsePublicationLayout,
} from "@/features/works/publication-layout";
import {
  CHAPTER_FORMATTING_INPUT_NAME,
  hasChapterFormatting,
  parseChapterFormatting,
  type ChapterFormatting,
} from "@/features/works/rich-text-formatting";
import {
  getWriterBookPublicationPreview,
  type WriterBookPublicationPreview,
} from "../writer-publication-preview-store";

type PreviewSnapshot = {
  mode: "preview";
  chapterTitle: string;
  content: string;
  formatting: string;
  layout: string;
  workTitle: string;
};

type SuccessSnapshot = {
  mode: "success";
};

type PublishExperienceSnapshot = PreviewSnapshot | SuccessSnapshot;

const EMPTY_SNAPSHOT = "";
const COVER_SURFACE_ID = "__front_cover__";

function readPreviewSnapshot(): PreviewSnapshot | null {
  const preview = document.querySelector<HTMLElement>(
    ".publish-preview .preview-article",
  );

  if (!preview) return null;

  const chapterTitle =
    preview.querySelector<HTMLElement>(":scope > h1")?.textContent?.trim() ?? "";
  const workTitle =
    preview.querySelector<HTMLElement>(":scope > span")?.textContent?.trim() ?? "";
  const content =
    preview.querySelector<HTMLElement>(":scope > .preview-article__body")?.textContent ?? "";
  const form = document.querySelector<HTMLFormElement>(".publish-preview form");
  const layout =
    form?.querySelector<HTMLInputElement>(
      `input[name="${PUBLICATION_LAYOUT_INPUT_NAME}"]`,
    )?.value ?? "";
  const formatting =
    form?.querySelector<HTMLInputElement>(
      `input[name="${CHAPTER_FORMATTING_INPUT_NAME}"]`,
    )?.value ?? "";

  return {
    mode: "preview",
    chapterTitle,
    content,
    formatting,
    layout,
    workTitle,
  };
}

function getPublishExperienceSnapshot() {
  if (typeof document === "undefined") return EMPTY_SNAPSHOT;

  const preview = readPreviewSnapshot();
  if (preview) return JSON.stringify(preview);

  if (document.querySelector(".publish-success__content")) {
    return JSON.stringify({ mode: "success" } satisfies SuccessSnapshot);
  }

  return EMPTY_SNAPSHOT;
}

function getServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

function subscribePublishExperience(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => undefined;

  let frame = 0;
  let secondFrame = 0;

  const schedule = () => {
    window.cancelAnimationFrame(frame);
    window.cancelAnimationFrame(secondFrame);
    onStoreChange();
    frame = window.requestAnimationFrame(() => {
      onStoreChange();
      secondFrame = window.requestAnimationFrame(onStoreChange);
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });

  document.addEventListener("click", schedule, true);
  document.addEventListener("input", schedule, true);
  document.addEventListener("change", schedule, true);

  return () => {
    observer.disconnect();
    document.removeEventListener("click", schedule, true);
    document.removeEventListener("input", schedule, true);
    document.removeEventListener("change", schedule, true);
    window.cancelAnimationFrame(frame);
    window.cancelAnimationFrame(secondFrame);
  };
}

function bookItemLabel(item: PublishedBookItem) {
  if (item.type === "chapter") {
    return `${item.chapterPosition}. Bölüm · ${item.title}`;
  }

  const sectionLabel = bookSectionDetails[item.kind].label;
  return item.title.trim() === sectionLabel
    ? sectionLabel
    : `${sectionLabel} · ${item.title}`;
}

function pageStartForItem(book: PublishedBookSnapshot, itemIndex: number) {
  return (
    1 +
    book.items
      .slice(0, itemIndex)
      .reduce((total, item) => total + item.layout.pageEnds.length, 0)
  );
}

function parsePreviewFormatting(
  raw: string,
  content: string,
): ChapterFormatting | null {
  if (!raw) return null;
  try {
    const formatting = parseChapterFormatting(raw, content);
    return hasChapterFormatting(formatting) ? formatting : null;
  } catch {
    return null;
  }
}

function WriterFullBookPublicationPreview({
  book,
}: {
  book: WriterBookPublicationPreview;
}) {
  const [activeSurfaceId, setActiveSurfaceId] = useState(COVER_SURFACE_ID);
  const [startAtLastPage, setStartAtLastPage] = useState(false);
  const showingCover = activeSurfaceId === COVER_SURFACE_ID;
  const selectedIndex = book.items.findIndex(
    (item) => item.structureItemId === activeSurfaceId,
  );
  const boundedIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const activeItem = book.items[boundedIndex];
  const bookPageStart = useMemo(
    () => pageStartForItem(book, boundedIndex),
    [book, boundedIndex],
  );

  function showSurface(surfaceId: string, fromLastPage = false) {
    setStartAtLastPage(fromLastPage);
    setActiveSurfaceId(surfaceId);
  }

  if (!activeItem) return null;

  const atLastBookItem = !showingCover && boundedIndex >= book.items.length - 1;
  const previousBookLabel = showingCover
    ? "Başlangıç"
    : boundedIndex === 0
      ? "← Kapak"
      : "← Önceki Bölüm";
  const nextBookLabel = showingCover
    ? "İlk Bölüm →"
    : atLastBookItem
      ? "Kitabın Sonu"
      : "Sonraki Bölüm →";

  return (
    <div className="writer-publication-preview__book">
      <header className="writer-publication-preview__review-heading">
        <span>Yayın öncesi son kontrol</span>
        <strong>{showingCover ? "Kapak" : bookItemLabel(activeItem)}</strong>
        <p>
          Okurun göreceği canlı kitabı kapaktan başlayarak kontrol et. Kapak
          sayfa numarasına dahil değildir; içerik sayfa 1’den başlar.
        </p>
      </header>

      {showingCover ? (
        <div
          className="writer-publication-preview__cover"
          data-book-surface="front-cover"
          role="img"
          aria-label={`${book.workTitle} kapak önizlemesi`}
        >
          {book.coverUrl ? (
            <img
              className="writer-publication-preview__cover-image"
              src={book.coverUrl}
              alt={`${book.workTitle} kapak görseli`}
            />
          ) : (
            <div className="writer-publication-preview__cover-fallback">
              <span>İlkOku · Canlı Kitap</span>
              <strong>{book.workTitle}</strong>
              <small>Ön Kapak</small>
            </div>
          )}
        </div>
      ) : (
        <PublishedManuscriptViewport
          bookPageStart={bookPageStart}
          bookTotalPages={book.totalPages}
          chapterTitle={activeItem.title}
          content={activeItem.content}
          formatting={activeItem.type === "chapter" ? activeItem.formatting : null}
          identity="Yayın önizleme"
          key={`${activeItem.structureItemId}:${startAtLastPage ? "last" : "first"}`}
          layout={activeItem.layout}
          onNextBookPage={
            boundedIndex < book.items.length - 1
              ? () => {
                  const nextItem = book.items[boundedIndex + 1];
                  if (nextItem) showSurface(nextItem.structureItemId);
                }
              : undefined
          }
          onPreviousBookPage={
            boundedIndex > 0
              ? () => {
                  const previousItem = book.items[boundedIndex - 1];
                  if (previousItem) {
                    showSurface(previousItem.structureItemId, true);
                  }
                }
              : undefined
          }
          startAtLastPage={startAtLastPage}
          subtitle={activeItem.subtitle}
          workTitle={book.workTitle}
        />
      )}

      <nav
        aria-label="Yayın önizleme kitap yapısı"
        className="writer-publication-preview__book-nav"
      >
        <button
          disabled={showingCover}
          onClick={() => {
            if (boundedIndex === 0) {
              showSurface(COVER_SURFACE_ID);
              return;
            }

            const previousItem = book.items[boundedIndex - 1];
            if (previousItem) {
              showSurface(previousItem.structureItemId);
            }
          }}
          type="button"
        >
          {previousBookLabel}
        </button>

        <label>
          <span>Kitap yapısı</span>
          <select
            aria-label="Önizlenecek kitap yüzeyi veya bölümü"
            onChange={(event) => showSurface(event.target.value)}
            value={showingCover ? COVER_SURFACE_ID : activeItem.structureItemId}
          >
            <option value={COVER_SURFACE_ID}>Kapak</option>
            {book.items.map((item, index) => (
              <option key={item.structureItemId} value={item.structureItemId}>
                {index + 1}/{book.items.length} · {bookItemLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <button
          disabled={atLastBookItem}
          onClick={() => {
            if (showingCover) {
              showSurface(book.items[0]?.structureItemId ?? COVER_SURFACE_ID);
              return;
            }

            const nextItem =
              book.items[Math.min(book.items.length - 1, boundedIndex + 1)];
            if (nextItem) {
              showSurface(nextItem.structureItemId);
            }
          }}
          type="button"
        >
          {nextBookLabel}
        </button>
      </nav>
    </div>
  );
}

export function WriterPublishExperienceEnhancer() {
  const snapshot = useSyncExternalStore(
    subscribePublishExperience,
    getPublishExperienceSnapshot,
    getServerSnapshot,
  );

  const parsed = useMemo<PublishExperienceSnapshot | null>(() => {
    if (!snapshot) return null;

    try {
      return JSON.parse(snapshot) as PublishExperienceSnapshot;
    } catch {
      return null;
    }
  }, [snapshot]);

  if (!parsed || typeof document === "undefined") return null;

  if (parsed.mode === "success") {
    const successTarget = document.querySelector<HTMLElement>(
      ".publish-success__content",
    );

    if (!successTarget) return null;

    return createPortal(
      <Link
        className="button button--primary writer-post-publish-action"
        href="/eserlerim"
      >
        Eserlerime Dön
      </Link>,
      successTarget,
    );
  }

  const previewTarget = document.querySelector<HTMLElement>(
    ".publish-preview .preview-article",
  );

  if (!previewTarget || !parsed.layout || !parsed.content) return null;

  const fullBookPreview = getWriterBookPublicationPreview();
  if (fullBookPreview?.items.length) {
    return createPortal(
      <div
        className="writer-publication-preview"
        aria-label="Yazarın tam kitap yayın önizlemesi"
      >
        <WriterFullBookPublicationPreview book={fullBookPreview} />
      </div>,
      previewTarget,
    );
  }

  const publicationLayout = parsePublicationLayout(
    parsed.layout,
    parsed.content,
  );

  if (!publicationLayout) return null;
  const formatting = parsePreviewFormatting(parsed.formatting, parsed.content);

  return createPortal(
    <div
      className="writer-publication-preview"
      aria-label="Yazarın gerçek yayın önizlemesi"
    >
      <PublishedManuscriptViewport
        chapterTitle={parsed.chapterTitle}
        content={parsed.content}
        formatting={formatting}
        identity="Yayın önizleme"
        layout={publicationLayout}
        subtitle={writerContent.editor.subtitle}
        workTitle={parsed.workTitle}
      />
    </div>,
    previewTarget,
  );
}
