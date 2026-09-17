import { WriterBookStructureRefreshBoundary } from "@/features/writer/components/WriterBookStructureRefreshBoundary";
import { WriterBookTrashEnhancer } from "@/features/writer/components/WriterBookTrashEnhancer";
import { WriterClassificationStatsEnhancer } from "@/features/writer/components/WriterClassificationStatsEnhancer";
import { WriterEditingTools } from "@/features/writer/components/WriterEditingTools";
import { WriterFullBookPublicationEnhancer } from "@/features/writer/components/WriterFullBookPublicationEnhancer";
import { WriterFullBookPublicationSubmitBridge } from "@/features/writer/components/WriterFullBookPublicationSubmitBridge";
import { WriterLiveFormattingLayer } from "@/features/writer/components/WriterLiveFormattingLayer";
import { WriterPagedManuscriptEnhancer } from "@/features/writer/components/WriterPagedManuscriptEnhancer";
import { WriterPublishExperienceEnhancer } from "@/features/writer/components/WriterPublishExperienceEnhancer";
import { WriterRichTextFormattingTools } from "@/features/writer/components/WriterRichTextFormattingTools";
import { WriterTextEditingCommands } from "@/features/writer/components/WriterTextEditingCommands";
import "@/features/writer/writer-paper-experience.css";
import "@/features/writer/writer-brand-purple.css";
import "@/styles/light-purple-route-fallback.css";
import "@/features/writer/writer-editor-density.css";
import "@/features/writer/writer-editing-tools.css";
import "@/features/writer/writer-text-editing-commands.css";
import "@/features/writer/writer-rich-text-formatting.css";
import "@/features/writer/writer-live-formatting-layer.css";
import "@/features/writer/writer-toolbar-wrap.css";
import "@/features/writer/writer-paged-manuscript.css";
import "@/features/writer/writer-publish-experience.css";
import "@/features/writer/writer-publish-review-contrast.css";
import "@/features/writer/writer-book-structure.css";
import "@/features/writer/writer-sidebar-regressions.css";
import "@/features/writer/writer-book-trash.css";
import "@/features/writer/writer-classification-stats.css";
import "@/features/writer/writer-mobile-regressions.css";

export default function WriterDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <WriterEditingTools />
      <WriterRichTextFormattingTools />
      <WriterLiveFormattingLayer />
      <WriterTextEditingCommands />
      <WriterPagedManuscriptEnhancer />
      <WriterPublishExperienceEnhancer />
      <WriterFullBookPublicationSubmitBridge />
      <WriterFullBookPublicationEnhancer />
      <WriterBookStructureRefreshBoundary />
      <WriterBookTrashEnhancer />
      <WriterClassificationStatsEnhancer />
    </>
  );
}
