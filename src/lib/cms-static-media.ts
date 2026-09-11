import "server-only";

import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { EDUCATION_VISUAL_SLOTS } from "@/lib/cms-education";

const MEDIA_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg", ".ico", ".pdf"]);

export type CmsStaticMediaAsset = {
  key: string;
  url: string;
  relativePath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  sectionKey: string;
  sectionLabel: string;
  publicHref: string | null;
  cmsHref: string | null;
  kind: "image" | "document";
  placementLabel: string;
  targetSpec: string;
  targetWidth?: number;
  targetHeight?: number;
  targetAspectRatio?: string;
  fit: "cover" | "contain" | "responsive" | "intrinsic";
};

export type CmsStaticMediaSection = {
  key: string;
  label: string;
  publicHref: string | null;
  cmsHref: string | null;
  assets: CmsStaticMediaAsset[];
};

type Classification = Pick<CmsStaticMediaAsset,
  "sectionKey" | "sectionLabel" | "publicHref" | "cmsHref" | "placementLabel" | "targetSpec" | "targetWidth" | "targetHeight" | "targetAspectRatio" | "fit"
>;

const TRUST_PAGE_MAP: Record<string, Omit<Classification, "placementLabel" | "targetSpec" | "fit">> = {
  "community-rules": { sectionKey: "topluluk-kurallari", sectionLabel: "Topluluk Kuralları", publicHref: "/topluluk-kurallari", cmsHref: "/icerik/sayfalar" },
  "content-age-policy": { sectionKey: "icerik-ve-yas-politikasi", sectionLabel: "İçerik ve Yaş Politikası", publicHref: "/icerik-ve-yas-politikasi", cmsHref: "/icerik/sayfalar" },
  "copyright-notice": { sectionKey: "telif-bildirimi", sectionLabel: "Telif Bildirimi", publicHref: "/telif-bildirimi", cmsHref: "/icerik/sayfalar" },
  "editorial-standards": { sectionKey: "editoryal-standartlar", sectionLabel: "Editoryal Standartlar", publicHref: "/editoryal-standartlar", cmsHref: "/icerik/sayfalar" },
  "for-editors": { sectionKey: "editorler-icin", sectionLabel: "Editörler İçin", publicHref: "/editorler-icin", cmsHref: "/icerik/sayfalar" },
  "for-publishers": { sectionKey: "yayinevleri-icin", sectionLabel: "Yayınevleri İçin", publicHref: "/yayinevleri-icin", cmsHref: "/icerik/sayfalar" },
  "for-writers": { sectionKey: "yazarlar-icin", sectionLabel: "Yazarlar İçin", publicHref: "/yazarlar-icin", cmsHref: "/icerik/sayfalar" },
};

function humanizeSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

function heroPlacement(sectionLabel: string): Pick<Classification, "placementLabel" | "targetSpec" | "fit"> {
  return {
    placementLabel: `${sectionLabel} / Hero`,
    targetSpec: "min-height 29rem · masaüstü ~54vw · mobil 100vw",
    fit: "cover",
  };
}

function educationPlacement(filename: string, genre: string): Pick<Classification, "placementLabel" | "targetSpec" | "targetWidth" | "targetHeight" | "targetAspectRatio" | "fit"> {
  const number = filename.match(/(?:^|-)(0[1-7])(?:-|\.)/)?.[1];
  const slot = EDUCATION_VISUAL_SLOTS.find((item) => item.number === number);
  if (!slot) {
    return {
      placementLabel: `Eğitim / ${humanizeSlug(genre)} / Görsel`,
      targetSpec: "Responsive eğitim içerik alanı",
      fit: "contain",
    };
  }

  return {
    placementLabel: `Eğitim / ${humanizeSlug(genre)} / ${slot.number} ${slot.label}`,
    targetSpec: `${slot.recommendedWidth}×${slot.recommendedHeight} px · ${slot.aspectRatio}`,
    targetWidth: slot.recommendedWidth,
    targetHeight: slot.recommendedHeight,
    targetAspectRatio: slot.aspectRatio,
    fit: slot.fit,
  };
}

function classify(relativePath: string): Classification {
  const normalized = relativePath.replaceAll("\\", "/");
  const parts = normalized.split("/");
  const filename = parts.at(-1) ?? normalized;
  const basename = filename.slice(0, Math.max(0, filename.length - path.extname(filename).length));

  if (normalized.startsWith("landing/")) {
    const isHero = filename.includes("hero");
    return {
      sectionKey: "ana-sayfa",
      sectionLabel: "Ana Sayfa",
      publicHref: "/",
      cmsHref: "/icerik/ana-sayfa",
      placementLabel: isHero ? "Ana Sayfa / Hero" : "Ana Sayfa / Bölüm görseli",
      targetSpec: isHero ? "3:2 · masaüstü 54vw · mobil 100vw" : "Responsive bölüm alanı",
      targetAspectRatio: isHero ? "3:2" : undefined,
      fit: isHero ? "contain" : "responsive",
    };
  }

  if (normalized.startsWith("about/")) {
    const isHero = filename === "about-collaboration-hero.webp";
    const isFinalIcon = filename === "about-final-parchment-quill.webp";
    return {
      sectionKey: "hakkimizda",
      sectionLabel: "Hakkımızda",
      publicHref: "/hakkimizda",
      cmsHref: "/icerik/sayfalar",
      placementLabel: isHero ? "Hakkımızda / Hero" : isFinalIcon ? "Hakkımızda / Final işareti" : "Hakkımızda / Bölüm görseli",
      targetSpec: isHero ? "masaüstü 48vw · mobil 100vw" : isFinalIcon ? "44×44 px" : "Responsive bölüm alanı",
      targetWidth: isFinalIcon ? 44 : undefined,
      targetHeight: isFinalIcon ? 44 : undefined,
      targetAspectRatio: isFinalIcon ? "1:1" : undefined,
      fit: isFinalIcon ? "contain" : isHero ? "cover" : "responsive",
    };
  }

  if (normalized.startsWith("how-it-works/")) {
    return {
      sectionKey: "nasil-calisir",
      sectionLabel: "Nasıl Çalışır",
      publicHref: "/nasil-calisir",
      cmsHref: "/icerik/sayfalar",
      ...heroPlacement("Nasıl Çalışır"),
    };
  }

  if (normalized.startsWith("trust-pages/")) {
    const mapped = TRUST_PAGE_MAP[basename];
    if (mapped) return { ...mapped, ...heroPlacement(mapped.sectionLabel) };
    return {
      sectionKey: "guven-sayfalari",
      sectionLabel: "Güven & Politika Sayfaları",
      publicHref: null,
      cmsHref: "/icerik/sayfalar",
      placementLabel: "Güven sayfası / Görsel",
      targetSpec: "Responsive bölüm alanı",
      fit: "responsive",
    };
  }

  if (normalized.startsWith("writers/")) {
    return {
      sectionKey: "yazarlar-icin",
      sectionLabel: "Yazarlar İçin",
      publicHref: "/yazarlar-icin",
      cmsHref: "/icerik/sayfalar",
      placementLabel: normalized.includes("/history/") ? "Yazarlar İçin / History" : "Yazarlar İçin / Bölüm görseli",
      targetSpec: "Responsive bölüm alanı",
      fit: "responsive",
    };
  }

  if (normalized.startsWith("writing-guides/") || normalized.startsWith("media/education/")) {
    const offset = normalized.startsWith("writing-guides/") ? 1 : 2;
    const category = parts[offset] ?? "";
    const genre = parts[offset + 1] ?? "";
    if (genre) {
      return {
        sectionKey: `egitim-${category}-${genre}`,
        sectionLabel: `Eğitim · ${humanizeSlug(genre)}`,
        publicHref: `/yazarlar-icin/${category}/${genre}`,
        cmsHref: `/icerik/egitim/${genre}`,
        ...educationPlacement(filename, genre),
      };
    }
    return {
      sectionKey: "egitim",
      sectionLabel: "Eğitim Merkezi",
      publicHref: "/yazarlar-icin",
      cmsHref: "/icerik/egitim",
      placementLabel: "Eğitim Merkezi / Görsel",
      targetSpec: "Responsive eğitim alanı",
      fit: "contain",
    };
  }

  if (normalized.startsWith("icons/")) {
    return {
      sectionKey: "ortak-sistem",
      sectionLabel: "Ortak / Sistem Medyası",
      publicHref: null,
      cmsHref: "/icerik/site-kimligi",
      placementLabel: "Global ikon / sistem varlığı",
      targetSpec: "Intrinsic / bileşene bağlı",
      fit: "intrinsic",
    };
  }

  return {
    sectionKey: "atanmamis",
    sectionLabel: "Atanmamış Medya",
    publicHref: null,
    cmsHref: null,
    placementLabel: "Atanmamış",
    targetSpec: "Hedef alan tanımlı değil",
    fit: "responsive",
  };
}

async function walk(directory: string, root: string): Promise<CmsStaticMediaAsset[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute, root);
    if (!entry.isFile()) return [];

    const extension = path.extname(entry.name).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(extension)) return [];

    const relativePath = path.relative(root, absolute).replaceAll("\\", "/");
    const info = await stat(absolute);
    const classification = classify(relativePath);
    const url = `/${relativePath}`;

    return [{
      key: `static:${relativePath}`,
      url,
      relativePath,
      filename: entry.name,
      extension,
      sizeBytes: info.size,
      kind: extension === ".pdf" ? "document" as const : "image" as const,
      ...classification,
    }];
  }));

  return nested.flat();
}

export async function getCmsStaticMediaInventory(): Promise<CmsStaticMediaSection[]> {
  const publicRoot = path.join(process.cwd(), "public");

  try {
    const assets = await walk(publicRoot, publicRoot);
    const grouped = new Map<string, CmsStaticMediaSection>();

    for (const asset of assets) {
      const existing = grouped.get(asset.sectionKey);
      if (existing) {
        existing.assets.push(asset);
        continue;
      }
      grouped.set(asset.sectionKey, {
        key: asset.sectionKey,
        label: asset.sectionLabel,
        publicHref: asset.publicHref,
        cmsHref: asset.cmsHref,
        assets: [asset],
      });
    }

    return [...grouped.values()]
      .map((section) => ({ ...section, assets: section.assets.sort((a, b) => a.filename.localeCompare(b.filename, "tr")) }))
      .sort((a, b) => {
        if (a.key === "atanmamis") return 1;
        if (b.key === "atanmamis") return -1;
        if (a.key === "ortak-sistem") return 1;
        if (b.key === "ortak-sistem") return -1;
        return a.label.localeCompare(b.label, "tr");
      });
  } catch {
    return [];
  }
}
