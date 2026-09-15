import { redirect } from "next/navigation";

import { EDITOR_EDUCATION_CATEGORIES, editorEducationPublicPath } from "@/lib/editor-education";

export default function EditorEducationIndexPage() {
  redirect(editorEducationPublicPath(EDITOR_EDUCATION_CATEGORIES[0]));
}
