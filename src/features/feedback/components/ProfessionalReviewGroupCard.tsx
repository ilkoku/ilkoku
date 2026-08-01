import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { feedbackContent } from "@/content";
import type {
  FeedbackItem,
  ProfessionalReviewGroup,
} from "../types";

type Props = {
  group: ProfessionalReviewGroup;
  onDetail: (group: ProfessionalReviewGroup) => void;
  onRead: (group: ProfessionalReviewGroup) => void;
  pending: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function stageOrder(item: FeedbackItem) {
  if (item.reviewStage === "first") return 1;
  if (item.reviewStage === "second") return 2;
  return 3;
}

function stageLabel(item: FeedbackItem) {
  if (item.reviewStage === "first") return "1. Editör Raporu";
  if (item.reviewStage === "second") return "2. Editör Raporu";
  return "Profesyonel Editör Raporu";
}

export function ProfessionalReviewGroupCard({
  group,
  onDetail,
  onRead,
  pending,
}: Props) {
  const reports = [...group.reports].sort(
    (first, second) => stageOrder(first) - stageOrder(second),
  );

  const hasSecondReport = reports.some(
    (report) => report.reviewStage === "second",
  );

  return (
    <Card
      className="feedback-entry feedback-professional-group"
      data-unread={group.status === "unread"}
    >
      <div className="feedback-entry__topline">
        <div className="feedback-entry__identity">
          <span
            className="feedback-entry__avatar feedback-professional-group__avatar"
            aria-hidden="true"
          >
            {hasSecondReport ? 2 : 1}
          </span>

          <div>
            <strong>İlkOku Profesyonel İnceleme</strong>
            <span>
              {hasSecondReport
                ? "Bağımsız iki editör değerlendirmesi"
                : "Profesyonel editör değerlendirmesi"}
            </span>
          </div>
        </div>

        <time dateTime={group.createdAt}>
          {formatDate(group.createdAt)}
        </time>
      </div>

      <div className="feedback-entry__badges">
        <span>
          {hasSecondReport
            ? "İki Aşamalı Rapor"
            : "1. Editör Raporu"}
        </span>

        {group.priority === "important" && (
          <span data-priority="important">
            {feedbackContent.priority.important}
          </span>
        )}

        <span data-status={group.status}>
          {feedbackContent.status[group.status]}
        </span>
      </div>

      <div className="feedback-entry__body">
        <p className="feedback-entry__context">
          <strong>{group.work.title}</strong>
          <span>·</span>
          Profesyonel inceleme sonucu
        </p>

        <h2>
          {hasSecondReport
            ? "İki Bağımsız Editör Raporu"
            : "Profesyonel Editör İnceleme Raporu"}
        </h2>

        <div className="feedback-professional-group__reports">
          {reports.map((report) => (
            <article key={report.id}>
              <span>{stageLabel(report)}</span>
              <strong>{report.title}</strong>
              <p>{report.content}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="feedback-entry__actions">
        <Button
          onClick={() => onDetail(group)}
          variant="secondary"
        >
          {hasSecondReport
            ? "İki Raporu Görüntüle"
            : "Raporu Görüntüle"}
        </Button>

        <Link className="button button--ghost" href="/eserlerim">
          {feedbackContent.actions.openWork}
        </Link>

        {group.status === "unread" && (
          <Button
            disabled={pending}
            onClick={() => onRead(group)}
            variant="ghost"
          >
            {feedbackContent.actions.markRead}
          </Button>
        )}

      </div>
    </Card>
  );
}
