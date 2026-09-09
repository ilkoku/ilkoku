"use client";

import {
  BOOK_PUBLICATION_VERSION,
  type BookPublicationLayoutSubmission,
} from "@/features/works/book-publication";
import {
  bookSectionDetails,
  type BookStructureItem,
} from "@/features/works/book-structure";
import {
  PUBLICATION_LAYOUT_VERSION,
  type PublicationBox,
  type PublicationFont,
  type PublicationLayoutSnapshot,
} from "@/features/works/publication-layout";

const MAX_PAGE_COUNT = 1000;
const NATURAL_BREAK_LOOKBACK = 180;

function nextAnimationFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function fitsInProbe(probe: HTMLTextAreaElement, value: string) {
  if (probe.clientHeight <= 0 || probe.clientWidth <= 0) return false;
  probe.value = value;
  probe.scrollTop = 0;
  return probe.scrollHeight <= probe.clientHeight + 1;
}

function preferNaturalBreak(content: string, start: number, measuredEnd: number) {
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

  if (breakIndex < 0) return measuredEnd;

  const naturalEnd = lookbackStart + breakIndex + 1;
  const measuredLength = measuredEnd - start;
  const naturalLength = naturalEnd - start;
  return naturalLength >= measuredLength * 0.72 ? naturalEnd : measuredEnd;
}

function findPageEnd(
  content: string,
  start: number,
  probe: HTMLTextAreaElement,
) {
  const remaining = content.slice(start);
  if (!remaining) return start;
  if (fitsInProbe(probe, remaining)) return content.length;

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

function pageEndsForContent(
  content: string,
  firstProbe: HTMLTextAreaElement,
  continuationProbe: HTMLTextAreaElement,
) {
  if (!content) return [0];

  const pageEnds: number[] = [];
  let start = 0;

  while (start < content.length && pageEnds.length < MAX_PAGE_COUNT) {
    const probe = pageEnds.length === 0 ? firstProbe : continuationProbe;
    const measuredEnd = findPageEnd(content, start, probe);
    const end = Math.max(start + 1, measuredEnd);
    pageEnds.push(end);
    start = end;
  }

  if (start < content.length) pageEnds.push(content.length);
  return pageEnds;
}

function finiteCssNumber(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function relativeBox(element: HTMLElement, page: HTMLElement): PublicationBox {
  const pageRect = page.getBoundingClientRect();
  const rect = element.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left - pageRect.left,
    top: rect.top - pageRect.top,
    width: rect.width,
  };
}

function writerFont(screen: HTMLElement): PublicationFont {
  const value = screen.querySelector<HTMLSelectElement>(
    'select[aria-label="Yazı tipi"]',
  )?.value;

  return value === "serif" || value === "sans" || value === "typewriter"
    ? value
    : "typewriter";
}

function addHeader(
  pageInner: HTMLElement,
  workTitle: string,
  pageTitle: string,
  subtitle: string,
) {
  const header = document.createElement("header");
  header.className = "writer-manuscript-page__header";

  const workTitleInput = document.createElement("input");
  workTitleInput.className = "writer-work-title";
  workTitleInput.value = workTitle;
  workTitleInput.readOnly = true;
  workTitleInput.tabIndex = -1;

  const titleInput = document.createElement("input");
  titleInput.className = "writer-title";
  titleInput.value = pageTitle;
  titleInput.readOnly = true;
  titleInput.tabIndex = -1;

  const subtitleElement = document.createElement("p");
  subtitleElement.className = "writer-subtitle";
  subtitleElement.textContent = subtitle;

  header.append(workTitleInput, titleInput, subtitleElement);
  pageInner.append(header);
}

function makeProbePage(
  workTitle: string,
  pageTitle: string,
  subtitle: string,
  includeHeader: boolean,
) {
  const page = document.createElement("section");
  page.className = "writer-manuscript-page writer-manuscript-page--probe";

  const inner = document.createElement("div");
  inner.className = "writer-manuscript-page__inner";
  if (includeHeader) addHeader(inner, workTitle, pageTitle, subtitle);

  const textarea = document.createElement("textarea");
  textarea.className =
    "writer-textarea writer-page-textarea writer-page-textarea--probe";
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  inner.append(textarea);
  page.append(inner);

  return { page, textarea };
}

async function measureSpecialPage(
  screen: HTMLElement,
  workTitle: string,
  item: BookStructureItem,
): Promise<PublicationLayoutSnapshot | null> {
  if (item.chapterId !== null) return null;

  const subtitle = bookSectionDetails[item.kind].description;
  const probes = document.createElement("div");
  probes.className = "writer-page-probes";
  probes.setAttribute("aria-hidden", "true");
  probes.dataset.bookPublicationMeasure = item.id;

  const first = makeProbePage(workTitle, item.title, subtitle, true);
  const continuation = makeProbePage(workTitle, item.title, subtitle, false);
  probes.append(first.page, continuation.page);
  screen.append(probes);

  try {
    await nextAnimationFrame();
    await nextAnimationFrame();

    const firstRect = first.page.getBoundingClientRect();
    const continuationRect = continuation.page.getBoundingClientRect();
    if (
      firstRect.width <= 0 ||
      firstRect.height <= 0 ||
      continuationRect.width <= 0 ||
      continuationRect.height <= 0 ||
      first.textarea.clientWidth <= 0 ||
      first.textarea.clientHeight <= 0 ||
      continuation.textarea.clientWidth <= 0 ||
      continuation.textarea.clientHeight <= 0
    ) {
      return null;
    }

    const pageEnds = pageEndsForContent(
      item.content,
      first.textarea,
      continuation.textarea,
    );
    const textStyle = window.getComputedStyle(first.textarea);
    const fontSize = finiteCssNumber(textStyle.fontSize);
    const lineHeight = finiteCssNumber(textStyle.lineHeight);
    const letterSpacing =
      textStyle.letterSpacing === "normal"
        ? 0
        : finiteCssNumber(textStyle.letterSpacing);

    if (fontSize <= 0 || lineHeight <= 0) return null;

    return {
      version: PUBLICATION_LAYOUT_VERSION,
      contentLength: item.content.length,
      pageEnds,
      page: {
        height: firstRect.height,
        width: firstRect.width,
        firstBody: relativeBox(first.textarea, first.page),
        continuationBody: relativeBox(
          continuation.textarea,
          continuation.page,
        ),
      },
      typography: {
        font: writerFont(screen),
        fontSize,
        letterSpacing,
        lineHeight,
      },
    };
  } finally {
    probes.remove();
  }
}

export async function measureBookPublicationLayouts(
  screen: HTMLElement,
  workTitle: string,
  items: BookStructureItem[],
): Promise<BookPublicationLayoutSubmission | null> {
  const specialPages: BookPublicationLayoutSubmission["specialPages"] = [];

  for (const item of [...items].sort((left, right) => left.position - right.position)) {
    if (item.chapterId !== null) continue;
    const layout = await measureSpecialPage(screen, workTitle, item);
    if (!layout) return null;
    specialPages.push({ id: item.id, layout });
  }

  return {
    version: BOOK_PUBLICATION_VERSION,
    specialPages,
  };
}
