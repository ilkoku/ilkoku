"use client";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import { feedbackContent } from "@/content";
import {
  archiveFeedbackAction,
  archiveFeedbackGroupAction,
  markFeedbackGroupReadAction,
  markFeedbackReadAction,
} from "../actions/feedback.actions";
import type {
  FeedbackItem,
  FeedbackOrder,
  FeedbackStatus,
  FeedbackTab,
  ProfessionalReviewGroup,
} from "../types";
import { FeedbackCard } from "./FeedbackCard";
import { FeedbackDetailDialog } from "./FeedbackDetailDialog";
import { FeedbackEmptyState } from "./FeedbackEmptyState";
import { FeedbackStats } from "./FeedbackStats";
import { ProfessionalReviewGroupCard } from "./ProfessionalReviewGroupCard";
import { ProfessionalReviewGroupDialog } from "./ProfessionalReviewGroupDialog";

type Selection =
  | {
      id: string;
      type: "item";
    }
  | {
      id: string;
      type: "group";
    }
  | null;

type DisplayEntry =
  | {
      createdAt: string;
      item: FeedbackItem;
      type: "item";
    }
  | {
      createdAt: string;
      group: ProfessionalReviewGroup;
      type: "group";
    };

function professionalGroupStatus(
  reports: FeedbackItem[],
): FeedbackStatus {
  if (
    reports.length > 0 &&
    reports.every((report) => report.status === "archived")
  ) {
    return "archived";
  }

  if (reports.some((report) => report.status === "unread")) {
    return "unread";
  }

  return "read";
}

function createProfessionalGroups(
  items: FeedbackItem[],
): ProfessionalReviewGroup[] {
  const grouped = new Map<string, FeedbackItem[]>();

  for (const item of items) {
    if (!item.isProfessionalReview) continue;

    const current = grouped.get(item.work.id) ?? [];
    current.push(item);
    grouped.set(item.work.id, current);
  }

  return [...grouped.entries()].map(([workId, reports]) => {
    const sortedReports = [...reports].sort((first, second) =>
      first.createdAt.localeCompare(second.createdAt),
    );

    const newestCreatedAt = sortedReports.reduce(
      (latest, report) =>
        report.createdAt > latest
          ? report.createdAt
          : latest,
      sortedReports[0]?.createdAt ?? new Date(0).toISOString(),
    );

    const work = sortedReports[0]?.work;

    if (!work) {
      throw new Error("PROFESSIONAL_REVIEW_WORK_MISSING");
    }

    return {
      createdAt: newestCreatedAt,
      id: `professional-${workId}`,
      priority: sortedReports.some(
        (report) => report.priority === "important",
      )
        ? "important"
        : "normal",
      reports: sortedReports,
      status: professionalGroupStatus(sortedReports),
      work,
    };
  });
}

function matchesTab(
  status: FeedbackStatus,
  tab: FeedbackTab,
) {
  if (tab === "archived") return status === "archived";
  if (tab === "unread") return status === "unread";

  return status !== "archived";
}

export function FeedbackWorkspace({
  initialItems,
  initialWorkId = null,
}: {
  initialItems: FeedbackItem[];
  initialWorkId?: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [tab, setTab] = useState<FeedbackTab>(
    initialWorkId ? "all" : "unread",
  );
  const [workId, setWorkId] = useState(
    initialWorkId ?? "all",
  );
  const [category, setCategory] = useState("all");
  const [order, setOrder] =
    useState<FeedbackOrder>("newest");
  const [importantOnly, setImportantOnly] =
    useState(false);
  const [selection, setSelection] =
    useState<Selection>(
      initialWorkId
        ? {
            id: `professional-${initialWorkId}`,
            type: "group",
          }
        : null,
    );
  const [pendingId, setPendingId] =
    useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();

  const normalItems = useMemo(
    () =>
      items.filter(
        (item) => !item.isProfessionalReview,
      ),
    [items],
  );

  const professionalGroups = useMemo(
    () => createProfessionalGroups(items),
    [items],
  );

  const allEntries = useMemo<DisplayEntry[]>(
    () => [
      ...normalItems.map((item) => ({
        createdAt: item.createdAt,
        item,
        type: "item" as const,
      })),
      ...professionalGroups.map((group) => ({
        createdAt: group.createdAt,
        group,
        type: "group" as const,
      })),
    ],
    [normalItems, professionalGroups],
  );

  const filteredEntries = useMemo(
    () =>
      allEntries
        .filter((entry) => {
          const status =
            entry.type === "item"
              ? entry.item.status
              : entry.group.status;

          return matchesTab(status, tab);
        })
        .filter((entry) => {
          const entryWorkId =
            entry.type === "item"
              ? entry.item.work.id
              : entry.group.work.id;

          return (
            workId === "all" ||
            entryWorkId === workId
          );
        })
        .filter((entry) => {
          if (category === "all") return true;

          if (entry.type === "item") {
            return entry.item.category === category;
          }

          return entry.group.reports.some(
            (report) => report.category === category,
          );
        })
        .filter((entry) => {
          if (!importantOnly) return true;

          return entry.type === "item"
            ? entry.item.priority === "important"
            : entry.group.priority === "important";
        })
        .sort((first, second) =>
          order === "newest"
            ? second.createdAt.localeCompare(
                first.createdAt,
              )
            : first.createdAt.localeCompare(
                second.createdAt,
              ),
        ),
    [
      allEntries,
      category,
      importantOnly,
      order,
      tab,
      workId,
    ],
  );

  const stats = useMemo(
    () => ({
      archived: allEntries.filter((entry) => {
        const status =
          entry.type === "item"
            ? entry.item.status
            : entry.group.status;

        return status === "archived";
      }).length,
      important: allEntries.filter((entry) => {
        const status =
          entry.type === "item"
            ? entry.item.status
            : entry.group.status;

        const priority =
          entry.type === "item"
            ? entry.item.priority
            : entry.group.priority;

        return (
          priority === "important" &&
          status !== "archived"
        );
      }).length,
      total: allEntries.filter((entry) => {
        const status =
          entry.type === "item"
            ? entry.item.status
            : entry.group.status;

        return status !== "archived";
      }).length,
      unread: allEntries.filter((entry) => {
        const status =
          entry.type === "item"
            ? entry.item.status
            : entry.group.status;

        return status === "unread";
      }).length,
    }),
    [allEntries],
  );

  const works = useMemo(
    () => [
      ...new Map(
        items.map((item) => [
          item.work.id,
          item.work,
        ]),
      ).values(),
    ],
    [items],
  );

  const selectedItem =
    selection?.type === "item"
      ? items.find(
          (item) => item.id === selection.id,
        ) ?? null
      : null;

  const selectedGroup =
    selection?.type === "group"
      ? professionalGroups.find(
          (group) => group.id === selection.id,
        ) ?? null
      : null;

  const closeDetail = useCallback(
    () => setSelection(null),
    [],
  );

  function updateItemsStatus(
    ids: Set<string>,
    status: "read" | "archived",
  ) {
    const now = new Date().toISOString();

    setItems((current) =>
      current.map((item) =>
        ids.has(item.id)
          ? {
              ...item,
              archivedAt:
                status === "archived"
                  ? now
                  : item.archivedAt,
              readAt:
                status === "read"
                  ? now
                  : item.readAt,
              status,
            }
          : item,
      ),
    );
  }

  function updateItemStatus(
    id: string,
    status: "read" | "archived",
  ) {
    setPendingId(id);
    setMessage("");

    startTransition(async () => {
      const response =
        status === "read"
          ? await markFeedbackReadAction(id)
          : await archiveFeedbackAction(id);

      setMessage(response.message);

      if (response.status === "success") {
        updateItemsStatus(new Set([id]), status);

        if (
          status === "archived" &&
          selection?.type === "item" &&
          selection.id === id
        ) {
          setSelection(null);
        }
      }

      setPendingId(null);
    });
  }

  function updateGroupStatus(
    group: ProfessionalReviewGroup,
    status: "read" | "archived",
  ) {
    setPendingId(group.id);
    setMessage("");

    startTransition(async () => {
      const feedbackIds = group.reports.map(
        (report) => report.id,
      );

      const response =
        status === "read"
          ? await markFeedbackGroupReadAction(
              group.work.id,
              feedbackIds,
            )
          : await archiveFeedbackGroupAction(
              group.work.id,
              feedbackIds,
            );

      setMessage(response.message);

      if (response.status === "success") {
        updateItemsStatus(
          new Set(feedbackIds),
          status,
        );

        if (
          status === "archived" &&
          selection?.type === "group" &&
          selection.id === group.id
        ) {
          setSelection(null);
        }
      }

      setPendingId(null);
    });
  }

  function openItemDetail(item: FeedbackItem) {
    setSelection({
      id: item.id,
      type: "item",
    });

    if (
      item.status === "unread" &&
      pendingId !== item.id
    ) {
      updateItemStatus(item.id, "read");
    }
  }

  function openGroupDetail(
    group: ProfessionalReviewGroup,
  ) {
    setSelection({
      id: group.id,
      type: "group",
    });

    if (
      group.status === "unread" &&
      pendingId !== group.id
    ) {
      updateGroupStatus(group, "read");
    }
  }

  return (
    <div className="feedback-workspace">
      <header className="feedback-hero">
        <p>{feedbackContent.eyebrow}</p>
        <h1>{feedbackContent.title}</h1>
        <span>{feedbackContent.description}</span>
      </header>

      <FeedbackStats stats={stats} />

      <section
        className="feedback-controls"
        aria-label={feedbackContent.filters.area}
      >
        <div
          className="feedback-tabs"
          role="tablist"
          aria-label={feedbackContent.title}
        >
          {(["unread", "all", "archived"] as const).map(
            (value) => (
              <button
                aria-selected={tab === value}
                key={value}
                onClick={() => setTab(value)}
                role="tab"
                type="button"
              >
                {feedbackContent.tabs[value]}
              </button>
            ),
          )}
        </div>

        <div className="feedback-filters">
          <label>
            <span>{feedbackContent.filters.work}</span>

            <select
              value={workId}
              onChange={(event) =>
                setWorkId(event.target.value)
              }
            >
              <option value="all">
                {feedbackContent.filters.allWorks}
              </option>

              {works.map((work) => (
                <option
                  key={work.id}
                  value={work.id}
                >
                  {work.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>
              {feedbackContent.filters.category}
            </span>

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
            >
              <option value="all">
                {
                  feedbackContent.filters
                    .allCategories
                }
              </option>

              {Object.entries(
                feedbackContent.categories,
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{feedbackContent.filters.order}</span>

            <select
              value={order}
              onChange={(event) =>
                setOrder(
                  event.target.value as FeedbackOrder,
                )
              }
            >
              <option value="newest">
                {feedbackContent.filters.newest}
              </option>
              <option value="oldest">
                {feedbackContent.filters.oldest}
              </option>
            </select>
          </label>

          <label className="feedback-important">
            <input
              checked={importantOnly}
              onChange={(event) =>
                setImportantOnly(
                  event.target.checked,
                )
              }
              type="checkbox"
            />

            <span>
              {
                feedbackContent.filters
                  .importantOnly
              }
            </span>
          </label>
        </div>
      </section>

      {message && (
        <p className="feedback-message" role="status">
          {message}
        </p>
      )}

      {filteredEntries.length > 0 ? (
        <section
          className="feedback-list-grid"
          aria-label={feedbackContent.labels.list}
        >
          {filteredEntries.map((entry) =>
            entry.type === "item" ? (
              <FeedbackCard
                item={entry.item}
                key={entry.item.id}
                onArchive={(id) =>
                  updateItemStatus(id, "archived")
                }
                onDetail={openItemDetail}
                onRead={(id) =>
                  updateItemStatus(id, "read")
                }
                pending={
                  pendingId === entry.item.id
                }
              />
            ) : (
              <ProfessionalReviewGroupCard
                group={entry.group}
                key={entry.group.id}
                onDetail={openGroupDetail}
                onRead={(group) =>
                  updateGroupStatus(group, "read")
                }
                pending={
                  pendingId === entry.group.id
                }
              />
            ),
          )}
        </section>
      ) : (
        <FeedbackEmptyState
          filtered={allEntries.length > 0}
        />
      )}

      {selectedItem && (
        <FeedbackDetailDialog
          key={selectedItem.id}
          item={selectedItem}
          onClose={closeDetail}
        />
      )}

      {selectedGroup && (
        <ProfessionalReviewGroupDialog
          key={selectedGroup.id}
          group={selectedGroup}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
