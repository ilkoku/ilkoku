"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { feedbackContent } from "@/content";
import { archiveFeedbackAction, markFeedbackReadAction } from "../actions/feedback.actions";
import type { FeedbackItem, FeedbackOrder, FeedbackTab } from "../types";
import { FeedbackCard } from "./FeedbackCard";
import { FeedbackDetailDialog } from "./FeedbackDetailDialog";
import { FeedbackEmptyState } from "./FeedbackEmptyState";
import { FeedbackStats } from "./FeedbackStats";

export function FeedbackWorkspace({ initialItems }: { initialItems: FeedbackItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [tab, setTab] = useState<FeedbackTab>("unread");
  const [workId, setWorkId] = useState("all");
  const [category, setCategory] = useState("all");
  const [order, setOrder] = useState<FeedbackOrder>("newest");
  const [importantOnly, setImportantOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const stats = {
    archived: items.filter((item) => item.status === "archived").length,
    important: items.filter((item) => item.priority === "important" && item.status !== "archived").length,
    total: items.filter((item) => item.status !== "archived").length,
    unread: items.filter((item) => item.status === "unread").length,
  };
  const works = useMemo(() => [...new Map(items.map((item) => [item.work.id, item.work])).values()], [items]);

  const filteredItems = useMemo(() => items
    .filter((item) => tab === "archived" ? item.status === "archived" : tab === "unread" ? item.status === "unread" : item.status !== "archived")
    .filter((item) => workId === "all" || item.work.id === workId)
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => !importantOnly || item.priority === "important")
    .sort((a, b) => order === "newest" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)),
  [category, importantOnly, items, order, tab, workId]);

  const closeDetail = useCallback(() => setSelectedId(null), []);

  function updateStatus(id: string, status: "read" | "archived") {
    setPendingId(id);
    setMessage("");
    startTransition(async () => {
      const response = status === "read" ? await markFeedbackReadAction(id) : await archiveFeedbackAction(id);
      setMessage(response.message);
      if (response.status === "success") {
        const now = new Date().toISOString();
        setItems((current) => current.map((item) => item.id === id ? {
          ...item,
          archivedAt: status === "archived" ? now : item.archivedAt,
          readAt: status === "read" ? now : item.readAt,
          status,
        } : item));
        if (status === "archived") setSelectedId(null);
      }
      setPendingId(null);
    });
  }

  function openDetail(item: FeedbackItem) {
    setSelectedId(item.id);
    if (item.status === "unread" && pendingId !== item.id) updateStatus(item.id, "read");
  }

  return (
    <div className="feedback-workspace">
      <header className="feedback-hero">
        <p>{feedbackContent.eyebrow}</p>
        <h1>{feedbackContent.title}</h1>
        <span>{feedbackContent.description}</span>
      </header>
      <FeedbackStats stats={stats} />

      <section className="feedback-controls" aria-label={feedbackContent.filters.area}>
        <div className="feedback-tabs" role="tablist" aria-label={feedbackContent.title}>
          {(["unread", "all", "archived"] as const).map((value) => (
            <button aria-selected={tab === value} key={value} onClick={() => setTab(value)} role="tab" type="button">
              {feedbackContent.tabs[value]}
            </button>
          ))}
        </div>
        <div className="feedback-filters">
          <label><span>{feedbackContent.filters.work}</span><select value={workId} onChange={(event) => setWorkId(event.target.value)}><option value="all">{feedbackContent.filters.allWorks}</option>{works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}</select></label>
          <label><span>{feedbackContent.filters.category}</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">{feedbackContent.filters.allCategories}</option>{Object.entries(feedbackContent.categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>{feedbackContent.filters.order}</span><select value={order} onChange={(event) => setOrder(event.target.value as FeedbackOrder)}><option value="newest">{feedbackContent.filters.newest}</option><option value="oldest">{feedbackContent.filters.oldest}</option></select></label>
          <label className="feedback-important"><input checked={importantOnly} onChange={(event) => setImportantOnly(event.target.checked)} type="checkbox" /><span>{feedbackContent.filters.importantOnly}</span></label>
        </div>
      </section>

      {message && <p className="feedback-message" role="status">{message}</p>}
      {filteredItems.length > 0 ? (
        <section className="feedback-list-grid" aria-label={feedbackContent.labels.list}>
          {filteredItems.map((item) => <FeedbackCard item={item} key={item.id} onArchive={(id) => updateStatus(id, "archived")} onDetail={openDetail} onRead={(id) => updateStatus(id, "read")} pending={pendingId === item.id} />)}
        </section>
      ) : <FeedbackEmptyState filtered={items.length > 0} />}

      {selected && <FeedbackDetailDialog key={selected.id} item={selected} onClose={closeDetail} />}
    </div>
  );
}
