"use client";

import {
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { workspaceContent } from "@/content";
import { NewWorkFlow } from "@/features/writer/components/NewWorkFlow";
import { submitForEditorAction } from "@/features/editor-review/actions/editor-review.actions";
import { workContentRatingDetails } from "@/lib/work-content-classification";

import type { WorkWithChapterSummary } from "../types";
import { WorkArchiveAction } from "./WorkArchiveAction";
import { WorkCoverUpload } from "./WorkCoverUpload";

type WorkspaceWork = WorkWithChapterSummary & {
  publishedPageCount: number | null;
};

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
  works: WorkspaceWork[];
}) {
  const [tab, setTab] =
    useState<Tab>("active");

  const [search, setSearch] =
    useState("");

  const [sort, setSort] =
    useState<Sort>("updated");


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

  const chapterCount = useMemo(
    () =>
      works.reduce(
        (total, work) =>
          total + work.chapterCount,
        0,
      ),
    [works],
  );

  const wordCount = useMemo(
    () =>
      works.reduce(
        (total, work) =>
          total + work.totalWords,
        0,
      ),
    [works],
  );


  const visibleWorks = useMemo(() => {
    const source =
      tab === "active"
        ? activeWorks
        : archivedWorks;

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
                    }`}
                    aria-label={`${work.title} kapak görseli`}
                    role="img"
                  >
                    <span>✦</span>

                    <strong>
                      {work.title}
                    </strong>

                    <small>
                      İlkOku
                    </small>
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
                        <dt>Bölüm / Sayfa</dt>
                        <dd>
                          {work.chapterCount} / {work.publishedPageCount?.toLocaleString("tr-TR") ?? "—"}
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

                    {work.status !== "archived" ? (
                      <WorkCoverUpload workId={work.id} />
                    ) : null}

                    {work.status !== "archived" && (
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
                                      : work.status === "published"
                                        ? "Yayımlanmış eserini bütün olarak editör incelemesine gönder."
                                        : "Profesyonel editör incelemesi için önce eseri yayınla. Yayınlandıktan sonra gönder düğmesi burada açılır."}
                          </span>
                        </div>

                        {work.editorReviewStatus === "not_requested" ? (
                          work.status === "published" ? (
                            <form action={submitForEditorAction}>
                              <input name="workId" type="hidden" value={work.id} />
                              <Button type="submit" variant="outline">
                                Editör İncelemesine Gönder
                              </Button>
                            </form>
                          ) : (
                            <span className="workspace-editor-review__status">
                              Önce eseri yayınla
                            </span>
                          )
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

                    <div className="workspace-work-card__actions">
                      {work.status !==
                        "archived" && (
                        <Link
                          className="button button--outline"
                          href={`/kitap/${work.slug}/duzenle?from=${encodeURIComponent("/eserlerim")}`}
                        >
                          {
                            workspaceContent.edit
                          }
                        </Link>
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

                      <Link
                        className="button button--outline"
                        href={`/eserlerim/${work.id}/pasaport`}
                      >
                        Eser Pasaportu
                      </Link>

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
      </div>

    </>
  );
}