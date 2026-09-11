"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type EducationWorkbenchItem = {
  slug: string;
  label: string;
  category: string;
  categoryPath: string;
  visualCount: number;
  updatedAt: string | null;
  editHref: string;
  publicHref: string;
};

export type EducationWorkbenchCategory = {
  label: string;
  path: string;
  total: number;
  complete: number;
  inProgress: number;
  notStarted: number;
};

type StatusFilter = "all" | "not-started" | "in-progress" | "complete";

type Props = {
  items: EducationWorkbenchItem[];
  categories: EducationWorkbenchCategory[];
  lockedCategory?: string;
};

function statusFor(count: number): Exclude<StatusFilter, "all"> {
  if (count >= 7) return "complete";
  if (count > 0) return "in-progress";
  return "not-started";
}

function statusLabel(count: number) {
  if (count >= 7) return "GÖRSEL TAM";
  if (count > 0) return "DEVAM EDİYOR";
  return "BAŞLANMADI";
}

function statusTone(count: number) {
  if (count >= 7) return "is-index";
  if (count > 0) return "is-draft";
  return "is-noindex";
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Henüz kayıt yok";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function EducationWorkbench({ items, categories, lockedCategory }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(lockedCategory ?? "all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const scopedItems = useMemo(
    () => lockedCategory ? items.filter((item) => item.category === lockedCategory) : items,
    [items, lockedCategory],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("tr-TR");
    return scopedItems.filter((item) => {
      if (!lockedCategory && category !== "all" && item.category !== category) return false;
      if (status !== "all" && statusFor(item.visualCount) !== status) return false;
      if (!needle) return true;
      return `${item.label} ${item.slug} ${item.category}`.toLocaleLowerCase("tr-TR").includes(needle);
    });
  }, [category, lockedCategory, scopedItems, search, status]);

  const metrics = useMemo(() => {
    const complete = scopedItems.filter((item) => item.visualCount >= 7).length;
    const inProgress = scopedItems.filter((item) => item.visualCount > 0 && item.visualCount < 7).length;
    const notStarted = scopedItems.length - complete - inProgress;
    return { total: scopedItems.length, complete, inProgress, notStarted };
  }, [scopedItems]);

  const currentCategory = lockedCategory
    ? categories.find((item) => item.label === lockedCategory) ?? null
    : null;

  function resetFilters() {
    setSearch("");
    if (!lockedCategory) setCategory("all");
    setStatus("all");
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div className="content-metric-grid">
        <article className="content-metric-card"><span>Toplam tür</span><strong>{metrics.total}</strong><small>{lockedCategory ? `${lockedCategory} kategorisi` : "Eğitim envanteri"}</small></article>
        <article className="content-metric-card"><span>Tamamlanan</span><strong>{metrics.complete}</strong><small>7/7 görsel hazır</small></article>
        <article className="content-metric-card"><span>Devam eden</span><strong>{metrics.inProgress}</strong><small>1–6 görsel yüklenmiş</small></article>
        <article className="content-metric-card"><span>Başlanmamış</span><strong>{metrics.notStarted}</strong><small>0/7 görsel</small></article>
      </div>

      <section className="content-panel">
        <div className="content-section-heading">
          <div><span>Çalışma masası</span><h2>Filtre Masası</h2></div>
          <p>{filtered.length} sonuç gösteriliyor.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: lockedCategory ? "minmax(240px,2fr) minmax(190px,1fr) auto" : "minmax(240px,2fr) minmax(190px,1fr) minmax(190px,1fr) auto", gap: ".75rem", alignItems: "end" }}>
          <label>
            <span>Tür ara</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value.slice(0, 120))}
              placeholder="Roman, şiir, senaryo…"
              style={{ width: "100%", marginTop: ".35rem" }}
            />
          </label>
          {!lockedCategory ? (
            <label>
              <span>Kategori</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} style={{ width: "100%", marginTop: ".35rem" }}>
                <option value="all">Tüm kategoriler</option>
                {categories.map((item) => <option key={item.path} value={item.label}>{item.label}</option>)}
              </select>
            </label>
          ) : null}
          <label>
            <span>Hazırlık durumu</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} style={{ width: "100%", marginTop: ".35rem" }}>
              <option value="all">Tüm durumlar</option>
              <option value="not-started">Başlanmamış · 0/7</option>
              <option value="in-progress">Devam ediyor · 1–6/7</option>
              <option value="complete">Tamamlandı · 7/7</option>
            </select>
          </label>
          <button type="button" onClick={resetFilters}>Filtreleri temizle</button>
        </div>
      </section>

      {!lockedCategory ? (
        <section className="content-panel">
          <div className="content-section-heading">
            <div><span>7 ana kategori</span><h2>Kategori Masası</h2></div>
            <p>Bir kategoriye girince yalnız o kategoriye ait türler açılır.</p>
          </div>
          <div className="content-metric-grid">
            {categories.map((item) => (
              <Link
                key={item.path}
                href={`/icerik/egitim/kategori/${item.path}`}
                className="content-metric-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span>{item.label}</span>
                <strong>{item.total}</strong>
                <small>{item.complete} tam · {item.inProgress} devam · {item.notStarted} başlanmamış</small>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <nav className="cms-editor-toolbar" aria-label="Kategori gezinmesi">
          <div className="cms-editor-toolbar__cluster">
            <Link href="/icerik/egitim">← Tüm Eğitim</Link>
            {currentCategory ? <strong>{currentCategory.label} · {currentCategory.total} tür</strong> : null}
          </div>
        </nav>
      )}

      <section className="content-panel">
        <div className="content-section-heading">
          <div><span>{lockedCategory ? "Kategori türleri" : "Filtrelenmiş sonuç"}</span><h2>{lockedCategory ?? "Tür Çalışma Listesi"}</h2></div>
          <p>Yeni bir tür ana tür kataloğuna eklendiğinde bu listeye otomatik dahil olur.</p>
        </div>

        {filtered.length === 0 ? (
          <div className="content-empty-state">
            <strong>Bu filtrelerle eşleşen tür yok.</strong>
            <p>Arama veya hazırlık durumunu değiştir.</p>
            <button type="button" onClick={resetFilters}>Filtreleri temizle</button>
          </div>
        ) : (
          <div className="content-list">
            {filtered.map((item) => (
              <div className="content-list-row" key={item.slug} style={{ alignItems: "center", gap: "1rem" }}>
                <div style={{ minWidth: 105 }}>
                  <strong>{item.visualCount}/7</strong><br />
                  <span className={`cms-status-pill ${statusTone(item.visualCount)}`}>{statusLabel(item.visualCount)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{item.label}</strong>
                  <p style={{ margin: ".25rem 0 0" }}>{item.category} · {item.publicHref}</p>
                  <small>Son kayıt: {formatUpdatedAt(item.updatedAt)}</small>
                </div>
                <div className="cms-editor-toolbar__cluster" style={{ justifyContent: "flex-end" }}>
                  {!lockedCategory ? <Link href={`/icerik/egitim/kategori/${item.categoryPath}`}>Kategori</Link> : null}
                  <Link href={item.editHref}>Yönet →</Link>
                  <Link href={item.publicHref} target="_blank">Canlı ↗</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
