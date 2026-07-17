import { Card } from "@/components/ui/Card";
import { feedbackContent } from "@/content";
import type { FeedbackStatsData } from "../types";

export function FeedbackStats({ stats }: { stats: FeedbackStatsData }) {
  const items = [
    [feedbackContent.stats.unread, stats.unread],
    [feedbackContent.stats.total, stats.total],
    [feedbackContent.stats.important, stats.important],
    [feedbackContent.stats.archived, stats.archived],
  ] as const;
  return (
    <section className="feedback-stats" aria-label={feedbackContent.title}>
      {items.map(([label, value]) => <Card className="feedback-stat" key={label}><span>{label}</span><strong>{value}</strong></Card>)}
    </section>
  );
}
