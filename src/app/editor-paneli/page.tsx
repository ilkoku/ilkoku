import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { completeEditorReviewAction } from "@/features/editor-review/actions/editor-review.actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import "./editor-panel.css";

export const metadata: Metadata = {
  title: "Editör Paneli | İlkOku",
  description:
    "Editör inceleme ve geri bildirim çalışma alanı.",
};

export const dynamic = "force-dynamic";

interface EditorPanelPageProps {
  searchParams: Promise<{
    gonderildi?: string;
  }>;
}

function wordCount(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export default async function EditorPanelPage({
  searchParams,
}: EditorPanelPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/giris");
  }

  if (user.role !== "editor") {
    redirect("/erisim-reddedildi");
  }

  const parameters = await searchParams;

  const works = await prisma.work.findMany({
    where: {
      archivedAt: null,
      status: "published",
      editorReviewStatus: "requested",
    },
    include: {
      author: {
        select: {
          email: true,
          fullName: true,
        },
      },
      chapters: {
        where: {
          archivedAt: null,
          status: {
            not: "archived",
          },
        },
        orderBy: {
          position: "asc",
        },
        select: {
          content: true,
          id: true,
          position: true,
          title: true,
          updatedAt: true,
        },
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  return (
    <main className="editor-review-page">
      <header className="editor-review-hero">
        <div>
          <span className="editor-review-eyebrow">
            İlkOku İnsan Editör Sistemi
          </span>

          <h1>Editör çalışma alanı</h1>

          <p>
            İnceleme bekleyen yayımlanmış eserleri bir bütün
            olarak oku ve yazara yapılandırılmış geri
            bildirim gönder.
          </p>
        </div>

        <div className="editor-review-summary">
          <span>Bekleyen eser</span>
          <strong>{works.length}</strong>
        </div>
      </header>

      {parameters.gonderildi === "1" && (
        <div
          className="editor-review-success"
          role="status"
        >
          Eser değerlendirmesi yazara gönderildi.
        </div>
      )}

      {works.length === 0 ? (
        <section className="editor-review-empty">
          <span aria-hidden="true">✓</span>
          <h2>Bekleyen inceleme yok</h2>
          <p>
            Yazarlar eserlerini editöre
            gönderdiğinde burada görünecek.
          </p>
        </section>
      ) : (
        <section className="editor-review-list">
          {works.map((work) => {
            const totalWords =
              work.chapters.reduce(
                (total, chapter) =>
                  total +
                  wordCount(chapter.content),
                0,
              );

            return (
              <article
                className="editor-review-card"
                key={work.id}
              >
                <header className="editor-review-card__header">
                  <div>
                    <span className="editor-review-status">
                      İnceleme bekliyor
                    </span>

                    <h2>{work.title}</h2>

                    <p>
                      {work.author.fullName}
                      {" · "}
                      {work.author.email}
                    </p>
                  </div>

                  <dl className="editor-review-metrics">
                    <div>
                      <dt>Bölüm</dt>
                      <dd>
                        {work.chapters.length}
                      </dd>
                    </div>

                    <div>
                      <dt>Kelime</dt>
                      <dd>
                        {totalWords.toLocaleString(
                          "tr-TR",
                        )}
                      </dd>
                    </div>
                  </dl>
                </header>

                <div className="editor-review-layout">
                  <aside className="editor-review-chapters">
                    <h3>Bölümler</h3>

                    {work.chapters.map(
                      (chapter) => (
                        <details
                          className="editor-review-chapter"
                          key={chapter.id}
                        >
                          <summary>
                            <span>
                              {chapter.position}
                            </span>

                            <strong>
                              {chapter.title}
                            </strong>

                            <small>
                              {wordCount(
                                chapter.content,
                              ).toLocaleString(
                                "tr-TR",
                              )}{" "}
                              kelime
                            </small>
                          </summary>

                          <div className="editor-review-chapter__content">
                            {chapter.content ||
                              "Bu bölümde henüz içerik bulunmuyor."}
                          </div>
                        </details>
                      ),
                    )}
                  </aside>

                  <form
                    action={
                      completeEditorReviewAction
                    }
                    className="editor-review-form"
                  >
                    <input
                      name="workId"
                      type="hidden"
                      value={work.id}
                    />

                    <div className="editor-review-form__heading">
                      <span>
                        Değerlendirme
                      </span>
                      <h3>
                        Yazara geri bildirim
                      </h3>
                    </div>

                    <div className="editor-review-form__row">
                      <label>
                        <span>Kategori</span>

                        <select
                          defaultValue="genel"
                          name="category"
                        >
                          <option value="genel">
                            Genel değerlendirme
                          </option>
                          <option value="kurgu">
                            Kurgu
                          </option>
                          <option value="dil">
                            Dil ve anlatım
                          </option>
                          <option value="karakter">
                            Karakter
                          </option>
                          <option value="tempo">
                            Tempo
                          </option>
                          <option value="ozgunluk">
                            Özgünlük
                          </option>
                        </select>
                      </label>

                      <label>
                        <span>Puan</span>

                        <input
                          defaultValue="80"
                          max="100"
                          min="0"
                          name="score"
                          type="number"
                        />
                      </label>
                    </div>

                    <label>
                      <span>
                        Geri bildirim başlığı
                      </span>

                      <input
                        maxLength={160}
                        minLength={3}
                        name="title"
                        placeholder="Örn. Eserin genel değerlendirmesi"
                        required
                      />
                    </label>

                    <label>
                      <span>
                        Editör değerlendirmesi
                      </span>

                      <textarea
                        maxLength={10000}
                        minLength={20}
                        name="content"
                        placeholder="Güçlü yönleri, geliştirilmesi gereken alanları ve somut revizyon önerilerini yazın."
                        required
                      />
                    </label>

                    <label className="editor-review-priority">
                      <input
                        name="priority"
                        type="checkbox"
                        value="important"
                      />

                      <span>
                        Önemli geri bildirim
                      </span>
                    </label>

                    <button type="submit">
                      Geri Bildirimi Gönder
                    </button>

                    <small>
                      Değerlendirme eser seviyesinde kaydedilir;
                      yayımdaki eser otomatik olarak taslağa
                      alınmaz.
                    </small>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
