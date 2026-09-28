"use client";

import { useMemo, useState } from "react";

import type { TurkeySourceRankRow } from "@/lib/book-index/source-rank-table";

import styles from "./BookIndexPublicView.module.css";

function normalized(value: string) {
  return value.toLocaleLowerCase("tr-TR").trim();
}

export function BookIndexRankTable({
  rows,
  maxRank,
}: {
  rows: readonly TurkeySourceRankRow[];
  maxRank?: number;
}) {
  const scopedRows = useMemo(
    () => (maxRank ? rows.filter((row) => row.rank <= maxRank) : [...rows]),
    [maxRank, rows],
  );
  const [query, setQuery] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [rank, setRank] = useState("");

  const sourceOptions = useMemo(() => {
    const sources = new Map<string, string>();

    for (const row of scopedRows) {
      for (const source of row.sources) {
        sources.set(source.sourceCode, source.sourceName);
      }
    }

    return [...sources.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [scopedRows]);

  const rankOptions = useMemo(
    () => [...new Set(scopedRows.map((row) => row.rank))].sort((a, b) => a - b),
    [scopedRows],
  );

  const filteredRows = useMemo(() => {
    const needle = normalized(query);

    return scopedRows.filter((row) => {
      if (rank && row.rank !== Number(rank)) return false;
      if (
        sourceCode
        && !row.sources.some((source) => source.sourceCode === sourceCode)
      ) {
        return false;
      }

      if (!needle) return true;

      const haystack = normalized(
        [row.title, row.authorName ?? ""].join(" "),
      );
      return haystack.includes(needle);
    });
  }, [query, rank, scopedRows, sourceCode]);

  const hasFilters = Boolean(query || sourceCode || rank);

  return (
    <>
      <div className={styles.tableFilters} aria-label="Çok satan kitaplar filtreleri">
        <label className={styles.filterField}>
          <span>Kitap / Yazar</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kitap veya yazar ara"
          />
        </label>

        <label className={styles.filterField}>
          <span>Kaynak</span>
          <select
            value={sourceCode}
            onChange={(event) => setSourceCode(event.target.value)}
          >
            <option value="">Tüm kaynaklar</option>
            {sourceOptions.map((source) => (
              <option key={source.code} value={source.code}>
                {source.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          <span>Sıra</span>
          <select value={rank} onChange={(event) => setRank(event.target.value)}>
            <option value="">Tüm sıralar</option>
            {rankOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <button
          className={styles.clearFilters}
          type="button"
          disabled={!hasFilters}
          onClick={() => {
            setQuery("");
            setSourceCode("");
            setRank("");
          }}
        >
          Temizle
        </button>
      </div>

      <div className={styles.filterSummary} aria-live="polite">
        {filteredRows.length} sonuç
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.rankingTable}>
          <thead>
            <tr>
              <th scope="col">Sıra</th>
              <th scope="col">Kitap</th>
              <th scope="col">Yazar</th>
              <th scope="col">Kaynak</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.rowKey}>
                  <td className={styles.rankCell}>{row.rank}</td>
                  <td className={styles.titleCell}>
                    <strong>{row.title}</strong>
                  </td>
                  <td>{row.authorName ?? "Yazar bilgisi bekleniyor"}</td>
                  <td className={styles.sourceCell}>
                    {row.sources.map((source) => source.sourceName).join(" · ")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className={styles.emptyState} colSpan={4}>
                  Bu filtrelere uyan sonuç bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
