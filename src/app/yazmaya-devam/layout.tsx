import { WriterBookStructureRefreshBoundary } from "@/features/writer/components/WriterBookStructureRefreshBoundary";
import { WriterBookTrashEnhancer } from "@/features/writer/components/WriterBookTrashEnhancer";
import { WriterClassificationStatsEnhancer } from "@/features/writer/components/WriterClassificationStatsEnhancer";
import { WriterEditingTools } from "@/features/writer/components/WriterEditingTools";
import { WriterPagedManuscriptEnhancer } from "@/features/writer/components/WriterPagedManuscriptEnhancer";
import { WriterPublicationSnapshotGuard } from "@/features/writer/components/WriterPublicationSnapshotGuard";
import "@/features/writer/writer-paper-experience.css";
import "@/features/writer/writer-brand-purple.css";
import "@/styles/light-purple-route-fallback.css";
import "@/features/writer/writer-editor-density.css";
import "@/features/writer/writer-editing-tools.css";
import "@/features/writer/writer-paged-manuscript.css";
import "@/features/writer/writer-book-structure.css";
import "@/features/writer/writer-sidebar-regressions.css";
import "@/features/writer/writer-book-trash.css";
import "@/features/writer/writer-classification-stats.css";

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
      <WriterPublicationSnapshotGuard />
      <WriterBookStructureRefreshBoundary />
      <WriterBookTrashEnhancer />
      <WriterClassificationStatsEnhancer />
    </>
  );
}
