"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";

import {
  splitPublishedPages,
  type PublicationFont,
  type PublicationLayoutSnapshot,
} from "@/features/works/publication-layout";
import { READING_PAGE_PROGRESS_EVENT } from "../reading-display-mode";
import styles from "./PublishedManuscriptViewport.module.css";

const fontFamilies: Record<PublicationFont, string> = {
  typewriter:
    '"Courier New", Courier, ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  serif: 'Georgia, "Times New Roman", Times, serif',
  sans: 'var(--font-inter), Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const watermarkCopies = Array.from({ length: 24 }, (_, index) => index);

export function PublishedManuscriptViewport({
  chapterTitle,
  content,
  identity,
  layout,
  nextChapterHref,
  previousChapterHref,
  startAtLastPage = false,
  workTitle,
}: {
  chapterTitle: string;
  content: string;
  identity: string;
  layout: PublicationLayoutSnapshot;
  nextChapterHref?: string | null;
  previousChapterHref?: string | null;
  startAtLastPage?: boolean;
  workTitle: string;
}) {
  const router = useRouter();
  const pages = useMemo(
    () => splitPublishedPages(content, layout),
    [content, layout],
  );
  const [pageIndex, setPageIndex] = useState(() =>
    startAtLastPage ? Math.max(0, pages.length - 1) : 0,
  );
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const measureScale = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const availableWidth = Math.max(1, stage.clientWidth);
    setScale(Math.min(1, availableWidth / layout.page.width));
  }, [layout.page.width]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const frame = window.requestAnimationFrame(measureScale);
    const observer = new ResizeObserver(measureScale);
    observer.observe(stage);
    window.addEventListener("resize", measureScale);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measureScale);
    };
  }, [measureScale]);

  useEffect(() => {
    const chapter = document.getElementById("bolum-metni");
    if (!chapter) return;

    const progress = Math.round(
      ((Math.min(pageIndex, pages.length - 1) + 1) /
        Math.max(1, pages.length)) *
        100,
    );
    chapter.dataset.readingMode = "paged";
    chapter.dataset.pageProgress = String(progress);
    window.dispatchEvent(new Event(READING_PAGE_PROGRESS_EVENT));

    return () => {
      delete chapter.dataset.readingMode;
      delete chapter.dataset.pageProgress;
    };
  }, [pageIndex, pages.length]);

  function blockInteraction(event: SyntheticEvent) {
    event.preventDefault();
  }

  function goPrevious() {
    if (pageIndex > 0) {
      setPageIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (previousChapterHref) router.push(previousChapterHref);
  }

  function goNext() {
    if (pageIndex < pages.length - 1) {
      setPageIndex((current) => Math.min(pages.length - 1, current + 1));
      return;
    }
    if (nextChapterHref) router.push(nextChapterHref);
  }

  const activePage = pages[pageIndex] ?? pages[0];
  if (!activePage) return null;

  const bodyBox =
    pageIndex === 0
      ? layout.page.firstBody
      : layout.page.continuationBody;
  const fontFamily = fontFamilies[layout.typography.font];
  const renderedWidth = layout.page.width * scale;
  const renderedHeight = layout.page.height * scale;
  const headerTop = Math.max(24, bodyBox.top - 118);
  const headerHeight = Math.max(0, bodyBox.top - headerTop - 10);

  const pageStyle = {
    width: `${layout.page.width}px`,
    height: `${layout.page.height}px`,
    transform: `scale(${scale})`,
  } satisfies CSSProperties;

  const bodyStyle = {
    left: `${bodyBox.left}px`,
    top: `${bodyBox.top}px`,
    width: `${bodyBox.width}px`,
    height: `${bodyBox.height}px`,
    fontFamily,
    fontSize: `${layout.typography.fontSize}px`,
    lineHeight: `${layout.typography.lineHeight}px`,
    letterSpacing: `${layout.typography.letterSpacing}px`,
  } satisfies CSSProperties;

  return (
    <div
      className={styles.shell}
      data-publication-layout-version={layout.version}
      data-publication-page-count={pages.length}
    >
      <div className={styles.stage} ref={stageRef}>
        <div
          className={styles.pageFrame}
          style={{
            height: `${renderedHeight}px`,
            width: `${renderedWidth}px`,
          }}
        >
          <article
            aria-label={`Yayın sayfası ${pageIndex + 1} / ${pages.length}`}
            className={styles.page}
            onContextMenu={blockInteraction}
            onCopy={blockInteraction}
            onCut={blockInteraction}
            onDragStart={blockInteraction}
            style={pageStyle}
          >
            {pageIndex === 0 ? (
              <header
                className={styles.pageHeader}
                style={{
                  fontFamily,
                  height: `${headerHeight}px`,
                  left: `${bodyBox.left}px`,
                  top: `${headerTop}px`,
                  width: `${bodyBox.width}px`,
                }}
              >
                <span>{workTitle}</span>
                <strong>{chapterTitle}</strong>
              </header>
            ) : null}

            <div className={styles.pageText} style={bodyStyle}>
              {activePage.text}
            </div>

            <div aria-hidden="true" className={styles.watermarkLayer}>
              {watermarkCopies.map((copy) => (
                <span key={copy}>
                  {identity} · İlkOku güvenli okuma
                </span>
              ))}
            </div>

            <span aria-hidden="true" className={styles.pageNumber}>
              {pageIndex + 1}
            </span>
          </article>
        </div>
      </div>

      <nav aria-label="Yayın sayfası geçişleri" className={styles.controls}>
        <button
          disabled={pageIndex === 0 && !previousChapterHref}
          onClick={goPrevious}
          type="button"
        >
          <span aria-hidden="true">←</span>
          Önceki Sayfa
        </button>

        <div aria-live="polite" className={styles.status}>
          <small>Yazarın yayın sayfası</small>
          <strong>{pageIndex + 1} / {pages.length}</strong>
        </div>

        <button
          disabled={pageIndex >= pages.length - 1 && !nextChapterHref}
          onClick={goNext}
          type="button"
        >
          Sonraki Sayfa
          <span aria-hidden="true">→</span>
        </button>
      </nav>
    </div>
  );
}
