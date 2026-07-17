import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { editorsContent, tr } from "@/content";

export const dynamic = "force-dynamic";
import { EditorProfile } from "@/features/editors/components/EditorProfile";
import { editors, findEditorBySlug } from "@/features/editors/data";

interface EditorProfilePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return editors.map((editor) => ({ slug: editor.slug }));
}

export async function generateMetadata({ params }: EditorProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const editor = findEditorBySlug(slug);

  if (!editor) return { title: `${editorsContent.notFoundTitle} | ${tr.brand.name}` };

  return {
    title: `${editor.name} — ${editor.title} | ${tr.brand.name}`,
    description: editorsContent.profileDescription(editor.name),
  };
}

export default async function EditorProfilePage({ params }: EditorProfilePageProps) {
  const { slug } = await params;
  const editor = findEditorBySlug(slug);

  if (!editor) notFound();

  return <EditorProfile editor={editor} />;
}
