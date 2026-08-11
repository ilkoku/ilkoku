import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { editorsContent, tr } from "@/content";
import { EditorProfile } from "@/features/editors/components/EditorProfile";
import { editors, findEditorBySlug } from "@/features/editors/data";

export const dynamic = "force-dynamic";

interface EditorProfilePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return editors.map((editor) => ({ slug: editor.slug }));
}

export async function generateMetadata({ params }: EditorProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const editor = findEditorBySlug(slug);

  if (!editor) {
    return {
      title: `${editorsContent.notFoundTitle} | ${tr.brand.name}`,
      robots: { index: false, follow: false },
    };
  }

  const title = `${editor.name} — ${editor.title} | ${tr.brand.name}`;
  const description = editorsContent.profileDescription(editor.name);
  const canonical = `/editorler/${editor.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "profile",
      locale: "tr_TR",
      url: canonical,
      title,
      description,
    },
  };
}

export default async function EditorProfilePage({ params }: EditorProfilePageProps) {
  const { slug } = await params;
  const editor = findEditorBySlug(slug);

  if (!editor) notFound();

  return <EditorProfile editor={editor} />;
}
