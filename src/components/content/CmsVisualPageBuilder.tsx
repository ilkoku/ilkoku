"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PublicCmsPageBlocks } from "@/components/content/PublicCmsPageBlocks";
import { saveCmsPageAction } from "@/features/cms/page-actions";
import {
  cmsPageBlocksToPlainText,
  createEmptyCmsPageBlock,
  type CmsPageBlock,
  type CmsPageBlockType,
  type CmsPageCardItem,
  type CmsPageFaqItem,
  type CmsPageGalleryItem,
  type CmsPageStatItem,
  type CmsPageStepItem,
} from "@/lib/cms-page-blocks";
import {
  cmsPageTemplates,
  getCmsPageTemplate,
  type CmsPageTemplateKey,
} from "@/lib/cms-page-templates";

export type CmsVisualBuilderMediaOption = {
  title: string;
  url: string;
  altText: string;
};

type Props = {
  id?: string;
  slug?: string;
  title?: string;
  summary?: string;
  blocks?: CmsPageBlock[];
  seoTitle?: string;
  seoDescription?: string;
  noIndex?: boolean;
  canPublish?: boolean;
  media: CmsVisualBuilderMediaOption[];
  defaultEyebrow?: string;
};

const palette: Array<{ type: CmsPageBlockType; label: string; hint: string }> = [
  { type: "hero", label: "Hero", hint: "Büyük giriş, görsel ve butonlar" },
  { type: "text", label: "Metin", hint: "Başlık + zengin metin" },
  { type: "image", label: "Görsel", hint: "Tek görsel + açıklama" },
  { type: "split", label: "Görsel + Metin", hint: "İki sütunlu bölüm" },
  { type: "cards", label: "Kartlar", hint: "Fayda / özellik kartları" },
  { type: "cta", label: "CTA", hint: "Çağrı alanı + butonlar" },
  { type: "steps", label: "Adımlar", hint: "Numaralı süreç" },
  { type: "stats", label: "İstatistik", hint: "Rakam ve kısa etiketler" },
  { type: "quote", label: "Alıntı", hint: "Vurgulu söz / mesaj" },
  { type: "faq", label: "SSS", hint: "Açılır soru-cevaplar" },
  { type: "gallery", label: "Galeri", hint: "Çoklu görsel alanı" },
  { type: "table", label: "Tablo", hint: "Karşılaştırma / veri" },
  { type: "divider", label: "Boşluk", hint: "Bölümler arası nefes" },
];

const inputClass =
  "mt-1 w-full rounded-xl border border-[#ded8ef] bg-white px-3 py-2 text-sm text-[#262139] outline-none transition focus:border-[#6847e8] focus:ring-2 focus:ring-[#6847e8]/10";

function cloneBlocks(blocks: readonly CmsPageBlock[]) {
  return structuredClone(blocks) as CmsPageBlock[];
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function MediaSelect({
  media,
  value,
  onChange,
}: {
  media: CmsVisualBuilderMediaOption[];
  value: string;
  onChange: (value: string, alt?: string) => void;
}) {
  return (
    <select
      className={inputClass}
      onChange={(event) => {
        const selected = media.find((item) => item.url === event.target.value);
        onChange(event.target.value, selected?.altText);
      }}
      value={value}
    >
      <option value="">Görsel seçilmedi</option>
      {media.map((item) => (
        <option key={item.url} value={item.url}>
          {item.title}
          {item.altText ? ` · ${item.altText}` : ""}
        </option>
      ))}
    </select>
  );
}

export function CmsVisualPageBuilder({
  id,
  slug = "",
  title: initialTitle = "",
  summary: initialSummary = "",
  blocks: initialBlocks,
  seoTitle: initialSeoTitle = "",
  seoDescription: initialSeoDescription = "",
  noIndex: initialNoIndex = false,
  canPublish = false,
  media,
  defaultEyebrow = "İlkOku",
}: Props) {
  const initialTemplate = getCmsPageTemplate("kurumsal");
  const [templateKey, setTemplateKey] = useState<CmsPageTemplateKey>(initialTemplate.key);
  const [title, setTitle] = useState(initialTitle);
  const [slugValue, setSlugValue] = useState(slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(id || slug));
  const [summary, setSummary] = useState(initialSummary || initialTemplate.summary);
  const [blocks, setBlocks] = useState<CmsPageBlock[]>(
    initialBlocks?.length ? cloneBlocks(initialBlocks) : cloneBlocks(initialTemplate.blocks),
  );
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle);
  const [seoDescription, setSeoDescription] = useState(
    initialSeoDescription || initialTemplate.seoDescription,
  );
  const [noIndex, setNoIndex] = useState(initialNoIndex);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(true);

  const body = useMemo(() => cmsPageBlocksToPlainText(blocks), [blocks]);

  function chooseTemplate(nextKey: CmsPageTemplateKey) {
    const template = getCmsPageTemplate(nextKey);
    setTemplateKey(nextKey);
    setSummary(template.summary);
    setSeoDescription(template.seoDescription);
    setBlocks(cloneBlocks(template.blocks));
  }

  function changeTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlugValue(slugify(value));
  }

  function updateBlock(blockId: string, patch: Record<string, unknown>) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === blockId ? ({ ...block, ...patch } as CmsPageBlock) : block,
      ),
    );
  }

  function addBlock(type: CmsPageBlockType) {
    setBlocks((current) => {
      const usedIds = new Set(current.map((block) => block.id));
      let sequence = current.length + 1;
      let blockId = `${type}-editor-${sequence}`;
      while (usedIds.has(blockId)) {
        sequence += 1;
        blockId = `${type}-editor-${sequence}`;
      }
      return [...current, createEmptyCmsPageBlock(type, blockId)];
    });
  }

  function removeBlock(blockId: string) {
    setBlocks((current) => current.filter((block) => block.id !== blockId));
  }

  function duplicateBlock(blockId: string) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === blockId);
      if (index < 0) return current;
      const duplicate = cloneBlocks([current[index]])[0];
      const usedIds = new Set(current.map((block) => block.id));
      let sequence = current.length + 1;
      let duplicateId = `${duplicate.type}-editor-${sequence}`;
      while (usedIds.has(duplicateId)) {
        sequence += 1;
        duplicateId = `${duplicate.type}-editor-${sequence}`;
      }
      duplicate.id = duplicateId;
      return [
        ...current.slice(0, index + 1),
        duplicate,
        ...current.slice(index + 1),
      ];
    });
  }

  function moveBlock(blockId: string, delta: number) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === blockId);
      if (index < 0) return current;
      const nextIndex = Math.max(0, Math.min(current.length - 1, index + delta));
      if (index === nextIndex) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function dropBefore(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setBlocks((current) => {
      const from = current.findIndex((block) => block.id === draggedId);
      const target = current.findIndex((block) => block.id === targetId);
      if (from < 0 || target < 0) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      const insertion = from < target ? target - 1 : target;
      next.splice(insertion, 0, item);
      return next;
    });
    setDraggedId(null);
  }

  function updateCardItem(
    blockId: string,
    index: number,
    patch: Partial<CmsPageCardItem>,
  ) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === blockId && block.type === "cards"
          ? {
              ...block,
              items: block.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...patch } : item,
              ),
            }
          : block,
      ),
    );
  }

  function updateStepItem(
    blockId: string,
    index: number,
    patch: Partial<CmsPageStepItem>,
  ) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === blockId && block.type === "steps"
          ? {
              ...block,
              items: block.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...patch } : item,
              ),
            }
          : block,
      ),
    );
  }

  function updateStatItem(
    blockId: string,
    index: number,
    patch: Partial<CmsPageStatItem>,
  ) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === blockId && block.type === "stats"
          ? {
              ...block,
              items: block.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...patch } : item,
              ),
            }
          : block,
      ),
    );
  }

  function updateFaqItem(
    blockId: string,
    index: number,
    patch: Partial<CmsPageFaqItem>,
  ) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === blockId && block.type === "faq"
          ? {
              ...block,
              items: block.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...patch } : item,
              ),
            }
          : block,
      ),
    );
  }

  function updateGalleryItem(
    blockId: string,
    index: number,
    patch: Partial<CmsPageGalleryItem>,
  ) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === blockId && block.type === "gallery"
          ? {
              ...block,
              items: block.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...patch } : item,
              ),
            }
          : block,
      ),
    );
  }

  function renderBlockEditor(block: CmsPageBlock) {
    switch (block.type) {
      case "hero":
        return (
          <div className="grid gap-3">
            <label>
              Üst etiket
              <input
                className={inputClass}
                value={block.eyebrow}
                onChange={(event) => updateBlock(block.id, { eyebrow: event.target.value })}
              />
            </label>
            <label>
              Hero başlığı
              <input
                className={inputClass}
                value={block.title}
                onChange={(event) => updateBlock(block.id, { title: event.target.value })}
              />
            </label>
            <label>
              Açıklama
              <textarea
                className={inputClass}
                rows={4}
                value={block.text}
                onChange={(event) => updateBlock(block.id, { text: event.target.value })}
              />
            </label>
            <label>
              Hero görseli
              <MediaSelect
                media={media}
                value={block.imageUrl}
                onChange={(url, alt) =>
                  updateBlock(block.id, {
                    imageUrl: url,
                    imageAlt: alt || block.imageAlt,
                  })
                }
              />
            </label>
            <label>
              Görsel alt metni
              <input
                className={inputClass}
                value={block.imageAlt}
                onChange={(event) => updateBlock(block.id, { imageAlt: event.target.value })}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Ana buton
                <input
                  className={inputClass}
                  value={block.primaryLabel}
                  onChange={(event) =>
                    updateBlock(block.id, { primaryLabel: event.target.value })
                  }
                />
              </label>
              <label>
                Ana buton linki
                <input
                  className={inputClass}
                  placeholder="/kayit"
                  value={block.primaryHref}
                  onChange={(event) =>
                    updateBlock(block.id, { primaryHref: event.target.value })
                  }
                />
              </label>
              <label>
                İkinci buton
                <input
                  className={inputClass}
                  value={block.secondaryLabel}
                  onChange={(event) =>
                    updateBlock(block.id, { secondaryLabel: event.target.value })
                  }
                />
              </label>
              <label>
                İkinci link
                <input
                  className={inputClass}
                  placeholder="/nasil-calisir"
                  value={block.secondaryHref}
                  onChange={(event) =>
                    updateBlock(block.id, { secondaryHref: event.target.value })
                  }
                />
              </label>
            </div>
          </div>
        );

      case "text":
        return (
          <div className="grid gap-3">
            <label>
              Bölüm başlığı
              <input
                className={inputClass}
                value={block.heading}
                onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
              />
            </label>
            <label>
              Metin
              <textarea
                className={inputClass}
                rows={9}
                value={block.body}
                onChange={(event) => updateBlock(block.id, { body: event.target.value })}
              />
            </label>
            <small>## ara başlık, ### alt başlık, madde ve tablo söz dizimi desteklenir.</small>
          </div>
        );

      case "image":
        return (
          <div className="grid gap-3">
            <label>
              Görsel
              <MediaSelect
                media={media}
                value={block.imageUrl}
                onChange={(url, alt) =>
                  updateBlock(block.id, { imageUrl: url, alt: alt || block.alt })
                }
              />
            </label>
            <label>
              Alt metin
              <input
                className={inputClass}
                value={block.alt}
                onChange={(event) => updateBlock(block.id, { alt: event.target.value })}
              />
            </label>
            <label>
              Açıklama
              <input
                className={inputClass}
                value={block.caption}
                onChange={(event) => updateBlock(block.id, { caption: event.target.value })}
              />
            </label>
            <label>
              Genişlik
              <select
                className={inputClass}
                value={block.layout}
                onChange={(event) => updateBlock(block.id, { layout: event.target.value })}
              >
                <option value="contained">İçerik genişliği</option>
                <option value="wide">Geniş</option>
              </select>
            </label>
          </div>
        );

      case "split":
        return (
          <div className="grid gap-3">
            <label>
              Başlık
              <input
                className={inputClass}
                value={block.heading}
                onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
              />
            </label>
            <label>
              Metin
              <textarea
                className={inputClass}
                rows={6}
                value={block.body}
                onChange={(event) => updateBlock(block.id, { body: event.target.value })}
              />
            </label>
            <label>
              Görsel
              <MediaSelect
                media={media}
                value={block.imageUrl}
                onChange={(url, alt) =>
                  updateBlock(block.id, {
                    imageUrl: url,
                    imageAlt: alt || block.imageAlt,
                  })
                }
              />
            </label>
            <label>
              Alt metin
              <input
                className={inputClass}
                value={block.imageAlt}
                onChange={(event) => updateBlock(block.id, { imageAlt: event.target.value })}
              />
            </label>
            <label>
              Görsel tarafı
              <select
                className={inputClass}
                value={block.imageSide}
                onChange={(event) => updateBlock(block.id, { imageSide: event.target.value })}
              >
                <option value="left">Sol</option>
                <option value="right">Sağ</option>
              </select>
            </label>
          </div>
        );

      case "cards":
        return (
          <div className="grid gap-3">
            <label>
              Başlık
              <input
                className={inputClass}
                value={block.heading}
                onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
              />
            </label>
            <label>
              Giriş
              <input
                className={inputClass}
                value={block.intro}
                onChange={(event) => updateBlock(block.id, { intro: event.target.value })}
              />
            </label>
            {block.items.map((item, index) => (
              <div className="rounded-xl border border-[#e4def3] bg-[#faf9ff] p-3" key={`${block.id}-${index}`}>
                <input
                  className={inputClass}
                  placeholder="Kart başlığı"
                  value={item.title}
                  onChange={(event) =>
                    updateCardItem(block.id, index, { title: event.target.value })
                  }
                />
                <textarea
                  className={inputClass}
                  placeholder="Açıklama"
                  rows={3}
                  value={item.text}
                  onChange={(event) =>
                    updateCardItem(block.id, index, { text: event.target.value })
                  }
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    placeholder="Buton etiketi"
                    value={item.label}
                    onChange={(event) =>
                      updateCardItem(block.id, index, { label: event.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="/link"
                    value={item.href}
                    onChange={(event) =>
                      updateCardItem(block.id, index, { href: event.target.value })
                    }
                  />
                </div>
                <button
                  className="mt-2 text-xs font-bold text-[#8b3c63]"
                  type="button"
                  onClick={() =>
                    updateBlock(block.id, {
                      items: block.items.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                >
                  Kartı kaldır
                </button>
              </div>
            ))}
            <button
              className="rounded-xl border border-dashed border-[#6847e8]/30 px-3 py-2 text-sm font-bold text-[#5b35dd]"
              type="button"
              onClick={() =>
                updateBlock(block.id, {
                  items: [
                    ...block.items,
                    { title: "Yeni kart", text: "", label: "", href: "" },
                  ],
                })
              }
            >
              + Kart ekle
            </button>
          </div>
        );

      case "cta":
        return (
          <div className="grid gap-3">
            <label>
              Başlık
              <input
                className={inputClass}
                value={block.heading}
                onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
              />
            </label>
            <label>
              Metin
              <textarea
                className={inputClass}
                rows={4}
                value={block.text}
                onChange={(event) => updateBlock(block.id, { text: event.target.value })}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Ana buton
                <input
                  className={inputClass}
                  value={block.primaryLabel}
                  onChange={(event) =>
                    updateBlock(block.id, { primaryLabel: event.target.value })
                  }
                />
              </label>
              <label>
                Ana link
                <input
                  className={inputClass}
                  value={block.primaryHref}
                  onChange={(event) =>
                    updateBlock(block.id, { primaryHref: event.target.value })
                  }
                />
              </label>
              <label>
                İkinci buton
                <input
                  className={inputClass}
                  value={block.secondaryLabel}
                  onChange={(event) =>
                    updateBlock(block.id, { secondaryLabel: event.target.value })
                  }
                />
              </label>
              <label>
                İkinci link
                <input
                  className={inputClass}
                  value={block.secondaryHref}
                  onChange={(event) =>
                    updateBlock(block.id, { secondaryHref: event.target.value })
                  }
                />
              </label>
            </div>
          </div>
        );

      case "steps":
        return (
          <div className="grid gap-3">
            <label>
              Başlık
              <input
                className={inputClass}
                value={block.heading}
                onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
              />
            </label>
            <label>
              Giriş
              <input
                className={inputClass}
                value={block.intro}
                onChange={(event) => updateBlock(block.id, { intro: event.target.value })}
              />
            </label>
            {block.items.map((item, index) => (
              <div className="rounded-xl border border-[#e4def3] bg-[#faf9ff] p-3" key={`${block.id}-${index}`}>
                <input
                  className={inputClass}
                  value={item.title}
                  onChange={(event) =>
                    updateStepItem(block.id, index, { title: event.target.value })
                  }
                />
                <textarea
                  className={inputClass}
                  rows={3}
                  value={item.text}
                  onChange={(event) =>
                    updateStepItem(block.id, index, { text: event.target.value })
                  }
                />
                <button
                  className="mt-2 text-xs font-bold text-[#8b3c63]"
                  type="button"
                  onClick={() =>
                    updateBlock(block.id, {
                      items: block.items.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                >
                  Adımı kaldır
                </button>
              </div>
            ))}
            <button
              className="rounded-xl border border-dashed border-[#6847e8]/30 px-3 py-2 text-sm font-bold text-[#5b35dd]"
              type="button"
              onClick={() =>
                updateBlock(block.id, {
                  items: [
                    ...block.items,
                    { title: `Adım ${block.items.length + 1}`, text: "" },
                  ],
                })
              }
            >
              + Adım ekle
            </button>
          </div>
        );

      case "stats":
        return (
          <div className="grid gap-3">
            <label>
              Başlık
              <input
                className={inputClass}
                value={block.heading}
                onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
              />
            </label>
            {block.items.map((item, index) => (
              <div
                className="grid gap-2 rounded-xl border border-[#e4def3] bg-[#faf9ff] p-3 sm:grid-cols-[120px_1fr_auto]"
                key={`${block.id}-${index}`}
              >
                <input
                  className={inputClass}
                  value={item.value}
                  onChange={(event) =>
                    updateStatItem(block.id, index, { value: event.target.value })
                  }
                />
                <input
                  className={inputClass}
                  value={item.label}
                  onChange={(event) =>
                    updateStatItem(block.id, index, { label: event.target.value })
                  }
                />
                <button
                  className="text-xs font-bold text-[#8b3c63]"
                  type="button"
                  onClick={() =>
                    updateBlock(block.id, {
                      items: block.items.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                >
                  Sil
                </button>
              </div>
            ))}
            <button
              className="rounded-xl border border-dashed border-[#6847e8]/30 px-3 py-2 text-sm font-bold text-[#5b35dd]"
              type="button"
              onClick={() =>
                updateBlock(block.id, {
                  items: [...block.items, { value: "00", label: "Yeni veri" }],
                })
              }
            >
              + İstatistik ekle
            </button>
          </div>
        );

      case "quote":
        return (
          <div className="grid gap-3">
            <label>
              Alıntı
              <textarea
                className={inputClass}
                rows={5}
                value={block.quote}
                onChange={(event) => updateBlock(block.id, { quote: event.target.value })}
              />
            </label>
            <label>
              Kaynak / kişi
              <input
                className={inputClass}
                value={block.attribution}
                onChange={(event) =>
                  updateBlock(block.id, { attribution: event.target.value })
                }
              />
            </label>
          </div>
        );

      case "faq":
        return (
          <div className="grid gap-3">
            <label>
              Başlık
              <input
                className={inputClass}
                value={block.heading}
                onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
              />
            </label>
            {block.items.map((item, index) => (
              <div className="rounded-xl border border-[#e4def3] bg-[#faf9ff] p-3" key={`${block.id}-${index}`}>
                <input
                  className={inputClass}
                  value={item.question}
                  onChange={(event) =>
                    updateFaqItem(block.id, index, { question: event.target.value })
                  }
                />
                <textarea
                  className={inputClass}
                  rows={3}
                  value={item.answer}
                  onChange={(event) =>
                    updateFaqItem(block.id, index, { answer: event.target.value })
                  }
                />
                <button
                  className="mt-2 text-xs font-bold text-[#8b3c63]"
                  type="button"
                  onClick={() =>
                    updateBlock(block.id, {
                      items: block.items.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                >
                  Soruyu kaldır
                </button>
              </div>
            ))}
            <button
              className="rounded-xl border border-dashed border-[#6847e8]/30 px-3 py-2 text-sm font-bold text-[#5b35dd]"
              type="button"
              onClick={() =>
                updateBlock(block.id, {
                  items: [...block.items, { question: "Yeni soru", answer: "" }],
                })
              }
            >
              + Soru ekle
            </button>
          </div>
        );

      case "gallery":
        return (
          <div className="grid gap-3">
            <label>
              Başlık
              <input
                className={inputClass}
                value={block.heading}
                onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
              />
            </label>
            {block.items.map((item, index) => (
              <div className="rounded-xl border border-[#e4def3] bg-[#faf9ff] p-3" key={`${block.id}-${index}`}>
                <MediaSelect
                  media={media}
                  value={item.imageUrl}
                  onChange={(url, alt) =>
                    updateGalleryItem(block.id, index, {
                      imageUrl: url,
                      alt: alt || item.alt,
                    })
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Alt metin"
                  value={item.alt}
                  onChange={(event) =>
                    updateGalleryItem(block.id, index, { alt: event.target.value })
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Açıklama"
                  value={item.caption}
                  onChange={(event) =>
                    updateGalleryItem(block.id, index, { caption: event.target.value })
                  }
                />
                <button
                  className="mt-2 text-xs font-bold text-[#8b3c63]"
                  type="button"
                  onClick={() =>
                    updateBlock(block.id, {
                      items: block.items.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                >
                  Görseli kaldır
                </button>
              </div>
            ))}
            <button
              className="rounded-xl border border-dashed border-[#6847e8]/30 px-3 py-2 text-sm font-bold text-[#5b35dd]"
              type="button"
              onClick={() =>
                updateBlock(block.id, {
                  items: [...block.items, { imageUrl: "", alt: "", caption: "" }],
                })
              }
            >
              + Galeri görseli ekle
            </button>
          </div>
        );

      case "table":
        return (
          <div className="grid gap-3">
            <label>
              Başlık
              <input
                className={inputClass}
                value={block.heading}
                onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
              />
            </label>
            <label>
              Sütunlar <small>( | ile ayırın )</small>
              <input
                className={inputClass}
                value={block.columns.join(" | ")}
                onChange={(event) =>
                  updateBlock(block.id, {
                    columns: event.target.value
                      .split("|")
                      .map((value) => value.trim())
                      .filter(Boolean)
                      .slice(0, 8),
                  })
                }
              />
            </label>
            <label>
              Satırlar <small>(her satır yeni kayıt, | hücre ayracı)</small>
              <textarea
                className={inputClass}
                rows={6}
                value={block.rows.map((row) => row.join(" | ")).join("\n")}
                onChange={(event) =>
                  updateBlock(block.id, {
                    rows: event.target.value
                      .split("\n")
                      .filter(Boolean)
                      .map((row) =>
                        row
                          .split("|")
                          .map((cell) => cell.trim())
                          .slice(0, 8),
                      )
                      .slice(0, 30),
                  })
                }
              />
            </label>
          </div>
        );

      case "divider":
        return (
          <label>
            Boşluk miktarı
            <select
              className={inputClass}
              value={block.spacing}
              onChange={(event) => updateBlock(block.id, { spacing: event.target.value })}
            >
              <option value="small">Küçük</option>
              <option value="medium">Orta</option>
              <option value="large">Büyük</option>
            </select>
          </label>
        );
    }
  }

  return (
    <form action={saveCmsPageAction} className="space-y-5">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <input type="hidden" name="blocksJson" value={JSON.stringify(blocks)} />
      <input type="hidden" name="body" value={body} />

      <div className="rounded-2xl border border-[#ddd6f1] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="text-sm font-bold text-[#332c49]">
            Sayfa başlığı
            <input
              className={inputClass}
              maxLength={220}
              name="title"
              required
              value={title}
              onChange={(event) => changeTitle(event.target.value)}
            />
          </label>
          <label className="text-sm font-bold text-[#332c49]">
            URL kısa adı
            <input
              className={inputClass}
              maxLength={120}
              name="slug"
              readOnly={Boolean(id)}
              required
              value={slugValue}
              onChange={(event) => {
                setSlugTouched(true);
                setSlugValue(slugify(event.target.value));
              }}
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-bold text-[#332c49]">
          Kısa özet
          <textarea
            className={inputClass}
            maxLength={500}
            name="summary"
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </label>
        {!id ? (
          <div className="mt-4">
            <span className="text-sm font-bold text-[#332c49]">Başlangıç şablonu</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {cmsPageTemplates.map((template) => (
                <button
                  className={`rounded-full border px-4 py-2 text-xs font-extrabold ${
                    template.key === templateKey
                      ? "border-[#6847e8] bg-[#6847e8] text-white"
                      : "border-[#dcd4ef] bg-white text-[#554d68]"
                  }`}
                  key={template.key}
                  onClick={() => chooseTemplate(template.key)}
                  type="button"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[230px_minmax(420px,700px)_minmax(360px,1fr)]">
        <aside className="sticky top-4 rounded-2xl border border-[#ddd6f1] bg-white p-3 shadow-sm">
          <div className="px-2 pb-2">
            <strong className="text-sm text-[#251f39]">Bloklar</strong>
            <p className="mt-1 text-xs leading-5 text-[#776f87]">Sayfaya eklemek için seç.</p>
          </div>
          <div className="grid gap-2">
            {palette.map((item) => (
              <button
                className="rounded-xl border border-[#e6e0f2] bg-[#fbfaff] px-3 py-2 text-left transition hover:border-[#6847e8]/35 hover:bg-[#f5f1ff]"
                key={item.type}
                onClick={() => addBlock(item.type)}
                type="button"
              >
                <strong className="block text-sm text-[#33264f]">+ {item.label}</strong>
                <span className="mt-0.5 block text-[11px] leading-4 text-[#81798f]">{item.hint}</span>
              </button>
            ))}
          </div>
          <Link
            className="mt-3 block rounded-xl px-3 py-2 text-xs font-bold text-[#5b35dd]"
            href="/icerik/medya"
          >
            Medya kütüphanesi →
          </Link>
        </aside>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#ddd6f1] bg-white p-4 shadow-sm">
            <div>
              <strong className="text-sm text-[#251f39]">Sayfa akışı</strong>
              <p className="text-xs text-[#776f87]">Sürükle-bırak veya oklarla sırala.</p>
            </div>
            <button
              className="rounded-full border border-[#dcd4ef] px-3 py-1.5 text-xs font-bold text-[#5b35dd] xl:hidden"
              type="button"
              onClick={() => setPreview((value) => !value)}
            >
              {preview ? "Önizlemeyi gizle" : "Önizlemeyi aç"}
            </button>
          </div>

          {blocks.map((block, index) => {
            const paletteItem = palette.find((item) => item.type === block.type);
            return (
              <details
                className="group rounded-2xl border border-[#ddd6f1] bg-white shadow-sm"
                draggable
                key={block.id}
                onDragEnd={() => setDraggedId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDraggedId(block.id)}
                onDrop={() => dropBefore(block.id)}
              >
                <summary className="cursor-grab list-none px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[#a39aad]">⋮⋮</span>
                    <div>
                      <strong className="text-sm text-[#29213e]">
                        {paletteItem?.label ?? block.type}
                      </strong>
                      <span className="ml-2 text-[11px] text-[#92899e]">#{index + 1}</span>
                    </div>
                  </div>
                </summary>
                <div className="border-t border-[#eee9f6] p-4 text-sm text-[#51495f]">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#faf9ff] p-2">
                    <span className="text-xs font-bold text-[#81798f]">Bölüm işlemleri</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        className="rounded-lg border border-[#dcd4ef] bg-white px-2.5 py-1.5 text-xs font-bold text-[#5b35dd]"
                        type="button"
                        onClick={() => moveBlock(block.id, -1)}
                      >
                        ↑ Yukarı
                      </button>
                      <button
                        className="rounded-lg border border-[#dcd4ef] bg-white px-2.5 py-1.5 text-xs font-bold text-[#5b35dd]"
                        type="button"
                        onClick={() => moveBlock(block.id, 1)}
                      >
                        ↓ Aşağı
                      </button>
                      <button
                        className="rounded-lg border border-[#dcd4ef] bg-white px-2.5 py-1.5 text-xs font-bold text-[#5b35dd]"
                        type="button"
                        onClick={() => duplicateBlock(block.id)}
                      >
                        Kopyala
                      </button>
                      <button
                        className="rounded-lg border border-[#ebd8df] bg-white px-2.5 py-1.5 text-xs font-bold text-[#963d5f]"
                        type="button"
                        onClick={() => removeBlock(block.id)}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                  {renderBlockEditor(block)}
                </div>
              </details>
            );
          })}

          {blocks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfc5e8] bg-white p-8 text-center text-sm text-[#766f83]">
              Soldaki panelden ilk bloğu ekleyin.
            </div>
          ) : null}
        </section>

        <aside className={`${preview ? "block" : "hidden"} xl:sticky xl:top-4 xl:block`}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <strong className="text-sm text-[#251f39]">Canlı önizleme</strong>
            <span className="text-[11px] font-bold text-[#7b7390]">Header / footer kilitli</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#d7cfeb] bg-white shadow-[0_18px_50px_rgba(48,32,112,.12)]">
            <div className="border-b border-[#ece7f5] bg-[#fbfaff] px-4 py-2.5 text-xs font-extrabold text-[#5b35dd]">
              İlkOku · Global header site kimliğinden gelir
            </div>
            <div className="max-h-[70vh] min-w-[340px] overflow-auto">
              <PublicCmsPageBlocks
                blocks={blocks}
                eyebrow={defaultEyebrow}
                pageTitle={title || "Yeni sayfa"}
                summary={summary}
              />
            </div>
            <div className="border-t border-[#ece7f5] bg-[#fbfaff] px-4 py-2.5 text-center text-[11px] font-bold text-[#81798f]">
              Global footer site kimliğinden otomatik gelir
            </div>
          </div>
        </aside>
      </div>

      <div className="rounded-2xl border border-[#ddd6f1] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="text-sm font-bold text-[#332c49]">
            SEO başlığı
            <input
              className={inputClass}
              maxLength={220}
              name="seoTitle"
              value={seoTitle}
              onChange={(event) => setSeoTitle(event.target.value)}
            />
          </label>
          <label className="text-sm font-bold text-[#332c49]">
            SEO açıklaması
            <textarea
              className={inputClass}
              maxLength={500}
              name="seoDescription"
              rows={3}
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
            />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#51495f]">
          <input
            checked={noIndex}
            name="noIndex"
            type="checkbox"
            onChange={(event) => setNoIndex(event.target.checked)}
          />
          Arama motorlarında gösterme (noindex)
        </label>
      </div>

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cfc5e8] bg-white/95 p-3 shadow-[0_14px_40px_rgba(48,32,112,.14)] backdrop-blur">
        <div className="text-xs text-[#776f87]">
          <strong className="text-[#3d3452]">{blocks.length} blok</strong> ·{" "}
          {body.split(/\s+/).filter(Boolean).length} kelime · tasarım sistemi kilitli
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-[#cfc5e8] bg-white px-5 py-2.5 text-sm font-extrabold text-[#5b35dd]"
            name="mode"
            type="submit"
            value="draft"
          >
            Taslak kaydet
          </button>
          {canPublish ? (
            <button
              className="rounded-full bg-[#5b35dd] px-5 py-2.5 text-sm font-extrabold text-white shadow-md"
              name="mode"
              type="submit"
              value="publish"
            >
              Kaydet ve yayınla
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
