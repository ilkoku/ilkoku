"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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

const REFRESH_INTERVAL_MS = 180;

function getCanonicalBody() {
  return document.querySelector<HTMLTextAreaElement>(
    ".writer-canvas > .writer-textarea",
  );
}

function readFormattingRaw() {
  return (
    document.querySelector<HTMLInputElement>(
      `form.writer-screen input[name="${CHAPTER_FORMATTING_INPUT_NAME}"]`,
    )?.value ?? ""
  );
}

function readPageTargets(): PageTarget[] {
  const textareas = Array.from(
    document.querySelectorAll<HTMLTextAreaElement>(
      ".writer-manuscript-pages .writer-page-textarea",
    ),
  );
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

function renderInlineText(
  content: string,
  start: number,
  end: number,
  formatting: ChapterFormatting,
) {
  if (end <= start) return "\u00a0";

  const boundaries = new Set<number>([start, end]);
  for (const mark of formatting.marks) {
    if (mark.start >= end || mark.end <= start) continue;
    boundaries.add(Math.max(start, mark.start));
    boundaries.add(Math.min(end, mark.end));
  }

  const ordered = [...boundaries].sort((left, right) => left - right);
  return ordered.slice(0, -1).map((segmentStart, index) => {
    const segmentEnd = ordered[index + 1] ?? segmentStart;
    const classes = formatting.marks
      .filter(
        (mark) => mark.start <= segmentStart && mark.end >= segmentEnd,
      )
      .map((mark) => `writer-live-formatting-mark--${mark.type}`)
      .join(" ");

    return (
      <span className={classes || undefined} key={`${segmentStart}-${segmentEnd}`}>
        {content.slice(segmentStart, segmentEnd)}
      </span>
    );
  });
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
}: {
  content: string;
  formatting: ChapterFormatting;
  page: PageTarget;
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
      });
    }

    refresh();
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("resize", refresh);
    window.addEventListener("ilkoku:writer-preferences-changed", refresh);
    document.addEventListener("input", refresh, true);
    document.addEventListener("change", refresh, true);
    document.addEventListener("click", refresh, true);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("ilkoku:writer-preferences-changed", refresh);
      document.removeEventListener("input", refresh, true);
      document.removeEventListener("change", refresh, true);
      document.removeEventListener("click", refresh, true);
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
          />,
          page.host,
          page.key,
        ),
      )}
    </>
  );
}
