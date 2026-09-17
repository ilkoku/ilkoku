"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  CHAPTER_FORMATTING_INPUT_NAME,
  emptyChapterFormatting,
  hasChapterFormatting,
  paragraphFormatAt,
  paragraphRangeAt,
  parseChapterFormatting,
  type ChapterFormatting,
} from "@/features/works/rich-text-formatting";

type PageTarget = {
  height: number;
  host: HTMLElement;
  key: string;
  left: number;
  start: number;
  text: string;
  top: number;
  width: number;
};

type ParagraphFragment = {
  end: number;
  start: number;
  text: string;
};

type TextSelection = {
  end: number;
  start: number;
};

const REFRESH_INTERVAL_MS = 180;

function getCanonicalBody() {
  return document.querySelector<HTMLTextAreaElement>(
    ".writer-canvas > .writer-textarea",
  );
}

function getPageTextareas() {
  return Array.from(
    document.querySelectorAll<HTMLTextAreaElement>(
      ".writer-manuscript-pages .writer-page-textarea",
    ),
  );
}

function readActiveSelection(): TextSelection | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLTextAreaElement)) return null;

  const pages = getPageTextareas();
  const pageIndex = pages.indexOf(active);
  if (pageIndex < 0) return null;

  const pageStart = pages
    .slice(0, pageIndex)
    .reduce((total, textarea) => total + textarea.value.length, 0);

  return {
    start: pageStart + (active.selectionStart ?? 0),
    end: pageStart + (active.selectionEnd ?? active.selectionStart ?? 0),
  };
}

function selectionsEqual(left: TextSelection | null, right: TextSelection | null) {
  return left?.start === right?.start && left?.end === right?.end;
}

function readFormattingRaw() {
  return (
    document.querySelector<HTMLInputElement>(
      `form.writer-screen input[name="${CHAPTER_FORMATTING_INPUT_NAME}"]`,
    )?.value ?? ""
  );
}

function readPageTargets(): PageTarget[] {
  const textareas = getPageTextareas();
  let start = 0;

  return textareas.flatMap((textarea, index) => {
    const host = textarea.closest<HTMLElement>(
      ".writer-manuscript-page__inner",
    );
    const text = textarea.value;
    const pageStart = start;
    start += text.length;

    if (!host || textarea.offsetWidth <= 0 || textarea.offsetHeight <= 0) {
      return [];
    }

    return [
      {
        height: textarea.offsetHeight,
        host,
        key: `${index}-${pageStart}`,
        left: textarea.offsetLeft,
        start: pageStart,
        text,
        top: textarea.offsetTop,
        width: textarea.offsetWidth,
      },
    ];
  });
}

function targetsEqual(left: PageTarget[], right: PageTarget[]) {
  if (left.length !== right.length) return false;
  return left.every((item, index) => {
    const other = right[index];
    return (
      item.host === other?.host &&
      item.start === other.start &&
      item.text === other.text &&
      item.top === other.top &&
      item.left === other.left &&
      item.width === other.width &&
      item.height === other.height
    );
  });
}

function paragraphFragments(text: string, pageStart: number) {
  const fragments: ParagraphFragment[] = [];
  let localStart = 0;

  while (localStart <= text.length) {
    const newline = text.indexOf("\n", localStart);
    const localEnd = newline < 0 ? text.length : newline;
    fragments.push({
      end: pageStart + localEnd,
      start: pageStart + localStart,
      text: text.slice(localStart, localEnd),
    });

    if (newline < 0) break;
    localStart = newline + 1;
  }

  return fragments;
}

function inlineFontSizeAtCaret(
  formatting: ChapterFormatting,
  offset: number,
) {
  return [...formatting.fontSizes]
    .reverse()
    .find((item) => item.start <= offset && offset < item.end)?.size;
}

function visualCaret(
  formatting: ChapterFormatting,
  offset: number,
  key: string,
) {
  const fontSize = inlineFontSizeAtCaret(formatting, offset);
  const style = fontSize
    ? ({ fontSize: `${fontSize}px` } satisfies CSSProperties)
    : undefined;

  return (
    <span
      className="writer-live-formatting-caret"
      key={key}
      style={style}
    />
  );
}

function renderInlineText(
  content: string,
  start: number,
  end: number,
  formatting: ChapterFormatting,
  selection: TextSelection | null,
) {
  const collapsedCaret =
    selection && selection.start === selection.end ? selection.start : null;

  if (end <= start) {
    return (
      <>
        {collapsedCaret === start
          ? visualCaret(formatting, start, `caret-${start}`)
          : null}
        {"\u00a0"}
      </>
    );
  }

  const boundaries = new Set<number>([start, end]);
  for (const mark of formatting.marks) {
    if (mark.start >= end || mark.end <= start) continue;
    boundaries.add(Math.max(start, mark.start));
    boundaries.add(Math.min(end, mark.end));
  }
  for (const fontSize of formatting.fontSizes) {
    if (fontSize.start >= end || fontSize.end <= start) continue;
    boundaries.add(Math.max(start, fontSize.start));
    boundaries.add(Math.min(end, fontSize.end));
  }
  if (selection) {
    if (selection.start > start && selection.start < end) {
      boundaries.add(selection.start);
    }
    if (selection.end > start && selection.end < end) {
      boundaries.add(selection.end);
    }
  }

  const ordered = [...boundaries].sort((left, right) => left - right);
  const nodes: ReactNode[] = [];

  ordered.slice(0, -1).forEach((segmentStart, index) => {
    const segmentEnd = ordered[index + 1] ?? segmentStart;
    if (collapsedCaret === segmentStart) {
      nodes.push(
        visualCaret(formatting, segmentStart, `caret-${segmentStart}-${index}`),
      );
    }

    const markClasses = formatting.marks
      .filter(
        (mark) => mark.start <= segmentStart && mark.end >= segmentEnd,
      )
      .map((mark) => `writer-live-formatting-mark--${mark.type}`);
    const isSelected = Boolean(
      selection &&
        selection.end > selection.start &&
        selection.start <= segmentStart &&
        selection.end >= segmentEnd,
    );
    if (isSelected) {
      markClasses.push("writer-live-formatting-selection");
    }

    const fontSize = formatting.fontSizes.find(
      (item) => item.start <= segmentStart && item.end >= segmentEnd,
    )?.size;
    const style = fontSize
      ? ({ fontSize: `${fontSize}px` } satisfies CSSProperties)
      : undefined;

    nodes.push(
      <span
        className={markClasses.length ? markClasses.join(" ") : undefined}
        key={`${segmentStart}-${segmentEnd}`}
        style={style}
      >
        {content.slice(segmentStart, segmentEnd)}
      </span>,
    );
  });

  if (collapsedCaret === end) {
    nodes.push(visualCaret(formatting, end, `caret-${end}-end`));
  }

  return nodes;
}

function numberedListOrdinal(
  formatting: ChapterFormatting,
  paragraphStart: number,
) {
  return formatting.paragraphs.filter(
    (paragraph) =>
      paragraph.list === "number" && paragraph.start <= paragraphStart,
  ).length;
}

function FormattedPage({
  content,
  formatting,
  page,
  selection,
}: {
  content: string;
  formatting: ChapterFormatting;
  page: PageTarget;
  selection: TextSelection | null;
}) {
  return (
    <div
      aria-hidden="true"
      className="writer-live-formatting-layer"
      style={{
        height: page.height,
        left: page.left,
        top: page.top,
        width: page.width,
      }}
    >
      {paragraphFragments(page.text, page.start).map((fragment, index) => {
        const paragraph =
          paragraphFormatAt(formatting, content, fragment.start) ?? {
            alignment: "left" as const,
            end: fragment.end,
            indent: 0,
            list: "none" as const,
            start: fragment.start,
            style: "paragraph" as const,
          };
        const fullRange = paragraphRangeAt(content, fragment.start);
        const beginsParagraph = fullRange?.start === fragment.start;
        const marker =
          beginsParagraph && paragraph.list === "bullet"
            ? "•"
            : beginsParagraph && paragraph.list === "number"
              ? `${numberedListOrdinal(formatting, paragraph.start)}.`
              : "";
        const style = {
          marginInlineStart: `${paragraph.indent * 1.25}rem`,
          textAlign: paragraph.alignment,
        } satisfies CSSProperties;

        return (
          <div
            className={`writer-live-formatting-line writer-live-formatting-line--${paragraph.style}`}
            data-list={paragraph.list}
            key={`${fragment.start}-${index}`}
            style={style}
          >
            {marker ? (
              <span className="writer-live-formatting-list-marker">{marker}</span>
            ) : null}
            {renderInlineText(
              content,
              fragment.start,
              fragment.end,
              formatting,
              selection,
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WriterLiveFormattingLayer() {
  const [formatting, setFormatting] = useState<ChapterFormatting>(
    emptyChapterFormatting(0),
  );
  const [content, setContent] = useState("");
  const [pages, setPages] = useState<PageTarget[]>([]);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const formattingKeyRef = useRef("");

  useEffect(() => {
    let frame: number | null = null;

    function refresh() {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const body = getCanonicalBody();
        const nextContent = body?.value ?? "";
        const raw = readFormattingRaw();
        const formattingKey = `${nextContent.length}:${raw}`;

        if (formattingKeyRef.current !== formattingKey) {
          formattingKeyRef.current = formattingKey;
          setContent(nextContent);
          if (!raw) {
            setFormatting(emptyChapterFormatting(nextContent.length));
          } else {
            try {
              setFormatting(parseChapterFormatting(raw, nextContent));
            } catch {
              // Keep the previous valid visual state until the formatting bridge
              // catches up with an in-flight text edit.
            }
          }
        }

        const nextPages = readPageTargets();
        setPages((current) =>
          targetsEqual(current, nextPages) ? current : nextPages,
        );

        const nextSelection = readActiveSelection();
        setSelection((current) =>
          selectionsEqual(current, nextSelection) ? current : nextSelection,
        );
      });
    }

    refresh();
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("resize", refresh);
    window.addEventListener("ilkoku:writer-preferences-changed", refresh);
    document.addEventListener("input", refresh, true);
    document.addEventListener("change", refresh, true);
    document.addEventListener("click", refresh, true);
    document.addEventListener("keyup", refresh, true);
    document.addEventListener("mouseup", refresh, true);
    document.addEventListener("select", refresh, true);
    document.addEventListener("selectionchange", refresh);
    document.addEventListener("focusin", refresh, true);
    document.addEventListener("focusout", refresh, true);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("ilkoku:writer-preferences-changed", refresh);
      document.removeEventListener("input", refresh, true);
      document.removeEventListener("change", refresh, true);
      document.removeEventListener("click", refresh, true);
      document.removeEventListener("keyup", refresh, true);
      document.removeEventListener("mouseup", refresh, true);
      document.removeEventListener("select", refresh, true);
      document.removeEventListener("selectionchange", refresh);
      document.removeEventListener("focusin", refresh, true);
      document.removeEventListener("focusout", refresh, true);
    };
  }, []);

  if (!content || !hasChapterFormatting(formatting) || pages.length === 0) {
    return null;
  }

  return (
    <>
      {pages.map((page) =>
        createPortal(
          <FormattedPage
            content={content}
            formatting={formatting}
            page={page}
            selection={selection}
          />,
          page.host,
          page.key,
        ),
      )}
    </>
  );
}
