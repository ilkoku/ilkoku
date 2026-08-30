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
  work,
}: {
  index: number;
  work: ReaderShelfWork;
}) {
  return (
    <Card className="book-card" variant="hover">
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
  sections,
  storageKey,
}: {
  sections: ReaderShelfSection[];
  storageKey: string;
}) {
  const validIds = useMemo(
    () => new Set(sections.map((section) => section.id)),
    [sections],
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
      const firstVisible = sections.find(
        (section) => !normalized.includes(section.id),
      );

      frameId = window.requestAnimationFrame(() => {
        setHiddenIds(normalized);
        setActiveId((current) =>
          current && !normalized.includes(current)
            ? current
            : firstVisible?.id ?? "",
        );
      });
    } catch {
      window.localStorage.removeItem(storageKey);
    }

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [sections, storageKey, validIds]);

  const visibleSections = sections.filter(
    (section) => !hiddenIds.includes(section.id),
  );
  const hiddenSections = sections.filter((section) =>
    hiddenIds.includes(section.id),
  );
  const activeSection =
    visibleSections.find((section) => section.id === activeId) ??
    visibleSections[0] ??
    null;

  function hideSection(id: string) {
    const nextHidden = Array.from(new Set([...hiddenIds, id]));
    setHiddenIds(nextHidden);
    saveHidden(storageKey, nextHidden);

    const nextVisible = sections.find(
      (section) => !nextHidden.includes(section.id),
    );
    setActiveId(nextVisible?.id ?? "");
  }

  function restoreSection(id: string) {
    const nextHidden = hiddenIds.filter((hiddenId) => hiddenId !== id);
    setHiddenIds(nextHidden);
    saveHidden(storageKey, nextHidden);
    setActiveId(id);
  }

  function restoreAll() {
    setHiddenIds([]);
    saveHidden(storageKey, []);
    setActiveId(sections[0]?.id ?? "");
  }

  return (
    <div className="reader-workdesk__shelf-system">
      <div className="reader-workdesk__shelf-toolbar">
        <nav
          aria-label="Okuyucu raf bölümleri"
          className="reader-workdesk__shelf-tabs"
        >
          {visibleSections.map((section) => (
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
              <span>{section.works.length}</span>
            </button>
          ))}
        </nav>

        <details className="reader-workdesk__hidden-drawer">
          <summary>
            Gizlenenler
            {hiddenSections.length > 0 && (
              <span>{hiddenSections.length}</span>
            )}
          </summary>

          <div className="reader-workdesk__hidden-menu">
            {hiddenSections.length > 0 ? (
              <>
                {hiddenSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => restoreSection(section.id)}
                    type="button"
                  >
                    <span>{section.label}</span>
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
              <p>Gizlenmiş bölüm yok.</p>
            )}
          </div>
        </details>
      </div>

      {activeSection ? (
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
              <span>{activeSection.works.length} eser</span>
              {activeSection.href && (
                <Link
                  className="button button--ghost"
                  href={activeSection.href}
                >
                  Tümünü Gör
                </Link>
              )}
              <button
                aria-label={`${activeSection.label} bölümünü gizle`}
                className="reader-workdesk__hide-section"
                onClick={() => hideSection(activeSection.id)}
                title="Bu bölümü çalışma masasından kaldır"
                type="button"
              >
                ×
              </button>
            </div>
          </div>

          {activeSection.works.length > 0 ? (
            <div className="books-grid">
              {activeSection.works.map((work, index) => (
                <WorkCard index={index} key={work.id} work={work} />
              ))}
            </div>
          ) : (
            <Card className="workspace-empty">
              <h3>{activeSection.emptyTitle}</h3>
              <p>{activeSection.emptyDescription}</p>
            </Card>
          )}
        </section>
      ) : (
        <Card className="workspace-empty reader-workdesk__all-hidden">
          <h3>Rafların şu an boş</h3>
          <p>
            Tüm vitrin bölümlerini gizledin. İstersen Gizlenenler menüsünden
            tek tek, istersen hepsini birden geri getirebilirsin.
          </p>
          <button
            className="button button--outline"
            onClick={restoreAll}
            type="button"
          >
            Tüm rafları geri getir
          </button>
        </Card>
      )}
    </div>
  );
}
