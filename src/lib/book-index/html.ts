const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export function decodeBookIndexHtml(value: string) {
  return value
    .replace(
      /&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/giu,
      (match, entity: string) => {
        if (entity.startsWith("#x") || entity.startsWith("#X")) {
          const codePoint = Number.parseInt(entity.slice(2), 16);
          return Number.isFinite(codePoint)
            ? String.fromCodePoint(codePoint)
            : match;
        }

        if (entity.startsWith("#")) {
          const codePoint = Number.parseInt(entity.slice(1), 10);
          return Number.isFinite(codePoint)
            ? String.fromCodePoint(codePoint)
            : match;
        }

        return namedEntities[entity.toLocaleLowerCase("en-US")] ?? match;
      },
    )
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function normalizeBookIndexText(value: string) {
  return decodeBookIndexHtml(value)
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}
