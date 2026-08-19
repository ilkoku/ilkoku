"use client";

import { PublicDocumentHydrator } from "@/components/content/PublicDocumentHydrator";
import { PublicFooterHydrator } from "@/components/content/PublicFooterHydrator";

export function PublicCmsHydrator() {
  return (
    <>
      <PublicDocumentHydrator />
      <PublicFooterHydrator />
    </>
  );
}
