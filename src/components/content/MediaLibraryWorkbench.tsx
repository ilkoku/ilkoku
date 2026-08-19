"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CopyMediaUrlButton } from "@/components/content/CopyMediaUrlButton";
import { archiveMediaAssetAction, createMediaAssetAction } from "@/features/cms/media-actions";
import styles from "./MediaLibraryWorkbench.module.css";

export type MediaWorkbenchReference = {
  source: "site" | "page";
  label: string;
  detail: string;
  editHref: string;
};

export type MediaWorkbenchAsset = {
  contentKey: string;
  updatedAt: string;
  title: string;
  url: string;
  altText: string;
  kind: string;
  usage: string;
  notes: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storage: string;
  uploadedBy: string;
  references: MediaWorkbenchReference[];
};

export type MediaWorkbenchInvalid = {
  contentKey: string;
  updatedAt: string;
};

type Props = {
  assets: MediaWorkbenchAsset[];
  invalid: MediaWorkbenchInvalid[];
  referencesAvailable: boolean;
  canPublish: boolean;
  initialSearch?: string;
  initialKind?: string;
  initialUsage?: string;
};

type Mode = "library" | "new";
type KindFilter = "all" | "image" | "document" | "icon" | "other";
type UsageFilter = "all" | "used" | "unused";

function formatBytes(input: number) {
  if (!Number.isFinite(input) || input <= 0) return "—";
  if (input < 1024) return `${input} B`;
  if (input < 1024 * 1024) return `${(input / 1024).toFixed(1)} KB`;
  return `${(input / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(input: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(input));
}

function normalizedKind(value?: string): KindFilter {
  return value === "image" || value === "document" || value === "icon" || value === "other" ? value : "all";
}

function normalizedUsage(value?: string): UsageFilter {
  return value === "used" || value === "unused" ? value : "all";
}

function kindLabel(kind: string) {
  if (kind === "image") return "Görsel";
  if (kind === "document") return "Doküman";
  if (kind === "icon") return "İkon";
  return "Diğer";
}

export function MediaLibraryWorkbench({
  assets,
  invalid,
  referencesAvailable,
  canPublish,
  initialSearch = "",
  initialKind = "all",
  initialUsage = "all",
}: Props) {
  const [mode, setMode] = useState<Mode>("library");
  const [selectedKey, setSelectedKey] = useState(assets[0]?.contentKey ?? "");
  const [search, setSearch] = useState(initialSearch);
  const [kind, setKind] = useState<KindFilter>(normalizedKind(initialKind));
  const [usage, setUsage] = useState<UsageFilter>(normalizedUsage(initialUsage));

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("tr-TR");
    return assets.filter((asset) => {
      const actualKind = normalizedKind(asset.kind || "other");
      if (kind !== "all" && actualKind !== kind) return false;
      if (referencesAvailable && usage === "used" && asset.references.length === 0) return false;
      if (referencesAvailable && usage === "unused" && asset.references.length > 0) return false;
      if (!needle) return true;
      const haystack = [
        asset.title,
        asset.filename,
        asset.url,
        asset.usage,
        asset.altText,
        asset.notes,
        ...asset.references.map((reference) => `${reference.label} ${reference.detail}`),
      ].join(" ").toLocaleLowerCase("tr-TR");
      return haystack.includes(needle);
    });
  }, [assets, kind, referencesAvailable, search, usage]);

  const selected = filtered.find((asset) => asset.contentKey === selectedKey) ?? filtered[0] ?? null;
  const usedCount = assets.filter((asset) => asset.references.length > 0).length;
  const unusedCount = referencesAvailable ? assets.length - usedCount : 0;

  function selectAsset(contentKey: string) {
    setSelectedKey(contentKey);
    setMode("library");
  }

  function resetFilters() {
    setSearch("");
    setKind("all");
    setUsage("all");
  }

  return (
    <div className={styles.workbench}>
      <div className={styles.summaryBar}>
        <article><span>Aktif medya</span><strong>{assets.length}</strong><small>geçerli metadata</small></article>
        <article><span>Kullanımda</span><strong>{referencesAvailable ? usedCount : "—"}</strong><small>yayında referanslı</small></article>
        <article><span>Boşta</span><strong>{referencesAvailable ? unusedCount : "—"}</strong><small>arşiv adayı</small></article>
        <article><span>Bozuk kayıt</span><strong>{invalid.length}</strong><small>sağlık teşhisi gerekir</small></article>
      </div>

      <div className={styles.layout}>
        <aside className={styles.rail}>
          <div className={styles.railHeader}>
            <div><span>Medya envanteri</span><strong>{filtered.length} / {assets.length}</strong></div>
            <button type="button" onClick={() => setMode("new")}>+ Yeni Medya</button>
          </div>

          <div className={styles.filters}>
            <label>
              <span>Arama</span>
              <input name="q" value={search} onChange={(event) => setSearch(event.target.value.slice(0, 120))} placeholder="Dosya, başlık, kullanım..." />
            </label>
            <div className={styles.filterGrid}>
              <label><span>Tür</span><select name="tur" value={kind} onChange={(event) => setKind(normalizedKind(event.target.value))}><option value="all">Tümü</option><option value="image">Görsel</option><option value="document">Doküman</option><option value="icon">İkon</option><option value="other">Diğer</option></select></label>
              <label><span>Kullanım</span><select name="kullanim" value={usage} disabled={!referencesAvailable} onChange={(event) => setUsage(normalizedUsage(event.target.value))}><option value="all">Tümü</option><option value="used">Kullanımda</option><option value="unused">Boşta</option></select></label>
            </div>
            {(search || kind !== "all" || usage !== "all") ? <button type="button" className={styles.resetButton} onClick={resetFilters}>Filtreleri temizle</button> : null}
          </div>

          <div className={styles.assetList}>
            {filtered.length === 0 ? <div className={styles.railEmpty}><strong>Sonuç yok</strong><small>Aramayı veya filtreleri değiştir.</small></div> : filtered.map((asset) => {
              const active = mode === "library" && selected?.contentKey === asset.contentKey;
              return (
                <button key={asset.contentKey} type="button" className={`${styles.assetItem} ${active ? styles.assetItemActive : ""}`} onClick={() => selectAsset(asset.contentKey)}>
                  <span className={styles.kindBadge}>{kindLabel(asset.kind)}</span>
                  <span className={styles.assetText}><strong>{asset.title || "İsimsiz medya"}</strong><small>{asset.filename || asset.url}</small></span>
                  <span className={`${styles.usageBadge} ${asset.references.length > 0 ? styles.used : styles.unused}`}>
                    {referencesAvailable ? asset.references.length > 0 ? `${asset.references.length} kullanım` : "Boşta" : "?"}
                  </span>
                </button>
              );
            })}
          </div>

          {invalid.length > 0 ? <div className={styles.invalidNotice}><strong>{invalid.length} bozuk metadata</strong><span>Bu kayıtlar normal medya akışına sokulmaz.</span><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}
        </aside>

        <main className={styles.detail}>
          {mode === "new" ? (
            <div className={styles.newMediaStack}>
              <div className={styles.detailHeading}><div><span>Yeni Medya</span><h2>Dosya yükle</h2><p>Yeni dosyayı kütüphaneye ekle; metadata ve erişilebilirlik bilgisini yükleme sırasında tanımla.</p></div><button type="button" onClick={() => setMode("library")}>Kütüphaneye dön</button></div>
              <form action="/api/cms-media-upload" method="post" encType="multipart/form-data" className={styles.editorForm}>
                <label className={styles.fileDrop}><span>Dosya seç</span><strong>JPEG, PNG, WebP, GIF, AVIF, ICO veya PDF</strong><small>En fazla 3 MB · SVG ve çalıştırılabilir dosyalar kabul edilmez.</small><input name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/x-icon,image/vnd.microsoft.icon,application/pdf" /></label>
                <div className={styles.twoCol}><label><span>Medya başlığı</span><input name="title" maxLength={180} placeholder="Boş bırakılırsa dosya adı kullanılır" /></label><label><span>Kullanım alanı</span><input name="usage" maxLength={180} placeholder="Örn. Ana Sayfa / Hero" /></label></div>
                <label><span>Alt metin</span><input name="altText" maxLength={300} placeholder="Görsel erişilebilirlik açıklaması" /></label>
                <label><span>Not</span><textarea name="notes" maxLength={800} placeholder="Kaynak, lisans veya kullanım notu" /></label>
                <div className={styles.formActions}><button type="submit">Dosyayı Yükle</button></div>
              </form>

              <div className={styles.pathPanel}>
                <div><span>Mevcut public dosya</span><strong>Dosya yolunu kütüphaneye kaydet</strong><p>Dosya sunucuda zaten varsa yeni blob oluşturmadan yalnız güvenli public yolu kaydet.</p></div>
                <form action={createMediaAssetAction} className={styles.editorForm}>
                  <div className={styles.twoCol}><label><span>Medya başlığı</span><input name="title" required maxLength={180} /></label><label><span>Dosya yolu</span><input name="url" required maxLength={500} placeholder="/landing/ilkoku-hero.webp" /></label></div>
                  <div className={styles.twoCol}><label><span>Tür</span><select name="kind" defaultValue="image"><option value="image">Görsel</option><option value="document">Doküman</option><option value="icon">İkon</option><option value="other">Diğer</option></select></label><label><span>Kullanım alanı</span><input name="usage" maxLength={180} /></label></div>
                  <label><span>Alt metin</span><input name="altText" maxLength={300} /></label><label><span>Not</span><textarea name="notes" maxLength={800} /></label>
                  <div className={styles.formActions}><button type="submit">Dosya Yolunu Kaydet</button></div>
                </form>
              </div>
            </div>
          ) : selected ? (
            <>
              <div className={styles.detailHeading}>
                <div><span>Seçili medya</span><h2>{selected.title || "İsimsiz medya"}</h2><p>{selected.filename || selected.url}</p></div>
                <div className={styles.detailActions}><CopyMediaUrlButton url={selected.url} /><Link href={selected.url} target="_blank">Dosyayı aç ↗</Link></div>
              </div>

              <div className={styles.previewStage}>
                {selected.kind === "image" || selected.kind === "icon" ? <Image src={selected.url} alt={selected.altText || selected.title || "İlkOku medya"} width={1200} height={760} unoptimized /> : <div className={styles.documentPreview}><span>{selected.kind === "document" ? "PDF" : "DOSYA"}</span><strong>{selected.filename || selected.title}</strong><small>{selected.mimeType || kindLabel(selected.kind)}</small></div>}
              </div>

              <div className={styles.metadataGrid}>
                <article><span>Tür</span><strong>{selected.mimeType || kindLabel(selected.kind)}</strong></article>
                <article><span>Boyut</span><strong>{formatBytes(selected.sizeBytes)}</strong></article>
                <article><span>Depolama</span><strong>{selected.storage === "database" ? "Veritabanı" : "Public dosya yolu"}</strong></article>
                <article><span>Güncelleme</span><strong>{formatDate(selected.updatedAt)}</strong></article>
              </div>

              <div className={styles.contentInfo}>
                <div><span>Tanımlı kullanım</span><strong>{selected.usage || "Belirtilmedi"}</strong></div>
                <div><span>Alt metin</span><p>{selected.altText || "Alt metin tanımlanmamış."}</p></div>
                <div><span>Not</span><p>{selected.notes || "Not eklenmemiş."}</p></div>
                {selected.uploadedBy ? <div><span>Ekleyen</span><strong>{selected.uploadedBy}</strong></div> : null}
              </div>
            </>
          ) : (
            <div className={styles.emptyDetail}><strong>Medya seçilmedi</strong><p>Sol envanterden bir dosya seç veya yeni medya ekle.</p><button type="button" onClick={() => setMode("new")}>+ Yeni Medya</button></div>
          )}
        </main>

        <aside className={styles.sidePane}>
          {mode === "new" ? (
            <div className={styles.sideStack}>
              <div className={styles.sideSection}><span>Yükleme güvenliği</span><strong>Dosya imzası server-side doğrulanır</strong><p>Yalnız izin verilen görsel ve PDF tipleri kabul edilir. Dosya uzantısı tek başına güvenilir sayılmaz.</p></div>
              <div className={styles.sideSection}><span>Sonraki adım</span><strong>Yüklenen medya hemen envantere eklenir</strong><p>Sonrasında bu çalışma masasından gerçek kullanım yerlerini takip edebilir ve boşta olduğunda güvenli biçimde arşivleyebilirsin.</p></div>
            </div>
          ) : selected ? (
            <div className={styles.sideStack}>
              <div className={styles.sideSection}>
                <span>Gerçek kullanım</span>
                <strong>{referencesAvailable ? selected.references.length > 0 ? `${selected.references.length} canlı referans` : "Yayındaki içerikte kullanılmıyor" : "Kullanım bilgisi doğrulanamadı"}</strong>
                {!referencesAvailable ? <p className={styles.warningText}>Kullanım haritası doğrulanamadığı için arşivleme fail-closed olarak kilitli.</p> : null}
              </div>

              {selected.references.length > 0 ? <div className={styles.referenceList}>{selected.references.map((reference, index) => <Link key={`${reference.editHref}-${index}`} href={reference.editHref}><strong>{reference.label}</strong><small>{reference.detail}</small><span>İlgili içeriğe git →</span></Link>)}</div> : referencesAvailable ? <div className={styles.noReferences}><strong>Boşta medya</strong><p>Yayındaki CMS içeriğinde bu URL için referans bulunmadı.</p></div> : null}

              <div className={styles.archivePanel}>
                <span>Güvenli arşiv</span>
                {canPublish && referencesAvailable && selected.references.length === 0 ? <><strong>Arşivlemeye uygun</strong><p>Gönderim sırasında server canlı referansları tekrar kontrol eder.</p><form action={archiveMediaAssetAction}><input type="hidden" name="contentKey" value={selected.contentKey} /><button type="submit">Medyayı Arşivle</button></form></> : <><strong>Arşivleme kilitli</strong><p>{!canPublish ? "Yayın yetkisi gerekiyor." : selected.references.length > 0 ? "Medya halen yayındaki içerikte kullanılıyor." : "Kullanım haritası doğrulanamadı."}</p></>}
              </div>
            </div>
          ) : <div className={styles.sideSection}><span>Operasyon</span><strong>Bir medya seç</strong><p>Kullanım ve güvenli arşiv kararları seçili kayıt üzerinden gösterilir.</p></div>}
        </aside>
      </div>
    </div>
  );
}
