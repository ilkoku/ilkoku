import { Card } from "@/components/ui/Card";
import { feedbackContent } from "@/content";

export function FeedbackEmptyState({ filtered = false }: { filtered?: boolean }) {
  return (
    <Card className="feedback-empty">
      <span aria-hidden="true">✦</span>
      <h2>{feedbackContent.empty.title}</h2>
      <p>{filtered ? feedbackContent.empty.filtered : feedbackContent.empty.description}</p>
    </Card>
  );
}
