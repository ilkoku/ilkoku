import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { feedbackContent } from "@/content";
import type { FeedbackItem } from "../types";

type Props = {
  item: FeedbackItem;
  pending: boolean;
  onArchive: (id: string) => void;
  onDetail: (item: FeedbackItem) => void;
  onRead: (id: string) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

export function FeedbackCard({ item, onArchive, onDetail, onRead, pending }: Props) {
  const locationLabel = item.chapter?.title ?? feedbackContent.labels.workGeneral;
  return (
    <Card className="feedback-entry" data-unread={item.status === "unread"}>
      <div className="feedback-entry__topline">
        <div className="feedback-entry__identity">
          <span className="feedback-entry__avatar" aria-hidden="true">{item.editorName.slice(0, 1).toLocaleUpperCase("tr")}</span>
          <div><strong>{item.editorName}</strong><span>{feedbackContent.labels.editorNote}</span></div>
        </div>
        <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
      </div>
      <div className="feedback-entry__badges">
        <span>{feedbackContent.categories[item.category]}</span>
        {item.priority === "important" && <span data-priority="important">{feedbackContent.priority.important}</span>}
        <span data-status={item.status}>{feedbackContent.status[item.status]}</span>
      </div>
      <div className="feedback-entry__body">
        <p className="feedback-entry__context"><strong>{item.work.title}</strong><span>·</span>{locationLabel}</p>
        <h2>{item.title}</h2>
        <p className="feedback-entry__summary">{item.content}</p>
      </div>
      <div className="feedback-entry__actions">
        <Button onClick={() => onDetail(item)} variant="secondary">{feedbackContent.actions.detail}</Button>
        <Link className="button button--ghost" href={item.chapter ? `/yazmaya-devam?eser=${item.work.id}&bolum=${item.chapter.id}` : "/eserlerim"}>
          {item.chapter ? feedbackContent.actions.openChapter : feedbackContent.actions.openWork}
        </Link>
        {item.status === "unread" && <Button disabled={pending} onClick={() => onRead(item.id)} variant="ghost">{feedbackContent.actions.markRead}</Button>}
        {item.status === "read" && <Button disabled={pending} onClick={() => onArchive(item.id)} variant="ghost">{feedbackContent.actions.archive}</Button>}
      </div>
    </Card>
  );
}
