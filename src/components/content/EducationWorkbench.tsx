"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "./EducationWorkbench.module.css";

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
  if (count >= 7) return "HAZIR";
  if (count > 0) return "DEVAM";
  return "BEKLİYOR";
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "—";
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
    <div className={styles.workbench}>
      <div className={styles.metrics} aria-label="Eğitim durumu özeti">
        <article className={styles.metric}><strong>{metrics.total}</strong><span>Toplam tür</span><small>{lockedCategory ?? "Eğitim envanteri"}</small></article>
        <article className={styles.metric}><strong>{metrics.complete}</strong><span>Tamamlanan</span><small>7/7 görsel</small></article>
        <article className={styles.metric}><strong>{metrics.inProgress}</strong><span>Devam eden</span><small>1–6/7 görsel</small></article>
        <article className={styles.metric}><strong>{metrics.notStarted}</strong><span>Başlanmamış</span><small>0/7 görsel</small></article>
      </div>

      <section className={`${styles.toolbar} ${lockedCategory ? styles.toolbarLocked : ""}`} aria-label="Eğitim filtreleri">
        <label className={styles.field}>
          <span>Tür ara · {filtered.length} sonuç</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value.slice(0, 120))}
            placeholder="Roman, şiir, senaryo…"
          />
        </label>
        {!lockedCategory ? (
          <label className={styles.field}>
            <span>Kategori</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">Tüm kategoriler</option>
              {categories.map((item) => <option key={item.path} value={item.label}>{item.label}</option>)}
            </select>
          </label>
        ) : null}
        <label className={styles.field}>
          <span>Hazırlık</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="all">Tüm durumlar</option>
            <option value="not-started">Başlanmamış · 0/7</option>
            <option value="in-progress">Devam · 1–6/7</option>
            <option value="complete">Tamamlandı · 7/7</option>
          </select>
        </label>
        <button className={styles.resetButton} type="button" onClick={resetFilters}>Temizle</button>
      </section>

      {!lockedCategory ? (
        <nav className={styles.categoryStrip} aria-label="Eğitim kategorileri">
          {categories.map((item) => (
            <Link key={item.path} href={`/icerik/egitim/kategori/${item.path}`} className={styles.categoryCard}>
              <strong>{item.label}</strong>
              <span>{item.total} tür</span>
              <small>{item.complete} hazır · {item.inProgress} devam</small>
            </Link>
          ))}
        </nav>
      ) : (
        <nav className={styles.categoryBar} aria-label="Kategori gezinmesi">
          <Link className={styles.compactLink} href="/icerik/egitim">← Tüm Eğitim</Link>
          {currentCategory ? <strong>{currentCategory.label} · {currentCategory.total} tür</strong> : null}
        </nav>
      )}

      <section className={styles.table} aria-label={lockedCategory ? `${lockedCategory} türleri` : "Eğitim türleri"}>
        <div className={styles.tableHeader} aria-hidden="true">
          <span>Durum</span>
          <span>Tür</span>
          <span>Kategori</span>
          <span>Son işlem</span>
          <span style={{ textAlign: "right" }}>Aksiyon</span>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            Bu filtrelerle eşleşen tür yok. <button className={styles.resetButton} type="button" onClick={resetFilters}>Filtreleri temizle</button>
          </div>
        ) : filtered.map((item) => {
          const rowStatus = statusFor(item.visualCount);
          return (
            <div className={styles.row} key={item.slug}>
              <div className={styles.statusCell}>
                <span className={styles.statusCount}>{item.visualCount}/7</span>
                <span className={styles.statusPill} data-status={rowStatus}>{statusLabel(item.visualCount)}</span>
              </div>
              <div className={styles.typeCell}>
                <strong>{item.label}</strong>
                <small>{item.publicHref}</small>
              </div>
              <div className={styles.categoryCell}>{item.category}</div>
              <div className={styles.dateCell}>{formatUpdatedAt(item.updatedAt)}</div>
              <div className={styles.actions}>
                <Link className={styles.primaryAction} href={item.editHref}>Yönet</Link>
                <Link className={styles.secondaryAction} href={item.publicHref} target="_blank">Canlı ↗</Link>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
