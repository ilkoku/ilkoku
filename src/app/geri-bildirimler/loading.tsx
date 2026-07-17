import { Brand } from "@/components/ui/Brand";
import { feedbackContent } from "@/content";

export default function FeedbackLoading() {
  return <main className="feedback-loading"><div><Brand /><p role="status">{feedbackContent.labels.loading}</p></div></main>;
}
