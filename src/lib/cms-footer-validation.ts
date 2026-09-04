import "server-only";

import { safeCmsInternalHref } from "@/lib/cms-links";
import { type FooterNavigationPayload } from "@/lib/cms-footer-navigation";
import { prisma } from "@/lib/prisma";

export type FooterLinkStatus = "ok" | "fallback" | "duplicate" | "broken";
export type FooterLinkDiagnostic = {
  key: string;
  label: string;
  href: string;
  effectiveHref: string;
  status: FooterLinkStatus;
  detail: string;
};

const landingAnchors = new Set(["#hakkimizda", "#eser-pasaportu", "#neden-ilkoku", "#roller", "#iletisim"]);
const fixedPublicPaths = new Set([
  "/",
  "/kesfet",
  "/eserler",
  "/yazarlar",
  "/turler",
  "/editorler",
  "/yardim",
  "/iletisim",
  "/hakkimizda",
  "/giris",
  "/kayit",
  "/sifremi-unuttum",
  "/nasil-calisir",
  "/editoryal-standartlar",
  "/icerik-ve-yas-politikasi",
  "/topluluk-kurallari",
  "/telif-bildirimi",
  "/yazarlar-icin",
  "/editorler-icin",
  "/yayinevleri-icin",
]);

const linkSpecs = [
  ["platform1", "Nasıl Çalışır?", "/nasil-calisir"],
  ["platform2", "Yazarlar İçin", "/yazarlar-icin"],
  ["platform3", "Editörler İçin", "/editorler-icin"],
  ["support", "Destek", "mailto:destek@ilkoku.com"],
  ["terms", "Kullanım Şartları", "/yasal/kullanim-sartlari"],
  ["privacy", "Gizlilik", "/yasal/gizlilik-politikasi"],
  ["kvkk", "KVKK", "/yasal/kvkk"],
  ["cookie", "Çerez", "/yasal/cerez-politikasi"],
  ["copyright", "Telif", "/yasal/telif-hakki-politikasi"],
] as const;

function pathnameOf(href: string) {
  if (href.startsWith("#")) return href;
  try {
    return new URL(href, "https://ilkoku.local").pathname;
  } catch {
    return "";
  }
}

async function publishedCmsPaths() {
  const rows = await prisma.$queryRaw<Array<{ slug: string }>>`
    SELECT slug
    FROM ContentPage
    WHERE status = 'published'
      AND slug IS NOT NULL
      AND slug <> ''
    LIMIT 1000
  `;
  return new Set(rows.map((row) => row.slug.startsWith("/") ? row.slug : `/${row.slug}`));
}

export async function analyzeFooterNavigation(payload: FooterNavigationPayload) {
  const contentPaths = await publishedCmsPaths();
  const preliminary: FooterLinkDiagnostic[] = linkSpecs.map(([key, fallbackLabel, fallbackHref]) => {
    const label = payload[`${key}Label` as keyof FooterNavigationPayload] || fallbackLabel;
    const rawHref = payload[`${key}Href` as keyof FooterNavigationPayload].trim();
    if (!rawHref) {
      return {
        key,
        label,
        href: "",
        effectiveHref: fallbackHref,
        status: "fallback" as const,
        detail: "Özel hedef girilmedi; public kod fallback’i kullanılacak.",
      };
    }

    const safeHref = safeCmsInternalHref(rawHref);
    if (!safeHref) {
      return {
        key,
        label,
        href: rawHref,
        effectiveHref: rawHref,
        status: "broken" as const,
        detail: "Hedef güvenli site içi URL/anchor değil veya yönetim/API alanına gidiyor.",
      };
    }

    if (safeHref.startsWith("#")) {
      return landingAnchors.has(safeHref)
        ? { key, label, href: rawHref, effectiveHref: safeHref, status: "ok" as const, detail: "Ana sayfa anchor hedefi doğrulandı." }
        : { key, label, href: rawHref, effectiveHref: safeHref, status: "broken" as const, detail: "Ana sayfada bilinen bir anchor hedefi değil." };
    }

    const pathname = pathnameOf(safeHref);
    if (fixedPublicPaths.has(pathname) || contentPaths.has(pathname)) {
      return { key, label, href: rawHref, effectiveHref: safeHref, status: "ok" as const, detail: "Public hedef doğrulandı." };
    }

    return {
      key,
      label,
      href: rawHref,
      effectiveHref: safeHref,
      status: "broken" as const,
      detail: "Hedef güvenli görünüyor ancak yayındaki public rota/içerik listesinde bulunamadı.",
    };
  });

  const counts = new Map<string, number>();
  for (const item of preliminary) {
    if (item.status === "broken" || item.status === "fallback") continue;
    counts.set(item.effectiveHref, (counts.get(item.effectiveHref) ?? 0) + 1);
  }

  const diagnostics = preliminary.map((item) => {
    if (item.status !== "ok" || (counts.get(item.effectiveHref) ?? 0) < 2) return item;
    return { ...item, status: "duplicate" as const, detail: "Aynı hedef footer içinde birden fazla bağlantıda kullanılıyor." };
  });

  return {
    diagnostics,
    blocking: diagnostics.filter((item) => item.status === "broken" || item.status === "duplicate"),
    fallbackCount: diagnostics.filter((item) => item.status === "fallback").length,
  };
}
