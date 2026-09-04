import "server-only";

import { cache } from "react";
import {
  getPublicAuthors,
  getPublicGenres,
} from "@/features/public-discovery/library";
import { prisma } from "@/lib/prisma";
import { isBlockedPublicWorkSlug } from "@/lib/public-content-safety";
import {
  publicCmsManagedCoreRoutes,
  publicCodeOwnedIndexRoutes,
  publicDefaultCoreSeoRoutes,
} from "@/lib/public-seo-routes";
import { publicDiscoveryEnabled } from "@/lib/public-site-navigation";

export type SeoEvidenceState = "ok" | "warn" | "danger";
export type SeoSchemaType = "WebSite" | "Book" | "CollectionPage" | "ProfilePage" | "FAQPage" | "BreadcrumbList";

type LiveResponse = {
  ok: boolean;
  status: number | null;
  text: string | null;
};

type EvidenceCheck = {
  detail: string;
  state: SeoEvidenceState;
};

type SchemaEvidenceCheck = EvidenceCheck & {
  route: string | null;
};

type CoreSitemapExpectation = {
  state: "ok" | "unavailable";
  routes: string[];
};

type CoreIndexabilityRow = {
  slug: string;
  noIndex: boolean;
};

export type LiveSeoVerification = {
  robots: EvidenceCheck;
  sitemap: EvidenceCheck & {
    count: number | null;
    duplicates: number | null;
  };
  social: EvidenceCheck & {
    checked: number;
    failed: string[];
    unavailable: string[];
  };
  structuredData: Record<SeoSchemaType, SchemaEvidenceCheck>;
};

const baseUrl = "https://ilkoku.com";
const requiredRobotsDisallow = [
  "/admin",
  "/icerik",
  "/sistem-yonetimi",
  "/harita",
  "/sozlesme",
  "/sozlesmelerim",
  "/api",
  "/auth",
] as const;

async function fetchLive(path: string): Promise<LiveResponse> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: {
        accept: "text/html,text/plain;q=0.9,*/*;q=0.8",
        "user-agent": "IlkOku-SEO-Evidence/1.0",
      },
      signal: AbortSignal.timeout(6_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      text: response.ok ? await response.text() : null,
    };
  } catch {
    return { ok: false, status: null, text: null };
  }
}

function hasSocialMetadata(html: string) {
  const openGraphImage = /<meta[^>]+property=["']og:image["'][^>]*>/iu.test(html);
  const twitterCard = /<meta[^>]+name=["']twitter:card["'][^>]*>/iu.test(html);
  const twitterImage = /<meta[^>]+name=["']twitter:image["'][^>]*>/iu.test(html);
  return openGraphImage && twitterCard && twitterImage;
}

function sitemapLocations(xml: string) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/giu)].map((match) => match[1].trim());
}

function normalizedSitemapLocation(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "ilkoku.com") return null;
    const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}

function absoluteCoreRoute(route: string) {
  return `${baseUrl}${route === "/" ? "/" : route.replace(/\/+$/, "")}`;
}

async function coreSitemapExpectation(): Promise<CoreSitemapExpectation> {
  try {
    const rows = await prisma.$queryRaw<CoreIndexabilityRow[]>`
      SELECT slug, noIndex
      FROM ContentPage
      WHERE status = 'published'
        AND (
          contentKey LIKE 'page:tr:%'
          OR (contentKey LIKE 'legal:%' AND contentKey NOT LIKE 'legal:en:%')
        )
      LIMIT 5000
    `;
    const bySlug = new Map(rows.map((row) => [row.slug.startsWith("/") ? row.slug : `/${row.slug}`, row]));
    const cmsRoutes = publicCmsManagedCoreRoutes.filter((route) => !bySlug.get(route)?.noIndex);
    return {
      state: "ok",
      routes: Array.from(new Set<string>([
        ...publicCodeOwnedIndexRoutes,
        ...cmsRoutes,
      ])),
    };
  } catch {
    // Fail closed: code-owned routes are always expected, but CMS noindex
    // decisions cannot be guessed when the published inventory is unreadable.
    return {
      state: "unavailable",
      routes: [...publicCodeOwnedIndexRoutes],
    };
  }
}

function schemaTypesFromHtml(html: string) {
  const types = new Set<string>();
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu;

  function visit(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    const type = record["@type"];
    if (typeof type === "string") types.add(type);
    else if (Array.isArray(type)) type.filter((item): item is string => typeof item === "string").forEach((item) => types.add(item));
    Object.values(record).forEach(visit);
  }

  for (const match of html.matchAll(scriptPattern)) {
    try {
      visit(JSON.parse(match[1]) as unknown);
    } catch {
      // A malformed JSON-LD block is not accepted as evidence.
    }
  }
  return types;
}

async function representativeRoutes() {
  try {
    const [works, authors, genres, faqRows] = await Promise.all([
      prisma.work.findMany({
        where: {
          archivedAt: null,
          contentRating: { not: "adult_18" },
          author: { is: { deletedAt: null, status: "active" } },
          language: "tr",
          publishedAt: { not: null },
          status: "published",
          visibility: "public",
        },
        orderBy: { updatedAt: "desc" },
        select: { slug: true },
        take: 100,
      }),
      publicDiscoveryEnabled ? getPublicAuthors() : Promise.resolve([]),
      publicDiscoveryEnabled ? getPublicGenres() : Promise.resolve([]),
      prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*) AS total
        FROM SiteContent
        WHERE namespace = 'faq' AND status = 'published'
      `,
    ]);

    const work = works.find((item) => !isBlockedPublicWorkSlug(item.slug));
    return {
      author: authors[0] ? `/yazarlar/${authors[0].publicId}` : null,
      faqExpected: Number(faqRows[0]?.total ?? 0) > 0,
      genre: genres[0] ? `/turler/${genres[0].slug}` : null,
      work: work ? `/kitap/${work.slug}` : null,
    };
  } catch {
    return { author: null, faqExpected: null, genre: null, work: null };
  }
}

function missingRepresentative(detail: string): SchemaEvidenceCheck {
  return { state: "warn", route: null, detail };
}

function inactiveSchema(detail: string): SchemaEvidenceCheck {
  return { state: "ok", route: null, detail };
}

export const getLiveSeoVerification = cache(async (): Promise<LiveSeoVerification> => {
  const [representatives, sitemapExpectation] = await Promise.all([
    representativeRoutes(),
    coreSitemapExpectation(),
  ]);
  const dynamicSocialRoutes = [representatives.work, representatives.author, representatives.genre]
    .filter((route): route is string => Boolean(route));
  const socialRoutes = Array.from(new Set<string>([
    ...publicDefaultCoreSeoRoutes,
    ...dynamicSocialRoutes,
  ]));

  const [robotsResponse, sitemapResponse, socialResponses] = await Promise.all([
    fetchLive("/robots.txt"),
    fetchLive("/sitemap.xml"),
    Promise.all(socialRoutes.map(async (route) => ({ route, response: await fetchLive(route) }))),
  ]);

  let robots: EvidenceCheck;
  if (!robotsResponse.ok || !robotsResponse.text) {
    robots = {
      state: "warn",
      detail: `Canlı robots.txt okunamadı${robotsResponse.status ? ` (HTTP ${robotsResponse.status})` : ""}; PASS üretilmedi.`,
    };
  } else {
    const missingRules = requiredRobotsDisallow.filter((path) => !robotsResponse.text!.includes(`Disallow: ${path}`));
    const sitemapDeclared = robotsResponse.text.includes(`Sitemap: ${baseUrl}/sitemap.xml`);
    robots = missingRules.length === 0 && sitemapDeclared
      ? { state: "ok", detail: `Canlı robots.txt doğrulandı: ${requiredRobotsDisallow.length} korumalı prefix + sitemap ilanı mevcut.` }
      : {
          state: "danger",
          detail: `${missingRules.length} zorunlu Disallow kuralı eksik${sitemapDeclared ? "" : " · sitemap ilanı eksik"}.`,
        };
  }

  let sitemap: LiveSeoVerification["sitemap"];
  if (!sitemapResponse.ok || !sitemapResponse.text) {
    sitemap = {
      state: "warn",
      count: null,
      duplicates: null,
      detail: `Canlı sitemap.xml okunamadı${sitemapResponse.status ? ` (HTTP ${sitemapResponse.status})` : ""}; URL kapsamı doğrulanamadı.`,
    };
  } else {
    const locations = sitemapLocations(sitemapResponse.text);
    const normalizedLocations = locations.map(normalizedSitemapLocation);
    const validLocations = normalizedLocations.filter((location): location is string => Boolean(location));
    const uniqueLocations = new Set(validLocations);
    const duplicateCount = validLocations.length - uniqueLocations.size;
    const invalidHostCount = normalizedLocations.length - validLocations.length;
    const missingCoreRoutes = sitemapExpectation.routes.filter(
      (route) => !uniqueLocations.has(absoluteCoreRoute(route)),
    );

    if (duplicateCount > 0 || invalidHostCount > 0 || missingCoreRoutes.length > 0) {
      sitemap = {
        state: "danger",
        count: locations.length,
        duplicates: duplicateCount,
        detail: `${locations.length} canlı URL · ${duplicateCount} tekrar · ${invalidHostCount} geçersiz host/URL · ${missingCoreRoutes.length} zorunlu çekirdek rota eksik${missingCoreRoutes.length ? ` (${missingCoreRoutes.join(", ")})` : ""}.`,
      };
    } else if (sitemapExpectation.state === "unavailable") {
      sitemap = {
        state: "warn",
        count: locations.length,
        duplicates: 0,
        detail: `Canlı sitemap.xml içindeki ${sitemapExpectation.routes.length} kod tabanlı zorunlu rota doğrulandı; published CMS noindex envanteri okunamadığı için tam çekirdek kapsam için PASS üretilmedi.`,
      };
    } else {
      sitemap = {
        state: "ok",
        count: locations.length,
        duplicates: 0,
        detail: `Canlı sitemap.xml doğrulandı: ${locations.length} benzersiz public URL ve ${sitemapExpectation.routes.length} beklenen çekirdek rota eksiksiz; duplicate veya geçersiz canonical host yok.`,
      };
    }
  }

  const unavailableSocial = socialResponses
    .filter(({ response }) => !response.ok || !response.text)
    .map(({ route }) => route);
  const failedSocial = socialResponses
    .filter(({ response }) => response.ok && response.text && !hasSocialMetadata(response.text))
    .map(({ route }) => route);
  const checkedSocial = socialResponses.length - unavailableSocial.length;
  const social: LiveSeoVerification["social"] = failedSocial.length > 0
    ? {
        state: "danger",
        checked: checkedSocial,
        failed: failedSocial,
        unavailable: unavailableSocial,
        detail: `${failedSocial.length} canlı public route OG/Twitter kanıtını geçemedi${unavailableSocial.length ? ` · ${unavailableSocial.length} route okunamadı` : ""}.`,
      }
    : unavailableSocial.length > 0
      ? {
          state: "warn",
          checked: checkedSocial,
          failed: [],
          unavailable: unavailableSocial,
          detail: `${checkedSocial}/${socialRoutes.length} public route canlı sosyal metadata ile doğrulandı; ${unavailableSocial.length} route okunamadığı için PASS üretilmedi.`,
        }
      : {
          state: "ok",
          checked: checkedSocial,
          failed: [],
          unavailable: [],
          detail: `${checkedSocial}/${socialRoutes.length} public route canlı OG image + Twitter card/image ile doğrulandı.`,
        };

  const schemaRoutes = new Map<string, Promise<LiveResponse>>();
  const schemaResponse = (route: string) => {
    const existing = schemaRoutes.get(route);
    if (existing) return existing;
    const pending = fetchLive(route);
    schemaRoutes.set(route, pending);
    return pending;
  };

  async function verifySchema(type: SeoSchemaType, route: string | null, missingDetail: string): Promise<SchemaEvidenceCheck> {
    if (!route) return missingRepresentative(missingDetail);
    const response = await schemaResponse(route);
    if (!response.ok || !response.text) {
      return {
        state: "warn",
        route,
        detail: `Canlı ${route} okunamadı${response.status ? ` (HTTP ${response.status})` : ""}; ${type} PASS üretilmedi.`,
      };
    }
    const found = schemaTypesFromHtml(response.text).has(type);
    return found
      ? { state: "ok", route, detail: `${route} server HTML içinde ${type} JSON-LD doğrulandı.` }
      : { state: "danger", route, detail: `${route} canlı HTML içinde ${type} JSON-LD bulunamadı.` };
  }

  const [website, book, collectionPage, profilePage, breadcrumb] = await Promise.all([
    verifySchema("WebSite", "/", "Ana Sayfa route'u belirlenemedi."),
    verifySchema("Book", representatives.work, "Canlı doğrulama için keşfe açık eser örneği bulunamadı."),
    publicDiscoveryEnabled
      ? verifySchema("CollectionPage", "/eserler", "Eser koleksiyonu route'u belirlenemedi.")
      : Promise.resolve(inactiveSchema("Public Eserler/Yazarlar/Türler keşif bölümleri geçici olarak pasif; CollectionPage doğrulaması uygulanabilir değil.")),
    publicDiscoveryEnabled
      ? verifySchema("ProfilePage", representatives.author, "Canlı doğrulama için public yazar örneği bulunamadı.")
      : Promise.resolve(inactiveSchema("Public Eserler/Yazarlar/Türler keşif bölümleri geçici olarak pasif; ProfilePage doğrulaması uygulanabilir değil.")),
    verifySchema("BreadcrumbList", "/yardim", "Yardım route'u belirlenemedi."),
  ]);

  const faq = representatives.faqExpected === false
    ? missingRepresentative("Yayınlanmış SSS kaydı yok; FAQPage şeması koşullu olduğu için PASS üretilmedi.")
    : representatives.faqExpected === null
      ? missingRepresentative("Yayınlanmış SSS envanteri okunamadı; FAQPage doğrulanamadı.")
      : await verifySchema("FAQPage", "/yardim", "Yardım route'u belirlenemedi.");

  return {
    robots,
    sitemap,
    social,
    structuredData: {
      WebSite: website,
      Book: book,
      CollectionPage: collectionPage,
      ProfilePage: profilePage,
      FAQPage: faq,
      BreadcrumbList: breadcrumb,
    },
  };
});
