"use client";

import "../publishers.css";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { publishersContent } from "@/content";
import { withdrawPublisherSubmissionAction } from "../actions";
import type { PublisherFilter, PublisherItem, SubmissionItem, SubmissionWork } from "../types";
import { PublisherDialog } from "./PublisherDialog";

type SubmissionTab = keyof typeof publishersContent.tabs;
const initials = (name: string) => name.split(" ").slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("tr-TR");
const formatDate = (value: string) => new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
const formatMoney = (value: string | null) => {
  if (!value) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat("tr-TR", { currency: "TRY", style: "currency" }).format(amount);
};

const contractStatusLabels = {
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  sent: "Yazara gönderildi",
} as const;

const publicationStatusLabels = {
  distribution: "Dağıtım",
  planning: "Planlama",
  preproduction: "Ön hazırlık",
  production: "Üretim",
  published: "Yayımlandı",
} as const;

const taskStatusLabels = {
  completed: "Tamamlandı",
  in_progress: "Devam ediyor",
  not_started: "Başlamadı",
} as const;

function EmptyStateIcon({ type }: { type: "publisher" | "submission" }) {
  return (
    <span className="publisher-empty__icon" aria-hidden="true">
      {type === "publisher" ? (
        <svg viewBox="0 0 48 48" role="img"><path d="M7 19h34M10 19v20m7-20v20m7-20v20m7-20v20m7-20v20M6 40h36M9 14l15-7 15 7v5H9v-5Z" /></svg>
      ) : (
        <svg viewBox="0 0 48 48" role="img"><path d="M10 9h20l8 8v22H10V9Zm20 0v8h8M16 24h16M16 30h12" /></svg>
      )}
    </span>
  );
}

export function PublisherWorkspace({
  focusedSubmissionId = null,
  initialPublishers,
  initialSubmissions,
  works,
}: {
  focusedSubmissionId?: string | null;
  initialPublishers: PublisherItem[];
  initialSubmissions: SubmissionItem[];
  works: SubmissionWork[];
}) {
  const [publishers] = useState(initialPublishers);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PublisherFilter>("all");
  const [tab, setTab] = useState<SubmissionTab>("all");
  const [selected, setSelected] = useState<PublisherItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();
  const appliedIds = useMemo(() => new Set(submissions.filter((item) => item.status !== "withdrawn" && item.status !== "rejected").map((item) => item.publisher.id)), [submissions]);
  const filteredPublishers = useMemo(() => publishers.filter((publisher) => publisher.companyName.toLocaleLowerCase("tr-TR").includes(query.trim().toLocaleLowerCase("tr-TR"))).filter((publisher) => filter === "all" ? true : filter === "available" ? publisher.acceptsSubmissions : appliedIds.has(publisher.id)), [appliedIds, filter, publishers, query]);
  const filteredSubmissions = useMemo(() => submissions.filter((item) => tab === "all" || item.status === tab), [submissions, tab]);
  const activeCount = submissions.filter((item) => ["pending", "reviewing", "accepted"].includes(item.status)).length;
  const closeDialog = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (!focusedSubmissionId) return;
    const element = document.getElementById(`submission-${focusedSubmissionId}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus({ preventScroll: true });
  }, [focusedSubmissionId]);

  function withdraw(id: string) {
    if (!window.confirm(publishersContent.withdrawConfirm)) return;
    setPendingId(id); setMessage("");
    startTransition(async () => {
      const response = await withdrawPublisherSubmissionAction(id);
      setMessage(response.message);
      if (response.status === "success") setSubmissions((items) => items.map((item) => item.id === id ? { ...item, status: "withdrawn", updatedAt: new Date().toISOString() } : item));
      setPendingId(null);
    });
  }

  return <div className="publishers-workspace">
    <header className="publishers-hero"><p>{publishersContent.eyebrow}</p><h1>{publishersContent.title}</h1><span>{publishersContent.description}</span></header>
    <section className="publishers-stats" aria-label="Yayınevi özeti"><Card><span>{publishersContent.stats.publishers}</span><strong>{publishers.length}</strong></Card><Card><span>{publishersContent.stats.active}</span><strong>{activeCount}</strong></Card></section>
    <section className="publishers-controls" aria-label={publishersContent.filterLabel}>
      <label><span>{publishersContent.searchLabel}</span><input onChange={(event) => setQuery(event.target.value)} placeholder={publishersContent.searchPlaceholder} type="search" value={query} /></label>
      <div className="publishers-filter" role="group" aria-label={publishersContent.filterLabel}>{(Object.keys(publishersContent.filters) as PublisherFilter[]).map((value) => <button aria-pressed={filter === value} key={value} onClick={() => setFilter(value)} type="button">{publishersContent.filters[value]}</button>)}</div>
    </section>
    {filteredPublishers.length ? <section className="publisher-grid" aria-label={publishersContent.title}>{filteredPublishers.map((publisher) => <Card className="publisher-card" key={publisher.id} variant="hover"><div className="publisher-card__top"><span className="publisher-card__logo">{initials(publisher.companyName)}</span><div><h2>{publisher.companyName}</h2><span>✓ {publishersContent.verified}</span></div></div><p>{publisher.description ?? "Yayınevi tanıtım metni yakında eklenecek."}</p><div className="publisher-card__meta"><span>{publishersContent.accepts}</span>{publisher.websiteUrl && <a href={publisher.websiteUrl} rel="noopener noreferrer" target="_blank">{publishersContent.website}</a>}</div><Button disabled={!publisher.acceptsSubmissions || appliedIds.has(publisher.id) || works.length === 0} onClick={() => setSelected(publisher)}>{appliedIds.has(publisher.id) ? publishersContent.applied : publishersContent.apply}</Button></Card>)}</section> : <Card className="publisher-empty"><EmptyStateIcon type="publisher" /><h2>{publishersContent.noPublishersTitle}</h2><p>{publishersContent.noPublishersDescription}</p></Card>}
    <section className="submissions-section">
      <header><div><p>{publishersContent.eyebrow}</p><h2>{publishersContent.submissionsTitle}</h2><span>{publishersContent.submissionsDescription}</span></div></header>
      <div className="submission-tabs" role="tablist">{(Object.keys(publishersContent.tabs) as SubmissionTab[]).map((value) => <button aria-selected={tab === value} key={value} onClick={() => setTab(value)} role="tab" type="button">{publishersContent.tabs[value]}</button>)}</div>
      {message && <p className="publisher-message" role="status">{message}</p>}
      {filteredSubmissions.length ? <div className="submission-list">{filteredSubmissions.map((item) => (
        <article id={`submission-${item.id}`} key={item.id} tabIndex={-1}>
          <Card className="submission-card">
            <div><span>{item.publisher.companyName}</span><h3>{item.work.title}</h3></div>
            <dl>
              <div><dt>Durum</dt><dd data-status={item.status}>{publishersContent.statuses[item.status]}</dd></div>
              <div><dt>Gönderim</dt><dd>{formatDate(item.submittedAt)}</dd></div>
              <div><dt>Son güncelleme</dt><dd>{formatDate(item.updatedAt)}</dd></div>
            </dl>
            <p>{item.coverLetter}</p>
            {item.publisherNote && <blockquote>{item.publisherNote}</blockquote>}

            {item.contract ? (
              <section aria-label="Yayınevi sözleşmesi">
                <h4>Sözleşme · Sürüm {item.contract.version}</h4>
                <dl>
                  <div><dt>Durum</dt><dd>{contractStatusLabels[item.contract.status]}</dd></div>
                  <div><dt>Telif</dt><dd>%{item.contract.royaltyPercentage}</dd></div>
                  {item.contract.advanceAmount ? <div><dt>Avans</dt><dd>{formatMoney(item.contract.advanceAmount)}</dd></div> : null}
                  <div><dt>Hak süresi</dt><dd>{item.contract.rightsPeriodMonths} ay</dd></div>
                  <div><dt>Hak alanı</dt><dd>{item.contract.territory}</dd></div>
                  {item.contract.sentAt ? <div><dt>Gönderim</dt><dd>{formatDate(item.contract.sentAt)}</dd></div> : null}
                </dl>
                {item.contract.notes ? <p>{item.contract.notes}</p> : null}
              </section>
            ) : null}

            {item.publicationPlan ? (
              <section aria-label="Yayın planı">
                <h4>Yayın planı</h4>
                <dl>
                  <div><dt>Aşama</dt><dd>{publicationStatusLabels[item.publicationPlan.status]}</dd></div>
                  {item.publicationPlan.targetPublicationDate ? <div><dt>Hedef yayın</dt><dd>{formatDate(item.publicationPlan.targetPublicationDate)}</dd></div> : null}
                  {item.publicationPlan.isbn ? <div><dt>ISBN</dt><dd>{item.publicationPlan.isbn}</dd></div> : null}
                  {item.publicationPlan.printRun ? <div><dt>Baskı adedi</dt><dd>{item.publicationPlan.printRun.toLocaleString("tr-TR")}</dd></div> : null}
                  <div><dt>Kapak</dt><dd>{taskStatusLabels[item.publicationPlan.coverStatus]}</dd></div>
                  <div><dt>Mizanpaj</dt><dd>{taskStatusLabels[item.publicationPlan.layoutStatus]}</dd></div>
                </dl>
                {item.publicationPlan.notes ? <p>{item.publicationPlan.notes}</p> : null}
              </section>
            ) : null}

            {["pending", "reviewing"].includes(item.status) && <Button loading={pendingId === item.id} onClick={() => withdraw(item.id)} variant="outline">{publishersContent.withdraw}</Button>}
          </Card>
        </article>
      ))}</div> : <Card className="publisher-empty"><EmptyStateIcon type="submission" /><h2>{publishersContent.noSubmissionsTitle}</h2><p>{publishersContent.noSubmissionsDescription}</p></Card>}
    </section>
    {selected && <PublisherDialog onClose={closeDialog} publisher={selected} works={works} />}
  </div>;
}
