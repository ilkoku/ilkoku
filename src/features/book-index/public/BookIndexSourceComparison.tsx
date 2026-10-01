"use client";

import { useMemo, useState } from "react";

import type { TurkeySourceRankRow } from "@/lib/book-index/source-rank-table";

import styles from "./BookIndexPublicView.module.css";

type SourceOption = {
  code: string;
  name: string;
};

type ComparisonBook = {
  title: string;
  authorName: string | null;
};

function sourceOptionsFromRows(rows: readonly TurkeySourceRankRow[]) {
  const sources = new Map<string, string>();

  for (const row of rows) {
    for (const source of row.sources) {
      sources.set(source.sourceCode, source.sourceName);
    }
  }

  return [...sources.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function BookIndexSourceComparison({
  rows,
}: {
  rows: readonly TurkeySourceRankRow[];
}) {
  const sourceOptions = useMemo(() => sourceOptionsFromRows(rows), [rows]);
  const [selectedSources, setSelectedSources] = useState<string[]>(() => [
    sourceOptions[0]?.code ?? "",
    sourceOptions[1]?.code ?? "",
    sourceOptions[2]?.code ?? "",
    sourceOptions[3]?.code ?? "",
  ]);

  const selectedCodes = selectedSources.filter(Boolean);

  const comparisonRows = useMemo(() => {
    const byRank = new Map<number, Map<string, ComparisonBook[]>>();

    for (const row of rows) {
      for (const source of row.sources) {
        if (!selectedCodes.includes(source.sourceCode)) continue;

        const sourceMap = byRank.get(row.rank) ?? new Map<string, ComparisonBook[]>();
        const books = sourceMap.get(source.sourceCode) ?? [];
        books.push({
          title: row.title,
          authorName: row.authorName,
        });
        sourceMap.set(source.sourceCode, books);
        byRank.set(row.rank, sourceMap);
      }
    }

    return [...byRank.entries()]
      .sort(([a], [b]) => a - b)
      .map(([rank, sourceMap]) => ({ rank, sourceMap }));
  }, [rows, selectedCodes]);

  function updateSource(slot: number, sourceCode: string) {
    setSelectedSources((current) => {
      const next = [...current];

      if (sourceCode && next.some((value, index) => index !== slot && value === sourceCode)) {
        return current;
      }

      next[slot] = sourceCode;
      return next;
    });
  }

  const selectedOptions = selectedCodes
    .map((code) => sourceOptions.find((source) => source.code === code))
    .filter((source): source is SourceOption => Boolean(source));

  return (
    <div className={styles.comparisonPanel}>
      <div className={styles.comparisonControls} aria-label="Karşılaştırılacak kitap satış kanalları">
        {selectedSources.map((sourceCode, index) => (
          <label className={styles.comparisonField} key={index}>
            <span>Kitap satış kanalı {index + 1}</span>
            <select
              value={sourceCode}
              onChange={(event) => updateSource(index, event.target.value)}
            >
              <option value="">Kitap satış kanalı seç</option>
              {sourceOptions.map((source) => (
                <option
                  key={source.code}
                  value={source.code}
                  disabled={
                    source.code !== sourceCode && selectedCodes.includes(source.code)
                  }
                >
                  {source.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {selectedOptions.length >= 2 ? (
        <div className={styles.comparisonScroll}>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th scope="col">Sıra</th>
                {selectedOptions.map((source) => (
                  <th scope="col" key={source.code}>
                    {source.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(({ rank, sourceMap }) => (
                <tr key={rank}>
                  <th className={styles.comparisonRank} scope="row">
                    {rank}
                  </th>
                  {selectedOptions.map((source) => {
                    const books = sourceMap.get(source.code) ?? [];
                    return (
                      <td key={source.code}>
                        {books.length ? (
                          <div className={styles.comparisonBooks}>
                            {books.map((book, bookIndex) => (
                              <div
                                className={styles.comparisonBook}
                                key={`${source.code}-${rank}-${book.title}-${bookIndex}`}
                              >
                                <strong>{book.title}</strong>
                                <span>
                                  {book.authorName ?? "Yazar bilgisi bekleniyor"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className={styles.comparisonMissing}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.comparisonHint}>
          Karşılaştırmak için en az iki kitap satış kanalı seç.
        </p>
      )}
    </div>
  );
}
