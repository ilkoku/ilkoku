"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { WorkWithChapterSummary } from "../types";

type WorkEditDialogProps = {
  onClose: () => void;
  work: WorkWithChapterSummary;
};

export function WorkEditDialog({ work }: WorkEditDialogProps) {
  const router = useRouter();

  useEffect(() => {
    router.push(
      `/kitap/${encodeURIComponent(work.slug)}/duzenle?from=${encodeURIComponent("/eserlerim")}`,
    );
  }, [router, work.slug]);

  return null;
}
