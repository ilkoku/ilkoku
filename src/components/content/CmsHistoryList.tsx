"use client";

import { useEffect, useState } from "react";

type Item = { id: string; pageId: string; version: number; createdAt: string };

export function CmsHistoryList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/cms-history")
      .then((response) => response.json())
      .then((payload) => setItems(Array.isArray(payload.items) ? payload.items : []))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return <div className="content-empty"><strong>Geçmiş yükleniyor…</strong></div>;
  if (items.length === 0) return <div className="content-empty"><strong>Henüz sürüm kaydı yok.</strong></div>;

  return (
    <div className="content-list">
      {items.map((item) => (
        <div className="content-list-row" key={item.id}>
          <strong>{item.id.slice(0, 8)}</strong>
          <small>{item.pageId.slice(0, 8)}</small>
          <span>v{item.version}</span>
          <span>{new Date(item.createdAt).toLocaleString("tr-TR")}</span>
        </div>
      ))}
    </div>
  );
}
