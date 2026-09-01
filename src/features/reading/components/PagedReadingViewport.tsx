"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type UIEvent,
} from "react";

import type { PersonalDrawingPoint } from "../personal-annotation-types";
import {
  PERSONAL_PAGE_POINT_NAVIGATE_EVENT,
  parsePersonalPagePointAnchor,
} from "../personal-page-point-anchor";
import { READING_PAGE_PROGRESS_EVENT } from "../reading-display-mode";
import { usePersonalReadingTools } from "./PersonalReadingToolsProvider";
import styles from "./PagedReadingViewport.module.css";

type DraftPageStroke = {
  pointerId: number;
  points: PersonalDrawingPoint[];
  token: number;
};

type ViewportMetrics = {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function parseDrawingPoints(pathData: string | null) {
  if (!pathData) return [];

  try {
    const parsed = JSON.parse(pathData) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (point): point is PersonalDrawingPoint =>
          typeof point === "object" &&
          point !== null &&
          typeof (point as PersonalDrawingPoint).x === "number" &&
          typeof (point as PersonalDrawingPoint).y === "number",
      )
      .map((point) => ({
        x: clamp01(point.x),
        y: clamp01(point.y),
      }))
      .slice(0, 512);
  } catch {
    return [];
  }
}

function normalizedBookPoint(
  viewport: HTMLDivElement,
  clientX: number,
  clientY: number,
): PersonalDrawingPoint {
  const rectangle = viewport.getBoundingClientRect();
  const localY = clientY - rectangle.top;

  return {
    x: clamp01((clientX - rectangle.left) / Math.max(1, rectangle.width)),
    y: clamp01(
      (viewport.scrollTop + localY) / Math.max(1, viewport.scrollHeight),
    ),
  };
}

function projectedPointsAttribute(
  points: PersonalDrawingPoint[],
  metrics: ViewportMetrics,
) {
  return points
    .map((point) => {
      const localY =
        (point.y * metrics.scrollHeight - metrics.scrollTop) /
        Math.max(1, metrics.clientHeight);
      return `${point.x * 1000},${localY * 1000}`;
    })
    .join(" ");
}

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
  const tools = usePersonalReadingTools();
  const annotations = tools?.annotations ?? [];
  const [pageCount, setPageCount] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [viewportMetrics, setViewportMetrics] = useState<ViewportMetrics>({
    clientHeight: 1,
    scrollHeight: 1,
    scrollTop: 0,
  });
  const [draftStroke, setDraftStroke] = useState<DraftPageStroke | null>(null);
  const draftStrokeRef = useRef<DraftPageStroke | null>(null);
  const drawingTokenRef = useRef(0);
  const deletingDrawingIdsRef = useRef(new Set<string>());
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const placeAtLastPageRef = useRef(startAtLastPage);
  const drawingMode = tools?.activeTool === "pen";
  const eraserMode = tools?.activeTool === "eraser";
  const pointMode =
    tools?.activeTool === "pin" ||
    tools?.activeTool === "reading_position";
  const pageDrawings = annotations.filter(
    (annotation) =>
      annotation.type === "drawing" && annotation.paragraphIndex === 0,
  );
  const pagePoints = annotations.flatMap((annotation) => {
    if (
      annotation.type !== "pin" &&
      annotation.type !== "reading_position"
    ) {
      return [];
    }

    const anchor = parsePersonalPagePointAnchor(annotation.pathData);
    return anchor ? [{ anchor, annotation }] : [];
  });
  const visiblePagePoints = pagePoints.filter(
    (entry) => entry.anchor.pageIndex === pageIndex,
  );

  const syncViewportMetrics = useCallback((viewport: HTMLDivElement) => {
    setViewportMetrics({
      clientHeight: Math.max(1, viewport.clientHeight),
      scrollHeight: Math.max(1, viewport.scrollHeight),
      scrollTop: viewport.scrollTop,
    });
  }, []);

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
      syncViewportMetrics(viewport);
      updateProgressDataset(viewport);
      return;
    }

    const currentIndex = Math.min(
      Math.max(0, Math.floor(viewport.scrollTop / height)),
      measured - 1,
    );
    setPageIndex(currentIndex);
    syncViewportMetrics(viewport);
    updateProgressDataset(viewport);
  }, [syncViewportMetrics, updateProgressDataset]);

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

  useEffect(() => {
    function navigateToPoint(event: Event) {
      const detail = (event as CustomEvent<{
        annotationId?: string;
        pageIndex?: number;
      }>).detail;
      if (!Number.isInteger(detail?.pageIndex)) return;

      scrollToPage(detail.pageIndex as number);
      if (!detail.annotationId) return;

      window.setTimeout(() => {
        document
          .querySelector<HTMLButtonElement>(
            `[data-page-point-annotation="${detail.annotationId}"]`,
          )
          ?.focus();
      }, 380);
    }

    window.addEventListener(
      PERSONAL_PAGE_POINT_NAVIGATE_EVENT,
      navigateToPoint,
    );
    return () =>
      window.removeEventListener(
        PERSONAL_PAGE_POINT_NAVIGATE_EVENT,
        navigateToPoint,
      );
  }, [scrollToPage]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const viewport = event.currentTarget;
    const height = Math.max(1, viewport.clientHeight);
    const nextIndex = Math.min(
      Math.max(0, Math.floor(viewport.scrollTop / height)),
      Math.max(0, pageCount - 1),
    );
    setPageIndex(nextIndex);
    syncViewportMetrics(viewport);
    updateProgressDataset(viewport);
  }

  function placePagePoint(event: ReactPointerEvent<HTMLDivElement>) {
    if (!tools || !pointMode || event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest("[data-page-point-annotation]")) return;

    event.preventDefault();
    const rectangle = event.currentTarget.getBoundingClientRect();
    void tools.applyPagePointAnchor({
      pageIndex,
      x: clamp01(
        (event.clientX - rectangle.left) / Math.max(1, rectangle.width),
      ),
      y: clamp01(
        (event.clientY - rectangle.top) / Math.max(1, rectangle.height),
      ),
    });
  }

  function beginPageDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    if (!tools || !drawingMode || !viewport || event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = {
      pointerId: event.pointerId,
      points: [normalizedBookPoint(viewport, event.clientX, event.clientY)],
      token: ++drawingTokenRef.current,
    };
    draftStrokeRef.current = next;
    setDraftStroke(next);
  }

  function continuePageDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    const current = draftStrokeRef.current;
    if (
      !drawingMode ||
      !viewport ||
      !current ||
      current.pointerId !== event.pointerId ||
      current.points.length >= 512
    ) {
      return;
    }

    event.preventDefault();
    const point = normalizedBookPoint(viewport, event.clientX, event.clientY);
    const previous = current.points[current.points.length - 1];
    const distance = Math.hypot(
      (point.x - previous.x) * viewport.clientWidth,
      (point.y - previous.y) * viewport.scrollHeight,
    );
    if (distance < 2) return;

    const next = {
      ...current,
      points: [...current.points, point],
    };
    draftStrokeRef.current = next;
    setDraftStroke(next);
  }

  function finishPageDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    const current = draftStrokeRef.current;
    if (
      !tools ||
      !drawingMode ||
      !viewport ||
      !current ||
      current.pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();
    const point = normalizedBookPoint(viewport, event.clientX, event.clientY);
    const points = [...current.points, point].slice(0, 512);
    const finishedStroke = { ...current, points };
    draftStrokeRef.current = finishedStroke;
    setDraftStroke(finishedStroke);

    if (points.length < 2) {
      draftStrokeRef.current = null;
      setDraftStroke(null);
      return;
    }

    const token = current.token;
    void tools.saveDrawing(0, points).then((saved) => {
      const currentDraft = draftStrokeRef.current;
      if (!currentDraft || currentDraft.token !== token) return;

      draftStrokeRef.current = null;
      setDraftStroke(null);

      if (!saved) {
        tools.setStatus(
          "Kalem çizgisi kaydedilemedi; çizgi geri alındı. Tekrar deneyebilirsin.",
        );
      }
    });
  }

  function cancelPageDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    const current = draftStrokeRef.current;
    if (current?.pointerId !== event.pointerId) return;
    draftStrokeRef.current = null;
    setDraftStroke(null);
  }

  function erasePageDrawing(
    annotationId: string,
    event: ReactPointerEvent<SVGPolylineElement>,
  ) {
    if (!tools || !eraserMode || deletingDrawingIdsRef.current.has(annotationId)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    deletingDrawingIdsRef.current.add(annotationId);
    void tools.deleteAnnotation(annotationId).finally(() => {
      deletingDrawingIdsRef.current.delete(annotationId);
    });
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

      <div
        aria-label={
          pointMode
            ? "Serbest kişisel işaret alanı"
            : drawingMode
              ? "Kalem çizim alanı"
              : "Kişisel işaret katmanı"
        }
        className={styles.pageToolLayer}
        data-eraser={eraserMode ? "true" : "false"}
        data-pen={drawingMode ? "true" : "false"}
        data-point={pointMode ? "true" : "false"}
        onPointerCancel={cancelPageDrawing}
        onPointerDown={(event) => {
          if (pointMode) {
            placePagePoint(event);
            return;
          }
          beginPageDrawing(event);
        }}
        onPointerMove={continuePageDrawing}
        onPointerUp={finishPageDrawing}
      >
        <svg
          aria-hidden="true"
          className={styles.pageDrawingSvg}
          preserveAspectRatio="none"
          viewBox="0 0 1000 1000"
        >
          {pageDrawings.map((annotation) => {
            const points = parseDrawingPoints(annotation.pathData);
            if (points.length < 2) return null;

            return (
              <polyline
                className={styles.pageDrawingPath}
                data-annotation-id={annotation.id}
                data-erasable={eraserMode ? "true" : "false"}
                fill="none"
                key={annotation.id}
                onPointerDown={(event) =>
                  erasePageDrawing(annotation.id, event)
                }
                onPointerEnter={(event) => {
                  if ((event.buttons & 1) !== 1) return;
                  erasePageDrawing(annotation.id, event);
                }}
                points={projectedPointsAttribute(points, viewportMetrics)}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {draftStroke ? (
            <polyline
              className={styles.pageDraftDrawingPath}
              fill="none"
              points={projectedPointsAttribute(
                draftStroke.points,
                viewportMetrics,
              )}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        {visiblePagePoints.map(({ anchor, annotation }) => {
          const readingPosition = annotation.type === "reading_position";
          const label = readingPosition ? "Kaldığım yer" : "Kişisel iğne";

          return (
            <button
              aria-label={label}
              className={styles.pagePointMarker}
              data-kind={annotation.type}
              data-page-point-annotation={annotation.id}
              key={annotation.id}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!tools) return;
                if (eraserMode) {
                  void tools.deleteAnnotation(annotation.id);
                  return;
                }
                tools.setStatus(label);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              style={{
                left: `${anchor.x * 100}%`,
                top: `${anchor.y * 100}%`,
              }}
              type="button"
            >
              {readingPosition ? "⌑" : "⌖"}
            </button>
          );
        })}
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
