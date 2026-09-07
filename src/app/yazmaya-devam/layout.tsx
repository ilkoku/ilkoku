import { WriterBookStructureEnhancer } from "@/features/writer/components/WriterBookStructureEnhancer";
import { WriterEditingTools } from "@/features/writer/components/WriterEditingTools";
import { WriterPagedManuscriptEnhancer } from "@/features/writer/components/WriterPagedManuscriptEnhancer";
import "@/features/writer/writer-paper-experience.css";
import "@/features/writer/writer-brand-purple.css";
import "@/styles/light-purple-route-fallback.css";
import "@/features/writer/writer-editor-density.css";
import "@/features/writer/writer-editing-tools.css";
import "@/features/writer/writer-paged-manuscript.css";
import "@/features/writer/writer-book-structure.css";
import "@/features/writer/writer-sidebar-regressions.css";

export default function ContinueWritingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <WriterEditingTools />
      <WriterPagedManuscriptEnhancer />
      <WriterBookStructureEnhancer />
    </>
  );
}
