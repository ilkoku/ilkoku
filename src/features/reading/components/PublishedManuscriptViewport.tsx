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
import {
  publishedBookItemHref,
  type PublishedBookItem,
} from "@/features/works/book-publication";
import type {
  ChapterFormatting,
  InlineMarkType,
} from "@/features/works/rich-text-formatting";
import type { PersonalBookAnnotationRecord } from "../personal-book-annotation-types";
import { parsePersonalPagePointAnchor } from "../personal-page-point-anchor";
import { READING_PAGE_PROGRESS_EVENT } from "../reading-display-mode";
import { usePublishedBookTools } from "./PublishedBookToolsContinuity";
import styles from "./PublishedManuscriptViewport.module.css";

const fontFamilies: Record<PublicationFont, string> = {
  typewriter:
    '"Courier New", Courier, ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  serif: 'Georgia, "Times New Roman", Times, serif',
  sans: 'var(--font-inter), Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const watermarkCopies = Array.from({ length: 12 }, (_, index) => index);
const BOOK_MODE_STORAGE_KEY = "ilkoku:published-book-display-mode:v1";
type BookDisplayMode = "book" | "single";

type BookPage = {
  content: string;
  formatting: ChapterFormatting | null;
  globalNumber: number;
  itemId: string;
  layout: PublicationLayoutSnapshot;
  localIndex: number;
  pageEnd: number;
  pageStart: number;
  subtitle: string | null;
  title: string;
};

type PageTextSegment = {
  annotations: PersonalBookAnnotationRecord[];
  end: number;
  fontSize: number | null;
  marks: InlineMarkType[];
  start: number;
  text: string;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function buildPageSegments({
  annotations,
  content,
  formatting,
  pageEnd,
  pageStart,
}: {
  annotations: PersonalBookAnnotationRecord[];
  content: string;
  formatting?: ChapterFormatting | null;
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

  for (const mark of formatting?.marks ?? []) {
    if (mark.start >= pageEnd || mark.end <= pageStart) continue;
    boundaries.add(Math.max(pageStart, mark.start));
    boundaries.add(Math.min(pageEnd, mark.end));
  }

  for (const fontSize of formatting?.fontSizes ?? []) {
    if (fontSize.start >= pageEnd || fontSize.end <= pageStart) continue;
    boundaries.add(Math.max(pageStart, fontSize.start));
    boundaries.add(Math.min(pageEnd, fontSize.end));
  }

  const sorted = [...boundaries].sort((left, right) => left - right);
  const segments: PageTextSegment[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (end <= start) continue;

    const activeMarks = (formatting?.marks ?? [])
      .filter((mark) => mark.start <= start && mark.end >= end)
      .map((mark) => mark.type);
    const fontSize = [...(formatting?.fontSizes ?? [])]
      .reverse()
      .find((item) => item.start <= start && item.end >= end)?.size ?? null;

    segments.push({
      annotations: textAnnotations.filter(
        (annotation) =>
          (annotation.startOffset as number) < end &&
          (annotation.endOffset as number) > start,
      ),
      end,
      fontSize,
      marks: activeMarks,
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
  activeItemId,
  bookItems,
  bookPageStart = 1,
  bookTotalPages,
  chapterTitle,
  content,
  encodedReturnTo,
  formatting = null,
  identity,
  initialBookPage = null,
  layout,
  nextChapterHref,
  onNextBookPage,
  onPreviousBookPage,
  previousChapterHref,
  startAtLastPage = false,
  subtitle,
  workSlug,
  workTitle,
}: {
  activeItemId?: string;
  bookItems?: PublishedBookItem[] | null;
  bookPageStart?: number;
  bookTotalPages?: number;
  chapterTitle: string;
  content: string;
  encodedReturnTo?: string;
  formatting?: ChapterFormatting | null;
  identity: string;
  initialBookPage?: number | null;
  layout: PublicationLayoutSnapshot;
  nextChapterHref?: string | null;
  onNextBookPage?: (() => void) | null;
  onPreviousBookPage?: (() => void) | null;
  previousChapterHref?: string | null;
  startAtLastPage?: boolean;
  subtitle?: string | null;
  workSlug?: string;
  workTitle: string;
}) {
  const router = useRouter();
  const tools = usePublishedBookTools();
  const pages = useMemo(() => splitPublishedPages(content, layout), [content, layout]);
  const currentItemId = activeItemId ?? "current-publication-item";
  const initialIndex = () => startAtLastPage
    ? Math.max(0, pages.length - 1)
    : typeof initialBookPage === "number" &&
      initialBookPage >= bookPageStart &&
      initialBookPage < bookPageStart + pages.length
      ? initialBookPage - bookPageStart
      : 0;
  const [pageIndex, setPageIndex] = useState(initialIndex);
  const [displayMode, setDisplayMode] = useState<BookDisplayMode>("book");
  const [isNarrow, setIsNarrow] = useState(false);
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BOOK_MODE_STORAGE_KEY);
      if (saved === "book" || saved === "single") setDisplayMode(saved);
    } catch {
      // Private browsing without storage still supports both reader modes.
    }
    const media = window.matchMedia("(max-width: 58rem)");
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setPageIndex(initialIndex());
    // The route may change the physical page without remounting this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBookPage, startAtLastPage, bookPageStart, content]);

  function chooseMode(next: BookDisplayMode) {
    setDisplayMode(next);
    try {
      window.localStorage.setItem(BOOK_MODE_STORAGE_KEY, next);
    } catch {
      // The choice remains available during this session.
    }
  }

  // The published snapshot is already commerce-redacted on the server. Never
  // regenerate page boundaries or expose text from a locked chapter here.
  const bookPages = useMemo(() => {
    if (bookItems?.length) {
      let globalNumber = 0;
      return bookItems.flatMap((item) => splitPublishedPages(item.content, item.layout).map((page, index) => ({
        content: item.content,
        formatting: item.type === "chapter" ? (item.formatting ?? null) : null,
        globalNumber: ++globalNumber,
        itemId: item.structureItemId,
        layout: item.layout,
        localIndex: index,
        pageEnd: page.end,
        pageStart: page.start,
        subtitle: item.subtitle,
        title: item.title,
      } satisfies BookPage)));
    }
    return pages.map((page, index) => ({
      content,
      formatting,
      globalNumber: bookPageStart + index,
      itemId: currentItemId,
      layout,
      localIndex: index,
      pageEnd: page.end,
      pageStart: page.start,
      subtitle: subtitle ?? null,
      title: chapterTitle,
    } satisfies BookPage));
  }, [bookItems, bookPageStart, chapterTitle, content, currentItemId, formatting, layout, pages, subtitle]);

  const globalPageNumber = bookPageStart + pageIndex;
  const globalPageTotal = Math.max(globalPageNumber, bookTotalPages ?? bookPages.length);
  const spreadMode = displayMode === "book" && !isNarrow;
  const leftNumber = globalPageNumber % 2 === 0 ? globalPageNumber : globalPageNumber - 1;
  const visibleNumbers = useMemo(() => spreadMode
    ? [leftNumber, leftNumber + 1]
    : [globalPageNumber], [spreadMode, leftNumber, globalPageNumber]);
  const visiblePages = useMemo(() => visibleNumbers.map(
    (number) => bookPages.find((page) => page.globalNumber === number) ?? null,
  ), [visibleNumbers, bookPages]);
  const visibleCurrentIndices = visiblePages
    .filter((page): page is BookPage => page !== null && page.itemId === currentItemId)
    .map((page) => page.localIndex);
  const activeChapterProgress = Math.round(
    ((Math.max(pageIndex, ...visibleCurrentIndices) + 1) / Math.max(1, pages.length)) * 100,
  );

  const measureScale = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const referencePages = visiblePages.filter((page): page is BookPage => page !== null);
    const referenceWidth = Math.max(layout.page.width, ...referencePages.map((page) => page.layout.page.width));
    const referenceHeight = Math.max(layout.page.height, ...referencePages.map((page) => page.layout.page.height));
    const availableWidth = Math.max(1, stage.clientWidth - 8);
    const availableHeight = Math.max(540, window.innerHeight - 180);
    const naturalWidth = spreadMode ? referenceWidth * 2 + 24 : referenceWidth;
    const naturalHeight = referenceHeight;
    const nextScale = Math.min(
      spreadMode ? 1.55 : 1.8,
      availableWidth / naturalWidth,
      availableHeight / naturalHeight,
    );
    setScale(Math.max(0.2, nextScale));
  }, [layout.page.width, layout.page.height, spreadMode, visiblePages]);

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
    chapter.dataset.readingMode = "paged";
    chapter.dataset.pageProgress = String(activeChapterProgress);
    window.dispatchEvent(new Event(READING_PAGE_PROGRESS_EVENT));
    return () => {
      delete chapter.dataset.readingMode;
      delete chapter.dataset.pageProgress;
    };
  }, [activeChapterProgress]);

  useEffect(() => {
    const request = tools?.navigateRequest;
    if (!request) return;
    const frame = window.requestAnimationFrame(() => {
      if (typeof request.pageIndex === "number") {
        setPageIndex(Math.min(Math.max(0, request.pageIndex), Math.max(0, pages.length - 1)));
      } else if (typeof request.startOffset === "number") {
        const targetIndex = pages.findIndex((page, index) =>
          request.startOffset! >= page.start &&
          (request.startOffset! < page.end ||
            (index === pages.length - 1 && request.startOffset === page.end)),
        );
        if (targetIndex >= 0) setPageIndex(targetIndex);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pages, tools?.navigateRequest]);

  function blockInteraction(event: SyntheticEvent) {
    event.preventDefault();
  }

  const encodedBookReturn = encodedReturnTo ?? encodeURIComponent(workSlug ? `/kitap/${workSlug}` : "/eserler");
  const coverHref = workSlug
    ? `/oku/${workSlug}/kapak?from=${encodedBookReturn}`
    : null;
  const contentsHref = workSlug
    ? `/oku/${workSlug}/icindekiler?from=${encodedBookReturn}`
    : null;

  function navigateToGlobal(target: number) {
    if (target < 1) {
      if (coverHref) router.push(coverHref);
      else if (onPreviousBookPage) onPreviousBookPage();
      else if (previousChapterHref) router.push(previousChapterHref);
      return;
    }
    if (target > globalPageTotal) {
      if (onNextBookPage) onNextBookPage();
      else if (nextChapterHref) router.push(nextChapterHref);
      return;
    }
    const destination = bookPages.find((page) => page.globalNumber === target);
    if (!destination) {
      if (target < globalPageNumber && previousChapterHref) router.push(previousChapterHref);
      else if (nextChapterHref) router.push(nextChapterHref);
      return;
    }
    if (destination.itemId === currentItemId) {
      setPageIndex(destination.localIndex);
      return;
    }
    const item = bookItems?.find((candidate) => candidate.structureItemId === destination.itemId);
    if (item && workSlug) {
      router.push(
        `${publishedBookItemHref(workSlug, item)}?from=${encodedBookReturn}&sayfa=${target}`,
      );
    }
  }

  function goPrevious() {
    navigateToGlobal(spreadMode ? leftNumber - 1 : globalPageNumber - 1);
  }

  function goNext() {
    navigateToGlobal(spreadMode ? leftNumber + 2 : globalPageNumber + 1);
  }

  const annotations = tools?.annotations ?? [];
  const activeTool = tools?.activeTool ?? null;
  const textSelectionMode =
    activeTool === "highlight" || activeTool === "underline" || activeTool === "note";
  const pointMode = activeTool === "pin" || activeTool === "reading_position";
  const eraserMode = activeTool === "eraser";

  function handleTextSelectionEnd(
    event: ReactPointerEvent<HTMLDivElement>,
    page: BookPage,
  ) {
    if (!tools || !textSelectionMode || page.itemId !== currentItemId) return;
    const element = event.currentTarget;
    window.requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) {
        tools.setStatus("Metin seçimi yakalanamadı. Tekrar deneyebilirsin.");
        return;
      }
      const range = selection.getRangeAt(0);
      if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
        tools.setStatus("İşaretlemek için yalnızca kitap metni içinden seçim yap.");
        return;
      }
      const localStart = textOffsetWithin(element, range.startContainer, range.startOffset);
      const localEnd = textOffsetWithin(element, range.endContainer, range.endOffset);
      const startOffset = page.pageStart + Math.min(localStart, localEnd);
      const endOffset = page.pageStart + Math.max(localStart, localEnd);
      const selectedText = page.content.slice(startOffset, endOffset);
      if (!selectedText || endOffset <= startOffset) {
        tools.setStatus("Metin seçimi doğrulanamadı.");
        return;
      }
      void tools.applyTextAnchor({ endOffset, selectedText, startOffset }).then((saved) => {
        if (saved && activeTool !== "note") selection.removeAllRanges();
      });
    });
  }

  function handlePagePoint(event: ReactPointerEvent<HTMLElement>, page: BookPage) {
    if (!tools || page.itemId !== currentItemId || !pointMode || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest("[data-personal-book-annotation='true']")
    ) return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    void tools.applyPagePointAnchor({
      pageIndex: page.localIndex,
      x: clamp01((event.clientX - rectangle.left) / Math.max(1, rectangle.width)),
      y: clamp01((event.clientY - rectangle.top) / Math.max(1, rectangle.height)),
    });
  }

  function segmentClass(segment: PageTextSegment) {
    return [
      segment.annotations.some((item) => item.type === "highlight") ? styles.annotationHighlight : "",
      segment.annotations.some((item) => item.type === "underline") ? styles.annotationUnderline : "",
      segment.annotations.some((item) => item.type === "note") ? styles.annotationNote : "",
      segment.annotations.length > 0 ? styles.annotationText : "",
    ].filter(Boolean).join(" ");
  }

  function segmentStyle(segment: PageTextSegment) {
    return {
      fontSize: segment.fontSize ? `${segment.fontSize}px` : undefined,
      fontStyle: segment.marks.includes("italic") ? "italic" : undefined,
      fontWeight: segment.marks.includes("bold") ? 700 : undefined,
      textDecorationLine: segment.marks.includes("underline") ? "underline" : undefined,
    } satisfies CSSProperties;
  }

  function handleSegmentClick(
    event: ReactPointerEvent<HTMLSpanElement>,
    segment: PageTextSegment,
  ) {
    if (!tools || segment.annotations.length === 0) return;
    const annotation = segment.annotations.find((item) => item.type === "note")
      ?? segment.annotations[segment.annotations.length - 1];
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

  function paper(page: BookPage | null, slot: number) {
    const inCurrentItem = page?.itemId === currentItemId;
    const pageLayout = page?.layout ?? layout;
    const renderWidth = pageLayout.page.width * scale;
    const renderHeight = pageLayout.page.height * scale;
    if (!page) {
      return (
        <div aria-hidden="true" className={styles.blankFrame} key={`blank-${slot}`}
          style={{ width: `${renderWidth}px`, height: `${renderHeight}px` }} />
      );
    }
    const bodyBox = page.localIndex === 0
      ? pageLayout.page.firstBody
      : pageLayout.page.continuationBody;
    const fontFamily = fontFamilies[pageLayout.typography.font];
    const headerTop = Math.max(24, bodyBox.top - 118);
    const headerHeight = Math.max(0, bodyBox.top - headerTop - 10);
    const ownAnnotations = inCurrentItem ? annotations : [];
    const pageSegments = buildPageSegments({
      annotations: ownAnnotations,
      content: page.content,
      formatting: page.formatting,
      pageEnd: page.pageEnd,
      pageStart: page.pageStart,
    });
    const pagePointAnnotations = ownAnnotations
      .map((annotation) => ({
        annotation,
        point: parsePersonalPagePointAnchor(annotation.pathData),
      }))
      .filter((entry) => entry.point && entry.point.pageIndex === page.localIndex);
    const locked = !page.content && page.pageEnd > page.pageStart;
    return (
      <div className={styles.pageFrame} key={page.globalNumber}
        style={{ width: `${renderWidth}px`, height: `${renderHeight}px` }}>
        <article
          aria-label={`Yayın sayfası ${page.globalNumber} / ${globalPageTotal}`}
          className={styles.page}
          data-personal-book-tool={inCurrentItem ? (activeTool ?? "none") : "none"}
          data-text-selection={inCurrentItem && textSelectionMode ? "true" : "false"}
          data-book-visible-page={page.globalNumber}
          onContextMenu={blockInteraction}
          onCopy={blockInteraction}
          onCut={blockInteraction}
          onDragStart={blockInteraction}
          onPointerUp={(event) => handlePagePoint(event, page)}
          style={{
            width: `${pageLayout.page.width}px`,
            height: `${pageLayout.page.height}px`,
            transform: `scale(${scale})`,
          }}
        >
          {page.localIndex === 0 ? (
            <header className={styles.pageHeader} style={{
              fontFamily,
              height: `${headerHeight}px`,
              left: `${bodyBox.left}px`,
              top: `${headerTop}px`,
              width: `${bodyBox.width}px`,
            }}>
              <span>{workTitle}</span>
              <strong>{page.title}</strong>
              {page.subtitle ? <p>{page.subtitle}</p> : null}
            </header>
          ) : null}
          {locked ? (
            <div className={styles.lockedPage} role="note">
              Bu sayfayı okumak için erişim hakkı gerekli.
            </div>
          ) : (
            <div
              className={styles.pageText}
              onPointerUp={(event) => handleTextSelectionEnd(event, page)}
              style={{
                left: `${bodyBox.left}px`,
                top: `${bodyBox.top}px`,
                width: `${bodyBox.width}px`,
                height: `${bodyBox.height}px`,
                fontFamily,
                fontSize: `${pageLayout.typography.fontSize}px`,
                lineHeight: `${pageLayout.typography.lineHeight}px`,
                letterSpacing: `${pageLayout.typography.letterSpacing}px`,
              }}
            >
              {pageSegments.map((segment) => (
                <span
                  className={segmentClass(segment)}
                  data-personal-book-annotation={segment.annotations.length > 0 ? "true" : undefined}
                  key={`${segment.start}-${segment.end}`}
                  onPointerUp={(event) => {
                    if (inCurrentItem) handleSegmentClick(event, segment);
                  }}
                  style={segmentStyle(segment)}
                >
                  {segment.text}
                </span>
              ))}
            </div>
          )}
          {pagePointAnnotations.map(({ annotation, point }) => point ? (
            <button
              aria-label={annotation.type === "reading_position" ? "Kaldığım yer işareti" : "Kişisel iğne"}
              className={styles.pointAnnotation}
              data-personal-book-annotation="true"
              data-reading-position={annotation.type === "reading_position" ? "true" : "false"}
              key={annotation.id}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (eraserMode) void tools?.deleteAnnotation(annotation.id);
              }}
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
              type="button"
            >
              <span aria-hidden="true">{annotation.type === "reading_position" ? "⌑" : "⌖"}</span>
            </button>
          ) : null)}
          <div aria-hidden="true" className={styles.watermarkLayer}>
            {watermarkCopies.map((copy) => (
              <span key={copy}>{identity} · İlkOku güvenli okuma</span>
            ))}
          </div>
          <span aria-hidden="true" className={styles.pageNumber}>
            {page.globalNumber} / {globalPageTotal}
          </span>
        </article>
        {!inCurrentItem && (
          <button
            className={styles.activatePage}
            onClick={() => navigateToGlobal(page.globalNumber)}
            type="button"
          >Bu sayfayı aç ve işaretle</button>
        )}
      </div>
    );
  }

  return (
    <div
      className={styles.shell}
      data-book-display-mode={spreadMode ? "book" : "single"}
      data-book-page-number={globalPageNumber}
      data-book-page-total={globalPageTotal}
      data-publication-layout-version={layout.version}
      data-publication-page-count={pages.length}
    >
      <nav aria-label="Kitap görünümü ve bölümler" className={styles.bookToolbar}>
        <div aria-label="Okuma görünümü" className={styles.modeOptions} role="group">
          <button aria-pressed={displayMode === "book"} onClick={() => chooseMode("book")} type="button">
            Kitap
          </button>
          <button aria-pressed={displayMode === "single"} onClick={() => chooseMode("single")} type="button">
            Tek Sayfa
          </button>
        </div>
        <div className={styles.bookLinks}>
          {coverHref ? <button onClick={() => router.push(coverHref)} type="button">Kapak</button> : null}
          {contentsHref ? <button onClick={() => router.push(contentsHref)} type="button">İçindekiler</button> : null}
        </div>
      </nav>
      <div aria-label={spreadMode ? "Açık kitap" : "Tek kitap sayfası"}
        className={styles.stage} ref={stageRef}>
        <div className={spreadMode ? styles.spread : styles.singlePage}>
          {visiblePages.map((page, slot) => paper(page, slot))}
        </div>
      </div>
      <nav aria-label="Yayın sayfası geçişleri" className={styles.controls}>
        <button disabled={globalPageNumber <= 1 && !coverHref && !onPreviousBookPage && !previousChapterHref}
          onClick={goPrevious} type="button">
          <span aria-hidden="true">←</span> Önceki Sayfa
        </button>
        <div aria-live="polite" className={styles.status}>
          <strong>{spreadMode
            ? visiblePages.filter((page): page is BookPage => page !== null).map((page) => page.globalNumber).join("–")
            : globalPageNumber} / {globalPageTotal}</strong>
        </div>
        <button disabled={globalPageNumber >= globalPageTotal && !onNextBookPage && !nextChapterHref}
          onClick={goNext} type="button">
          Sonraki Sayfa <span aria-hidden="true">→</span>
        </button>
      </nav>
    </div>
  );
}
