"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { workspaceContent } from "@/content";
import { NewWorkFlow } from "@/features/writer/components/NewWorkFlow";
import type { WorkWithChapterSummary } from "../types";
import { WorkArchiveAction } from "./WorkArchiveAction";
import { WorkEditDialog } from "./WorkEditDialog";

type Tab = "active" | "archived";
type Sort =
  | "updated"
  | "oldest"
  | "title"
  | "chapters";

type StatItem = [
  label: string,
  value: string | number,
];

const workStatusLabels: Record<
  WorkWithChapterSummary["status"],
  string
> = {
  archived: "Arşivlendi",
  draft: "Taslak",
  in_review: "İncelemede",
  published: "Yayında",
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(
    typeof value === "string"
      ? new Date(value)
      : value,
  );
}

export function WorksWorkspace({
  works,
}: {
  works: WorkWithChapterSummary[];
}) {
  const [tab, setTab] =
    useState<Tab>("active");
  const [search, setSearch] =
    useState("");
  const [sort, setSort] =
    useState<Sort>("updated");
  const [
    editingWorkId,
    setEditingWorkId,
  ] = useState<string | null>(null);

  const closeEditDialog = useCallback(() => {
    setEditingWorkId(null);
  }, []);

  const activeWorks = useMemo(
    () =>
      works.filter(
        (work) =>
          work.status !== "archived",
      ),
    [works],
  );

  const archivedWorks = useMemo(
    () =>
      works.filter(
        (work) =>
          work.status === "archived",
      ),
    [works],
  );

  const chapterCount = works.reduce(
    (total, work) =>
      total + work.chapterCount,
    0,
  );

  const wordCount = works.reduce(
    (total, work) =>
      total + work.totalWords,
    0,
  );

  const editingWork =
    works.find(
      (work) => work.id === editingWorkId,
    ) ?? null;

  const visibleWorks = useMemo(() => {
    const source =
      tab === "active"
        ? activeWorks
        : archivedWorks;

    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("tr");

    const filtered = source.filter(
      (work) =>
        work.title
          .toLocaleLowerCase("tr")
          .includes(normalizedSearch),
    );

    return [...filtered].sort(
      (left, right) => {
        if (sort === "oldest") {
          return (
            left.createdAt.getTime() -
            right.createdAt.getTime()
          );
        }

        if (sort === "title") {
          return left.title.localeCompare(
            right.title,
            "tr",
          );
        }

        if (sort === "chapters") {
          return (
            right.chapterCount -
            left.chapterCount
          );
        }

        return (
          right.updatedAt.getTime() -
          left.updatedAt.getTime()
        );
      },
    );
  }, [
    activeWorks,
    archivedWorks,
    search,
    sort,
    tab,
  ]);

  const stats: StatItem[] = [
    [
      workspaceContent.stats.total,
      works.length,
    ],
    [
      workspaceContent.stats.active,
      activeWorks.length,
    ],
    [
      workspaceContent.stats.archived,
      archivedWorks.length,
    ],
    [
      workspaceContent.stats.chapters,
      chapterCount,
    ],
    [
      workspaceContent.stats.words,
      wordCount.toLocaleString("tr-TR"),
    ],
  ];

  return (
    <div className="works-workspace">
      <header className="works-workspace__hero">
        <div>
          <p>{workspaceContent.eyebrow}</p>

          <h1>{workspaceContent.title}</h1>

          <span>
            {workspaceContent.description}
          </span>
        </div>

        <NewWorkFlow />
      </header>

      <section
        className="workspace-stats"
        aria-label="Eser istatistikleri"
      >
        {stats.map(([label, value]) => (
          <Card key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </Card>
        ))}
      </section>

      <div className="workspace-toolbar">
        <div
          className="workspace-tabs"
          role="tablist"
          aria-label="Eser listeleri"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "active"}
            onClick={() =>
              setTab("active")
            }
          >
            {workspaceContent.activeTab}

            <span>
              {activeWorks.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              tab === "archived"
            }
            onClick={() =>
              setTab("archived")
            }
          >
            {workspaceContent.archiveTab}

            <span>
              {archivedWorks.length}
            </span>
          </button>
        </div>

        <label className="workspace-search">
          <span>
            {workspaceContent.searchLabel}
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder={
              workspaceContent.searchPlaceholder
            }
          />
        </label>

        <label className="workspace-sort">
          <span>
            {workspaceContent.sortLabel}
          </span>

          <select
            value={sort}
            onChange={(event) =>
              setSort(
                event.target.value as Sort,
              )
            }
          >
            <option value="updated">
              {
                workspaceContent.sortOptions
                  .updated
              }
            </option>

            <option value="oldest">
              {
                workspaceContent.sortOptions
                  .oldest
              }
            </option>

            <option value="title">
              {
                workspaceContent.sortOptions
                  .title
              }
            </option>

            <option value="chapters">
              {
                workspaceContent.sortOptions
                  .chapters
              }
            </option>
          </select>
        </label>
      </div>

      {visibleWorks.length > 0 ? (
        <section
          className="workspace-grid"
          aria-live="polite"
        >
          {visibleWorks.map(
            (work, index) => (
              <Card
                className="workspace-work-card"
                variant="hover"
                key={work.id}
              >
                <div
                  className={`workspace-cover workspace-cover--${
                    (index % 3) + 1
                  }`}
                  aria-label={`${work.title} kapak görseli`}
                  role="img"
                >
                  <span>✦</span>

                  <strong>
                    {work.title}
                  </strong>

                  <small>İlkOku</small>
                </div>

                <div className="workspace-work-card__body">
                  <div>
                    <p>
                      {work.genre ??
                        "Tür belirtilmedi"}
                    </p>

                    <h2>{work.title}</h2>

                    <span className="status-badge">
                      {
                        workStatusLabels[
                          work.status
                        ]
                      }
                    </span>
                  </div>

                  <dl>
                    <div>
                      <dt>Bölüm</dt>
                      <dd>
                        {work.chapterCount}
                      </dd>
                    </div>

                    <div>
                      <dt>Kelime</dt>
                      <dd>
                        {work.totalWords.toLocaleString(
                          "tr-TR",
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        {
                          workspaceContent.lastEdited
                        }
                      </dt>

                      <dd>
                        {formatDate(
                          work.updatedAt,
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="workspace-work-card__actions">
                    {work.status !==
                      "archived" && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setEditingWorkId(
                            work.id,
                          )
                        }
                      >
                        {
                          workspaceContent.edit
                        }
                      </Button>
                    )}

                    {work.status !==
                      "archived" && (
                      <NewWorkFlow
                        initialWork={work}
                        triggerLabel={
                          workspaceContent.continueWriting
                        }
                      />
                    )}

                    <WorkArchiveAction
                      archived={
                        work.status ===
                        "archived"
                      }
                      workId={work.id}
                    />
                  </div>
                </div>
              </Card>
            ),
          )}
        </section>
      ) : (
        <Card className="workspace-empty">
          <p>
            {tab === "active"
              ? workspaceContent.emptyActive
              : workspaceContent.emptyArchive}
          </p>
        </Card>
      )}

      {editingWork && (
        <WorkEditDialog
          key={editingWork.id}
          work={editingWork}
          onClose={closeEditDialog}
        />
      )}
    </div>
  );
}