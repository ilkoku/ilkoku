import type { PublisherSubmissionTimelineEvent } from "../types";

const eventLabel = {
  contract_requested: "Sözleşme",
  decision_changed: "Karar",
  internal_note: "İç not",
  review_started: "İnceleme",
  submitted: "Başvuru",
} as const;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function PublisherTimeline({ events }: { events: PublisherSubmissionTimelineEvent[] }) {
  return (
    <ol className="publisher-timeline">
      {events.map((event) => (
        <li data-type={event.type} key={event.id}>
          <div className="publisher-timeline__marker" aria-hidden="true" />
          <div className="publisher-timeline__content">
            <div className="publisher-timeline__meta">
              <span>{eventLabel[event.type]}</span>
              <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
            </div>
            <h3>{event.title}</h3>
            {event.detail ? <p>{event.detail}</p> : null}
            {event.actorName ? <small>İşlemi yapan: {event.actorName}</small> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
