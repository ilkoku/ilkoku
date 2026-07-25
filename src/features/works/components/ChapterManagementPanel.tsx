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
  const normalized = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.split(" ").length : 0;
}

export async function ChapterManagementPanel({ authorId, chapters }: ChapterManagementPanelProps) {
  if (!chapters.length) return null;

  const rows = await Promise.all(
    chapters.map(async (chapter) => ({
      chapter,
      versions: await getChapterVersions(authorId, chapter.id),
    })),
  );

  return (
    <section className="chapter-management-panel" aria-labelledby="chapter-management-title">
      <div className="chapter-management-panel__heading">
        <div>
          <p>Bölüm Yönetimi</p>
          <h2 id="chapter-management-title">Sil, yeniden yaz veya eski sürüme dön</h2>
        </div>
        <span>{chapters.length} bölüm</span>
      </div>

      <div className="chapter-management-panel__list">
        {rows.map(({ chapter, versions }) => {
          const words = chapter.wordCount ?? countWords(chapter.content);
          const isEmpty = words === 0;

          return (
            <article className="chapter-management-card" key={chapter.id}>
              <div className="chapter-management-card__summary">
                <span>{chapter.position}</span>
                <div>
                  <strong>{chapter.title}</strong>
                  <small>{words.toLocaleString("tr-TR")} kelime</small>
                </div>
              </div>

              <div className="chapter-management-card__actions">
                {isEmpty ? (
                  <form action={deleteEmptyChapterAction}>
                    <input type="hidden" name="chapterId" value={chapter.id} />
                    <button type="submit" className="chapter-danger-action">Boş Bölümü Sil</button>
                  </form>
                ) : (
                  <form action={rewriteChapterAction}>
                    <input type="hidden" name="chapterId" value={chapter.id} />
                    <button type="submit">Yeniden Yaz</button>
                  </form>
                )}

                <details>
                  <summary>Geçmiş ({versions.length})</summary>
                  <div className="chapter-version-list">
                    {versions.length ? versions.map((version) => (
                      <div className="chapter-version-row" key={version.id}>
                        <div>
                          <strong>v{version.versionNumber}</strong>
                          <small>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(version.createdAt)}</small>
                        </div>
                        <form action={restoreChapterAction}>
                          <input type="hidden" name="chapterId" value={chapter.id} />
                          <input type="hidden" name="versionId" value={version.id} />
                          <button type="submit">Geri Yükle</button>
                        </form>
                      </div>
                    )) : <p>Henüz arşivlenmiş sürüm yok.</p>}
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
