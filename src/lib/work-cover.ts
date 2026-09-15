import "server-only";

import { detectAllowedMediaMime } from "@/lib/cms-media";

export const MAX_WORK_COVER_BYTES = 3 * 1024 * 1024;
export const WORK_COVER_MIN_WIDTH = 800;
export const WORK_COVER_MIN_HEIGHT = 1200;
export const WORK_COVER_RATIO = 2 / 3;
export const WORK_COVER_RATIO_TOLERANCE = 0.015;

export type WorkCoverDimensions = {
  height: number;
  width: number;
};

const COVER_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function uint16be(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function uint16le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function uint24le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function uint32be(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function pngDimensions(bytes: Uint8Array): WorkCoverDimensions | null {
  if (bytes.length < 24) return null;
  const width = uint32be(bytes, 16);
  const height = uint32be(bytes, 20);
  return width > 0 && height > 0 ? { width, height } : null;
}

function jpegDimensions(bytes: Uint8Array): WorkCoverDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;

  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    if (offset + 2 > bytes.length) break;

    const segmentLength = uint16be(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;

    if (sofMarkers.has(marker) && segmentLength >= 7) {
      const height = uint16be(bytes, offset + 3);
      const width = uint16be(bytes, offset + 5);
      return width > 0 && height > 0 ? { width, height } : null;
    }

    offset += segmentLength;
  }

  return null;
}

function webpDimensions(bytes: Uint8Array): WorkCoverDimensions | null {
  if (bytes.length < 30) return null;
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) !== "RIFF" || ascii(8, 12) !== "WEBP") return null;

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunk = ascii(offset, offset + 4);
    const size =
      bytes[offset + 4] |
      (bytes[offset + 5] << 8) |
      (bytes[offset + 6] << 16) |
      (bytes[offset + 7] << 24);
    const payload = offset + 8;
    if (size < 0 || payload + size > bytes.length) return null;

    if (chunk === "VP8X" && size >= 10) {
      return {
        width: uint24le(bytes, payload + 4) + 1,
        height: uint24le(bytes, payload + 7) + 1,
      };
    }

    if (chunk === "VP8L" && size >= 5 && bytes[payload] === 0x2f) {
      const b1 = bytes[payload + 1];
      const b2 = bytes[payload + 2];
      const b3 = bytes[payload + 3];
      const b4 = bytes[payload + 4];
      return {
        width: 1 + (((b2 & 0x3f) << 8) | b1),
        height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
      };
    }

    if (
      chunk === "VP8 " &&
      size >= 10 &&
      bytes[payload + 3] === 0x9d &&
      bytes[payload + 4] === 0x01 &&
      bytes[payload + 5] === 0x2a
    ) {
      return {
        width: uint16le(bytes, payload + 6) & 0x3fff,
        height: uint16le(bytes, payload + 8) & 0x3fff,
      };
    }

    offset = payload + size + (size % 2);
  }

  return null;
}

export function inspectWorkCover(bytes: Uint8Array) {
  const mimeType = detectAllowedMediaMime(bytes);
  if (!mimeType || !COVER_MIMES.has(mimeType)) {
    return { ok: false as const, message: "Kapak JPG, PNG veya WebP olmalıdır." };
  }

  const dimensions =
    mimeType === "image/png"
      ? pngDimensions(bytes)
      : mimeType === "image/jpeg"
        ? jpegDimensions(bytes)
        : webpDimensions(bytes);

  if (!dimensions) {
    return { ok: false as const, message: "Kapak görselinin ölçüleri okunamadı." };
  }

  if (
    dimensions.width < WORK_COVER_MIN_WIDTH ||
    dimensions.height < WORK_COVER_MIN_HEIGHT
  ) {
    return {
      ok: false as const,
      message: `Kapak en az ${WORK_COVER_MIN_WIDTH}×${WORK_COVER_MIN_HEIGHT} px olmalıdır.`,
    };
  }

  const ratio = dimensions.width / dimensions.height;
  if (Math.abs(ratio - WORK_COVER_RATIO) > WORK_COVER_RATIO_TOLERANCE) {
    return {
      ok: false as const,
      message: "Kapak oranı 2:3 olmalıdır. Önerilen ölçü 1200×1800 px.",
    };
  }

  return {
    ok: true as const,
    mimeType,
    ...dimensions,
  };
}
