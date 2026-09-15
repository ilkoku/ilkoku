import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { BookCover } from "@/features/showcase/components/BookCover";
import {
  addAuthorBookSectionAction,
  saveAuthorBookSectionAction,
  setAuthorWorkActiveAction,
  updateAuthorWorkBasicsAction,
} from "@/features/works/author-page-actions";
import {
  bookSectionDetails,
  specialBookSectionKinds,
} from "@/features/works/book-structure";
import { getBookStructure } from "@/features/works/book-structure-repository";
import { WorkArchiveAction } from "@/features/works/components/WorkArchiveAction";
import { getAuthorWorkspaceWorks } from "@/features/works/queries";
import { NewWorkFlow } from "@/features/writer/components/NewWorkFlow";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Eser Sayfası — Düzenle | İlkOku",
  description: "Eser bilgilerini, kitap yapısını ve bölümlerini tek sayfadan yönet.",
  robots: {
    index: false,
    follow: false,
  },
};

type AuthorWorkPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

const MAX_RETURN_PATH_LENGTH = 1500;

function safeReturnPath(value: string | undefined) {
  if (
    !value ||
    value.length > MAX_RETURN_PATH_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/eserlerim";
  }

  return value;
}

function statusLabel(status: string) {
  if (status === "published") return "Yayında";
  if (status === "in_review") return "İncelemede";
  if (status === "archived") return "Arşivde";
  return "Taslak";
}

function visibilityLabel(visibility: string) {
  if (visibility === "public") return "Herkese açık";
  if (visibility === "unlisted") return "Liste dışı";
  return "Özel";
}

function countWords(value: string) {
  const normalized = value
    .replace(/<[^>]*>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return normalized ? normalized.split(" ").length : 0;
}

export default async function AuthorWorkPage({
  params,
  searchParams,
}: AuthorWorkPageProps) {
  const [{ slug }, query, user] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);

  const returnTo = safeReturnPath(query.from);
  const loginReturn = `/kitap/${slug}/duzenle?from=${encodeURIComponent(returnTo)}`;

  if (!user) {
    redirect(`/giris?sonraki=${encodeURIComponent(loginReturn)}`);
  }

  if (user.role !== "writer") {
    redirect("/erisim-reddedildi");
  }

  const work = (await getAuthorWorkspaceWorks(user.id)).find(
    (candidate) => candidate.slug === slug,
  );

  if (!work) {
    notFound();
  }

  const structure = await getBookStructure(user.id, work.id);
  const authorName = user.displayName ?? user.fullName;
  const totalWords = work.chapters.reduce(
    (sum, chapter) => sum + countWords(chapter.content),
    0,
  );
  const publicViewAvailable =
    work.isActive &&
    work.status === "published" &&
    work.visibility === "public" &&
    work.publishedAt !== null;

  return (
    <div className="showcase-page">
      <header className="showcase-topbar">
        <nav className="showcase-topbar__inner" aria-label="Eser Sayfası araçları">
          <Link className="showcase-back" href={returnTo}>
            <span aria-hidden="true">←</span>
            <span>Eserlerime Dön</span>
          </Link>

          <Link className="showcase-brand" href="/" aria-label="İlkOku ana sayfa">
            <span>İlkOku</span>
          </Link>

          <span className="status-badge">Yazar modu</span>
        </nav>
      </header>

      <main id="eser-sayfasi">
        <section className="showcase-hero" aria-labelledby="eser-basligi">
          <BookCover title={work.title} />

          <div className="showcase-hero__content">
            <p className="showcase-eyebrow">Eser Sayfası · Düzenle</p>
            <h1 id="eser-basligi">{work.title}</h1>
            <span className="showcase-author-link">{authorName}</span>

            <dl className="showcase-metadata">
              <div>
                <dt>Tür</dt>
                <dd>{work.genre ?? "Belirtilmedi"}</dd>
              </div>
              <div>
                <dt>Dil</dt>
                <dd>{work.language === "en" ? "İngilizce" : "Türkçe"}</dd>
              </div>
              <div>
                <dt>Yayın durumu</dt>
                <dd>{statusLabel(work.status)}</dd>
              </div>
              <div>
                <dt>Görünürlük</dt>
                <dd>{visibilityLabel(work.visibility)}</dd>
              </div>
              <div>
                <dt>Eser erişimi</dt>
                <dd>{work.isActive ? "Aktif" : "Pasif"}</dd>
              </div>
              <div>
                <dt>Bölüm</dt>
                <dd>{work.chapterCount}</dd>
              </div>
              <div>
                <dt>Toplam kelime</dt>
                <dd>{totalWords.toLocaleString("tr-TR")}</dd>
              </div>
              <div>
                <dt>Kitap yapısı</dt>
                <dd>{structure.length} öğe</dd>
              </div>
            </dl>

            <div className="book-card__actions">
              <NewWorkFlow
                initialWork={work}
                triggerLabel="Yazmaya Devam Et"
              />

              <Link
                className="button button--outline"
                href={`/eserlerim/${work.id}/pasaport`}
              >
                Eser Pasaportu
              </Link>

              {publicViewAvailable ? (
                <Link
                  className="button button--outline"
                  href={`/kitap/${work.slug}?from=${encodeURIComponent(`/kitap/${work.slug}/duzenle`)}`}
                >
                  Okur Görünümü
                </Link>
              ) : (
                <span className="status-badge">Okur görünümü yayında değil</span>
              )}

              {work.status !== "archived" ? (
                <form action={setAuthorWorkActiveAction}>
                  <input name="workId" type="hidden" value={work.id} />
                  <input
                    name="nextActive"
                    type="hidden"
                    value={work.isActive ? "false" : "true"}
                  />
                  <Button type="submit" variant="outline">
                    {work.isActive ? "Eseri Pasife Al" : "Eseri Aktif Et"}
                  </Button>
                </form>
              ) : null}

              <WorkArchiveAction
                archived={work.status === "archived"}
                workId={work.id}
              />
            </div>
          </div>
        </section>

        <div className="showcase-content-grid">
          <div className="showcase-main-column">
            <section className="showcase-section" aria-labelledby="eser-bilgileri-basligi">
              <div className="showcase-section__heading">
                <p>Eser yönetimi</p>
                <h2 id="eser-bilgileri-basligi">Eser Bilgileri</h2>
              </div>

              <form action={updateAuthorWorkBasicsAction} className="workspace-edit-form">
                <input name="workId" type="hidden" value={work.id} />

                <Field
                  label="Başlık"
                  name="title"
                  defaultValue={work.title}
                  required
                />

                <Field
                  control="textarea"
                  label="Özet"
                  name="summary"
                  defaultValue={work.description ?? ""}
                  rows={5}
                />

                <div className="workspace-edit-form__row">
                  <Field
                    label="Tür"
                    name="genre"
                    defaultValue={work.genre ?? ""}
                    required
                  />

                  <Field
                    control="select"
                    label="Dil"
                    name="language"
                    defaultValue={work.language}
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">İngilizce</option>
                  </Field>
                </div>

                <div className="workspace-edit-form__actions">
                  <Button type="submit">Eser Bilgilerini Kaydet</Button>
                </div>
              </form>
            </section>

            <section className="showcase-section" aria-labelledby="kitap-yapisi-basligi">
              <div className="showcase-section__heading">
                <p>Kapak → Ek sayfalar → Bölümler</p>
                <h2 id="kitap-yapisi-basligi">Kitap Yapısı</h2>
              </div>

              <p className="showcase-synopsis">
                Ek sayfalar normal bölümlerden ayrı tutulur. İçindekiler otomatik hazırlanır;
                diğer ek sayfaları hazır şablonla ekleyip burada düzenleyebilirsin.
              </p>

              <form action={addAuthorBookSectionAction} className="workspace-edit-form">
                <input name="workId" type="hidden" value={work.id} />
                <input name="slug" type="hidden" value={work.slug} />

                <Field control="select" label="Ek sayfa ekle" name="kind" defaultValue="title_page">
                  {specialBookSectionKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {bookSectionDetails[kind].label}
                    </option>
                  ))}
                </Field>

                <div className="workspace-edit-form__actions">
                  <Button type="submit" variant="outline">Seçili Sayfayı Ekle</Button>
                </div>
              </form>

              {structure.length > 0 ? (
                <div className="editor-review-list">
                  {structure.map((item) => {
                    const details = bookSectionDetails[item.kind];

                    return (
                      <article className="editor-review-row" key={item.id}>
                        <div>
                          <span>{item.position}. {details.label}</span>
                          <h3>{item.title}</h3>
                          <p>
                            {details.description} · {item.wordCount.toLocaleString("tr-TR")} kelime
                          </p>
                        </div>

                        <div className="editor-review-row__report">
                          {item.kind === "chapter" && item.chapterId ? (
                            <Link
                              className="button button--outline"
                              href={`/yazmaya-devam?eser=${encodeURIComponent(work.id)}&bolum=${encodeURIComponent(item.chapterId)}`}
                            >
                              Bölümü Düzenle
                            </Link>
                          ) : item.kind === "toc" ? (
                            <span className="status-badge">Otomatik</span>
                          ) : (
                            <details>
                              <summary className="button button--outline">Sayfayı Düzenle</summary>
                              <form action={saveAuthorBookSectionAction} className="workspace-edit-form">
                                <input name="workId" type="hidden" value={work.id} />
                                <input name="itemId" type="hidden" value={item.id} />
                                <input name="slug" type="hidden" value={work.slug} />

                                <Field
                                  label="Sayfa başlığı"
                                  name="title"
                                  defaultValue={item.title}
                                  required
                                />
                                <Field
                                  control="textarea"
                                  label="Sayfa içeriği"
                                  name="content"
                                  defaultValue={item.content}
                                  rows={8}
                                />

                                <div className="workspace-edit-form__actions">
                                  <Button type="submit">Sayfayı Kaydet</Button>
                                </div>
                              </form>
                            </details>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="showcase-synopsis">Kitap yapısında henüz öğe bulunmuyor.</p>
              )}
            </section>
          </div>

          <aside className="showcase-aside" aria-label="Eser yönetim özeti">
            <section className="showcase-section">
              <div className="showcase-section__heading">
                <p>Yazar modu</p>
                <h2>Bu Eser Sayfası</h2>
              </div>
              <p>
                Eserlerim listesindeki “Düzenle” artık bu sayfayı açar. Eser bilgileri,
                erişim durumu, yazmaya devam etme ve kitap yapısı burada yönetilir.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
