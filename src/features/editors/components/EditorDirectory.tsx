import Link from "next/link";
import { editorsContent } from "@/content";
import { editors } from "../data";
import { EditorAvatar } from "./EditorAvatar";
import { EditorsHeader } from "./EditorsHeader";

export function EditorDirectory() {
  const hasEditors = editors.length > 0;

  return (
    <div className="editors-page editors-page--public">
      <a className="editors-skip-link" href="#editor-listesi">{editorsContent.directory.skip}</a>
      <EditorsHeader />

      <main>
        <section className="editors-hero" aria-labelledby="editorler-basligi">
          <div className="editors-hero__copy">
            <p className="editors-eyebrow">Editoryal keşif</p>
            <h1 id="editorler-basligi">Editörleri keşfet</h1>
            <p className="editors-hero__description">
              Yeni eserlerin gelişimine profesyonel katkı sunan doğrulanmış editörleri tanı. Onaylı profiller yayınlandıkça uzmanlıkları, çalışma yaklaşımı ve editoryal deneyimleri burada görünür olacak.
            </p>
            <div className="editors-hero__actions" aria-label="Editör keşif yolları">
              <Link className="editors-public-button editors-public-button--primary" href="/editorler-icin">
                Editörler için nasıl çalışır <span aria-hidden="true">→</span>
              </Link>
              <Link className="editors-public-button" href="/editoryal-standartlar">
                Editoryal standartları incele
              </Link>
            </div>
          </div>
          <div className="editors-human-note">
            <span aria-hidden="true">✦</span>
            <p>
              <strong>Gerçek editör, doğrulanmış profil</strong>
              Bu dizinde yalnız kimliği ve uzmanlığı doğrulanmış gerçek editör profilleri yayınlanır. Demo veya kurgu profil gösterilmez.
            </p>
          </div>
        </section>

        <section className="editor-directory" id="editor-listesi" aria-labelledby="editor-listesi-basligi">
          <div className="editors-section-heading editors-section-heading--row">
            <div>
              <p>Doğrulanmış profesyoneller</p>
              <h2 id="editor-listesi-basligi">İlkOku editör ağı</h2>
            </div>
            <span>{editors.length} {editorsContent.directory.editorSuffix}</span>
          </div>

          {hasEditors ? (
            <div className="editor-directory__grid">
              {editors.map((editor) => (
                <article className="editor-card" key={editor.id}>
                  <header className="editor-card__header">
                    <EditorAvatar initials={editor.initials} name={editor.name} />
                    <span className="editor-availability" data-availability={editor.availability}>{editor.availability}</span>
                  </header>
                  <div className="editor-card__identity">
                    <h3>{editor.name}</h3>
                    <p>{editor.title}</p>
                  </div>
                  <ul className="editor-tags" aria-label={editorsContent.directory.specialties(editor.name)}>
                    {editor.specialties.map((specialty) => <li key={specialty}>{specialty}</li>)}
                  </ul>
                  <dl className="editor-card__stats">
                    <div><dt>{editorsContent.directory.experience}</dt><dd>{editor.experienceYears} {editorsContent.directory.years}</dd></div>
                    <div><dt>{editorsContent.directory.review}</dt><dd>{editor.completedReviews}</dd></div>
                    <div><dt>{editorsContent.directory.satisfaction}</dt><dd>%{editor.satisfaction}</dd></div>
                  </dl>
                  <Link className="button button--outline editor-card__link" href={`/editorler/${editor.slug}`}>
                    <span className="button__label">{editorsContent.directory.inspectProfile}</span>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="editors-empty">
              <div>
                <span>İlk editörlerden biri ol</span>
                <h3>Doğrulanmış editör profilleri yayınlandıkça bu alan büyüyecek.</h3>
                <p>
                  Şu anda kurgu profil göstermek yerine gerçek editör başvurularını ve doğrulama sürecini bekliyoruz. Bu sırada editör modelini, değerlendirme standardını ve eser yolculuğundaki rolünü inceleyebilirsin.
                </p>
              </div>
              <div className="editors-empty__actions">
                <Link className="editors-public-button editors-public-button--primary" href="/kayit?rol=editor">
                  Editör olarak katıl <span aria-hidden="true">→</span>
                </Link>
                <Link className="editors-public-button" href="/editorler-icin">Editörler için sayfası</Link>
                <Link className="editors-public-button" href="/nasil-calisir">Eser yolculuğunu gör</Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
