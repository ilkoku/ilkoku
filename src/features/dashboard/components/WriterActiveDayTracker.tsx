"use client";

import { useEffect } from "react";
import { recordWriterActiveDayAction } from "@/features/writer-engagement/actions";

export function WriterActiveDayTracker() {
  useEffect(() => {
    void recordWriterActiveDayAction();
  }, []);

  return null;
}
