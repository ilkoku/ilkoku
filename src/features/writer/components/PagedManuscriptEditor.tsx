"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

type PageSegment = {
  start: number;
  end: number;
  text: string;
};

type PendingSelection = {
  absoluteOffset: number;
};

type PagedManuscriptEditorProps = {
  workTitle: string;
  chapterTitle: string;
  subtitle: string;
  content: string;
  workTitleLabel: string;
  chapterTitleLabel: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  onWorkTitleChange: (value: string) => void;
  onChapterTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
};

const MAX_PAGE_COUNT = 1000;
const NATURAL_BREAK_LOOKBACK = 180;

function pagesAreEqual(left: PageSegment[], right: PageSegment[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (page, index) =>
      page.start === right[index]?.start &&
      page.end === right[index]?.end &&
      page.text === right[index]?.text,
  );
}

function fitsInProbe(probe: HTMLTextAreaElement, value: string) {
  if (probe.clientHeight <= 0 || probe.clientWidth <= 0) {
    return false;
  }

  probe.value = value;
  probe.scrollTop = 0;

  return probe.scrollHeight <= probe.clientHeight + 1;
}

function preferNaturalBreak(
  content: string,
  start: number,
  measuredEnd: number,
) {
  if (measuredEnd >= content.length || measuredEnd <= start + 1) {
    return measuredEnd;
  }

  const lookbackStart = Math.max(
    start + 1,
    measuredEnd - NATURAL_BREAK_LOOKBACK,
  );
  const tail = content.slice(lookbackStart, measuredEnd);
  const newlineIndex = tail.lastIndexOf("\n");
  const spaceIndex = tail.lastIndexOf(" ");
  const breakIndex = Math.max(newlineIndex, spaceIndex);

  if (breakIndex < 0) {
    return measuredEnd;
  }

  const naturalEnd = lookbackStart + breakIndex + 1;
  const measuredLength = measuredEnd - start;
  const naturalLength = naturalEnd - start;

  return naturalLength >= measuredLength * 0.72
    ? naturalEnd
    : measuredEnd;
}

function findPageEnd(
  content: string,
  start: number,
  probe: HTMLTextAreaElement,
) {
  const remaining = content.slice(start);

  if (!remaining) {
    return start;
  }

  if (fitsInProbe(probe, remaining)) {
    return content.length;
  }

  let low = 1;
  let high = remaining.length;
  let best = 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = remaining.slice(0, middle);

    if (fitsInProbe(probe, candidate)) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return preferNaturalBreak(content, start, start + Math.max(best, 1));
}

function paginateContent(
  content: string,
  firstProbe: HTMLTextAreaElement | null,
  continuationProbe: HTMLTextAreaElement | null,
): PageSegment[] {
  if (!content) {
    return [{ start: 0, end: 0, text: "" }];
  }

  if (
    !firstProbe ||
    !continuationProbe ||
    firstProbe.clientHeight <= 0 ||
    continuationProbe.clientHeight <= 0
  ) {
    return [{ start: 0, end: content.length, text: content }];
  }

  const pages: PageSegment[] = [];
  let start = 0;

  while (start < content.length && pages.length < MAX_PAGE_COUNT) {
    const probe = pages.length === 0 ? firstProbe : continuationProbe;
    const measuredEnd = findPageEnd(content, start, probe);
    const end = Math.max(start + 1, measuredEnd);

    pages.push({
      start,
      end,
      text: content.slice(start, end),
    });

    start = end;
  }

  if (start < content.length) {
    pages.push({
      start,
      end: content.length,
      text: content.slice(start),
    });
  }

  return pages.length
    ? pages
    : [{ start: 0, end: 0, text: "" }];
}

function previousCodePointStart(value: string, index: number) {
  if (index <= 0) {
    return 0;
  }

  const previous = value.charCodeAt(index - 1);

  if (
    previous >= 0xdc00 &&
    previous <= 0xdfff &&
    index >= 2
  ) {
    const beforePrevious = value.charCodeAt(index - 2);

    if (beforePrevious >= 0xd800 && beforePrevious <= 0xdbff) {
      return index - 2;
    }
  }

  return index - 1;
}

function nextCodePointEnd(value: string, index: number) {
  if (index >= value.length) {
    return value.length;
  }

  const current = value.charCodeAt(index);

  if (
    current >= 0xd800 &&
    current <= 0xdbff &&
    index + 1 < value.length
  ) {
    const next = value.charCodeAt(index + 1);

    if (next >= 0xdc00 && next <= 0xdfff) {
      return index + 2;
    }
  }

  return index + 1;
}

export function PagedManuscriptEditor({
  workTitle,
  chapterTitle,
  subtitle,
  content,
  workTitleLabel,
  chapterTitleLabel,
  bodyLabel,
  bodyPlaceholder,
  onWorkTitleChange,
  onChapterTitleChange,
  onContentChange,
}: PagedManuscriptEditorProps) {
  const firstProbeRef = useRef<HTMLTextAreaElement | null>(null);
  const continuationProbeRef = useRef<HTMLTextAreaElement | null>(null);
  const pageRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const pendingSelectionRef = useRef<PendingSelection | null>(null);
  const latestContentRef = useRef(content);
  const scheduledFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<PageSegment[]>([
    { start: 0, end: content.length, text: content },
  ]);

  latestContentRef.current = content;

  const calculatePages = useCallback((value: string) => {
    return paginateContent(
      value,
      firstProbeRef.current,
      continuationProbeRef.current,
    );
  }, []);

  const commitPages = useCallback(
    (value: string) => {
      const nextPages = calculatePages(value);

      setPages((current) =>
        pagesAreEqual(current, nextPages) ? current : nextPages,
      );
    },
    [calculatePages],
  );

  const scheduleRepagination = useCallback(() => {
    if (scheduledFrameRef.current !== null) {
      window.cancelAnimationFrame(scheduledFrameRef.current);
    }

    scheduledFrameRef.current = window.requestAnimationFrame(() => {
      scheduledFrameRef.current = null;
      commitPages(latestContentRef.current);
    });
  }, [commitPages]);

  useEffect(() => {
    scheduleRepagination();

    return () => {
      if (scheduledFrameRef.current !== null) {
        window.cancelAnimationFrame(scheduledFrameRef.current);
        scheduledFrameRef.current = null;
      }
    };
  }, [content, scheduleRepagination]);

  useEffect(() => {
    const container = containerRef.current;
    const screen = container?.closest<HTMLElement>(".writer-screen");

    if (!container || !screen) {
      return;
    }

    const handleLayoutChange = () => scheduleRepagination();
    const mutationObserver = new MutationObserver(handleLayoutChange);
    const resizeObserver = new ResizeObserver(handleLayoutChange);

    mutationObserver.observe(screen, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    resizeObserver.observe(container);
    window.addEventListener("resize", handleLayoutChange);
    window.addEventListener(
      "ilkoku:writer-preferences-changed",
      handleLayoutChange,
    );

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleLayoutChange);
      window.removeEventListener(
        "ilkoku:writer-preferences-changed",
        handleLayoutChange,
      );
    };
  }, [scheduleRepagination]);

  useEffect(() => {
    const pendingSelection = pendingSelectionRef.current;

    if (!pendingSelection) {
      return;
    }

    pendingSelectionRef.current = null;
    const absoluteOffset = Math.max(
      0,
      Math.min(pendingSelection.absoluteOffset, content.length),
    );
    let targetPageIndex = pages.length - 1;

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      const isLastPage = index === pages.length - 1;

      if (absoluteOffset < page.end || isLastPage) {
        targetPageIndex = index;
        break;
      }
    }

    const page = pages[targetPageIndex];
    const textarea = pageRefs.current[targetPageIndex];

    if (!page || !textarea) {
      return;
    }

    const localOffset = Math.max(
      0,
      Math.min(absoluteOffset - page.start, page.text.length),
    );

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(localOffset, localOffset);
    });
  }, [content.length, pages]);

  function applyContent(nextContent: string, absoluteOffset: number) {
    pendingSelectionRef.current = { absoluteOffset };
    latestContentRef.current = nextContent;
    commitPages(nextContent);
    onContentChange(nextContent);
  }

  function handlePageChange(
    page: PageSegment,
    event: ChangeEvent<HTMLTextAreaElement>,
  ) {
    const value = event.currentTarget.value;
    const localOffset = event.currentTarget.selectionStart ?? value.length;
    const nextContent =
      content.slice(0, page.start) + value + content.slice(page.end);

    applyContent(nextContent, page.start + localOffset);
  }

  function handlePageKeyDown(
    page: PageSegment,
    pageIndex: number,
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    if (selectionStart !== selectionEnd) {
      return;
    }

    if (
      event.key === "Backspace" &&
      selectionStart === 0 &&
      page.start > 0
    ) {
      event.preventDefault();
      const deleteStart = previousCodePointStart(content, page.start);
      const nextContent =
        content.slice(0, deleteStart) + content.slice(page.start);

      applyContent(nextContent, deleteStart);
      return;
    }

    if (
      event.key === "Delete" &&
      selectionStart === page.text.length &&
      page.end < content.length
    ) {
      event.preventDefault();
      const deleteEnd = nextCodePointEnd(content, page.end);
      const nextContent =
        content.slice(0, page.end) + content.slice(deleteEnd);

      applyContent(nextContent, page.end);
      return;
    }

    if (
      event.key === "ArrowLeft" &&
      selectionStart === 0 &&
      page.start > 0
    ) {
      event.preventDefault();
      const previousOffset = previousCodePointStart(content, page.start);
      pendingSelectionRef.current = {
        absoluteOffset: previousOffset,
      };
      pageRefs.current[Math.max(0, pageIndex - 1)]?.focus();
      commitPages(content);
      return;
    }

    if (
      event.key === "ArrowRight" &&
      selectionStart === page.text.length &&
      page.end < content.length
    ) {
      event.preventDefault();
      const nextOffset = nextCodePointEnd(content, page.end);
      pendingSelectionRef.current = { absoluteOffset: nextOffset };
      pageRefs.current[Math.min(pages.length - 1, pageIndex + 1)]?.focus();
      commitPages(content);
    }
  }

  return (
    <div className="writer-paged-manuscript" ref={containerRef}>
      <input name="content" type="hidden" value={content} />

      {pages.map((page, pageIndex) => (
        <section
          className="writer-manuscript-page"
          data-page={pageIndex + 1}
          key={`${pageIndex}-${page.start}`}
          aria-label={`Sayfa ${pageIndex + 1}`}
        >
          <div className="writer-manuscript-page__inner">
            {pageIndex === 0 && (
              <header className="writer-manuscript-page__header">
                <input
                  className="writer-work-title"
                  name="workTitle"
                  aria-label={workTitleLabel}
                  value={workTitle}
                  onChange={(event) =>
                    onWorkTitleChange(event.target.value)
                  }
                />

                <input
                  className="writer-title"
                  name="chapterTitle"
                  aria-label={chapterTitleLabel}
                  value={chapterTitle}
                  onChange={(event) =>
                    onChapterTitleChange(event.target.value)
                  }
                  autoFocus
                />

                <p className="writer-subtitle">{subtitle}</p>
              </header>
            )}

            <textarea
              className="writer-textarea writer-page-textarea"
              aria-label={`${bodyLabel} — Sayfa ${pageIndex + 1}`}
              value={page.text}
              onChange={(event) => handlePageChange(page, event)}
              onKeyDown={(event) =>
                handlePageKeyDown(page, pageIndex, event)
              }
              placeholder={pageIndex === 0 ? bodyPlaceholder : undefined}
              ref={(node) => {
                pageRefs.current[pageIndex] = node;
              }}
            />
          </div>

          <span className="writer-manuscript-page__number" aria-hidden="true">
            {pageIndex + 1}
          </span>
        </section>
      ))}

      <div className="writer-page-probes" aria-hidden="true">
        <section className="writer-manuscript-page writer-manuscript-page--probe">
          <div className="writer-manuscript-page__inner">
            <header className="writer-manuscript-page__header">
              <input
                className="writer-work-title"
                value={workTitle}
                readOnly
                tabIndex={-1}
              />
              <input
                className="writer-title"
                value={chapterTitle}
                readOnly
                tabIndex={-1}
              />
              <p className="writer-subtitle">{subtitle}</p>
            </header>
            <textarea
              className="writer-textarea writer-page-textarea writer-page-textarea--probe"
              ref={firstProbeRef}
              readOnly
              tabIndex={-1}
            />
          </div>
        </section>

        <section className="writer-manuscript-page writer-manuscript-page--probe">
          <div className="writer-manuscript-page__inner">
            <textarea
              className="writer-textarea writer-page-textarea writer-page-textarea--probe"
              ref={continuationProbeRef}
              readOnly
              tabIndex={-1}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
