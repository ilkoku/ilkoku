"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";

import {
  splitPublishedPages,
  type PublicationFont,
  type PublicationLayoutSnapshot,
} from "@/features/works/publication-layout";
import type { PersonalBookAnnotationRecord } from "../personal-book-annotation-types";
import { parsePersonalPagePointAnchor } from "../personal-page-point-anchor";
import { READING_PAGE_PROGRESS_EVENT } from "../reading-display-mode";
import { usePublishedBookTools } from "./PublishedBookToolsContinuity";
import styles from "./PublishedManuscriptViewport.module.css";

const fontFamilies: Record<PublicationFont, string> = {
  typewriter:
    '\"Courier New\", Courier, ui-monospace, \"SFMono-Regular\", Menlo, Consolas, monospace',
  serif: 'Georgia, \"Times New Roman\", Times, serif',
  sans: 'var(--font-inter), Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif',
};

const watermarkCopies = Array.from({ length: 24 }, (_, index) => index);

type PageTextSegment = {
  annotations: PersonalBookAnnotationRecord[];
  end: number;
  start: number;
  text: string;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function buildPageSegments({
  annotations,
  content,
  pageEnd,
  pageStart,
}: {
  annotations: PersonalBookAnnotationRecord[];
  content: string;
  pageEnd: number;
  pageStart: number;
}) {
  const textAnnotations = annotations.filter(
    (annotation) =>
      typeof annotation.startOffset === "number" &&
      typeof annotation.endOffset === "number" &&
      annotation.startOffset < pageEnd &&
      annotation.endOffset > pageStart,
  );
  const boundaries = new Set<number>([pageStart, pageEnd]);

  for (const annotation of textAnnotations) {
    boundaries.add(Math.max(pageStart, annotation.startOffset as number));
    boundaries.add(Math.min(pageEnd, annotation.endOffset as number));
  }

  const sorted = [...boundaries].sort((left, right) => left - right);
  const segments: PageTextSegment[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (end <= start) continue;
    segments.push({
      annotations: textAnnotations.filter(
        (annotation) =>
          (annotation.startOffset as number) < end &&
          (annotation.endOffset as number) > start,
      ),
      end,
      start,
      text: content.slice(start, end),
    });
  }

  return segments;
}

function textOffsetWithin(element: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.setEnd(node, offset);
  return range.toString().length;
}

export function PublishedManuscriptViewport({
  chapterTitle,
  content,
  identity,
  layout,
  nextChapterHref,
  previousChapterHref,
  startAtLastPage = false,
  subtitle,
  workTitle,
}: {
  chapterTitle: string;
  content: string;
  identity: string;
  layout: PublicationLayoutSnapshot;
  nextChapterHref?: string | null;
  previousChapterHref?: string | null;
  startAtLastPage?: boolean;
  subtitle?: string | null;
  workTitle: string;
}) {
  const router = useRouter();
  const tools = usePublishedBookTools();
  const pages = useMemo(
    () => splitPublishedPages(content, layout),
    [content, layout],
  );
  const [pageIndex, setPageIndex] = useState(() =>
    startAtLastPage ? Math.max(0, pages.length - 1) : 0,
  );
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pageTextRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const request = tools?.navigateRequest;
    if (!request) return;

    if (typeof request.pageIndex === "number") {
      setPageIndex(Math.min(Math.max(0, request.pageIndex), Math.max(0, pages.length - 1)));
      return;
    }

    if (typeof request.startOffset === "number") {
      const targetIndex = pages.findIndex(
        (page, index) =>
          request.startOffset! >= page.start &&
          (request.startOffset! < page.end ||
            (index === pages.length - 1 && request.startOffset === page.end)),
      );
      if (targetIndex >= 0) setPageIndex(targetIndex);
    }
  }, [pages, tools?.navigateRequest]);

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
  const annotations = tools?.annotations ?? [];
  const activeTool = tools?.activeTool ?? null;
  const textSelectionMode =
    activeTool === "highlight" ||
    activeTool === "underline" ||
    activeTool === "note";
  const pointMode = activeTool === "pin" || activeTool === "reading_position";
  const eraserMode = activeTool === "eraser";
  const pageSegments = buildPageSegments({
    annotations,
    content,
    pageEnd: activePage.end,
    pageStart: activePage.start,
  });
  const pagePointAnnotations = annotations
    .map((annotation) => ({
      annotation,
      point: parsePersonalPagePointAnchor(annotation.pathData),
    }))
    .filter(
      (entry) => entry.point && entry.point.pageIndex === pageIndex,
    );

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

  function handleTextSelectionEnd() {
    if (!tools || !textSelectionMode) return;
    window.requestAnimationFrame(() => {
      const element = pageTextRef.current;
      const selection = window.getSelection();
      if (
        !element ||
        !selection ||
        selection.rangeCount !== 1 ||
        selection.isCollapsed
      ) {
        tools.setStatus("Metin seçimi yakalanamadı. Tekrar deneyebilirsin.");
        return;
      }

      const range = selection.getRangeAt(0);
      if (
        !element.contains(range.startContainer) ||
        !element.contains(range.endContainer)
      ) {
        tools.setStatus("İşaretlemek için yalnızca kitap metni içinden seçim yap.");
        return;
      }

      const localStart = textOffsetWithin(
        element,
        range.startContainer,
        range.startOffset,
      );
      const localEnd = textOffsetWithin(
        element,
        range.endContainer,
        range.endOffset,
      );
      const startOffset = activePage.start + Math.min(localStart, localEnd);
      const endOffset = activePage.start + Math.max(localStart, localEnd);
      const selectedText = content.slice(startOffset, endOffset);

      if (!selectedText || endOffset <= startOffset) {
        tools.setStatus("Metin seçimi doğrulanamadı.");
        return;
      }

      void tools.applyTextAnchor({ endOffset, selectedText, startOffset }).then(
        (saved) => {
          if (saved && activeTool !== "note") selection.removeAllRanges();
        },
      );
    });
  }

  function handlePagePoint(event: ReactPointerEvent<HTMLElement>) {
    if (!tools || !pointMode || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest("[data-personal-book-annotation='true']")
    ) {
      return;
    }
    const rectangle = event.currentTarget.getBoundingClientRect();
    void tools.applyPagePointAnchor({
      pageIndex,
      x: clamp01((event.clientX - rectangle.left) / Math.max(1, rectangle.width)),
      y: clamp01((event.clientY - rectangle.top) / Math.max(1, rectangle.height)),
    });
  }

  function segmentClass(segment: PageTextSegment) {
    return [
      segment.annotations.some((item) => item.type === "highlight")
        ? styles.annotationHighlight
        : "",
      segment.annotations.some((item) => item.type === "underline")
        ? styles.annotationUnderline
        : "",
      segment.annotations.some((item) => item.type === "note")
        ? styles.annotationNote
        : "",
      segment.annotations.length > 0 ? styles.annotationText : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function handleSegmentClick(
    event: ReactPointerEvent<HTMLSpanElement>,
    segment: PageTextSegment,
  ) {
    if (!tools || segment.annotations.length === 0) return;
    const annotation =
      segment.annotations.find((item) => item.type === "note") ??
      segment.annotations[segment.annotations.length - 1];

    if (eraserMode) {
      event.preventDefault();
      event.stopPropagation();
      void tools.deleteAnnotation(annotation.id);
      return;
    }

    if (annotation.type === "note") {
      event.stopPropagation();
      tools.setOpenNoteId(annotation.id);
    }
  }

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
            data-personal-book-tool={activeTool ?? "none"}
            data-text-selection={textSelectionMode ? "true" : "false"}
            onContextMenu={blockInteraction}
            onCopy={blockInteraction}
            onCut={blockInteraction}
            onDragStart={blockInteraction}
            onPointerUp={handlePagePoint}
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
                {subtitle ? <p>{subtitle}</p> : null}
              </header>
            ) : null}

            <div
              className={styles.pageText}
              onPointerUp={handleTextSelectionEnd}
              ref={pageTextRef}
              style={bodyStyle}
            >
              {pageSegments.map((segment) => (
                <span
                  className={segmentClass(segment)}
                  data-personal-book-annotation={
                    segment.annotations.length > 0 ? "true" : undefined
                  }
                  key={`${segment.start}-${segment.end}`}
                  onPointerUp={(event) => handleSegmentClick(event, segment)}
                >
                  {segment.text}
                </span>
              ))}
            </div>

            {pagePointAnnotations.map(({ annotation, point }) =>
              point ? (
                <button
                  aria-label={
                    annotation.type === "reading_position"
                      ? "Kaldığım yer işareti"
                      : "Kişisel iğne"
                  }
                  className={styles.pointAnnotation}
                  data-personal-book-annotation="true"
                  data-reading-position={
                    annotation.type === "reading_position" ? "true" : "false"
                  }
                  key={annotation.id}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (eraserMode) void tools?.deleteAnnotation(annotation.id);
                  }}
                  style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
                  type="button"
                >
                  <span aria-hidden="true">
                    {annotation.type === "reading_position" ? "⌑" : "⌖"}
                  </span>
                </button>
              ) : null,
            )}

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
