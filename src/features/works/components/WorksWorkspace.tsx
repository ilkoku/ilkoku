/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { workspaceContent } from "@/content";
import { submitForEditorAction } from "@/features/editor-review/actions/editor-review.actions";
import { NewWorkFlow } from "@/features/writer/components/NewWorkFlow";
import { workContentRatingDetails } from "@/lib/work-content-classification";

import type { WorkWithChapterSummary } from "../types";
import { WorkArchiveAction } from "./WorkArchiveAction";
import { WorkCoverUpload } from "./WorkCoverUpload";
import { WorkEditDialog } from "./WorkEditDialog";
import {
  TrashedWorkActions,
  WorkActivationAction,
  WorkTrashAction,
} from "./WorkLifecycleActions";

type Tab = "active" | "archived" | "trash";

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
  const date =
    typeof value === "string"
      ? new Date(value)
      : value;

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

  const closeEditDialog =
    useCallback(() => {
      setEditingWorkId(null);
    }, []);

  const currentWorks = useMemo(
    () => works.filter((work) => work.deletedAt === null),
    [works],
  );

  const activeWorks = useMemo(
    () =>
      currentWorks.filter(
        (work) =>
          work.status !== "archived",
      ),
    [currentWorks],
  );

  const archivedWorks = useMemo(
    () =>
      currentWorks.filter(
        (work) =>
          work.status === "archived",
      ),
    [currentWorks],
  );

  const trashedWorks = useMemo(
    () => works.filter((work) => work.deletedAt !== null),
    [works],
  );

  const chapterCount = useMemo(
    () =>
      currentWorks.reduce(
        (total, work) =>
          total + work.chapterCount,
        0,
      ),
    [currentWorks],
  );

  const wordCount = useMemo(
    () =>
      currentWorks.reduce(
        (total, work) =>
          total + work.totalWords,
        0,
      ),
    [currentWorks],
  );

  const editingWork = useMemo(
    () =>
      currentWorks.find(
        (work) =>
          work.id === editingWorkId,
      ) ?? null,
    [editingWorkId, currentWorks],
  );

  const visibleWorks = useMemo(() => {
    const source =
      tab === "active"
        ? activeWorks
        : tab === "archived"
          ? archivedWorks
          : trashedWorks;

    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    const filtered = source.filter(
      (work) =>
        work.title
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedSearch),
    );

    return [...filtered].sort(
      (left, right) => {
        if (sort === "oldest") {
          return (
            new Date(
              left.createdAt,
            ).getTime() -
            new Date(
              right.createdAt,
            ).getTime()
          );
        }

        if (sort === "title") {
          return left.title.localeCompare(
            right.title,
            "tr-TR",
          );
        }

        if (sort === "chapters") {
          return (
            right.chapterCount -
            left.chapterCount
          );
        }

        return (
          new Date(
            right.updatedAt,
          ).getTime() -
          new Date(
            left.updatedAt,
          ).getTime()
        );
      },
    );
  }, [
    activeWorks,
    archivedWorks,
    trashedWorks,
    search,
    sort,
    tab,
  ]);

  const stats: StatItem[] = [
    [
      workspaceContent.stats.total,
      currentWorks.length,
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
      "Çöp Kutusu",
      trashedWorks.length,
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
    <>
      <div className="works-workspace">
        <header className="works-workspace__hero">
          <div>
            <p>
              {workspaceContent.eyebrow}
            </p>

            <h1>
              {workspaceContent.title}
            </h1>

            <span>
              {
                workspaceContent.description
              }
            </span>
          </div>

          <NewWorkFlow />
        </header>

        <section
          className="workspace-stats"
          aria-label="Eser istatistikleri"
        >
          {stats.map(
            ([label, value]) => (
              <Card key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </Card>
            ),
          )}
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
              aria-selected={
                tab === "active"
              }
              onClick={() =>
                setTab("active")
              }
            >
              {
                workspaceContent.activeTab
              }

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
              {
                workspaceContent.archiveTab
              }

              <span>
                {archivedWorks.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "trash"}
              onClick={() => setTab("trash")}
            >
              Çöp Kutusu
              <span>{trashedWorks.length}</span>
            </button>
          </div>

          <label className="workspace-search">
            <span>
              {
                workspaceContent.searchLabel
              }
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder={
                workspaceContent.searchPlaceholder
              }
            />
          </label>

          <label className="workspace-sort">
            <span>
              {
                workspaceContent.sortLabel
              }
            </span>

            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target
                    .value as Sort,
                )
              }
            >
              <option value="updated">
                {
                  workspaceContent
                    .sortOptions.updated
                }
              </option>

              <option value="oldest">
                {
                  workspaceContent
                    .sortOptions.oldest
                }
              </option>

              <option value="title">
                {
                  workspaceContent
                    .sortOptions.title
                }
              </option>

              <option value="chapters">
                {
                  workspaceContent
                    .sortOptions.chapters
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
                    }${work.coverUrl ? " workspace-cover--image" : ""}`}
                    aria-label={`${work.title} kapak görseli`}
                    role="img"
                  >
                    {work.coverUrl ? (
                      <img src={work.coverUrl} alt={`${work.title} kapak görseli`} />
                    ) : (
                      <>
                        <span>✦</span>
                        <strong>
                          {work.title}
                        </strong>
                        <small>
                          İlkOku
                        </small>
                      </>
                    )}
                  </div>

                  <div className="workspace-work-card__body">
                    <div>
                      <p>
                        {work.genre ??
                          "Tür belirtilmedi"}
                      </p>

                      <h2>
                        {work.title}
                      </h2>

                      <div className="workspace-state-badges">
                        <span className="status-badge">
                          {
                            workStatusLabels[
                              work.status
                            ]
                          }
                        </span>
                        {work.deletedAt ? (
                          <span className="status-badge status-badge--muted">Çöp Kutusunda</span>
                        ) : (
                          <span className={`status-badge ${work.isActive ? "status-badge--active" : "status-badge--passive"}`}>
                            {work.isActive ? "Aktif" : "Pasif"}
                          </span>
                        )}
                      </div>
                    </div>

                    <dl>
                      <div>
                        <dt>Bölüm</dt>
                        <dd>
                          {
                            work.chapterCount
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>İçerik sınıfı</dt>
                        <dd>{workContentRatingDetails[work.contentRating].shortLabel}</dd>
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
                          {work.deletedAt ? "Silindi" : workspaceContent.lastEdited}
                        </dt>

                        <dd>
                          {formatDate(
                            work.deletedAt ?? work.updatedAt,
                          )}
                        </dd>
                      </div>
                    </dl>

                    {!work.deletedAt && work.status === "published" && (
                      <section className="workspace-editor-review" aria-label="Profesyonel editör incelemesi">
                        <div>
                          <strong>Profesyonel Editör İncelemesi</strong>
                          <span>
                            {work.editorReviewStatus === "requested"
                              ? "Eser editör havuzunda değerlendirme bekliyor."
                              : work.editorReviewStatus === "in_progress"
                                ? "Birinci editör eserini inceliyor."
                                : work.editorReviewStatus === "awaiting_second_editor"
                                  ? "Birinci editör raporu tamamlandı; ikinci editör bekleniyor."
                                  : work.editorReviewStatus === "second_in_progress"
                                    ? "İkinci editör eserini inceliyor."
                                    : work.editorReviewStatus === "completed"
                                      ? "Eser değerlendirmesi tamamlandı."
                                      : "Yayımlanmış eserini bütün olarak editör incelemesine gönder."}
                          </span>
                        </div>

                        {work.editorReviewStatus === "not_requested" ? (
                          <form action={submitForEditorAction}>
                            <input name="workId" type="hidden" value={work.id} />
                            <Button type="submit" variant="outline">
                              Editör İncelemesine Gönder
                            </Button>
                          </form>
                        ) : work.editorReviewStatus === "completed" ? (
                          <Link
                            className="button button--outline"
                            href={`/geri-bildirimler?eser=${encodeURIComponent(
                              work.id,
                            )}`}
                          >
                            Editör Raporunu Görüntüle
                          </Link>
                        ) : (
                          <span className="workspace-editor-review__status">
                            {work.editorReviewStatus === "requested"
                              ? "İnceleme bekliyor"
                              : work.editorReviewStatus === "in_progress"
                                ? "Birinci editörde"
                                : work.editorReviewStatus === "awaiting_second_editor"
                                  ? "İkinci editör bekleniyor"
                                  : "İkinci editörde"}
                          </span>
                        )}
                      </section>
                    )}

                    {work.deletedAt ? (
                      <TrashedWorkActions workId={work.id} title={work.title} />
                    ) : (
                      <>
                        {work.status !== "archived" ? (
                          <WorkCoverUpload workId={work.id} />
                        ) : null}

                        <div className="workspace-work-card__actions">
                          {work.status !== "archived" && (
                            <Button
                              type="button"
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

                          {work.status !== "archived" && (
                            <NewWorkFlow
                              initialWork={work}
                              triggerLabel={
                                workspaceContent.continueWriting
                              }
                            />
                          )}

                          <Link
                            className="button button--outline"
                            href={`/eserlerim/${work.id}/pasaport`}
                          >
                            Eser Pasaportu
                          </Link>

                          {work.status !== "archived" ? (
                            <WorkActivationAction
                              isActive={work.isActive}
                              workId={work.id}
                            />
                          ) : null}

                          <WorkArchiveAction
                            archived={
                              work.status ===
                              "archived"
                            }
                            workId={work.id}
                          />

                          <WorkTrashAction
                            title={work.title}
                            workId={work.id}
                          />
                        </div>
                      </>
                    )}
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
                : tab === "archived"
                  ? workspaceContent.emptyArchive
                  : "Çöp kutusu boş."}
            </p>
          </Card>
        )}
      </div>

      {editingWork ? (
        <WorkEditDialog
          key={editingWork.id}
          work={editingWork}
          onClose={closeEditDialog}
        />
      ) : null}
    </>
  );
}
