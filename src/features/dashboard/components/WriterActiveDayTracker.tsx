"use client";

import { useEffect } from "react";
import { recordWriterActiveDayAction } from "@/features/writer-engagement/actions";

type WriterActiveDayTrackerProps = {
  activeDayCount: number;
};

function normalizeActiveDayCount(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function syncEditorActiveDay(activeDayCount: number) {
  const count = normalizeActiveDayCount(activeDayCount);
  const text = `🔥 ${count} gün`;
  const label = `Yazma serisi ${count} gün`;

  document.querySelectorAll<HTMLElement>(".writer-streak").forEach((element) => {
    if (element.textContent !== text) {
      element.textContent = text;
    }
    if (element.getAttribute("aria-label") !== label) {
      element.setAttribute("aria-label", label);
    }
  });
}

export function WriterActiveDayTracker({ activeDayCount }: WriterActiveDayTrackerProps) {
  useEffect(() => {
    let currentCount = normalizeActiveDayCount(activeDayCount);
    syncEditorActiveDay(currentCount);

    const observer = new MutationObserver(() => {
      syncEditorActiveDay(currentCount);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    void recordWriterActiveDayAction().then((result) => {
      if (result.ok) {
        currentCount = normalizeActiveDayCount(result.activeDayCount);
        syncEditorActiveDay(currentCount);
      }
    });

    return () => observer.disconnect();
  }, [activeDayCount]);

  return null;
}
