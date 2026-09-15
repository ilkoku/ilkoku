import "server-only";

import { isValidElement, type ReactElement, type ReactNode } from "react";

import { getEditorEducationCategory } from "@/lib/editor-education";

const lessonLoaders = {
  "editorluge-baslama": () => import("@/app/editorler-icin/egitim/editorluge-baslama/page"),
  "metin-degerlendirme": () => import("@/app/editorler-icin/egitim/metin-degerlendirme/page"),
  "yapisal-editorluk": () => import("@/app/editorler-icin/egitim/yapisal-editorluk/page"),
  "dil-ve-anlatim-editorlugu": () => import("@/app/editorler-icin/egitim/dil-ve-anlatim-editorlugu/page"),
  "tur-editorlugu": () => import("@/app/editorler-icin/egitim/tur-editorlugu/page"),
  "editor-notu-ve-geri-bildirim": () => import("@/app/editorler-icin/egitim/editor-notu-ve-geri-bildirim/page"),
  "yazarla-calismak": () => import("@/app/editorler-icin/egitim/yazarla-calismak/page"),
  "yayincilik-ve-profesyonel-editorluk": () => import("@/app/editorler-icin/egitim/yayincilik-ve-profesyonel-editorluk/page"),
} as const;

type LessonSlug = keyof typeof lessonLoaders;

export async function getEditorEducationSourcePageTree(categorySlug: string): Promise<ReactNode | null> {
  const category = getEditorEducationCategory(categorySlug);
  if (!category || !(category.slug in lessonLoaders)) return null;
  const loader = lessonLoaders[category.slug as LessonSlug];
  const lessonModule = await loader();
  return lessonModule.default();
}

export async function getEditorEducationSourceTree(categorySlug: string): Promise<ReactNode | null> {
  const tree = await getEditorEducationSourcePageTree(categorySlug);
  if (!tree || !isValidElement(tree)) return null;
  const element = tree as ReactElement<{ children?: ReactNode }>;
  return element.props.children ?? null;
}
