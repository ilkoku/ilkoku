export type CmsPageBlockType =
  | "hero"
  | "text"
  | "image"
  | "split"
  | "cards"
  | "cta"
  | "steps"
  | "stats"
  | "quote"
  | "faq"
  | "gallery"
  | "table"
  | "divider";

export type CmsPageCardItem = { title: string; text: string; label: string; href: string };
export type CmsPageStepItem = { title: string; text: string };
export type CmsPageStatItem = { value: string; label: string };
export type CmsPageFaqItem = { question: string; answer: string };
export type CmsPageGalleryItem = { imageUrl: string; alt: string; caption: string };

export type CmsPageBlock =
  | { id: string; type: "hero"; eyebrow: string; title: string; text: string; imageUrl: string; imageAlt: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string }
  | { id: string; type: "text"; heading: string; body: string }
  | { id: string; type: "image"; imageUrl: string; alt: string; caption: string; layout: "contained" | "wide" }
  | { id: string; type: "split"; heading: string; body: string; imageUrl: string; imageAlt: string; imageSide: "left" | "right" }
  | { id: string; type: "cards"; heading: string; intro: string; items: CmsPageCardItem[] }
  | { id: string; type: "cta"; heading: string; text: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string }
  | { id: string; type: "steps"; heading: string; intro: string; items: CmsPageStepItem[] }
  | { id: string; type: "stats"; heading: string; items: CmsPageStatItem[] }
  | { id: string; type: "quote"; quote: string; attribution: string }
  | { id: string; type: "faq"; heading: string; items: CmsPageFaqItem[] }
  | { id: string; type: "gallery"; heading: string; items: CmsPageGalleryItem[] }
  | { id: string; type: "table"; heading: string; columns: string[]; rows: string[][] }
  | { id: string; type: "divider"; spacing: "small" | "medium" | "large" };

const allowedTypes = new Set<CmsPageBlockType>([
  "hero", "text", "image", "split", "cards", "cta", "steps", "stats", "quote", "faq", "gallery", "table", "divider",
]);

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Blok verisi geçersiz.");
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function blockId(value: unknown, index: number) {
  const normalized = stringValue(value, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  return normalized || `block-${index + 1}`;
}

function hrefValue(value: unknown) {
  const href = stringValue(value, 500);
  if (!href) return "";
  if (href.startsWith("/") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;
  throw new Error("Blok bağlantısı yalnız site içi, https, e-posta veya telefon bağlantısı olabilir.");
}

function imageValue(value: unknown) {
  const url = stringValue(value, 500);
  if (!url) return "";
  if (/^\/api\/media\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(url)) return url;
  throw new Error("Blok görseli yalnız CMS Medya kütüphanesinden seçilebilir.");
}

function list(value: unknown, max: number) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

function normalizeCard(value: unknown): CmsPageCardItem {
  const item = record(value);
  return {
    title: stringValue(item.title, 140),
    text: stringValue(item.text, 900),
    label: stringValue(item.label, 80),
    href: hrefValue(item.href),
  };
}

function normalizeStep(value: unknown): CmsPageStepItem {
  const item = record(value);
  return { title: stringValue(item.title, 140), text: stringValue(item.text, 1200) };
}

function normalizeStat(value: unknown): CmsPageStatItem {
  const item = record(value);
  return { value: stringValue(item.value, 40), label: stringValue(item.label, 120) };
}

function normalizeFaq(value: unknown): CmsPageFaqItem {
  const item = record(value);
  return { question: stringValue(item.question, 220), answer: stringValue(item.answer, 1800) };
}

function normalizeGallery(value: unknown): CmsPageGalleryItem {
  const item = record(value);
  return {
    imageUrl: imageValue(item.imageUrl),
    alt: stringValue(item.alt, 180),
    caption: stringValue(item.caption, 300),
  };
}

export function normalizeCmsPageBlocks(value: unknown): CmsPageBlock[] {
  if (!Array.isArray(value)) throw new Error("Sayfa blokları dizi olmalıdır.");
  if (value.length > 80) throw new Error("Bir sayfada en fazla 80 blok kullanılabilir.");

  return value.map((raw, index) => {
    const item = record(raw);
    const type = stringValue(item.type, 30) as CmsPageBlockType;
    if (!allowedTypes.has(type)) throw new Error("Bilinmeyen sayfa bloğu.");
    const id = blockId(item.id, index);

    switch (type) {
      case "hero":
        return { id, type, eyebrow: stringValue(item.eyebrow, 80), title: stringValue(item.title, 220), text: stringValue(item.text, 1200), imageUrl: imageValue(item.imageUrl), imageAlt: stringValue(item.imageAlt, 180), primaryLabel: stringValue(item.primaryLabel, 80), primaryHref: hrefValue(item.primaryHref), secondaryLabel: stringValue(item.secondaryLabel, 80), secondaryHref: hrefValue(item.secondaryHref) };
      case "text":
        return { id, type, heading: stringValue(item.heading, 220), body: stringValue(item.body, 12000) };
      case "image": {
        const layout = item.layout === "wide" ? "wide" : "contained";
        return { id, type, imageUrl: imageValue(item.imageUrl), alt: stringValue(item.alt, 180), caption: stringValue(item.caption, 400), layout };
      }
      case "split": {
        const imageSide = item.imageSide === "left" ? "left" : "right";
        return { id, type, heading: stringValue(item.heading, 220), body: stringValue(item.body, 5000), imageUrl: imageValue(item.imageUrl), imageAlt: stringValue(item.imageAlt, 180), imageSide };
      }
      case "cards":
        return { id, type, heading: stringValue(item.heading, 220), intro: stringValue(item.intro, 1000), items: list(item.items, 12).map(normalizeCard) };
      case "cta":
        return { id, type, heading: stringValue(item.heading, 220), text: stringValue(item.text, 1000), primaryLabel: stringValue(item.primaryLabel, 80), primaryHref: hrefValue(item.primaryHref), secondaryLabel: stringValue(item.secondaryLabel, 80), secondaryHref: hrefValue(item.secondaryHref) };
      case "steps":
        return { id, type, heading: stringValue(item.heading, 220), intro: stringValue(item.intro, 1000), items: list(item.items, 12).map(normalizeStep) };
      case "stats":
        return { id, type, heading: stringValue(item.heading, 220), items: list(item.items, 8).map(normalizeStat) };
      case "quote":
        return { id, type, quote: stringValue(item.quote, 1800), attribution: stringValue(item.attribution, 180) };
      case "faq":
        return { id, type, heading: stringValue(item.heading, 220), items: list(item.items, 20).map(normalizeFaq) };
      case "gallery":
        return { id, type, heading: stringValue(item.heading, 220), items: list(item.items, 12).map(normalizeGallery) };
      case "table": {
        const columns = list(item.columns, 8).map((entry) => stringValue(entry, 120));
        const rows = list(item.rows, 30).map((row) => list(row, 8).map((entry) => stringValue(entry, 600)));
        return { id, type, heading: stringValue(item.heading, 220), columns, rows };
      }
      case "divider": {
        const spacing = item.spacing === "small" || item.spacing === "large" ? item.spacing : "medium";
        return { id, type, spacing };
      }
    }
  });
}

export function parseCmsPageBlocksJson(value: string) {
  return normalizeCmsPageBlocks(JSON.parse(value));
}

export function cmsPageBlockImageUrls(blocks: readonly CmsPageBlock[]) {
  const urls = new Set<string>();
  for (const block of blocks) {
    if ((block.type === "hero" || block.type === "image" || block.type === "split") && block.imageUrl) urls.add(block.imageUrl);
    if (block.type === "gallery") for (const item of block.items) if (item.imageUrl) urls.add(item.imageUrl);
  }
  return [...urls];
}

export function cmsPageBlocksToPlainText(blocks: readonly CmsPageBlock[]) {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "hero": parts.push(block.eyebrow, block.title, block.text, block.primaryLabel, block.secondaryLabel); break;
      case "text": parts.push(block.heading, block.body); break;
      case "image": parts.push(block.alt, block.caption); break;
      case "split": parts.push(block.heading, block.body, block.imageAlt); break;
      case "cards": parts.push(block.heading, block.intro, ...block.items.flatMap((item) => [item.title, item.text, item.label])); break;
      case "cta": parts.push(block.heading, block.text, block.primaryLabel, block.secondaryLabel); break;
      case "steps": parts.push(block.heading, block.intro, ...block.items.flatMap((item) => [item.title, item.text])); break;
      case "stats": parts.push(block.heading, ...block.items.flatMap((item) => [item.value, item.label])); break;
      case "quote": parts.push(block.quote, block.attribution); break;
      case "faq": parts.push(block.heading, ...block.items.flatMap((item) => [item.question, item.answer])); break;
      case "gallery": parts.push(block.heading, ...block.items.flatMap((item) => [item.alt, item.caption])); break;
      case "table": parts.push(block.heading, ...block.columns, ...block.rows.flat()); break;
      case "divider": break;
    }
  }
  return parts.map((part) => part.trim()).filter(Boolean).join("\n\n");
}

export function createEmptyCmsPageBlock(type: CmsPageBlockType, id: string): CmsPageBlock {
  switch (type) {
    case "hero": return { id, type, eyebrow: "İlkOku", title: "Yeni sayfa başlığı", text: "Bu alanı sayfanın ana mesajıyla değiştirin.", imageUrl: "", imageAlt: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" };
    case "text": return { id, type, heading: "Yeni bölüm", body: "Metninizi buraya yazın." };
    case "image": return { id, type, imageUrl: "", alt: "", caption: "", layout: "contained" };
    case "split": return { id, type, heading: "Görsel ve metin", body: "Bu bölümü açıklayın.", imageUrl: "", imageAlt: "", imageSide: "right" };
    case "cards": return { id, type, heading: "Öne çıkanlar", intro: "", items: [{ title: "Kart başlığı", text: "Kart açıklaması", label: "", href: "" }] };
    case "cta": return { id, type, heading: "Sonraki adım", text: "Ziyaretçiyi ne yapmaya çağırdığınızı açıklayın.", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" };
    case "steps": return { id, type, heading: "Nasıl ilerler?", intro: "", items: [{ title: "1. Adım", text: "İlk adımı açıklayın." }] };
    case "stats": return { id, type, heading: "Rakamlarla", items: [{ value: "01", label: "Örnek istatistik" }] };
    case "quote": return { id, type, quote: "Vurgulamak istediğiniz cümleyi buraya yazın.", attribution: "" };
    case "faq": return { id, type, heading: "Sık sorulan sorular", items: [{ question: "Soru", answer: "Yanıt" }] };
    case "gallery": return { id, type, heading: "Galeri", items: [{ imageUrl: "", alt: "", caption: "" }] };
    case "table": return { id, type, heading: "Karşılaştırma", columns: ["Başlık", "Açıklama"], rows: [["Örnek", "Bilgi"]] };
    case "divider": return { id, type, spacing: "medium" };
  }
}
