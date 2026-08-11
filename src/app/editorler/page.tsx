import type { Metadata } from "next";
import { editorsContent } from "@/content";
import { EditorDirectory } from "@/features/editors/components/EditorDirectory";

export const metadata: Metadata = {
  title: editorsContent.metadataTitle,
  description: editorsContent.metadataDescription,
  alternates: {
    canonical: "/editorler",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/editorler",
    title: editorsContent.metadataTitle,
    description: editorsContent.metadataDescription,
  },
};
export const dynamic = "force-dynamic";

export default function EditorsPage() {
  return <EditorDirectory />;
}
