import { dashboardContent } from "@/content";
import type { Feedback } from "../types";

type FeedbackListProps = {
  items: readonly Feedback[];
};

export function FeedbackList({ items }: FeedbackListProps) {
  return (
    <ul className="feedback-list" aria-label={dashboardContent.feedbackListLabel}>
      {items.map((item) => (
        <li className="feedback-item" key={item.id}>
          <div className="feedback-item__avatar" aria-hidden="true">{item.initials}</div>
          <div className="feedback-item__content">
            <div className="feedback-item__meta">
              <strong>{item.editor}</strong>
              <time>{item.date}</time>
            </div>
            <p>{item.comment}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
