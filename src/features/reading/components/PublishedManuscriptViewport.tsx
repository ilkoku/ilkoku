"use client";

import Link from "next/link";
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
import type { ReaderFacingPagePreview } from "../reader-book-outline";
import { parsePersonalPagePointAnchor } from "../personal-page-point-anchor";
import { READING_PAGE_PROGRESS_EVENT } from "../reading-display-mode";
import {
  findReaderPageForOffset,
  measureReaderA5PageEnds,
  readerTextPages,
  sourceOffsetForPagePoint,
} from "../reader-a5-reflow";
import { usePublishedBookTools } from "./PublishedBookToolsContinuity";
import styles from "./PublishedManuscriptViewport.module.css";

const fontFamilies: Record<PublicationFont, string> = {
  typewriter:
    '"Courier New", Courier, ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  serif: 'Georgia, "Times New Roman", Times, serif',
  sans: 'var(--font-inter), Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

// Reader-only paper standard. No authored publication snapshot or pageEnds is rewritten.
const A5_PAGE_WIDTH_PX = 559.37;
const A5_PAGE_HEIGHT_PX = 793.7;
const READER_BODY_FONT_SIZE_PX = 14.67; // 11 pt at 96 CSS pixels/inch
const READER_BODY_LINE_HEIGHT_PX = READER_BODY_FONT_SIZE_PX * 1.15;

function canonicalBodyBox(
  box: { left: number; top: number; width: number; height: number },
  publication: PublicationLayoutSnapshot,
) {
  const widthScale = A5_PAGE_WIDTH_PX / publication.page.width;
  const heightScale = A5_PAGE_HEIGHT_PX / publication.page.height;
  const top = box.top * heightScale;
  // Use all of the available A5 body down to the footer. Earlier large
  // manuscript pages may contain more text, but their immutable pageEnds
  // and paragraph offsets must not change when the Reader standardizes.
  const bodyBottomMargin = 42;
  return {
    left: box.left * widthScale,
    top,
    width: box.width * widthScale,
    height: Math.max(1, A5_PAGE_HEIGHT_PX - top - bodyBottomMargin),
  };
}

const watermarkCopies = Array.from({ length: 12 }, (_, index) => index);
const BOOK_MODE_STORAGE_KEY = "ilkoku:published-book-display-mode:v1";
type BookDisplayMode = "book" | "single";

type BookPage = {
  content: string;
  formatting: ChapterFormatting | null;
  globalNumber: number;
  publishedGlobalNumber: number;
  itemId: string;
  isContentsPage: boolean;
  isChapter: boolean;
  layout: PublicationLayoutSnapshot;
  localIndex: number;
  pageEnd: number;
  pageStart: number;
  previewText: string | null;
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
  facingPreviews = [],
  formatting = null,
  identity,
  initialBookPage = null,
  layout,
  readerModesEnabled = false,
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
  facingPreviews?: ReaderFacingPagePreview[];
  formatting?: ChapterFormatting | null;
  identity: string;
  initialBookPage?: number | null;
  layout: PublicationLayoutSnapshot;
  readerModesEnabled?: boolean;
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
  const latestAnnotationsRef = useRef(tools?.annotations ?? []);
  useEffect(() => {
    latestAnnotationsRef.current = tools?.annotations ?? [];
  }, [tools?.annotations]);
  const savedPages = useMemo(() => splitPublishedPages(content, layout), [content, layout]);
  const currentItemId = activeItemId ?? "current-publication-item";
  const isContentsItem = bookItems?.some(
    (item) => item.structureItemId === currentItemId &&
      item.type === "special" && item.kind === "toc",
  ) ?? false;
  const paginationKey = [
    currentItemId,
    content.length,
    layout.pageEnds.join(","),
    layout.typography.font,
    layout.typography.letterSpacing,
  ].join("|");
  const [measuredReaderPages, setMeasuredReaderPages] = useState<{
    key: string;
    ends: number[];
  } | null>(null);
  const readerEnds = readerModesEnabled && measuredReaderPages?.key === paginationKey
    ? measuredReaderPages.ends
    : null;
  const pages = useMemo(
    () => readerEnds ? readerTextPages(readerEnds) : savedPages,
    [readerEnds, savedPages],
  );
  const usesReaderReflow = readerEnds !== null;

  // This measurement consumes only the already-authorized current item.
  // Other/locked book sections remain redacted, and published pageEnds persist.
  useEffect(() => {
    if (!readerModesEnabled || !content || isContentsItem) return;
    let cancelled = false;
    let frame = 0;
    const measure = () => {
      if (cancelled) return;
      const fontFamily = fontFamilies[layout.typography.font];
      const ends = measureReaderA5PageEnds({
        content,
        firstBody: canonicalBodyBox(layout.page.firstBody, layout),
        continuationBody: canonicalBodyBox(layout.page.continuationBody, layout),
        fontFamily,
        letterSpacing: layout.typography.letterSpacing,
      });
      if (cancelled || !ends) return;
      const changed = ends.length !== layout.pageEnds.length ||
        ends.some((end, index) => end !== layout.pageEnds[index]);
      if (changed) setMeasuredReaderPages({ key: paginationKey, ends });
    };
    void document.fonts.ready.then(() => {
      if (!cancelled) frame = window.requestAnimationFrame(measure);
    });
    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [content, isContentsItem, layout, paginationKey, readerModesEnabled]);
  const initialIndex = () => {
    if (startAtLastPage) return Math.max(0, pages.length - 1);
    const publishedIndex = typeof initialBookPage === "number"
      ? initialBookPage - bookPageStart
      : 0;
    const originalOffset = savedPages[Math.max(0, Math.min(savedPages.length - 1, publishedIndex))]?.start ?? 0;
    return findReaderPageForOffset(pages, originalOffset);
  };
  const [pageIndex, setPageIndex] = useState(initialIndex);
  const [displayMode, setDisplayMode] = useState<BookDisplayMode>(readerModesEnabled ? "book" : "single");
  const [isNarrow, setIsNarrow] = useState(false);
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!readerModesEnabled) return;
    let preferenceFrame = 0;
    try {
      const saved = window.localStorage.getItem(BOOK_MODE_STORAGE_KEY);
      if (saved === "book" || saved === "single") {
        preferenceFrame = window.requestAnimationFrame(() => setDisplayMode(saved));
      }
    } catch {
      // Private browsing without storage still supports both reader modes.
    }
    const media = window.matchMedia("(max-width: 58rem)");
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => {
      if (preferenceFrame) window.cancelAnimationFrame(preferenceFrame);
      media.removeEventListener("change", update);
    };
  }, [readerModesEnabled]);

  useEffect(() => {
    // A route can change the physical page without remounting this component.
    const frame = window.requestAnimationFrame(() => setPageIndex(initialIndex()));
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBookPage, startAtLastPage, bookPageStart, content, pages]);

  function chooseMode(next: BookDisplayMode) {
    setDisplayMode(next);
    try {
      window.localStorage.setItem(BOOK_MODE_STORAGE_KEY, next);
    } catch {
      // The choice remains available during this session.
    }
  }

  // The server has already redacted other book items. Reflow only the active
  // item's authorized text; use untouched source pages for neighbouring items.
  const bookPages = useMemo<BookPage[]>(() => {
    if (bookItems?.length) {
      let displayGlobal = 0;
      let publishedGlobal = 0;
      return bookItems.flatMap((item) => {
        const originalStart = publishedGlobal;
        publishedGlobal += item.layout.pageEnds.length;
        const current = item.structureItemId === currentItemId;
        const sourcePages = splitPublishedPages(item.content, item.layout);
        const itemPages = current ? pages : sourcePages;
        return itemPages.map((page, index) => {
          const publishedIndex = current
            ? findReaderPageForOffset(sourcePages, page.start)
            : index;
          return {
            content: item.content,
            formatting: item.type === "chapter" ? (item.formatting ?? null) : null,
            globalNumber: ++displayGlobal,
            publishedGlobalNumber: originalStart + publishedIndex + 1,
            itemId: item.structureItemId,
            isContentsPage: item.type === "special" && item.kind === "toc",
            isChapter: item.type === "chapter",
            layout: item.layout,
            localIndex: index,
            pageEnd: page.end,
            pageStart: page.start,
            previewText: current ? null : facingPreviews.find((candidate) =>
              candidate.itemId === item.structureItemId && candidate.localIndex === index,
            )?.text ?? null,
            subtitle: item.subtitle,
            title: item.title,
          } satisfies BookPage;
        });
      });
    }
    return pages.map((page, index) => ({
      content,
      formatting,
      globalNumber: bookPageStart + index,
      publishedGlobalNumber: bookPageStart + findReaderPageForOffset(savedPages, page.start),
      itemId: currentItemId,
      isContentsPage: false,
      isChapter: true,
      layout,
      localIndex: index,
      pageEnd: page.end,
      pageStart: page.start,
      previewText: null,
      subtitle: subtitle ?? null,
      title: chapterTitle,
    } satisfies BookPage));
  }, [bookItems, bookPageStart, chapterTitle, content, currentItemId, facingPreviews, formatting, layout, pages, savedPages, subtitle]);

  const currentDisplayStart = bookPages.find((page) => page.itemId === currentItemId)?.globalNumber ?? bookPageStart;
  const globalPageNumber = currentDisplayStart + Math.min(pageIndex, pages.length - 1);
  const globalPageTotal = bookItems?.length
    ? bookPages.length
    : Math.max(globalPageNumber, (bookTotalPages ?? bookPageStart + savedPages.length - 1) - savedPages.length + pages.length);
  const spreadMode = readerModesEnabled && displayMode === "book" && !isNarrow;
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
    const referenceWidth = A5_PAGE_WIDTH_PX;
    const referenceHeight = A5_PAGE_HEIGHT_PX;
    const availableWidth = Math.max(1, stage.clientWidth - 8);
    const availableHeight = Math.max(540, window.innerHeight - 180);
    // Facing sheets share a spine; reserve no artificial gap between them.
    const naturalWidth = spreadMode ? referenceWidth * 2 : referenceWidth;
    const naturalHeight = referenceHeight;
    const nextScale = Math.min(
      readerModesEnabled ? (spreadMode ? 1.55 : 1.8) : 1,
      availableWidth / naturalWidth,
      availableHeight / naturalHeight,
    );
    setScale(Math.max(0.2, nextScale));
  }, [layout.page.width, layout.page.height, readerModesEnabled, spreadMode, visiblePages]);

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
        // A saved point's y coordinate refines its text location when reflowed.
        const storedPoint = latestAnnotationsRef.current.find((item) => item.id === request.annotationId);
        const originalPoint = storedPoint
          ? parsePersonalPagePointAnchor(storedPoint.pathData)
          : null;
        const old = savedPages[Math.max(0, Math.min(savedPages.length - 1, request.pageIndex))];
        const offset = originalPoint
          ? sourceOffsetForPagePoint(savedPages, originalPoint.pageIndex, originalPoint.y)
          : (old?.start ?? 0);
        setPageIndex(findReaderPageForOffset(pages, offset));
      } else if (typeof request.startOffset === "number") {
        setPageIndex(findReaderPageForOffset(pages, request.startOffset));
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pages, savedPages, tools?.navigateRequest]);

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
        `${publishedBookItemHref(workSlug, item)}?from=${encodedBookReturn}&sayfa=${destination.publishedGlobalNumber}`,
      );
    }
  }

  function goPrevious() {
    navigateToGlobal(spreadMode ? leftNumber - 1 : globalPageNumber - 1);
  }

  function goNext() {
    navigateToGlobal(spreadMode ? leftNumber + 2 : globalPageNumber + 1);
  }

  // The final right-hand page can be visible while the active left page is
  // one page earlier. Do not offer a next turn into a non-existent spread.
  const lastVisiblePageNumber = spreadMode
    ? Math.min(globalPageTotal, leftNumber + 1)
    : globalPageNumber;
  const hasNextBookPage = Boolean(onNextBookPage || nextChapterHref);
  const atLastVisiblePage = lastVisiblePageNumber >= globalPageTotal && !hasNextBookPage;
  const atFirstVisiblePage = globalPageNumber <= 1 && !coverHref && !onPreviousBookPage && !previousChapterHref;

  const annotations = tools?.annotations ?? [];
  const activeTool = tools?.activeTool ?? null;
  const textSelectionMode =
    activeTool === "highlight" || activeTool === "underline" || activeTool === "note";
  const pointMode = activeTool === "pin" || activeTool === "reading_position";
  const eraserMode = activeTool === "eraser";

  // Navigation never captures typing, dialogs or active personal annotations.
  useEffect(() => {
    if (!readerModesEnabled) return;
    function handlePageKeys(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || activeTool) return;
      if (event.target instanceof Element && event.target.closest("input,textarea,select,button,a,summary,[contenteditable='true'],[role='dialog']")) return;
      if (event.key === "ArrowLeft" && !atFirstVisiblePage) {
        event.preventDefault();
        goPrevious();
      } else if (event.key === "ArrowRight" && !atLastVisiblePage) {
        event.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", handlePageKeys);
    return () => window.removeEventListener("keydown", handlePageKeys);
  // Navigation functions intentionally capture the current physical spread.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readerModesEnabled, activeTool, atFirstVisiblePage, atLastVisiblePage, globalPageNumber, spreadMode]);

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
    const clickY = clamp01((event.clientY - rectangle.top) / Math.max(1, rectangle.height));
    const clickX = clamp01((event.clientX - rectangle.left) / Math.max(1, rectangle.width));
    // Store NEW reader points in original page coordinates, so the signed
    // publication, bookmark list, and previously saved annotation IDs survive.
    const sourceOffset = page.pageStart +
      Math.round((page.pageEnd - page.pageStart) * clickY);
    const sourcePageIndex = usesReaderReflow
      ? findReaderPageForOffset(savedPages, sourceOffset)
      : page.localIndex;
    const sourcePage = savedPages[sourcePageIndex];
    const sourceY = usesReaderReflow && sourcePage
      ? clamp01((sourceOffset - sourcePage.start) / Math.max(1, sourcePage.end - sourcePage.start))
      : clickY;
    void tools.applyPagePointAnchor({
      pageIndex: sourcePageIndex,
      x: clickX,
      y: sourceY,
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
      // Authored per-range point sizes remain in saved metadata, but body text
      // is displayed consistently at 11 pt. Bold/italic/underline remain.
      fontSize: undefined,
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
    const renderWidth = A5_PAGE_WIDTH_PX * scale;
    const renderHeight = A5_PAGE_HEIGHT_PX * scale;
    if (!page) {
      return (
        <div aria-hidden="true" className={styles.blankFrame} key={`blank-${slot}`}
          style={{ width: `${renderWidth}px`, height: `${renderHeight}px` }} />
      );
    }
    const bodyBox = canonicalBodyBox(
      page.localIndex === 0
        ? pageLayout.page.firstBody
        : pageLayout.page.continuationBody,
      pageLayout,
    );
    const fontFamily = fontFamilies[pageLayout.typography.font];
    const headerTop = Math.max(24, bodyBox.top - 118);
    const headerHeight = Math.max(0, bodyBox.top - headerTop - 10);
    // Publication subtitles are platform editor instructions, not authored book text.
    // Keep them in immutable snapshots; do not print them in the Reader.
    // Fit the physical page title inside the actual space before the authored body.
    const isBookSectionHeading = page.isContentsPage || page.isChapter;
    // Contents and chapters are typeset as book section headings, not as
    // an oversized duplicate of the writer's typewriter-format body.
    const headerShowsWorkTitle = !isBookSectionHeading && headerHeight >= 64;
    const availableTitleHeight = Math.max(0, headerHeight - (headerShowsWorkTitle ? 24 : 0));
    const titleFontSize = isBookSectionHeading
      ? Math.min(
          page.isContentsPage ? 27 : 25,
          Math.max(16, Math.min(
            availableTitleHeight / 1.35,
            bodyBox.width / Math.max(1, page.title.length * 0.62),
          )),
        )
      : Math.min(
          39.2,
          Math.max(14, Math.min(
            availableTitleHeight / 1.12,
            bodyBox.width / Math.max(1, page.title.length * 0.55),
          )),
        );
    const ownAnnotations = inCurrentItem ? annotations : [];
    const visibleText = inCurrentItem ? page.content : (page.previewText ?? "");
    // A facing item carries only one physical-page excerpt, never its full text.
    // Shift formatting offsets to that excerpt without altering the author snapshot.
    const segmentFormatting = inCurrentItem || !page.formatting
      ? page.formatting
      : {
          ...page.formatting,
          contentLength: visibleText.length,
          marks: page.formatting.marks.map((mark) => ({
            ...mark,
            start: mark.start - page.pageStart,
            end: mark.end - page.pageStart,
          })),
          fontSizes: page.formatting.fontSizes.map((size) => ({
            ...size,
            start: size.start - page.pageStart,
            end: size.end - page.pageStart,
          })),
        };
    const isPhysicalContentsPage = page.isContentsPage;
    const physicalPageItemId = page.itemId;
    // Automatic physical contents text stays unchanged, but chapter titles
    // navigate directly to their published item when no annotation tool is active.
    function contentsText(text: string) {
      if (!isPhysicalContentsPage || !bookItems || !workSlug) return text;
      return text.split(/(\n\n)/u).map((part, partIndex) => {
        const target = bookItems.find((item) =>
          item.structureItemId !== physicalPageItemId && item.title.trim() === part.trim(),
        );
        if (!target) return part;
        return (
          <Link
            className={styles.contentsLink}
            href={`${publishedBookItemHref(workSlug, target)}?from=${encodedBookReturn}`}
            key={`${target.structureItemId}-${partIndex}`}
            onClick={(event) => { if (activeTool) event.preventDefault(); }}
          >
            {part}
          </Link>
        );
      });
    }

    const pageSegments = buildPageSegments({
      annotations: ownAnnotations,
      content: visibleText,
      formatting: segmentFormatting,
      pageEnd: inCurrentItem ? page.pageEnd : visibleText.length,
      pageStart: inCurrentItem ? page.pageStart : 0,
    });
    const pagePointAnnotations = ownAnnotations.flatMap((annotation) => {
      const point = parsePersonalPagePointAnchor(annotation.pathData);
      if (!point) return [];
      if (!usesReaderReflow) {
        return point.pageIndex === page.localIndex
          ? [{ annotation, x: point.x, y: point.y }]
          : [];
      }
      // A legacy point can be re-anchored visually without mutating its
      // original pageIndex, path data, or note. Its position is approximate.
      const sourceOffset = sourceOffsetForPagePoint(savedPages, point.pageIndex, point.y);
      const readerIndex = findReaderPageForOffset(pages, sourceOffset);
      if (readerIndex !== page.localIndex) return [];
      const position = clamp01(
        (sourceOffset - page.pageStart) / Math.max(1, page.pageEnd - page.pageStart),
      );
      const relativeTop = bodyBox.top / A5_PAGE_HEIGHT_PX;
      const relativeHeight = bodyBox.height / A5_PAGE_HEIGHT_PX;
      return [{
        annotation,
        x: point.x,
        y: clamp01(relativeTop + relativeHeight * (0.05 + 0.9 * position)),
      }];
    });
    const locked = !visibleText && page.pageEnd > page.pageStart;
    return (
      <div className={styles.pageFrame} key={page.globalNumber}
        style={{ width: `${renderWidth}px`, height: `${renderHeight}px` }}>
        <article
          aria-label={inCurrentItem && usesReaderReflow
            ? `Okuma sayfası ${page.localIndex + 1} / ${pages.length}`
            : `Yayın sayfası ${page.globalNumber} / ${globalPageTotal}`}
          className={styles.page}
          data-reader-paper-format="a5"
          data-personal-book-tool={inCurrentItem ? (activeTool ?? "none") : "none"}
          data-text-selection={inCurrentItem && textSelectionMode ? "true" : "false"}
          data-book-visible-page={page.globalNumber}
          onContextMenu={blockInteraction}
          onCopy={blockInteraction}
          onCut={blockInteraction}
          onDragStart={blockInteraction}
          onPointerUp={(event) => handlePagePoint(event, page)}
          style={{
            width: `${A5_PAGE_WIDTH_PX}px`,
            height: `${A5_PAGE_HEIGHT_PX}px`,
            transform: `scale(${scale})`,
          }}
        >
          {page.localIndex === 0 && headerHeight >= 24 ? (
            <header className={`${styles.pageHeader} ${isBookSectionHeading ? styles.bookSectionHeader : ""} ${page.isContentsPage ? styles.contentsHeader : ""}`} style={{
              fontFamily: isBookSectionHeading ? 'Georgia, "Times New Roman", serif' : fontFamily,
              height: `${headerHeight}px`,
              left: `${bodyBox.left}px`,
              top: `${headerTop}px`,
              width: `${bodyBox.width}px`,
            }}>
              {headerShowsWorkTitle ? <span>{workTitle}</span> : null}
              <strong style={{ fontSize: `${titleFontSize}px` }}>{page.title}</strong>
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
                fontSize: `${READER_BODY_FONT_SIZE_PX}px`,
                lineHeight: `${READER_BODY_LINE_HEIGHT_PX}px`,
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
                  {contentsText(segment.text)}
                </span>
              ))}
            </div>
          )}
          {pagePointAnnotations.map(({ annotation, x, y }) => (
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
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
              type="button"
            >
              <span aria-hidden="true">{annotation.type === "reading_position" ? "⌑" : "⌖"}</span>
            </button>
          ))}
          <div aria-hidden="true" className={styles.watermarkLayer}>
            {watermarkCopies.map((copy) => (
              <span key={copy}>{identity} · İlkOku güvenli okuma</span>
            ))}
          </div>
          <span aria-hidden="true" className={styles.pageNumber}>
            {inCurrentItem && usesReaderReflow
              ? `${page.localIndex + 1} / ${pages.length}`
              : `${page.globalNumber} / ${globalPageTotal}`}
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
      data-publication-page-count={savedPages.length}
      data-reader-page-count={pages.length}
      data-reader-reflow={usesReaderReflow ? "true" : "false"}
    >
      {readerModesEnabled ? <nav aria-label="Kitap görünümü ve bölümler" className={styles.bookToolbar}>
        <div aria-label="Okuma görünümü" className={styles.modeOptions} role="group">
          <button aria-pressed={spreadMode} disabled={isNarrow} onClick={() => chooseMode("book")} type="button">
            Kitap
          </button>
          <button aria-pressed={!spreadMode} onClick={() => chooseMode("single")} type="button">
            Tek Sayfa
          </button>
        </div>
        <div className={styles.bookLinks}>
          {coverHref ? <button onClick={() => router.push(coverHref)} type="button">Kapak</button> : null}
          {contentsHref ? <button onClick={() => router.push(contentsHref)} type="button">İçindekiler</button> : null}
        </div>
      </nav> : null}
      <div aria-label={spreadMode ? "Açık kitap" : "Tek kitap sayfası"}
        className={styles.stage} ref={stageRef}>
        <div className={spreadMode ? styles.spread : styles.singlePage} data-page-spread={spreadMode ? "facing" : "single"}>
          {visiblePages.map((page, slot) => paper(page, slot))}
        </div>
        {readerModesEnabled ? (
          <div className={styles.pageTurnRail} aria-label="Kitap sayfası çevirme araçları" role="group">
            <button className={styles.turnPrevious} aria-label="Önceki sayfayı çevir" disabled={atFirstVisiblePage} onClick={goPrevious} type="button">←</button>
            <button className={styles.turnNext} aria-label="Sonraki sayfayı çevir" disabled={atLastVisiblePage} onClick={goNext} type="button">→</button>
          </div>
        ) : null}
      </div>
      <nav aria-label="Yayın sayfası geçişleri" className={styles.controls}>
        <button disabled={atFirstVisiblePage}
          onClick={goPrevious} type="button">
          <span aria-hidden="true">←</span> Önceki Sayfa
        </button>
        <div aria-live="polite" className={styles.status}>
          <strong>{usesReaderReflow
            ? `${spreadMode
              ? visiblePages.filter((page): page is BookPage => page !== null && page.itemId === currentItemId)
                .map((page) => page.localIndex + 1).join("–")
              : pageIndex + 1} / ${pages.length} (bölüm)`
            : `${spreadMode
              ? visiblePages.filter((page): page is BookPage => page !== null).map((page) => page.globalNumber).join("–")
              : globalPageNumber} / ${globalPageTotal}`}</strong>
        </div>
        <button disabled={atLastVisiblePage}
          onClick={goNext} type="button">
          Sonraki Sayfa <span aria-hidden="true">→</span>
        </button>
      </nav>
    </div>
  );
}
