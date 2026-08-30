"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/features/dashboard/components/ProgressBar";
import { EditorReviewBadge } from "@/features/editor-workspace/components/EditorReviewBadge";
import { restartReadingAction } from "@/features/reading/progress";

export type ReaderShelfWork = {
  authorName: string;
  chapterCount: number;
  editorReviewStatus:
    | "not_requested"
    | "requested"
    | "in_progress"
    | "awaiting_second_editor"
    | "second_in_progress"
    | "completed";
  genre: string | null;
  id: string;
  ratingLabel: string;
  readingProgress: {
    chapterPosition: number;
    progressPercent: number;
  } | null;
  readingState: "unread" | "in_progress" | "completed";
  slug: string;
  title: string;
};

export type ReaderShelfSection = {
  emptyDescription: string;
  emptyTitle: string;
  eyebrow: string;
  href?: string;
  id: string;
  label: string;
  title: string;
  works: ReaderShelfWork[];
};

function saveHidden(storageKey: string, ids: string[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(ids));
}

function WorkCard({
  index,
  onHide,
  work,
}: {
  index: number;
  onHide: (id: string) => void;
  work: ReaderShelfWork;
}) {
  return (
    <Card className="book-card reader-workdesk__work-card" variant="hover">
      <button
        aria-label={`${work.title} eserini ana sayfadan gizle`}
        className="reader-workdesk__hide-work"
        onClick={() => onHide(work.id)}
        title="Bu eseri ana sayfadan kaldır"
        type="button"
      >
        ×
      </button>

      <div
        aria-hidden="true"
        className={`book-cover book-cover--${
          (["one", "two", "three"] as const)[index % 3]
        }`}
      >
        <span className="book-cover__ornament">✦</span>
        <strong>{work.title}</strong>
        <small>İlkOku</small>
      </div>

      <div className="book-card__content">
        <p className="book-card__genre">
          {work.genre ?? "Tür belirtilmedi"} · {work.authorName}
        </p>

        <h3>{work.title}</h3>

        <div className="reader-workdesk__card-meta">
          <EditorReviewBadge status={work.editorReviewStatus} />
          <div className="reader-workdesk__meta-chips">
            <span className="reader-workdesk__meta-chip reader-workdesk__meta-chip--age">
              Hitap {work.ratingLabel}
            </span>
            <span className="reader-workdesk__meta-chip">
              {work.chapterCount} bölüm
            </span>
          </div>
        </div>

        {work.readingProgress && (
          <ProgressBar
            label={`${work.title} okuma ilerlemesi`}
            value={work.readingProgress.progressPercent}
          />
        )}

        <div className="book-card__actions">
          <Link
            className="button button--ghost"
            href={`/kitap/${work.slug}/pasaport?from=${encodeURIComponent(
              "/okuyucu",
            )}`}
          >
            Eser Pasaportu
          </Link>

          {work.readingState === "completed" ? (
            <form action={restartReadingAction}>
              <input name="workId" type="hidden" value={work.id} />
              <input name="returnTo" type="hidden" value="/okuyucu" />
              <button className="button button--outline" type="submit">
                Yeniden Oku
              </button>
            </form>
          ) : (
            <Link
              className="button button--outline"
              href={
                work.readingState === "in_progress"
                  ? `/oku/${work.slug}/bolum-${
                      work.readingProgress?.chapterPosition ?? 1
                    }?from=${encodeURIComponent("/okuyucu")}`
                  : `/kitap/${work.slug}?from=${encodeURIComponent(
                      "/okuyucu",
                    )}`
              }
            >
              {work.readingState === "in_progress"
                ? "Okumaya Devam Et"
                : "Eseri İncele"}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ReaderShelfTabs({
  continueEmptyDescription,
  continueEmptyTitle,
  continueWorks,
  sections,
  storageKey,
}: {
  continueEmptyDescription: string;
  continueEmptyTitle: string;
  continueWorks: ReaderShelfWork[];
  sections: ReaderShelfSection[];
  storageKey: string;
}) {
  const allWorks = useMemo(() => {
    const unique = new Map<string, ReaderShelfWork>();

    for (const work of continueWorks) {
      unique.set(work.id, work);
    }

    for (const section of sections) {
      for (const work of section.works) {
        if (!unique.has(work.id)) {
          unique.set(work.id, work);
        }
      }
    }

    return Array.from(unique.values());
  }, [continueWorks, sections]);

  const validIds = useMemo(
    () => new Set(allWorks.map((work) => work.id)),
    [allWorks],
  );
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    let frameId = 0;

    try {
      const saved = JSON.parse(
        window.localStorage.getItem(storageKey) ?? "[]",
      );
      const normalized = Array.isArray(saved)
        ? saved.filter(
            (value): value is string =>
              typeof value === "string" && validIds.has(value),
          )
        : [];

      frameId = window.requestAnimationFrame(() => {
        setHiddenIds(normalized);
      });
    } catch {
      window.localStorage.removeItem(storageKey);
    }

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [storageKey, validIds]);

  const hiddenWorks = allWorks.filter((work) => hiddenIds.includes(work.id));
  const visibleContinueWorks = continueWorks.filter(
    (work) => !hiddenIds.includes(work.id),
  );
  const activeSection =
    sections.find((section) => section.id === activeId) ?? sections[0] ?? null;
  const activeWorks =
    activeSection?.works.filter((work) => !hiddenIds.includes(work.id)) ?? [];

  function hideWork(id: string) {
    const nextHidden = Array.from(new Set([...hiddenIds, id]));
    setHiddenIds(nextHidden);
    saveHidden(storageKey, nextHidden);
  }

  function restoreWork(id: string) {
    const nextHidden = hiddenIds.filter((hiddenId) => hiddenId !== id);
    setHiddenIds(nextHidden);
    saveHidden(storageKey, nextHidden);
  }

  function restoreAll() {
    setHiddenIds([]);
    saveHidden(storageKey, []);
  }

  return (
    <>
      <section
        aria-labelledby="okumaya-devam-baslik"
        className="dashboard-section reader-workdesk__continue"
      >
        <div className="section-heading">
          <div>
            <p>Masanın üstünde</p>
            <h2 id="okumaya-devam-baslik">Okumaya Devam Et</h2>
          </div>
          <div>
            <span>{visibleContinueWorks.length} eser</span>
            <Link className="button button--ghost" href="/okumaya-devam">
              Tümünü Gör
            </Link>
          </div>
        </div>

        {visibleContinueWorks.length > 0 ? (
          <div className="books-grid">
            {visibleContinueWorks.map((work, index) => (
              <WorkCard
                index={index}
                key={work.id}
                onHide={hideWork}
                work={work}
              />
            ))}
          </div>
        ) : continueWorks.length > 0 ? (
          <Card className="workspace-empty">
            <h3>Masandaki eserleri temizledin</h3>
            <p>
              Gizlediğin eserleri aşağıdaki Gizlenen Eserler menüsünden geri
              getirebilirsin.
            </p>
          </Card>
        ) : (
          <Card className="workspace-empty">
            <h3>{continueEmptyTitle}</h3>
            <p>{continueEmptyDescription}</p>
            <Link className="button button--outline" href="/kesfet">
              Masana bir eser seç
            </Link>
          </Card>
        )}
      </section>

      <div className="reader-workdesk__shelf-system">
        <div className="reader-workdesk__shelf-toolbar">
          <nav
            aria-label="Okuyucu raf bölümleri"
            className="reader-workdesk__shelf-tabs"
          >
            {sections.map((section) => {
              const visibleCount = section.works.filter(
                (work) => !hiddenIds.includes(work.id),
              ).length;

              return (
                <button
                  aria-current={
                    activeSection?.id === section.id ? "page" : undefined
                  }
                  className={
                    activeSection?.id === section.id
                      ? "reader-workdesk__shelf-tab is-active"
                      : "reader-workdesk__shelf-tab"
                  }
                  key={section.id}
                  onClick={() => setActiveId(section.id)}
                  type="button"
                >
                  {section.label}
                  <span>{visibleCount}</span>
                </button>
              );
            })}
          </nav>

          <details className="reader-workdesk__hidden-drawer">
            <summary>
              Gizlenen Eserler
              {hiddenWorks.length > 0 && <span>{hiddenWorks.length}</span>}
            </summary>

            <div className="reader-workdesk__hidden-menu">
              {hiddenWorks.length > 0 ? (
                <>
                  {hiddenWorks.map((work) => (
                    <button
                      key={work.id}
                      onClick={() => restoreWork(work.id)}
                      type="button"
                    >
                      <span className="reader-workdesk__hidden-work-label">
                        <b>{work.title}</b>
                        <small>{work.authorName}</small>
                      </span>
                      <strong>Geri getir</strong>
                    </button>
                  ))}
                  <button
                    className="reader-workdesk__restore-all"
                    onClick={restoreAll}
                    type="button"
                  >
                    Tümünü geri getir
                  </button>
                </>
              ) : (
                <p>Gizlenmiş eser yok.</p>
              )}
            </div>
          </details>
        </div>

        {activeSection && (
          <section
            aria-labelledby={`${activeSection.id}-baslik`}
            className="dashboard-section reader-workdesk__shelf reader-workdesk__active-shelf"
          >
            <div className="section-heading reader-workdesk__shelf-heading">
              <div>
                <p>{activeSection.eyebrow}</p>
                <h2 id={`${activeSection.id}-baslik`}>
                  {activeSection.title}
                </h2>
              </div>

              <div className="reader-workdesk__shelf-actions">
                <span>{activeWorks.length} eser</span>
                {activeSection.href && (
                  <Link
                    className="button button--ghost"
                    href={activeSection.href}
                  >
                    Tümünü Gör
                  </Link>
                )}
              </div>
            </div>

            {activeWorks.length > 0 ? (
              <div className="books-grid">
                {activeWorks.map((work, index) => (
                  <WorkCard
                    index={index}
                    key={work.id}
                    onHide={hideWork}
                    work={work}
                  />
                ))}
              </div>
            ) : activeSection.works.length > 0 ? (
              <Card className="workspace-empty">
                <h3>Bu raftaki eserleri temizledin</h3>
                <p>
                  Gizlediğin eserleri Gizlenen Eserler menüsünden geri
                  getirebilirsin.
                </p>
              </Card>
            ) : (
              <Card className="workspace-empty">
                <h3>{activeSection.emptyTitle}</h3>
                <p>{activeSection.emptyDescription}</p>
              </Card>
            )}
          </section>
        )}
      </div>
    </>
  );
}
