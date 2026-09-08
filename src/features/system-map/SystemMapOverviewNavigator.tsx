"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { systemMapNavigationGroups } from "./navigation";

const ALL_GROUPS = "all";

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export function SystemMapOverviewNavigator() {
  const [activeGroup, setActiveGroup] = useState(ALL_GROUPS);
  const [query, setQuery] = useState("");

  const totalWorkbenches = useMemo(
    () => systemMapNavigationGroups.reduce(
      (total, group) => total + group.items.filter((item) => item.key !== "overview").length,
      0,
    ),
    [],
  );

  const visibleGroups = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return systemMapNavigationGroups
      .filter((group) => activeGroup === ALL_GROUPS || group.label === activeGroup)
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.key === "overview") return false;
          if (!normalizedQuery) return true;

          return normalizeSearch(`${group.label} ${item.label} ${item.description}`).includes(normalizedQuery);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [activeGroup, query]);

  const visibleCount = visibleGroups.reduce((total, group) => total + group.items.length, 0);
  const isFiltered = activeGroup !== ALL_GROUPS || query.trim().length > 0;

  return (
    <section className="system-map-overview-workbenches" aria-labelledby="system-map-workbenches-title">
      <div className="system-map-section-heading">
        <div>
          <p>ÇALIŞMA MASALARI</p>
          <h2 id="system-map-workbenches-title">Aradığın parçaya doğrudan git</h2>
        </div>
        <span>{visibleCount}/{totalWorkbenches} uzman yüzey</span>
      </div>

      <div className="system-map-overview-filterbar">
        <label className="system-map-overview-search" htmlFor="system-map-workbench-search">
          <span>Çalışma masası ara</span>
          <input
            id="system-map-workbench-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Örn. sözleşme, API, rol, veri..."
            type="search"
            value={query}
          />
        </label>

        <div className="system-map-overview-filterset" role="group" aria-label="Çalışma masası kategorileri">
          <span>Kategori</span>
          <div>
            <button
              aria-pressed={activeGroup === ALL_GROUPS}
              data-active={activeGroup === ALL_GROUPS ? "true" : "false"}
              onClick={() => setActiveGroup(ALL_GROUPS)}
              type="button"
            >
              Tümü <small>{totalWorkbenches}</small>
            </button>
            {systemMapNavigationGroups.map((group) => {
              const count = group.items.filter((item) => item.key !== "overview").length;
              return (
                <button
                  aria-pressed={activeGroup === group.label}
                  data-active={activeGroup === group.label ? "true" : "false"}
                  key={group.label}
                  onClick={() => setActiveGroup(group.label)}
                  type="button"
                >
                  {group.label} <small>{count}</small>
                </button>
              );
            })}
          </div>
        </div>

        {isFiltered ? (
          <button
            className="system-map-overview-reset"
            onClick={() => {
              setActiveGroup(ALL_GROUPS);
              setQuery("");
            }}
            type="button"
          >
            Filtreleri temizle
          </button>
        ) : null}
      </div>

      {visibleGroups.length > 0 ? (
        <div className="system-map-overview-groups" aria-live="polite">
          {visibleGroups.map((group) => (
            <section key={group.label}>
              <h3>{group.label}</h3>
              <div>
                {group.items.map((item) => (
                  <Link href={item.href} key={item.href}>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                    <small>Çalışma masasını aç →</small>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="system-map-overview-empty" role="status">
          <strong>Eşleşen çalışma masası yok.</strong>
          <span>Arama kelimesini değiştir veya filtreleri temizle.</span>
        </div>
      )}
    </section>
  );
}
