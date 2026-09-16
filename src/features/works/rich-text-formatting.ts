export const CHAPTER_FORMATTING_INPUT_NAME = "chapterFormatting";
export const CHAPTER_FORMATTING_VERSION = 1 as const;
export const MAX_CHAPTER_FORMATTING_LENGTH = 250_000;

export const inlineMarkTypes = ["bold", "italic", "underline"] as const;
export const paragraphStyles = ["paragraph", "heading", "subheading", "quote"] as const;
export const paragraphListStyles = ["none", "bullet", "number"] as const;
export const textAlignments = ["left", "center", "right", "justify"] as const;

export type InlineMarkType = (typeof inlineMarkTypes)[number];
export type ParagraphStyle = (typeof paragraphStyles)[number];
export type ParagraphListStyle = (typeof paragraphListStyles)[number];
export type TextAlignment = (typeof textAlignments)[number];

export type ChapterInlineMark = {
  end: number;
  start: number;
  type: InlineMarkType;
};

export type ChapterInlineFontSize = {
  end: number;
  size: number;
  start: number;
};

export type ChapterParagraphFormat = {
  alignment: TextAlignment;
  end: number;
  indent: number;
  list: ParagraphListStyle;
  start: number;
  style: ParagraphStyle;
};

export type ChapterFormatting = {
  contentLength: number;
  fontSizes: ChapterInlineFontSize[];
  marks: ChapterInlineMark[];
  paragraphs: ChapterParagraphFormat[];
  version: typeof CHAPTER_FORMATTING_VERSION;
};

export type ChapterParagraphRange = {
  end: number;
  start: number;
};

const INLINE_MARK_LIMIT = 4096;
const INLINE_FONT_SIZE_LIMIT = 4096;
const PARAGRAPH_FORMAT_LIMIT = 4096;
const MAX_INDENT = 6;
export const MIN_INLINE_FONT_SIZE = 12;
export const MAX_INLINE_FONT_SIZE = 36;

export function emptyChapterFormatting(contentLength: number): ChapterFormatting {
  return {
    contentLength,
    fontSizes: [],
    marks: [],
    paragraphs: [],
    version: CHAPTER_FORMATTING_VERSION,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

function isInlineMarkType(value: unknown): value is InlineMarkType {
  return typeof value === "string" && inlineMarkTypes.includes(value as InlineMarkType);
}

function isParagraphStyle(value: unknown): value is ParagraphStyle {
  return typeof value === "string" && paragraphStyles.includes(value as ParagraphStyle);
}

function isParagraphListStyle(value: unknown): value is ParagraphListStyle {
  return typeof value === "string" && paragraphListStyles.includes(value as ParagraphListStyle);
}

function isTextAlignment(value: unknown): value is TextAlignment {
  return typeof value === "string" && textAlignments.includes(value as TextAlignment);
}

function normalizeMarks(marks: ChapterInlineMark[], contentLength: number) {
  const ordered = marks
    .filter(
      (mark) =>
        isInlineMarkType(mark.type) &&
        isIntegerInRange(mark.start, 0, contentLength) &&
        isIntegerInRange(mark.end, 0, contentLength) &&
        mark.end > mark.start,
    )
    .sort((left, right) =>
      left.type.localeCompare(right.type) ||
      left.start - right.start ||
      left.end - right.end,
    );

  const normalized: ChapterInlineMark[] = [];
  for (const mark of ordered) {
    const previous = normalized.at(-1);
    if (previous && previous.type === mark.type && mark.start <= previous.end) {
      previous.end = Math.max(previous.end, mark.end);
      continue;
    }
    normalized.push({ ...mark });
  }
  return normalized.slice(0, INLINE_MARK_LIMIT);
}

function normalizeFontSizes(fontSizes: ChapterInlineFontSize[], contentLength: number) {
  const ordered = fontSizes
    .filter(
      (item) =>
        isIntegerInRange(item.start, 0, contentLength) &&
        isIntegerInRange(item.end, 0, contentLength) &&
        item.end > item.start &&
        isIntegerInRange(item.size, MIN_INLINE_FONT_SIZE, MAX_INLINE_FONT_SIZE),
    )
    .sort((left, right) => left.start - right.start || left.end - right.end);

  const normalized: ChapterInlineFontSize[] = [];
  for (const item of ordered) {
    const previous = normalized.at(-1);
    if (previous && previous.size === item.size && item.start <= previous.end) {
      previous.end = Math.max(previous.end, item.end);
      continue;
    }
    normalized.push({ ...item });
  }
  return normalized.slice(0, INLINE_FONT_SIZE_LIMIT);
}

function normalizeParagraphs(paragraphs: ChapterParagraphFormat[], content: string) {
  const byStart = new Map<number, ChapterParagraphFormat>();
  for (const paragraph of paragraphs) {
    if (
      !isParagraphStyle(paragraph.style) ||
      !isParagraphListStyle(paragraph.list) ||
      !isTextAlignment(paragraph.alignment) ||
      !isIntegerInRange(paragraph.indent, 0, MAX_INDENT)
    ) {
      continue;
    }

    const range = paragraphRangeAt(content, paragraph.start);
    if (!range || range.end <= range.start) continue;
    const normalized = { ...paragraph, start: range.start, end: range.end };
    if (isDefaultParagraphFormat(normalized)) byStart.delete(range.start);
    else byStart.set(range.start, normalized);
  }

  return [...byStart.values()]
    .sort((left, right) => left.start - right.start)
    .slice(0, PARAGRAPH_FORMAT_LIMIT);
}

export function parseChapterFormatting(
  raw: string | null | undefined,
  content: string,
): ChapterFormatting {
  if (!raw?.trim()) return emptyChapterFormatting(content.length);
  if (raw.length > MAX_CHAPTER_FORMATTING_LENGTH) {
    throw new Error("Metin biçim bilgisi izin verilen boyutu aşıyor.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Metin biçim bilgisi okunamadı.");
  }

  if (!isRecord(parsed) || parsed.version !== CHAPTER_FORMATTING_VERSION) {
    throw new Error("Metin biçim sürümü desteklenmiyor.");
  }
  if (parsed.contentLength !== content.length) {
    throw new Error("Metin biçimi mevcut bölüm içeriğiyle eşleşmiyor.");
  }
  if (!Array.isArray(parsed.marks) || !Array.isArray(parsed.paragraphs)) {
    throw new Error("Metin biçim bilgisi geçersiz.");
  }

  const rawFontSizes = parsed.fontSizes === undefined ? [] : parsed.fontSizes;
  if (!Array.isArray(rawFontSizes)) {
    throw new Error("Metin boyutu biçim bilgisi geçersiz.");
  }
  if (
    parsed.marks.length > INLINE_MARK_LIMIT ||
    rawFontSizes.length > INLINE_FONT_SIZE_LIMIT ||
    parsed.paragraphs.length > PARAGRAPH_FORMAT_LIMIT
  ) {
    throw new Error("Metin biçim bilgisi izin verilen öğe sayısını aşıyor.");
  }

  const marks: ChapterInlineMark[] = parsed.marks.map((value) => {
    if (
      !isRecord(value) ||
      !isInlineMarkType(value.type) ||
      !isIntegerInRange(value.start, 0, content.length) ||
      !isIntegerInRange(value.end, 0, content.length) ||
      value.end <= value.start
    ) {
      throw new Error("Metin içi biçim aralığı geçersiz.");
    }
    return { type: value.type, start: value.start, end: value.end };
  });

  const fontSizes: ChapterInlineFontSize[] = rawFontSizes.map((value) => {
    if (
      !isRecord(value) ||
      !isIntegerInRange(value.start, 0, content.length) ||
      !isIntegerInRange(value.end, 0, content.length) ||
      value.end <= value.start ||
      !isIntegerInRange(value.size, MIN_INLINE_FONT_SIZE, MAX_INLINE_FONT_SIZE)
    ) {
      throw new Error("Metin boyutu biçim aralığı geçersiz.");
    }
    return { start: value.start, end: value.end, size: value.size };
  });

  const paragraphs: ChapterParagraphFormat[] = parsed.paragraphs.map((value) => {
    if (
      !isRecord(value) ||
      !isParagraphStyle(value.style) ||
      !isParagraphListStyle(value.list) ||
      !isTextAlignment(value.alignment) ||
      !isIntegerInRange(value.indent, 0, MAX_INDENT) ||
      !isIntegerInRange(value.start, 0, content.length) ||
      !isIntegerInRange(value.end, 0, content.length) ||
      value.end < value.start
    ) {
      throw new Error("Paragraf biçim aralığı geçersiz.");
    }
    return {
      alignment: value.alignment,
      end: value.end,
      indent: value.indent,
      list: value.list,
      start: value.start,
      style: value.style,
    };
  });

  return {
    contentLength: content.length,
    fontSizes: normalizeFontSizes(fontSizes, content.length),
    marks: normalizeMarks(marks, content.length),
    paragraphs: normalizeParagraphs(paragraphs, content),
    version: CHAPTER_FORMATTING_VERSION,
  };
}

export function serializeChapterFormatting(formatting: ChapterFormatting) {
  if (
    formatting.marks.length === 0 &&
    formatting.fontSizes.length === 0 &&
    formatting.paragraphs.length === 0
  ) {
    return "";
  }
  return JSON.stringify(formatting);
}

export function hasChapterFormatting(formatting: ChapterFormatting) {
  return (
    formatting.marks.length > 0 ||
    formatting.fontSizes.length > 0 ||
    formatting.paragraphs.length > 0
  );
}

export function paragraphRangeAt(content: string, offset: number): ChapterParagraphRange | null {
  if (offset < 0 || offset > content.length) return null;
  const safeOffset = Math.min(offset, content.length);
  const previousBreak = content.lastIndexOf("\n", Math.max(0, safeOffset - 1));
  const start = previousBreak < 0 ? 0 : previousBreak + 1;
  const nextBreak = content.indexOf("\n", safeOffset);
  const end = nextBreak < 0 ? content.length : nextBreak;
  return { start, end };
}

export function paragraphRangesForSelection(content: string, start: number, end: number) {
  const safeStart = Math.max(0, Math.min(start, content.length));
  const safeEnd = Math.max(safeStart, Math.min(end, content.length));
  const first = paragraphRangeAt(content, safeStart);
  if (!first) return [];

  const ranges: ChapterParagraphRange[] = [];
  let cursor = first.start;
  const terminal = safeEnd > safeStart ? safeEnd - 1 : safeStart;
  while (cursor <= content.length) {
    const range = paragraphRangeAt(content, cursor);
    if (!range) break;
    ranges.push(range);
    if (range.end >= terminal || range.end >= content.length) break;
    cursor = range.end + 1;
  }
  return ranges;
}

export function defaultParagraphFormat(range: ChapterParagraphRange): ChapterParagraphFormat {
  return {
    alignment: "left",
    end: range.end,
    indent: 0,
    list: "none",
    start: range.start,
    style: "paragraph",
  };
}

export function isDefaultParagraphFormat(format: ChapterParagraphFormat) {
  return (
    format.style === "paragraph" &&
    format.list === "none" &&
    format.alignment === "left" &&
    format.indent === 0
  );
}

export function paragraphFormatAt(
  formatting: ChapterFormatting,
  content: string,
  offset: number,
) {
  const range = paragraphRangeAt(content, offset);
  if (!range) return null;
  return formatting.paragraphs.find((item) => item.start === range.start) ?? defaultParagraphFormat(range);
}

export function applyParagraphFormatting(
  formatting: ChapterFormatting,
  content: string,
  start: number,
  end: number,
  patch: Partial<Pick<ChapterParagraphFormat, "alignment" | "indent" | "list" | "style">>,
) {
  const ranges = paragraphRangesForSelection(content, start, end);
  const byStart = new Map(formatting.paragraphs.map((item) => [item.start, item] as const));
  for (const range of ranges) {
    const current = byStart.get(range.start) ?? defaultParagraphFormat(range);
    const next: ChapterParagraphFormat = {
      ...current,
      ...patch,
      start: range.start,
      end: range.end,
      indent: Math.max(0, Math.min(MAX_INDENT, patch.indent ?? current.indent)),
    };
    if (isDefaultParagraphFormat(next)) byStart.delete(range.start);
    else byStart.set(range.start, next);
  }
  return {
    ...formatting,
    contentLength: content.length,
    paragraphs: normalizeParagraphs([...byStart.values()], content),
  };
}

function subtractMarkRange(mark: ChapterInlineMark, start: number, end: number): ChapterInlineMark[] {
  if (mark.end <= start || mark.start >= end) return [mark];
  const result: ChapterInlineMark[] = [];
  if (mark.start < start) result.push({ ...mark, end: start });
  if (mark.end > end) result.push({ ...mark, start: end });
  return result;
}

function subtractFontSizeRange(
  item: ChapterInlineFontSize,
  start: number,
  end: number,
): ChapterInlineFontSize[] {
  if (item.end <= start || item.start >= end) return [item];
  const result: ChapterInlineFontSize[] = [];
  if (item.start < start) result.push({ ...item, end: start });
  if (item.end > end) result.push({ ...item, start: end });
  return result;
}

export function toggleInlineMark(
  formatting: ChapterFormatting,
  content: string,
  start: number,
  end: number,
  type: InlineMarkType,
) {
  const safeStart = Math.max(0, Math.min(start, content.length));
  const safeEnd = Math.max(safeStart, Math.min(end, content.length));
  if (safeEnd <= safeStart) return formatting;

  const sameType = formatting.marks.filter((mark) => mark.type === type);
  const fullyCovered = sameType.some(
    (mark) => mark.start <= safeStart && mark.end >= safeEnd,
  );
  const others = formatting.marks.filter((mark) => mark.type !== type);
  const nextSameType = fullyCovered
    ? sameType.flatMap((mark) => subtractMarkRange(mark, safeStart, safeEnd))
    : [...sameType, { type, start: safeStart, end: safeEnd }];

  return {
    ...formatting,
    contentLength: content.length,
    marks: normalizeMarks([...others, ...nextSameType], content.length),
  };
}

export function inlineMarkActive(
  formatting: ChapterFormatting,
  start: number,
  end: number,
  type: InlineMarkType,
) {
  if (end <= start) {
    return formatting.marks.some(
      (mark) => mark.type === type && mark.start <= start && mark.end >= start,
    );
  }
  return formatting.marks.some(
    (mark) => mark.type === type && mark.start <= start && mark.end >= end,
  );
}

export function inlineFontSizeAt(
  formatting: ChapterFormatting,
  start: number,
  end: number,
  fallback: number,
) {
  const match = formatting.fontSizes.find((item) =>
    end > start
      ? item.start <= start && item.end >= end
      : item.start <= start && item.end >= start,
  );
  return match?.size ?? fallback;
}

export function applyInlineFontSize(
  formatting: ChapterFormatting,
  content: string,
  start: number,
  end: number,
  size: number,
) {
  const safeStart = Math.max(0, Math.min(start, content.length));
  const safeEnd = Math.max(safeStart, Math.min(end, content.length));
  if (safeEnd <= safeStart) return formatting;
  const safeSize = Math.max(MIN_INLINE_FONT_SIZE, Math.min(MAX_INLINE_FONT_SIZE, Math.round(size)));
  const remaining = formatting.fontSizes.flatMap((item) =>
    subtractFontSizeRange(item, safeStart, safeEnd),
  );
  return {
    ...formatting,
    contentLength: content.length,
    fontSizes: normalizeFontSizes(
      [...remaining, { start: safeStart, end: safeEnd, size: safeSize }],
      content.length,
    ),
  };
}

function commonPrefixLength(left: string, right: string) {
  const limit = Math.min(left.length, right.length);
  let index = 0;
  while (index < limit && left[index] === right[index]) index += 1;
  return index;
}

function commonSuffixLength(left: string, right: string, prefixLength: number) {
  const limit = Math.min(left.length, right.length) - prefixLength;
  let count = 0;
  while (
    count < limit &&
    left[left.length - 1 - count] === right[right.length - 1 - count]
  ) {
    count += 1;
  }
  return count;
}

export function adjustFormattingForContentChange(
  formatting: ChapterFormatting,
  previousContent: string,
  nextContent: string,
) {
  if (previousContent === nextContent) {
    return { ...formatting, contentLength: nextContent.length };
  }

  const prefix = commonPrefixLength(previousContent, nextContent);
  const suffix = commonSuffixLength(previousContent, nextContent, prefix);
  const previousEditEnd = previousContent.length - suffix;
  const nextEditEnd = nextContent.length - suffix;
  const delta = nextContent.length - previousContent.length;

  const marks = formatting.marks.flatMap((mark): ChapterInlineMark[] => {
    if (mark.end <= prefix) return [{ ...mark }];
    if (mark.start >= previousEditEnd) {
      return [{ ...mark, start: mark.start + delta, end: mark.end + delta }];
    }
    return [];
  });

  const fontSizes = formatting.fontSizes.flatMap((item): ChapterInlineFontSize[] => {
    if (item.end <= prefix) return [{ ...item }];
    if (item.start >= previousEditEnd) {
      return [{ ...item, start: item.start + delta, end: item.end + delta }];
    }
    return [];
  });

  const paragraphs = formatting.paragraphs.flatMap(
    (paragraph): ChapterParagraphFormat[] => {
      let anchor: number;
      if (paragraph.end <= prefix) anchor = paragraph.start;
      else if (paragraph.start >= previousEditEnd) anchor = paragraph.start + delta;
      else {
        const oldEdited = previousContent.slice(prefix, previousEditEnd);
        const newEdited = nextContent.slice(prefix, nextEditEnd);
        if (oldEdited.includes("\n") || newEdited.includes("\n")) return [];
        anchor = Math.min(paragraph.start, prefix);
      }
      const range = paragraphRangeAt(
        nextContent,
        Math.max(0, Math.min(anchor, nextContent.length)),
      );
      if (!range || range.end <= range.start) return [];
      return [{ ...paragraph, start: range.start, end: range.end }];
    },
  );

  return {
    contentLength: nextContent.length,
    fontSizes: normalizeFontSizes(fontSizes, nextContent.length),
    marks: normalizeMarks(marks, nextContent.length),
    paragraphs: normalizeParagraphs(paragraphs, nextContent),
    version: CHAPTER_FORMATTING_VERSION,
  } satisfies ChapterFormatting;
}

export function formattingForRange(
  formatting: ChapterFormatting,
  start: number,
  end: number,
) {
  return formatting.marks.filter((mark) => mark.start < end && mark.end > start);
}

export function fontSizesForRange(
  formatting: ChapterFormatting,
  start: number,
  end: number,
) {
  return formatting.fontSizes.filter((item) => item.start < end && item.end > start);
}
