"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";

import {
  isReadingDisplayMode,
  READING_DISPLAY_MODE_EVENT,
  READING_DISPLAY_MODE_STORAGE_KEY,
  READING_PAGE_PROGRESS_EVENT,
  type ReadingDisplayMode,
} from "../reading-display-mode";
import styles from "./PagedReadingViewport.module.css";

const watermarkCopies = Array.from({ length: 12 }, (_, index) => index);

export function PagedReadingViewport({
  children,
  estimatedBookEndPage,
  estimatedBookStartPage,
  estimatedBookTotalPages,
  watermarkIdentity,
}: {
  children: ReactNode;
  estimatedBookEndPage: number;
  estimatedBookStartPage: number;
  estimatedBookTotalPages: number;
  watermarkIdentity: string;
}) {
  const [mode, setMode] = useState<ReadingDisplayMode>("scroll");
  const [pageCount, setPageCount] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measurePages = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || mode !== "paged") return;

    const width = Math.max(1, viewport.clientWidth);
    const measured = Math.max(
      1,
      Math.round(viewport.scrollWidth / width),
    );
    setPageCount(measured);
    setPageIndex((current) => Math.min(current, measured - 1));
  }, [mode]);

  const scrollToPage = useCallback((nextIndex: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const clamped = Math.min(
      Math.max(0, nextIndex),
      Math.max(0, pageCount - 1),
    );
    setPageIndex(clamped);
    viewport.scrollTo({
      behavior: "smooth",
      left: clamped * viewport.clientWidth,
      top: 0,
    });
  }, [pageCount]);

  useEffect(() => {
    const saved = window.localStorage.getItem(
      READING_DISPLAY_MODE_STORAGE_KEY,
    );
    if (isReadingDisplayMode(saved)) setMode(saved);

    function handleMode(event: Event) {
      const nextMode = (event as CustomEvent<unknown>).detail;
      if (isReadingDisplayMode(nextMode)) setMode(nextMode);
    }

    window.addEventListener(READING_DISPLAY_MODE_EVENT, handleMode);
    return () => {
      window.removeEventListener(READING_DISPLAY_MODE_EVENT, handleMode);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollTo({ left: 0, top: 0 });
    setPageIndex(0);

    if (mode !== "paged") {
      setPageCount(1);
      return;
    }

    let frame = window.requestAnimationFrame(measurePages);
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measurePages);
    });
    observer.observe(viewport);

    if (document.fonts?.ready) {
      void document.fonts.ready.then(measurePages);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measurePages, mode]);

  useEffect(() => {
    const chapter = document.getElementById("bolum-metni");
    if (!chapter) return;

    if (mode === "paged") {
      chapter.dataset.readingMode = "paged";
      chapter.dataset.pageProgress = String(
        Math.round(((pageIndex + 1) / Math.max(1, pageCount)) * 100),
      );
    } else {
      delete chapter.dataset.readingMode;
      delete chapter.dataset.pageProgress;
    }

    window.dispatchEvent(new Event(READING_PAGE_PROGRESS_EVENT));
  }, [mode, pageCount, pageIndex]);

  useEffect(() => () => {
    if (scrollTimerRef.current) {
      window.clearTimeout(scrollTimerRef.current);
    }
  }, []);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    if (mode !== "paged") return;

    const viewport = event.currentTarget;
    const width = Math.max(1, viewport.clientWidth);
    const nextIndex = Math.min(
      Math.max(0, Math.round(viewport.scrollLeft / width)),
      Math.max(0, pageCount - 1),
    );
    setPageIndex(nextIndex);

    if (scrollTimerRef.current) {
      window.clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = window.setTimeout(() => {
      viewport.scrollTo({
        behavior: "smooth",
        left: nextIndex * width,
        top: 0,
      });
    }, 120);
  }

  const estimatedChapterPageCount = Math.max(
    1,
    estimatedBookEndPage - estimatedBookStartPage + 1,
  );
  const estimatedBookPageOffset =
    pageCount <= 1
      ? 0
      : Math.round(
          (pageIndex / (pageCount - 1)) *
            (estimatedChapterPageCount - 1),
        );
  const estimatedCurrentBookPage = Math.min(
    estimatedBookEndPage,
    estimatedBookStartPage + estimatedBookPageOffset,
  );

  return (
    <div className={styles.shell} data-mode={mode}>
      <div
        aria-label={mode === "paged" ? "Sayfalı okuma alanı" : undefined}
        className={styles.viewport}
        onScroll={handleScroll}
        ref={viewportRef}
      >
        <div aria-hidden="true" className={styles.watermark}>
          {watermarkCopies.map((copy) => (
            <span key={copy}>
              {watermarkIdentity} · İlkOku güvenli okuma
            </span>
          ))}
        </div>
        <div className={styles.frame}>{children}</div>
      </div>

      <nav
        aria-label="Sayfa geçişleri"
        className={styles.pageControls}
      >
        <button
          disabled={pageIndex === 0}
          onClick={() => scrollToPage(pageIndex - 1)}
          type="button"
        >
          <span aria-hidden="true">←</span>
          Önceki Sayfa
        </button>

        <div aria-live="polite" className={styles.pageStatus}>
          <small>Sayfalı Okuma</small>
          <strong>
            Sayfa {pageIndex + 1} / {pageCount}
          </strong>
          <span>
            Tahmini kitap sayfası {estimatedCurrentBookPage} / {estimatedBookTotalPages}
          </span>
        </div>

        <button
          disabled={pageIndex >= pageCount - 1}
          onClick={() => scrollToPage(pageIndex + 1)}
          type="button"
        >
          Sonraki Sayfa
          <span aria-hidden="true">→</span>
        </button>
      </nav>
    </div>
  );
}
