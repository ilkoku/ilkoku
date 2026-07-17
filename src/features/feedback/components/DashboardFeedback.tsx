import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { feedbackContent } from "@/content";
import type { FeedbackItem } from "../types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(new Date(value));
}

export function DashboardFeedback({ items, unreadCount }: { items: FeedbackItem[]; unreadCount: number }) {
  return (
    <section className="dashboard-section" aria-labelledby="feedback-title">
      <div className="section-heading">
        <div><p>{feedbackContent.dashboard.eyebrow}</p><h2 id="feedback-title">{feedbackContent.dashboard.title}</h2></div>
        <span>{unreadCount} {feedbackContent.dashboard.unreadSuffix}</span>
      </div>
      <Card className="feedback-card">
        {items.length > 0 ? <ul className="feedback-list">{items.map((item) => (
          <li className="feedback-item" key={item.id}>
            <span className="feedback-item__avatar" aria-hidden="true">{item.editorName.slice(0, 1).toLocaleUpperCase("tr")}</span>
            <div className="feedback-item__content"><div className="feedback-item__meta"><strong>{item.editorName}</strong><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div><p>{item.title} · {item.work.title}</p></div>
          </li>
        ))}</ul> : <p className="dashboard-empty-copy">{feedbackContent.empty.dashboard}</p>}
        <Link className="dashboard-feedback-link" href="/geri-bildirimler">{feedbackContent.actions.viewAll}</Link>
      </Card>
    </section>
  );
}
