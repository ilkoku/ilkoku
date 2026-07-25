import {
  deleteEmptyChapterAction,
  restoreChapterAction,
  rewriteChapterAction,
} from "@/features/works/chapter-archive-actions";
import { getChapterVersions } from "@/features/works/chapter-management";

type ChapterManagementPanelProps = {
  authorId: string;
  chapters: Array<{
    content: string;
    id: string;
    position: number;
    title: string;
    wordCount?: number;
  }>;
};

function countWords(value: string) {
  const normalized = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized ? normalized.split(" ").length : 0;
}

function chapterTitle(title: string, position: number) {
  const normalized = title.trim();

  return normalized || `Bölüm ${position}`;
}

export async function ChapterManagementPanel({
  authorId,
  chapters,
}: ChapterManagementPanelProps) {
  if (!chapters.length) {
    return null;
  }

  const rows = await Promise.all(
    chapters.map(async (chapter) => ({
      chapter,
      versions: await getChapterVersions(authorId, chapter.id),
    })),
  );

  const totalWords = rows.reduce((total, { chapter }) => {
    return total + (chapter.wordCount ?? countWords(chapter.content));
  }, 0);

  const completedChapters = rows.filter(({ chapter }) => {
    return (chapter.wordCount ?? countWords(chapter.content)) > 0;
  }).length;

  return (
    <section
      className="chapter-management-panel"
      aria-labelledby="chapter-management-title"
    >
      <header className="chapter-management-panel__heading">
        <div className="chapter-management-panel__intro">
          <span className="chapter-management-panel__eyebrow">
            Bölüm yönetimi
          </span>

          <h2 id="chapter-management-title">
            Eserinin bölümlerini yönet
          </h2>

          <p>
            Bölümlerini görüntüle, yeniden yaz ve önceki sürümlere
            güvenle geri dön.
          </p>
        </div>

        <div className="chapter-management-panel__metrics">
          <div>
            <strong>{chapters.length}</strong>
            <span>Toplam bölüm</span>
          </div>

          <div>
            <strong>{completedChapters}</strong>
            <span>Yazılan bölüm</span>
          </div>

          <div>
            <strong>{totalWords.toLocaleString("tr-TR")}</strong>
            <span>Toplam kelime</span>
          </div>
        </div>
      </header>

      <div className="chapter-management-panel__list">
        {rows.map(({ chapter, versions }) => {
          const words =
            chapter.wordCount ?? countWords(chapter.content);

          const isEmpty = words === 0;
          const title = chapterTitle(
            chapter.title,
            chapter.position,
          );

          return (
            <article
              className={[
                "chapter-management-card",
                isEmpty
                  ? "chapter-management-card--empty"
                  : "chapter-management-card--written",
              ].join(" ")}
              key={chapter.id}
            >
              <div className="chapter-management-card__number">
                <span>{chapter.position}</span>
              </div>

              <div className="chapter-management-card__content">
                <div className="chapter-management-card__title-row">
                  <div>
                    <span className="chapter-management-card__label">
                      Bölüm {chapter.position}
                    </span>

                    <h3>{title}</h3>
                  </div>

                  <span
                    className={[
                      "chapter-status",
                      isEmpty
                        ? "chapter-status--empty"
                        : "chapter-status--draft",
                    ].join(" ")}
                  >
                    {isEmpty ? "Henüz yazılmadı" : "Taslak"}
                  </span>
                </div>

                <div className="chapter-management-card__meta">
                  <span>
                    <strong>{words.toLocaleString("tr-TR")}</strong>
                    kelime
                  </span>

                  <span>
                    <strong>{versions.length}</strong>
                    kayıtlı sürüm
                  </span>
                </div>
              </div>

              <div className="chapter-management-card__actions">
                {!isEmpty ? (
                  <form action={rewriteChapterAction}>
                    <input
                      type="hidden"
                      name="chapterId"
                      value={chapter.id}
                    />

                    <button
                      type="submit"
                      className="chapter-primary-action"
                    >
                      Yeniden yaz
                    </button>
                  </form>
                ) : (
                  <span className="chapter-empty-note">
                    Yazmaya hazır
                  </span>
                )}

                <details className="chapter-actions-menu">
                  <summary aria-label={`${title} işlemleri`}>
                    <span aria-hidden="true">•••</span>
                  </summary>

                  <div className="chapter-actions-menu__panel">
                    <div className="chapter-actions-menu__heading">
                      <strong>{title}</strong>
                      <small>Bölüm işlemleri</small>
                    </div>

                    <details className="chapter-history">
                      <summary>
                        Sürüm geçmişi
                        <span>{versions.length}</span>
                      </summary>

                      <div className="chapter-version-list">
                        {versions.length ? (
                          versions.map((version) => (
                            <div
                              className="chapter-version-row"
                              key={version.id}
                            >
                              <div>
                                <strong>
                                  Sürüm {version.versionNumber}
                                </strong>

                                <small>
                                  {new Intl.DateTimeFormat(
                                    "tr-TR",
                                    {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    },
                                  ).format(version.createdAt)}
                                </small>
                              </div>

                              <form action={restoreChapterAction}>
                                <input
                                  type="hidden"
                                  name="chapterId"
                                  value={chapter.id}
                                />

                                <input
                                  type="hidden"
                                  name="versionId"
                                  value={version.id}
                                />

                                <button type="submit">
                                  Geri yükle
                                </button>
                              </form>
                            </div>
                          ))
                        ) : (
                          <p className="chapter-version-list__empty">
                            Henüz kayıtlı eski sürüm bulunmuyor.
                          </p>
                        )}
                      </div>
                    </details>

                    {isEmpty ? (
                      <form
                        action={deleteEmptyChapterAction}
                        className="chapter-delete-form"
                      >
                        <input
                          type="hidden"
                          name="chapterId"
                          value={chapter.id}
                        />

                        <button
                          type="submit"
                          className="chapter-danger-action"
                        >
                          Boş bölümü sil
                        </button>
                      </form>
                    ) : null}
                  </div>
                </details>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
