"use client";

import type { PublicationBox } from "@/features/works/publication-layout";

export const READER_A5_FONT_SIZE = 14.67;
export const READER_A5_LINE_HEIGHT = READER_A5_FONT_SIZE * 1.15;

const MAX_READER_PAGES = 1000;
const BREAK_LOOKBACK = 180;

export type ReaderTextPage = { start: number; end: number };

/**
 * Display-only pagination for material the server has already authorized.
 * Never persist its page ends as the author's signed publication snapshot.
 * Do not run for redacted or otherwise unavailable book items.
 */
export function measureReaderA5PageEnds({
  content,
  firstBody,
  continuationBody,
  fontFamily,
  letterSpacing,
}: {
  content: string;
  firstBody: PublicationBox;
  continuationBody: PublicationBox;
  fontFamily: string;
  letterSpacing: number;
}): number[] | null {
  if (typeof document === "undefined" || !document.body) return null;
  if (!content) return [0];

  const probe = document.createElement("div");
  Object.assign(probe.style, {
    position: "fixed",
    left: "-99999px",
    top: "0px",
    boxSizing: "border-box",
    padding: "0",
    margin: "0",
    border: "0",
    overflow: "hidden",
    visibility: "hidden",
    pointerEvents: "none",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    fontFamily,
    fontSize: `${READER_A5_FONT_SIZE}px`,
    lineHeight: `${READER_A5_LINE_HEIGHT}px`,
    letterSpacing: `${letterSpacing}px`,
    fontWeight: "400",
  });
  document.body.appendChild(probe);

  function fits(box: PublicationBox, value: string): boolean {
    probe.style.width = `${box.width}px`;
    // Reserve one line as slack for bold/italic fragments and browser rounding.
    const permittedHeight = Math.max(1, box.height - READER_A5_LINE_HEIGHT);
    probe.style.height = `${permittedHeight}px`;
    probe.textContent = value;
    return probe.scrollHeight <= permittedHeight + 1;
  }

  function pageEnd(start: number, box: PublicationBox): number {
    const remaining = content.length - start;
    if (remaining <= 0) return start;

    // A bounded first probe keeps a 500k-character manuscript responsive.
    let limit = Math.min(remaining, 6000);
    while (limit < remaining && fits(box, content.slice(start, start + limit))) {
      limit = Math.min(remaining, limit * 2);
    }
    if (limit === remaining && fits(box, content.slice(start))) return content.length;

    let low = 1;
    let high = limit;
    let best = 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (fits(box, content.slice(start, start + middle))) {
        best = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    const measured = start + best;
    if (measured >= content.length) return content.length;
    const tailStart = Math.max(start + 1, measured - BREAK_LOOKBACK);
    const tail = content.slice(tailStart, measured);
    const lastBreak = Math.max(tail.lastIndexOf("\n"), tail.lastIndexOf(" "));
    const natural = lastBreak >= 0 ? tailStart + lastBreak + 1 : measured;
    let end = natural > start && natural - start >= best * 0.72 ? natural : measured;
    // Never split a Unicode surrogate pair in the middle of a page.
    const previous = content.charCodeAt(end - 1);
    const next = content.charCodeAt(end);
    if (previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
      end = Math.min(content.length, end + 1);
    }
    return Math.min(content.length, Math.max(start + 1, end));
  }

  try {
    const ends: number[] = [];
    let start = 0;
    while (start < content.length && ends.length < MAX_READER_PAGES) {
      const box = ends.length === 0 ? firstBody : continuationBody;
      const end = pageEnd(start, box);
      if (end <= start) return null;
      ends.push(end);
      start = end;
    }
    // Failure is safe: the author-signed physical pages remain available.
    return start === content.length ? ends : null;
  } finally {
    probe.remove();
  }
}

export function readerTextPages(ends: readonly number[]): ReaderTextPage[] {
  let start = 0;
  return ends.map((end) => {
    const page = { start, end };
    start = end;
    return page;
  });
}

export function findReaderPageForOffset(pages: readonly ReaderTextPage[], offset: number): number {
  if (pages.length === 0) return 0;
  const location = Math.max(0, offset);
  const match = pages.findIndex((page, index) =>
    location >= page.start &&
    (location < page.end || (index === pages.length - 1 && location === page.end)),
  );
  return match >= 0 ? match : pages.length - 1;
}

export function sourceOffsetForPagePoint(
  sourcePages: readonly ReaderTextPage[],
  pageIndex: number,
  y: number,
): number {
  const page = sourcePages[Math.max(0, Math.min(sourcePages.length - 1, pageIndex))];
  if (!page) return 0;
  const position = Math.max(0, Math.min(1, y));
  return page.start + Math.round((page.end - page.start) * position);
}
