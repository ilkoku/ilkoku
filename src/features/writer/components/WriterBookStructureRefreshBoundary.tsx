"use client";

import { useEffect, useState } from "react";

import { WRITER_BOOK_STRUCTURE_CHANGED_EVENT } from "@/features/writer/writer-book-structure-events";

import { WriterBookStructureEnhancer } from "./WriterBookStructureEnhancer";

export function WriterBookStructureRefreshBoundary() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((current) => current + 1);

    window.addEventListener(WRITER_BOOK_STRUCTURE_CHANGED_EVENT, refresh);
    return () =>
      window.removeEventListener(WRITER_BOOK_STRUCTURE_CHANGED_EVENT, refresh);
  }, []);

  return <WriterBookStructureEnhancer key={revision} />;
}
