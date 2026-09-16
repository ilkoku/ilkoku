"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import { getWriterBookPublicationPreview } from "../writer-publication-preview-store";

type PreviewSnapshot = {
  mode: "preview";
  chapterTitle: string;
  content: string;
  layout: string;
  workTitle: string;
};

type SuccessSnapshot = {
  mode: "success";
};

type PublishExperienceSnapshot = PreviewSnapshot | SuccessSnapshot;

const EMPTY_SNAPSHOT = "";

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
  const layout =
    document.querySelector<HTMLInputElement>(
      `.publish-preview form input[name="${PUBLICATION_LAYOUT_INPUT_NAME}"]`,
    )?.value ?? "";

  return {
    mode: "preview",
    chapterTitle,
    content,
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
  return item.type === "chapter"
    ? `${item.chapterPosition}. Bölüm · ${item.title}`
    : `${bookSectionDetails[item.kind].label} · ${item.title}`;
}

function pageStartForItem(book: PublishedBookSnapshot, itemIndex: number) {
  return (
    1 +
    book.items
      .slice(0, itemIndex)
      .reduce((total, item) => total + item.layout.pageEnds.length, 0)
  );
}

function WriterFullBookPublicationPreview({
  book,
}: {
  book: PublishedBookSnapshot;
}) {
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  useEffect(() => {
    setActiveItemIndex(0);
  }, [book]);

  const boundedIndex = Math.min(
    Math.max(0, activeItemIndex),
    Math.max(0, book.items.length - 1),
  );
  const activeItem = book.items[boundedIndex];
  const bookPageStart = useMemo(
    () => pageStartForItem(book, boundedIndex),
    [book, boundedIndex],
  );

  if (!activeItem) return null;

  return (
    <div className="writer-publication-preview__book">
      <header className="writer-publication-preview__review-heading">
        <span>Yayın öncesi son kontrol</span>
        <strong>{bookItemLabel(activeItem)}</strong>
        <p>
          Okurun göreceği fiziksel kitap sayfalarını kontrol et. Tüm kitap
          bölümlerini ve ek sayfaları gezdikten sonra yayını onaylayabilirsin.
        </p>
      </header>

      <PublishedManuscriptViewport
        bookPageStart={bookPageStart}
        bookTotalPages={book.totalPages}
        chapterTitle={activeItem.title}
        content={activeItem.content}
        identity="Yayın önizleme"
        layout={activeItem.layout}
        subtitle={activeItem.subtitle}
        workTitle={book.workTitle}
      />

      <nav
        aria-label="Yayın önizleme kitap sırası"
        className="writer-publication-preview__book-nav"
      >
        <button
          disabled={boundedIndex === 0}
          onClick={() => setActiveItemIndex((current) => Math.max(0, current - 1))}
          type="button"
        >
          ← Önceki bölüm / sayfa
        </button>

        <label>
          <span>Kitap sırası</span>
          <select
            aria-label="Önizlenecek kitap bölümü veya sayfası"
            onChange={(event) => setActiveItemIndex(Number(event.target.value))}
            value={boundedIndex}
          >
            {book.items.map((item, index) => (
              <option key={item.structureItemId} value={index}>
                {index + 1}/{book.items.length} · {bookItemLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <button
          disabled={boundedIndex >= book.items.length - 1}
          onClick={() =>
            setActiveItemIndex((current) =>
              Math.min(book.items.length - 1, current + 1),
            )
          }
          type="button"
        >
          Sonraki bölüm / sayfa →
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

  return createPortal(
    <div
      className="writer-publication-preview"
      aria-label="Yazarın gerçek yayın önizlemesi"
    >
      <PublishedManuscriptViewport
        chapterTitle={parsed.chapterTitle}
        content={parsed.content}
        identity="Yayın önizleme"
        layout={publicationLayout}
        subtitle={writerContent.editor.subtitle}
        workTitle={parsed.workTitle}
      />
    </div>,
    previewTarget,
  );
}
