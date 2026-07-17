import { Card } from "@/components/ui/Card";
import { dashboardContent } from "@/content";
import { NewWorkFlow } from "@/features/writer/components/NewWorkFlow";
import { ArchiveWorkButton } from "@/features/works/components/ArchiveWorkButton";
import type { WorkWithChapterSummary } from "@/features/works/types";
import { ProgressBar } from "./ProgressBar";

type BookCardProps = {
  coverVariant: "one" | "two" | "three";
  work: WorkWithChapterSummary;
};

function workProgress(work: WorkWithChapterSummary) {
  if (work.status === "published" || work.status === "completed") return 100;
  if (work.status === "draft") return work.totalWords > 0 ? 15 : 5;
  return Math.min(95, Math.max(20, Math.round(work.totalWords / 100)));
}

export function BookCard({ coverVariant, work }: BookCardProps) {
  const progress = workProgress(work);
  return (
    <Card className="book-card" variant="hover">
      <div className={`book-cover book-cover--${coverVariant}`} aria-hidden="true">
        <span className="book-cover__ornament">✦</span>
        <strong>{work.title}</strong>
        <small>{dashboardContent.brandName}</small>
      </div>
      <div className="book-card__content">
        <p className="book-card__genre">{work.genre}</p>
        <h3>{work.title}</h3>
        <div className="book-card__status-row">
          <span className="status-badge">{dashboardContent.statusLabels[work.status]}</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} label={`${work.title} ilerleme durumu`} />
        <div className="book-card__actions">
          <NewWorkFlow initialWork={work} triggerLabel={dashboardContent.edit} />
          <ArchiveWorkButton workId={work.id} />
        </div>
      </div>
    </Card>
  );
}
