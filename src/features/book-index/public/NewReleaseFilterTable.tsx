"use client";

import { useMemo, useState } from "react";

import type { TurkeyNewReleaseRow } from "@/lib/book-index/new-releases";

import styles from "./BookIndexPublicView.module.css";

function normalize(value: string | null) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("tr-TR");
}

export function NewReleaseFilterTable({
  rows,
}: {
  rows: readonly TurkeyNewReleaseRow[];
}) {
  const [sourceCode, setSourceCode] = useState("");
  const [query, setQuery] = useState("");
  const [multiSourceOnly, setMultiSourceOnly] = useState(false);

  const sources = useMemo(() => {
    const map = new Map<string, string>();

    for (const row of rows) {
      for (const source of row.sources) {
        map.set(source.sourceCode, source.sourceName);
      }
    }

    return [...map.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [rows]);

  const normalizedQuery = normalize(query.trim());

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (
          sourceCode
          && !row.sources.some((source) => source.sourceCode === sourceCode)
        ) {
          return false;
        }

        if (multiSourceOnly && row.sources.length < 2) return false;

        if (!normalizedQuery) return true;

        return [
          row.title,
          row.authorName,
          row.publisherName,
        ].some((value) => normalize(value).includes(normalizedQuery));
      }),
    [rows, sourceCode, multiSourceOnly, normalizedQuery],
  );

  return (
    <>
      <div className={styles.newReleaseFilters} aria-label="Yeni çıkan kitap filtreleri">
        <label className={styles.newReleaseFilterField}>
          <span>Satış sitesi</span>
          <select value={sourceCode} onChange={(event) => setSourceCode(event.target.value)}>
            <option value="">Tüm siteler</option>
            {sources.map((source) => (
              <option key={source.code} value={source.code}>
                {source.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.newReleaseFilterField}>
          <span>Kitap, yazar veya yayınevi</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ara"
          />
        </label>

        <label className={styles.newReleaseCheckbox}>
          <input
            type="checkbox"
            checked={multiSourceOnly}
            onChange={(event) => setMultiSourceOnly(event.target.checked)}
          />
          <span>Birden fazla sitede görünenleri göster</span>
        </label>
      </div>

      <p className={styles.newReleaseFilterSummary} aria-live="polite">
        {filteredRows.length} kayıt gösteriliyor
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.newReleaseTable}>
          <thead>
            <tr>
              <th scope="col">Kitap</th>
              <th scope="col">Yazar</th>
              <th scope="col">Yayınevi</th>
              <th scope="col">Site · listedeki konum</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.rowKey}>
                  <td className={styles.titleCell}>
                    <strong>{row.title}</strong>
                  </td>
                  <td>{row.authorName ?? "—"}</td>
                  <td>{row.publisherName ?? "—"}</td>
                  <td className={styles.newReleaseSourcesCell}>
                    {row.sources.map((source) => (
                      <span className={styles.newReleaseSourceTag} key={source.sourceCode}>
                        {source.sourceName}: {source.position}
                      </span>
                    ))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className={styles.emptyState} colSpan={4}>
                  Filtrelere uyan kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
