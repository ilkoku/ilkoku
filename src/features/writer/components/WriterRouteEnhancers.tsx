import { WriterBookStructureRefreshBoundary } from "./WriterBookStructureRefreshBoundary";
import { WriterBookTrashEnhancer } from "./WriterBookTrashEnhancer";
import { WriterClassificationStatsEnhancer } from "./WriterClassificationStatsEnhancer";
import { WriterEditingTools } from "./WriterEditingTools";
import { WriterFullBookPublicationEnhancer } from "./WriterFullBookPublicationEnhancer";
import { WriterFullBookPublicationSubmitBridge } from "./WriterFullBookPublicationSubmitBridge";
import { WriterPagedManuscriptEnhancer } from "./WriterPagedManuscriptEnhancer";
import { WriterPublishExperienceEnhancer } from "./WriterPublishExperienceEnhancer";
import { WriterPublishFeedbackBridge } from "./WriterPublishFeedbackBridge";
import { WriterRichTextFormattingTools } from "./WriterRichTextFormattingTools";
import { WriterTextEditingCommands } from "./WriterTextEditingCommands";

export function WriterRouteEnhancers({
  includePublishFeedback = false,
}: {
  includePublishFeedback?: boolean;
}) {
  return (
    <>
      <WriterEditingTools />
      <WriterRichTextFormattingTools />
      <WriterTextEditingCommands />
      <WriterPagedManuscriptEnhancer />
      <WriterPublishExperienceEnhancer />
      {includePublishFeedback ? <WriterPublishFeedbackBridge /> : null}
      <WriterFullBookPublicationSubmitBridge />
      <WriterFullBookPublicationEnhancer />
      <WriterBookStructureRefreshBoundary />
      <WriterBookTrashEnhancer />
      <WriterClassificationStatsEnhancer />
    </>
  );
}
