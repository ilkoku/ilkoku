"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";

import { READING_PAGE_PROGRESS_EVENT } from "../reading-display-mode";
import styles from "./PagedReadingViewport.module.css";

export function PagedReadingViewport({
  children,
  estimatedBookEndPage,
  estimatedBookStartPage,
  estimatedBookTotalPages,
  nextChapterHref,
  previousChapterHref,
  startAtLastPage = false,
}: {
  children: ReactNode;
  estimatedBookEndPage: number;
  estimatedBookStartPage: number;
  estimatedBookTotalPages: number;
  nextChapterHref?: string | null;
  previousChapterHref?: string | null;
  startAtLastPage?: boolean;
}) {
  const router = useRouter();
  const [pageCount, setPageCount] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const placeAtLastPageRef = useRef(startAtLastPage);

  const updateProgressDataset = useCallback((viewport: HTMLDivElement) => {
    const chapter = document.getElementById("bolum-metni");
    if (!chapter) return;

    const scrollable = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const progress =
      scrollable <= 0
        ? 100
        : Math.round((viewport.scrollTop / scrollable) * 100);

    chapter.dataset.readingMode = "paged";
    chapter.dataset.pageProgress = String(Math.min(100, Math.max(0, progress)));
    window.dispatchEvent(new Event(READING_PAGE_PROGRESS_EVENT));
  }, []);

  const measurePages = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const height = Math.max(1, viewport.clientHeight);
    const measured = Math.max(1, Math.ceil(viewport.scrollHeight / height));
    setPageCount(measured);

    if (placeAtLastPageRef.current) {
      const lastIndex = measured - 1;
      placeAtLastPageRef.current = false;
      setPageIndex(lastIndex);
      viewport.scrollTo({
        top: Math.max(0, viewport.scrollHeight - height),
        left: 0,
      });
      updateProgressDataset(viewport);
      return;
    }

    const currentIndex = Math.min(
      Math.max(0, Math.floor(viewport.scrollTop / height)),
      measured - 1,
    );
    setPageIndex(currentIndex);
    updateProgressDataset(viewport);
  }, [updateProgressDataset]);

  const scrollToPage = useCallback(
    (nextIndex: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const clamped = Math.min(
        Math.max(0, nextIndex),
        Math.max(0, pageCount - 1),
      );
      const top = Math.min(
        clamped * viewport.clientHeight,
        Math.max(0, viewport.scrollHeight - viewport.clientHeight),
      );

      setPageIndex(clamped);
      viewport.scrollTo({
        behavior: "smooth",
        left: 0,
        top,
      });
    },
    [pageCount],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    const frameElement = frameRef.current;
    if (!viewport) return;

    let frame = window.requestAnimationFrame(measurePages);
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measurePages);
    });
    observer.observe(viewport);
    if (frameElement) observer.observe(frameElement);

    if (document.fonts?.ready) {
      void document.fonts.ready.then(measurePages);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measurePages]);

  useEffect(() => {
    const chapter = document.getElementById("bolum-metni");
    return () => {
      if (!chapter) return;
      delete chapter.dataset.readingMode;
      delete chapter.dataset.pageProgress;
    };
  }, []);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const viewport = event.currentTarget;
    const height = Math.max(1, viewport.clientHeight);
    const nextIndex = Math.min(
      Math.max(0, Math.floor(viewport.scrollTop / height)),
      Math.max(0, pageCount - 1),
    );
    setPageIndex(nextIndex);
    updateProgressDataset(viewport);
  }

  function goPrevious() {
    if (pageIndex > 0) {
      scrollToPage(pageIndex - 1);
      return;
    }
    if (previousChapterHref) router.push(previousChapterHref);
  }

  function goNext() {
    if (pageIndex < pageCount - 1) {
      scrollToPage(pageIndex + 1);
      return;
    }
    if (nextChapterHref) router.push(nextChapterHref);
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
  const atFirstBookPage = pageIndex === 0 && !previousChapterHref;
  const atLastBookPage = pageIndex >= pageCount - 1 && !nextChapterHref;

  return (
    <div className={styles.shell}>
      <div
        aria-label="Okuma alanı"
        className={styles.viewport}
        onScroll={handleScroll}
        ref={viewportRef}
      >
        <div className={styles.frame} ref={frameRef}>
          {children}
        </div>
      </div>

      <nav aria-label="Sayfa geçişleri" className={styles.pageControls}>
        <button
          disabled={atFirstBookPage}
          onClick={goPrevious}
          type="button"
        >
          <span aria-hidden="true">←</span>
          Önceki Sayfa
        </button>

        <div aria-live="polite" className={styles.pageStatus}>
          <small>Sayfa</small>
          <strong>{pageIndex + 1} / {pageCount}</strong>
          <span>
            Tahmini kitap sayfası {estimatedCurrentBookPage} / {estimatedBookTotalPages}
          </span>
        </div>

        <button
          disabled={atLastBookPage}
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
