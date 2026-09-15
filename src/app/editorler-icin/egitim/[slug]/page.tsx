import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorEducationPage } from "@/components/content/EditorEducationPage";
import {
  EDITOR_EDUCATION_CATEGORIES,
  editorEducationPublicPath,
  getEditorEducationCategory,
} from "@/lib/editor-education";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return EDITOR_EDUCATION_CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getEditorEducationCategory(slug);
  if (!category) {
    return { title: "Eğitim bulunamadı | İlkOku", robots: { index: false, follow: false } };
  }

  const canonical = `https://ilkoku.com${editorEducationPublicPath(category)}`;
  return {
    title: category.seoTitle,
    description: category.seoDescription,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title: category.seoTitle,
      description: category.seoDescription,
      type: "article",
      locale: "tr_TR",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: category.seoTitle,
      description: category.seoDescription,
    },
  };
}

export default async function EditorEducationRoute({ params }: PageProps) {
  const { slug } = await params;
  const category = getEditorEducationCategory(slug);
  if (!category) notFound();

  return <EditorEducationPage category={category} />;
}
