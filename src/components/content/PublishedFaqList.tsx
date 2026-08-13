"use client";

import { useEffect, useState } from "react";

type Item = { question?: string; answer?: string; category?: string };

export function PublishedFaqList() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch("/api/content-faq")
      .then((response) => response.json())
      .then((payload) => setItems(Array.isArray(payload.items) ? payload.items : []));
  }, []);

  if (items.length === 0) {
    return <div className="content-empty"><strong>Henüz yayınlanmış SSS yok.</strong></div>;
  }

  return (
    <div className="content-list">
      {items.map((item, index) => (
        <div className="content-list-row" key={`${item.question}-${index}`}>
          <strong>{item.question || "Soru"}</strong>
          <span>{item.category || "Genel"}</span>
          <small>{item.answer?.slice(0, 120) || "—"}</small>
          <span>Yayında</span>
        </div>
      ))}
    </div>
  );
}
