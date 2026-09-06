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
import { cmsPageTemplates, getCmsPageTemplate, type CmsPageTemplateKey } from "@/lib/cms-page-templates";

export type CmsVisualBuilderMediaOption = { title: string; url: string; altText: string };

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
  { type: "cta", label: "CTA", hint: "Koyu çağrı alanı + butonlar" },
  { type: "steps", label: "Adımlar", hint: "Numaralı süreç" },
  { type: "stats", label: "İstatistik", hint: "Rakam ve kısa etiketler" },
  { type: "quote", label: "Alıntı", hint: "Vurgulu söz / mesaj" },
  { type: "faq", label: "SSS", hint: "Açılır soru-cevaplar" },
  { type: "gallery", label: "Galeri", hint: "Çoklu görsel alanı" },
  { type: "table", label: "Tablo", hint: "Karşılaştırma / veri" },
  { type: "divider", label: "Boşluk", hint: "Bölümler arası nefes" },
];

function cloneBlocks(blocks: readonly CmsPageBlock[]) {
  return structuredClone(blocks) as CmsPageBlock[];
}

function slugify(value: string) {
  return value.toLocaleLowerCase("tr-TR")
    .replace(/[ç]/g, "c").replace(/[ğ]/g, "g").replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o").replace(/[ş]/g, "s").replace(/[ü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function fieldClass() {
  return "mt-1 w-full rounded-xl border border-[#ded8ef] bg-white px-3 py-2 text-sm text-[#262139] outline-none transition focus:border-[#6847e8] focus:ring-2 focus:ring-[#6847e8]/10";
}

function MediaSelect({ media, value, onChange }: { media: CmsVisualBuilderMediaOption[]; value: string; onChange: (value: string, alt?: string) => void }) {
  return (
    <select className={fieldClass()} onChange={(event) => { const selected = media.find((item) => item.url === event.target.value); onChange(event.target.value, selected?.altText); }} value={value}>
      <option value="">Görsel seçilmedi</option>
      {media.map((item) => <option key={item.url} value={item.url}>{item.title}{item.altText ? ` · ${item.altText}` : ""}</option>)}
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
  const [blocks, setBlocks] = useState<CmsPageBlock[]>(initialBlocks?.length ? cloneBlocks(initialBlocks) : cloneBlocks(initialTemplate.blocks));
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle);
  const [seoDescription, setSeoDescription] = useState(initialSeoDescription || initialTemplate.seoDescription);
  const [noIndex, setNoIndex] = useState(initialNoIndex);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(true);
  const body = useMemo(() => cmsPageBlocksToPlainText(blocks), [blocks]);

  function chooseTemplate(next: CmsPageTemplateKey) {
    const template = getCmsPageTemplate(next);
    setTemplateKey(next);
    setSummary(template.summary);
    setSeoDescription(template.seoDescription);
    setBlocks(cloneBlocks(template.blocks));
  }

  function changeTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlugValue(slugify(value));
  }

  function updateBlock(idValue: string, patch: Record<string, unknown>) {
    setBlocks((current) => current.map((block) => block.id === idValue ? ({ ...block, ...patch } as CmsPageBlock) : block));
  }

  function addBlock(type: CmsPageBlockType) {
    const idValue = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBlocks((current) => [...current, createEmptyCmsPageBlock(type, idValue)]);
  }

  function removeBlock(idValue: string) {
    setBlocks((current) => current.filter((block) => block.id !== idValue));
  }

  function duplicateBlock(idValue: string) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === idValue);
      if (index < 0) return current;
      const next = cloneBlocks([current[index]])[0];
      next.id = `${next.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return [...current.slice(0, index + 1), next, ...current.slice(index + 1)];
    });
  }

  function moveBlock(idValue: string, delta: number) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === idValue);
      const nextIndex = Math.max(0, Math.min(current.length - 1, index + delta));
      if (index < 0 || index === nextIndex) return current;
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

  function updateCardItem(blockId: string, index: number, key: keyof CmsPageCardItem, value: string) {
    setBlocks((current) => current.map((block) => block.id === blockId && block.type === "cards" ? { ...block, items: block.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) } : block));
  }
  function updateStepItem(blockId: string, index: number, key: keyof CmsPageStepItem, value: string) {
    setBlocks((current) => current.map((block) => block.id === blockId && block.type === "steps" ? { ...block, items: block.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) } : block));
  }
  function updateStatItem(blockId: string, index: number, key: keyof CmsPageStatItem, value: string) {
    setBlocks((current) => current.map((block) => block.id === blockId && block.type === "stats" ? { ...block, items: block.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) } : block));
  }
  function updateFaqItem(blockId: string, index: number, key: keyof CmsPageFaqItem, value: string) {
    setBlocks((current) => current.map((block) => block.id === blockId && block.type === "faq" ? { ...block, items: block.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) } : block));
  }
  function updateGalleryItem(blockId: string, index: number, patch: Partial<CmsPageGalleryItem>) {
    setBlocks((current) => current.map((block) => block.id === blockId && block.type === "gallery" ? { ...block, items: block.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) } : block));
  }

  function renderBlockFields(block: CmsPageBlock) {
    switch (block.type) {
      case "hero": return <div className="grid gap-3"><label>Üst etiket<input className={fieldClass()} value={block.eyebrow} onChange={(e) => updateBlock(block.id, { eyebrow: e.target.value })} /></label><label>Hero başlığı<input className={fieldClass()} value={block.title} onChange={(e) => updateBlock(block.id, { title: e.target.value })} /></label><label>Açıklama<textarea className={fieldClass()} rows={4} value={block.text} onChange={(e) => updateBlock(block.id, { text: e.target.value })} /></label><label>Hero görseli<MediaSelect media={media} value={block.imageUrl} onChange={(url, alt) => updateBlock(block.id, { imageUrl: url, imageAlt: alt || block.imageAlt })} /></label><label>Görsel alt metni<input className={fieldClass()} value={block.imageAlt} onChange={(e) => updateBlock(block.id, { imageAlt: e.target.value })} /></label><div className="grid gap-3 sm:grid-cols-2"><label>Ana buton<input className={fieldClass()} value={block.primaryLabel} onChange={(e) => updateBlock(block.id, { primaryLabel: e.target.value })} /></label><label>Ana buton linki<input className={fieldClass()} value={block.primaryHref} onChange={(e) => updateBlock(block.id, { primaryHref: e.target.value })} /></label><label>İkinci buton<input className={fieldClass()} value={block.secondaryLabel} onChange={(e) => updateBlock(block.id, { secondaryLabel: e.target.value })} /></label><label>İkinci link<input className={fieldClass()} value={block.secondaryHref} onChange={(e) => updateBlock(block.id, { secondaryHref: e.target.value })} /></label></div></div>;
      case "text": return <div className="grid gap-3"><label>Bölüm başlığı<input className={fieldClass()} value={block.heading} onChange={(e) => updateBlock(block.id, { heading: e.target.value })} /></label><label>Metin<textarea className={fieldClass()} rows={9} value={block.body} onChange={(e) => updateBlock(block.id, { body: e.target.value })} /></label><small>## ara başlık, ### alt başlık, madde ve tablo söz dizimi desteklenir.</small></div>;
      case "image": return <div className="grid gap-3"><label>Görsel<MediaSelect media={media} value={block.imageUrl} onChange={(url, alt) => updateBlock(block.id, { imageUrl: url, alt: alt || block.alt })} /></label><label>Alt metin<input className={fieldClass()} value={block.alt} onChange={(e) => updateBlock(block.id, { alt: e.target.value })} /></label><label>Açıklama<input className={fieldClass()} value={block.caption} onChange={(e) => updateBlock(block.id, { caption: e.target.value })} /></label><label>Genişlik<select className={fieldClass()} value={block.layout} onChange={(e) => updateBlock(block.id, { layout: e.target.value })}><option value="contained">İçerik genişliği</option><option value="wide">Geniş</option></select></label></div>;
      case "split": return <div className="grid gap-3"><label>Başlık<input className={fieldClass()} value={block.heading} onChange={(e) => updateBlock(block.id, { heading: e.target.value })} /></label><label>Metin<textarea className={fieldClass()} rows={6} value={block.body} onChange={(e) => updateBlock(block.id, { body: e.target.value })} /></label><label>Görsel<MediaSelect media={media} value={block.imageUrl} onChange={(url, alt) => updateBlock(block.id, { imageUrl: url, imageAlt: alt || block.imageAlt })} /></label><label>Alt metin<input className={fieldClass()} value={block.imageAlt} onChange={(e) => updateBlock(block.id, { imageAlt: e.target.value })} /></label><label>Görsel tarafı<select className={fieldClass()} value={block.imageSide} onChange={(e) => updateBlock(block.id, { imageSide: e.target.value })}><option value="left">Sol</option><option value="right">Sağ</option></select></label></div>;
      case "cards": return <div className="grid gap-3"><label>Başlık<input className={fieldClass()} value={block.heading} onChange={(e) => updateBlock(block.id, { heading: e.target.value })} /></label><label>Giriş<input className={fieldClass()} value={block.intro} onChange={(e) => updateBlock(block.id, { intro: e.target.value })} /></label>{block.items.map((item, index) => <div className="rounded-xl border border-[#e4def3] bg-[#faf9ff] p-3" key={index}><div className="grid gap-2"><input className={fieldClass()} placeholder="Kart başlığı" value={item.title} onChange={(e) => updateCardItem(block.id, index, "title", e.target.value)} /><textarea className={fieldClass()} placeholder="Açıklama" rows={3} value={item.text} onChange={(e) => updateCardItem(block.id, index, "text", e.target.value)} /><div className="grid gap-2 sm:grid-cols-2"><input className={fieldClass()} placeholder="Buton etiketi" value={item.label} onChange={(e) => updateCardItem(block.id, index, "label", e.target.value)} /><input className={fieldClass()} placeholder="/link" value={item.href} onChange={(e) => updateCardItem(block.id, index, "href", e.target.value)} /></div><button type="button" className="text-left text-xs font-bold text-[#8b3c63]" onClick={() => updateBlock(block.id, { items: block.items.filter((_, i) => i !== index) })}>Kartı kaldır</button></div></div>)}<button type="button" className="rounded-xl border border-dashed border-[#6847e8]/30 px-3 py-2 text-sm font-bold text-[#5b35dd]" onClick={() => updateBlock(block.id, { items: [...block.items, { title: "Yeni kart", text: "", label: "", href: "" }] })}>+ Kart ekle</button></div>;
      case "cta": return <div className="grid gap-3"><label>Başlık<input className={fieldClass()} value={block.heading} onChange={(e) => updateBlock(block.id, { heading: e.target.value })} /></label><label>Metin<textarea className={fieldClass()} rows={4} value={block.text} onChange={(e) => updateBlock(block.id, { text: e.target.value })} /></label><div className="grid gap-3 sm:grid-cols-2"><label>Ana buton<input className={fieldClass()} value={block.primaryLabel} onChange={(e) => updateBlock(block.id, { primaryLabel: e.target.value })} /></label><label>Ana link<input className={fieldClass()} value={block.primaryHref} onChange={(e) => updateBlock(block.id, { primaryHref: e.target.value })} /></label><label>İkinci buton<input className={fieldClass()} value={block.secondaryLabel} onChange={(e) => updateBlock(block.id, { secondaryLabel: e.target.value })} /></label><label>İkinci link<input className={fieldClass()} value={block.secondaryHref} onChange={(e) => updateBlock(block.id, { secondaryHref: e.target.value })} /></label></div></div>;
      case "steps": return <div className="grid gap-3"><label>Başlık<input className={fieldClass()} value={block.heading} onChange={(e) => updateBlock(block.id, { heading: e.target.value })} /></label><label>Giriş<input className={fieldClass()} value={block.intro} onChange={(e) => updateBlock(block.id, { intro: e.target.value })} /></label>{block.items.map((item, index) => <div className="rounded-xl border border-[#e4def3] bg-[#faf9ff] p-3" key={index}><input className={fieldClass()} value={item.title} onChange={(e) => updateStepItem(block.id, index, "title", e.target.value)} /><textarea className={fieldClass()} rows={3} value={item.text} onChange={(e) => updateStepItem(block.id, index, "text", e.target.value)} /><button type="button" className="mt-2 text-xs font-bold text-[#8b3c63]" onClick={() => updateBlock(block.id, { items: block.items.filter((_, i) => i !== index) })}>Adımı kaldır</button></div>)}<button type="button" className="rounded-xl border border-dashed border-[#6847e8]/30 px-3 py-2 text-sm font-bold text-[#5b35dd]" onClick={() => updateBlock(block.id, { items: [...block.items, { title: `Adım ${block.items.length + 1}`, text: "" }] })}>+ Adım ekle</button></div>;
      case "stats": return <div className="grid gap-3"><label>Başlık<input className={fieldClass()} value={block.heading} onChange={(e) => updateBlock(block.id, { heading: e.target.value })} /></label>{block.items.map((item, index) => <div className="grid gap-2 rounded-xl border border-[#e4def3] bg-[#faf9ff] p-3 sm:grid-cols-[120px_1fr_auto]" key={index}><input className={fieldClass()} value={item.value} onChange={(e) => updateStatItem(block.id, index, "value", e.target.value)} /><input className={fieldClass()} value={item.label} onChange={(e) => updateStatItem(block.id, index, "label", e.target.value)} /><button type="button" className="text-xs font-bold text-[#8b3c63]" onClick={() => updateBlock(block.id, { items: block.items.filter((_, i) => i !== index) })}>Sil</button></div>)}<button type="button" className="rounded-xl border border-dashed border-[#6847e8]/30 px-3 py-2 text-sm font-bold text-[#5b35dd]" onClick={() => updateBlock(block.id, { items: [...block.items, { value: "00", label: "Yeni veri" }] })}>+ İstatistik ekle</button></div>;
      case "quote": return <div className="grid gap-3"><label>Alıntı<textarea className={fieldClass()} rows={5} value={block.quote} onChange={(e) => updateBlock(block.id, { quote: e.target.value })} /></label><label>Kaynak / kişi<input className={fieldClass()} value={block.attribution} onChange={(e) => updateBlock(block.id, { attribution: e.target.value })} /></label></div>;
      case "faq": return <div className="grid gap-3"><label>Başlık<input className={fieldClass()} value={block.heading} onChange={(e) => updateBlock(block.id, { heading: e.target.value })} /></label>{block.items.map((item, index) => <div className="rounded-xl border border-[#e4def3] bg-[#faf9ff] p-3" key={index}><input className={fieldClass()} value={item.question} onChange={(e) => updateFaqItem(block.id, index, "question", e.target.value)} /><textarea className={fieldClass()} rows={3} value={item.answer} onChange={(e) => updateFaqItem(block.id, index, "answer", e.target.value)} /><button type="button" className="mt-2 text-xs font-bold text-[#8b3c63]" onClick={() => updateBlock(block.id, { items: block.items.filter((_, i) => i !== index) })}>Soruyu kaldır</button></div>)}<button type="button" className="rounded-xl border border-dashed border-[#6847e8]/30 px-3 py-2 text-sm font-bold text-[#5b35dd]" onClick={() => updateBlock(block.id, { items: [...block.items, { question: "Yeni soru", answer: "" }] })}>+ Soru ekle</button></div>;
      case "gallery": return <div className="grid gap-3"><label>Başlık<input className={fieldClass()} value={block.heading} onChange={(e) => updateBlock(block.id, { heading: e.target.value })} /></label>{block.items.map((item, index) => <div className="rounded-xl border border-[#e4def3] bg-[#faf9ff] p-3" key={index}><MediaSelect media={media} value={item.imageUrl} onChange={(url, alt) => updateGalleryItem(block.id, index, { imageUrl: url, alt: alt || item.alt })} /><input className={fieldClass()} placeholder="Alt metin" value={item.alt} onChange={(e) => updateGalleryItem(block.id, index, { alt: e.target.value })} /><input className={fieldClass()} placeholder="Açıklama" value={item.caption} onChange={(e) => updateGalleryItem(block.id, index, { caption: e.target.value })} /><button type="button" className="mt-2 text-xs font-bold text-[#8b3c63]" onClick={() => updateBlock(block.id, { items: block.items.filter((_, i) => i !== index) })}>Görseli kaldır</button></div>)}<button type="button" className="rounded-xl border border-dashed border-[#6847e8]/30 px-3 py-2 text-sm font-bold text-[#5b35dd]" onClick={() => updateBlock(block.id, { items: [...block.items, { imageUrl: "", alt: "", caption: "" }] })}>+ Galeri görseli ekle</button></div>;
      case "table": return <div className="grid gap-3"><label>Başlık<input className={fieldClass()} value={block.heading} onChange={(e) => updateBlock(block.id, { heading: e.target.value })} /></label><label>Sütunlar <small>( | ile ayırın )</small><input className={fieldClass()} value={block.columns.join(" | ")} onChange={(e) => updateBlock(block.id, { columns: e.target.value.split("|").map((v) => v.trim()).filter(Boolean).slice(0, 8) })} /></label><label>Satırlar <small>(her satır yeni kayıt, | hücre ayracı)</small><textarea className={fieldClass()} rows={6} value={block.rows.map((row) => row.join(" | ")).join("\n")} onChange={(e) => updateBlock(block.id, { rows: e.target.value.split("\n").filter(Boolean).map((row) => row.split("|").map((cell) => cell.trim()).slice(0, 8)).slice(0, 30) })} /></label></div>;
      case "divider": return <label>Boşluk miktarı<select className={fieldClass()} value={block.spacing} onChange={(e) => updateBlock(block.id, { spacing: e.target.value })}><option value="small">Küçük</option><option value="medium">Orta</option><option value="large">Büyük</option></select></label>;
    }
  }

  return (
    <form action={saveCmsPageAction} className="space-y-5">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <input type="hidden" name="blocksJson" value={JSON.stringify(blocks)} />
      <input type="hidden" name="body" value={body} />

      <div className="rounded-2xl border border-[#ddd6f1] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="text-sm font-bold text-[#332c49]">Sayfa başlığı<input className={fieldClass()} maxLength={220} name="title" required value={title} onChange={(e) => changeTitle(e.target.value)} /></label>
          <label className="text-sm font-bold text-[#332c49]">URL kısa adı<input className={fieldClass()} maxLength={120} name="slug" readOnly={Boolean(id)} required value={slugValue} onChange={(e) => { setSlugTouched(true); setSlugValue(slugify(e.target.value)); }} /></label>
        </div>
        <label className="mt-4 block text-sm font-bold text-[#332c49]">Kısa özet<textarea className={fieldClass()} maxLength={500} name="summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} /></label>
        {!id ? <div className="mt-4"><span className="text-sm font-bold text-[#332c49]">Başlangıç şablonu</span><div className="mt-2 flex flex-wrap gap-2">{cmsPageTemplates.map((template) => <button className={`rounded-full border px-4 py-2 text-xs font-extrabold ${template.key === templateKey ? "border-[#6847e8] bg-[#6847e8] text-white" : "border-[#dcd4ef] bg-white text-[#554d68]"}`} key={template.key} onClick={() => chooseTemplate(template.key)} type="button">{template.label}</button>)}</div></div> : null}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[230px_minmax(420px,700px)_minmax(360px,1fr)]">
        <aside className="sticky top-4 rounded-2xl border border-[#ddd6f1] bg-white p-3 shadow-sm">
          <div className="px-2 pb-2"><strong className="text-sm text-[#251f39]">Bloklar</strong><p className="mt-1 text-xs leading-5 text-[#776f87]">Sayfaya eklemek için seç.</p></div>
          <div className="grid gap-2">{palette.map((item) => <button className="rounded-xl border border-[#e6e0f2] bg-[#fbfaff] px-3 py-2 text-left transition hover:border-[#6847e8]/35 hover:bg-[#f5f1ff]" key={item.type} onClick={() => addBlock(item.type)} type="button"><strong className="block text-sm text-[#33264f]">+ {item.label}</strong><span className="mt-0.5 block text-[11px] leading-4 text-[#81798f]">{item.hint}</span></button>)}</div>
          <Link className="mt-3 block rounded-xl px-3 py-2 text-xs font-bold text-[#5b35dd]" href="/icerik/medya">Medya kütüphanesi →</Link>
        </aside>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#ddd6f1] bg-white p-4 shadow-sm"><div><strong className="text-sm text-[#251f39]">Sayfa akışı</strong><p className="text-xs text-[#776f87]">Sürükle-bırak veya oklarla sırala.</p></div><button className="rounded-full border border-[#dcd4ef] px-3 py-1.5 text-xs font-bold text-[#5b35dd] xl:hidden" type="button" onClick={() => setPreview((value) => !value)}>{preview ? "Önizlemeyi gizle" : "Önizlemeyi aç"}</button></div>
          {blocks.map((block, index) => {
            const paletteItem = palette.find((item) => item.type === block.type);
            return (
              <details className="group rounded-2xl border border-[#ddd6f1] bg-white shadow-sm" draggable key={block.id} onDragStart={() => setDraggedId(block.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropBefore(block.id)} open={index === 0}>
                <summary className="flex cursor-grab list-none items-center justify-between gap-3 px-4 py-3"><div className="flex items-center gap-3"><span className="text-[#a39aad]">⋮⋮</span><div><strong className="text-sm text-[#29213e]">{paletteItem?.label ?? block.type}</strong><span className="ml-2 text-[11px] text-[#92899e]">#{index + 1}</span></div></div><div className="flex gap-1"><button type="button" className="rounded-lg border px-2 py-1 text-xs" onClick={(e) => { e.preventDefault(); moveBlock(block.id, -1); }}>↑</button><button type="button" className="rounded-lg border px-2 py-1 text-xs" onClick={(e) => { e.preventDefault(); moveBlock(block.id, 1); }}>↓</button></div></summary>
                <div className="border-t border-[#eee9f6] p-4 text-sm text-[#51495f]">{renderBlockFields(block)}<div className="mt-4 flex flex-wrap gap-2 border-t border-[#eee9f6] pt-3"><button className="rounded-lg border border-[#dcd4ef] px-3 py-1.5 text-xs font-bold text-[#5b35dd]" type="button" onClick={() => duplicateBlock(block.id)}>Kopyala</button><button className="rounded-lg border border-[#ebd8df] px-3 py-1.5 text-xs font-bold text-[#963d5f]" type="button" onClick={() => removeBlock(block.id)}>Bloğu sil</button></div></div>
              </details>
            );
          })}
          {blocks.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cfc5e8] bg-white p-8 text-center text-sm text-[#766f83]">Soldaki panelden ilk bloğu ekleyin.</div> : null}
        </section>

        <aside className={`${preview ? "block" : "hidden"} xl:sticky xl:top-4 xl:block`}>
          <div className="mb-2 flex items-center justify-between"><strong className="text-sm text-[#251f39]">Canlı önizleme</strong><span className="text-[11px] font-bold text-[#7b7390]">Header / footer sistemden gelir</span></div>
          <div className="max-h-[78vh] overflow-auto rounded-2xl border border-[#d7cfeb] bg-white shadow-[0_18px_50px_rgba(48,32,112,.12)]"><div className="min-w-[340px] origin-top"><PublicCmsPageBlocks blocks={blocks} eyebrow={defaultEyebrow} pageTitle={title || "Yeni sayfa"} summary={summary} /></div></div>
        </aside>
      </div>

      <div className="rounded-2xl border border-[#ddd6f1] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-2"><label className="text-sm font-bold text-[#332c49]">SEO başlığı<input className={fieldClass()} maxLength={220} name="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} /></label><label className="text-sm font-bold text-[#332c49]">SEO açıklaması<textarea className={fieldClass()} maxLength={500} name="seoDescription" rows={3} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} /></label></div><label className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#51495f]"><input name="noIndex" type="checkbox" checked={noIndex} onChange={(e) => setNoIndex(e.target.checked)} />Arama motorlarında gösterme (noindex)</label>
      </div>

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cfc5e8] bg-white/95 p-3 shadow-[0_14px_40px_rgba(48,32,112,.14)] backdrop-blur"><div className="text-xs text-[#776f87]"><strong className="text-[#3d3452]">{blocks.length} blok</strong> · {body.split(/\s+/).filter(Boolean).length} kelime · tasarım sistemi kilitli</div><div className="flex gap-2"><button className="rounded-full border border-[#cfc5e8] bg-white px-5 py-2.5 text-sm font-extrabold text-[#5b35dd]" name="mode" type="submit" value="draft">Taslak kaydet</button>{canPublish ? <button className="rounded-full bg-[#5b35dd] px-5 py-2.5 text-sm font-extrabold text-white shadow-md" name="mode" type="submit" value="publish">Kaydet ve yayınla</button> : null}</div></div>
    </form>
  );
}
