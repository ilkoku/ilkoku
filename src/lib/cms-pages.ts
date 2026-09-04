import {
  publicCodeOwnedIndexRoutes,
  publicPausedDiscoveryReservedRoutes,
} from "@/lib/public-seo-routes";

export type CmsPageBody = {
  summary: string;
  body: string;
};

const codeOwnedPublicRoots = [
  ...publicCodeOwnedIndexRoutes,
  ...publicPausedDiscoveryReservedRoutes,
].flatMap((route) => {
  const root = route.split("/").filter(Boolean)[0];
  return root ? [root] : [];
});

const reservedRoots = new Set([
  "api",
  "admin",
  "icerik",
  "sistem-yonetimi",
  "_next",
  "giris",
  "kayit",
  "rol-secimi",
  "sifremi-unuttum",
  "hesabim",
  "okuyucu",
  "yazar",
  "editor",
  "yayinevi",
  "yayinevleri",
  "kitap",
  "kesfet",
  "tamamlanan-eserler",
  "okumaya-devam",
  "yorumlarim",
  "yasal",
  "rehber",
  "en",
  "onizleme",
  "opengraph-image",
  "twitter-image",
  ...codeOwnedPublicRoots,
]);

export function normalizeCmsPageSlug(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "").trim().toLocaleLowerCase("tr-TR").replace(/^\/+|\/+$/g, "");
  if (!raw || raw.length > 120) throw new Error("Sayfa URL kısa adı boş veya çok uzun.");
  if (raw.includes("/") || !/^[a-z0-9-]+$/.test(raw) || raw.startsWith("-") || raw.endsWith("-") || raw.includes("--")) {
    throw new Error("Sayfa URL kısa adı yalnız a-z, 0-9 ve tek tire içerebilir.");
  }
  if (reservedRoots.has(raw)) throw new Error("Bu URL İlkOku ürün/sistem rotaları için ayrılmıştır.");
  return raw;
}

export function cmsPageContentKey(slugPart: string) {
  return `page:tr:${slugPart}`;
}

export function cmsPagePublicPath(slugPart: string) {
  return `/${slugPart}`;
}

export function isCmsGenericPageContentKey(contentKey: string) {
  return contentKey.startsWith("page:tr:");
}

export function parseCmsPageBody(valueJson: string): CmsPageBody {
  try {
    const value = JSON.parse(valueJson) as Record<string, unknown>;
    return {
      summary: typeof value.summary === "string" ? value.summary : "",
      body: typeof value.body === "string" ? value.body : "",
    };
  } catch {
    return { summary: "", body: "" };
  }
}
