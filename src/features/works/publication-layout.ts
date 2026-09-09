export const PUBLICATION_LAYOUT_INPUT_NAME = "publicationLayout";
export const PUBLICATION_LAYOUT_VERSION = 1 as const;
export const PUBLICATION_VERSION_DESCRIPTION_PREFIX =
  "@ilkoku:publication-layout:v1:";

export type PublicationFont = "typewriter" | "serif" | "sans";

export type PublicationBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type PublicationLayoutSnapshot = {
  version: typeof PUBLICATION_LAYOUT_VERSION;
  contentLength: number;
  pageEnds: number[];
  page: {
    height: number;
    width: number;
    firstBody: PublicationBox;
    continuationBody: PublicationBox;
  };
  typography: {
    font: PublicationFont;
    fontSize: number;
    letterSpacing: number;
    lineHeight: number;
  };
};

const publicationFonts = new Set<PublicationFont>([
  "typewriter",
  "serif",
  "sans",
]);

function finiteNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < minimum || value > maximum) return null;
  return value;
}

function parseBox(value: unknown): PublicationBox | null {
  if (!value || typeof value !== "object") return null;
  const box = value as Record<string, unknown>;
  const left = finiteNumber(box.left, 0, 2000);
  const top = finiteNumber(box.top, 0, 3000);
  const width = finiteNumber(box.width, 1, 2000);
  const height = finiteNumber(box.height, 1, 3000);

  return left === null || top === null || width === null || height === null
    ? null
    : { height, left, top, width };
}

export function parsePublicationLayout(
  raw: unknown,
  content: string,
): PublicationLayoutSnapshot | null {
  if (typeof raw !== "string" || !raw.trim()) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const snapshot = value as Record<string, unknown>;
  if (snapshot.version !== PUBLICATION_LAYOUT_VERSION) return null;
  if (snapshot.contentLength !== content.length) return null;

  if (!Array.isArray(snapshot.pageEnds) || snapshot.pageEnds.length < 1) {
    return null;
  }
  if (snapshot.pageEnds.length > 1000) return null;

  const pageEnds = snapshot.pageEnds.map((value) =>
    typeof value === "number" && Number.isInteger(value) ? value : -1,
  );

  if (content.length === 0) {
    if (pageEnds.length !== 1 || pageEnds[0] !== 0) return null;
  } else {
    let previous = 0;
    for (const end of pageEnds) {
      if (end <= previous || end > content.length) return null;
      previous = end;
    }
    if (pageEnds.at(-1) !== content.length) return null;
  }

  if (!snapshot.page || typeof snapshot.page !== "object") return null;
  const page = snapshot.page as Record<string, unknown>;
  const pageWidth = finiteNumber(page.width, 240, 2000);
  const pageHeight = finiteNumber(page.height, 320, 3000);
  const firstBody = parseBox(page.firstBody);
  const continuationBody = parseBox(page.continuationBody);
  if (
    pageWidth === null ||
    pageHeight === null ||
    !firstBody ||
    !continuationBody
  ) {
    return null;
  }

  for (const box of [firstBody, continuationBody]) {
    if (box.left + box.width > pageWidth + 2) return null;
    if (box.top + box.height > pageHeight + 2) return null;
  }

  if (!snapshot.typography || typeof snapshot.typography !== "object") {
    return null;
  }
  const typography = snapshot.typography as Record<string, unknown>;
  const font = typography.font;
  if (typeof font !== "string" || !publicationFonts.has(font as PublicationFont)) {
    return null;
  }
  const fontSize = finiteNumber(typography.fontSize, 10, 40);
  const lineHeight = finiteNumber(typography.lineHeight, 10, 100);
  const letterSpacing = finiteNumber(typography.letterSpacing, -2, 10);
  if (fontSize === null || lineHeight === null || letterSpacing === null) {
    return null;
  }

  return {
    version: PUBLICATION_LAYOUT_VERSION,
    contentLength: content.length,
    pageEnds,
    page: {
      height: pageHeight,
      width: pageWidth,
      firstBody,
      continuationBody,
    },
    typography: {
      font: font as PublicationFont,
      fontSize,
      letterSpacing,
      lineHeight,
    },
  };
}

export function encodePublicationVersionDescription(
  layout: PublicationLayoutSnapshot,
) {
  return `${PUBLICATION_VERSION_DESCRIPTION_PREFIX}${JSON.stringify(layout)}`;
}

export function decodePublicationVersionDescription(
  description: string | null,
  content: string,
) {
  if (!description?.startsWith(PUBLICATION_VERSION_DESCRIPTION_PREFIX)) {
    return null;
  }

  return parsePublicationLayout(
    description.slice(PUBLICATION_VERSION_DESCRIPTION_PREFIX.length),
    content,
  );
}

export function splitPublishedPages(
  content: string,
  layout: PublicationLayoutSnapshot,
) {
  let start = 0;
  return layout.pageEnds.map((end) => {
    const text = content.slice(start, end);
    const page = { end, start, text };
    start = end;
    return page;
  });
}
