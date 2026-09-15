import { cloneElement, isValidElement, type ReactElement } from "react";
import { notFound } from "next/navigation";

import { requireCmsManager } from "@/lib/cms-access";
import {
  getEditorEducationDraftTextRecord,
  getEditorEducationPublishedTextRecord,
} from "@/lib/cms-editor-education";
import { getEditorEducationCategory } from "@/lib/editor-education";
import { getEditorEducationSourcePageTree } from "@/lib/editor-education-source";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function EditorEducationPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getEditorEducationCategory(slug);
  if (!category) notFound();
  await requireCmsManager(`/icerik/onizleme/editor-egitim/${category.slug}`);

  const [tree, draft, published] = await Promise.all([
    getEditorEducationSourcePageTree(category.slug),
    getEditorEducationDraftTextRecord(category.slug),
    getEditorEducationPublishedTextRecord(category.slug),
  ]);
  if (!tree || !isValidElement(tree)) notFound();

  const record = draft ?? published;
  return cloneElement(tree as ReactElement<Record<string, unknown>>, {
    textOverrides: record?.overrides ?? {},
    previewMode: true,
  });
}
