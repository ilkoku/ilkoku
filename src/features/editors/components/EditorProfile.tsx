import Link from "next/link";
import { editorsContent } from "@/content";
import type { HumanEditor } from "../types";
import { EditorAvatar } from "./EditorAvatar";
import { EditorsHeader } from "./EditorsHeader";
import { EvaluationRequest } from "./EvaluationRequest";

interface EditorProfileProps {
  editor: HumanEditor;
}

export function EditorProfile({ editor }: EditorProfileProps) {
  return (
    <div className="editors-page editor-profile-page">
      <a className="editors-skip-link" href="#editor-profili">{editorsContent.profile.skip}</a>
      <EditorsHeader backHref="/editörler" backLabel={editorsContent.profile.backLabel} />

      <main id="editor-profili">
        <section className="editor-profile-hero" aria-labelledby="editor-adi">
          <div className="editor-profile-hero__identity">
            <EditorAvatar initials={editor.initials} name={editor.name} size="large" />
            <div>
              <p className="editors-eyebrow">{editorsContent.profile.eyebrow}</p>
              <h1 id="editor-adi">{editor.name}</h1>
              <p>{editor.title}</p>
            </div>
          </div>
          <div className="editor-profile-hero__action">
            <span className="editor-availability">{editor.availability}</span>
            <EvaluationRequest editorName={editor.name} />
          </div>
        </section>

        <div className="editor-profile-layout">
          <article className="editor-profile-main">
            <section className="editor-profile-section" aria-labelledby="biyografi-basligi">
              <div className="editors-section-heading"><p>{editorsContent.profile.biographyEyebrow}</p><h2 id="biyografi-basligi">{editorsContent.profile.biographyTitle}</h2></div>
              <p className="editor-profile-prose">{editor.biography}</p>
            </section>

            <section className="editor-profile-section" aria-labelledby="yaklasim-basligi">
              <div className="editors-section-heading"><p>{editorsContent.profile.approachEyebrow}</p><h2 id="yaklasim-basligi">{editorsContent.profile.approachTitle}</h2></div>
              <p className="editor-profile-prose">{editor.approach}</p>
            </section>

            <section className="editor-profile-section" aria-labelledby="ornek-basligi">
              <div className="editors-section-heading"><p>{editorsContent.profile.topicsEyebrow}</p><h2 id="ornek-basligi">{editorsContent.profile.topicsTitle}</h2></div>
              <ol className="editor-sample-list">
                {editor.sampleTopics.map((topic, index) => (
                  <li key={topic}><span>{String(index + 1).padStart(2, "0")}</span><strong>{topic}</strong></li>
                ))}
              </ol>
            </section>

            <section className="editor-profile-section" aria-labelledby="yazar-yorumlari-basligi">
              <div className="editors-section-heading"><p>{editorsContent.profile.reviewsEyebrow}</p><h2 id="yazar-yorumlari-basligi">{editorsContent.profile.reviewsTitle}</h2></div>
              <div className="editor-author-reviews">
                {editor.authorReviews.map((review) => (
                  <blockquote key={review.id}>
                    <p>“{review.comment}”</p>
                    <footer><strong>{review.author}</strong><span>{review.work}</span></footer>
                  </blockquote>
                ))}
              </div>
            </section>
          </article>

          <aside className="editor-profile-aside" aria-label={editorsContent.profile.summaryLabel}>
            <section>
              <p className="editors-eyebrow">{editorsContent.profile.experience}</p>
              <strong>{editor.experienceYears} {editorsContent.directory.years}</strong>
              <span>{editor.completedReviews} {editorsContent.profile.completedReviews}</span>
            </section>
            <section>
              <h2>{editorsContent.profile.specialties}</h2>
              <ul className="editor-tags">{editor.specialties.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section>
              <h2>{editorsContent.profile.genres}</h2>
              <ul className="editor-genre-list">{editor.genres.map((genre) => <li key={genre}>{genre}</li>)}</ul>
            </section>
            <section className="editor-profile-aside__assurance">
              <span aria-hidden="true">✦</span>
              <p><strong>{editorsContent.profile.assuranceTitle}</strong>{editorsContent.profile.assuranceDescription}</p>
            </section>
          </aside>
        </div>

        <footer className="editor-profile-footer">
          <Link href="/editörler">{editorsContent.profile.allEditors}</Link>
        </footer>
      </main>
    </div>
  );
}
