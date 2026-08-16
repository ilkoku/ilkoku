import "server-only";

export const MAX_CMS_MEDIA_BYTES = 3 * 1024 * 1024;

export type CmsMediaKind = "image" | "document" | "icon";

export type StoredMediaBlob = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
};

export type CmsMediaAssetMetadata = {
  id?: string;
  title?: string;
  url: string;
  altText?: string;
  kind?: string;
  usage?: string;
  notes?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  storage?: string;
  uploadedBy?: string;
};

const MIME_KIND: Record<string, CmsMediaKind> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/avif": "image",
  "image/x-icon": "icon",
  "image/vnd.microsoft.icon": "icon",
  "application/pdf": "document",
};

export function mediaKindForMime(mimeType: string): CmsMediaKind | null {
  return MIME_KIND[mimeType.toLowerCase()] ?? null;
}

export function sanitizeMediaFilename(input: string) {
  const clean = input
    .normalize("NFKC")
    .replace(/[\r\n\0]/g, "")
    .replace(/[\\/]+/g, "-")
    .replace(/[^\p{L}\p{N}._() -]+/gu, "-")
    .replace(/\s+/g, " ")
    .trim();
  return (clean || "ilkoku-medya").slice(0, 180);
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

export function detectAllowedMediaMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 6) {
    const signature = ascii(bytes, 0, 6);
    if (signature === "GIF87a" || signature === "GIF89a") return "image/gif";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (bytes.length >= 12) {
    const brand = ascii(bytes, 4, 12);
    if (brand === "ftypavif" || brand === "ftypavis") return "image/avif";
  }
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return "image/vnd.microsoft.icon";
  }
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  return null;
}

export function parseCmsMediaAssetMetadata(valueJson: string): CmsMediaAssetMetadata | null {
  try {
    const value = JSON.parse(valueJson) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const asset = value as Record<string, unknown>;
    if (typeof asset.url !== "string" || !asset.url.startsWith("/") || asset.url.startsWith("//")) return null;
    return { ...asset, url: asset.url } as CmsMediaAssetMetadata;
  } catch {
    return null;
  }
}

export function parseStoredMediaBlob(valueJson: string): StoredMediaBlob | null {
  try {
    const value = JSON.parse(valueJson) as Partial<StoredMediaBlob>;
    if (!value.id || !value.filename || !value.mimeType || !value.base64) return null;
    if (!mediaKindForMime(value.mimeType)) return null;
    const sizeBytes = Number(value.sizeBytes ?? 0);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_CMS_MEDIA_BYTES) return null;
    return {
      id: value.id,
      filename: sanitizeMediaFilename(value.filename),
      mimeType: value.mimeType,
      sizeBytes,
      base64: value.base64,
    };
  } catch {
    return null;
  }
}
