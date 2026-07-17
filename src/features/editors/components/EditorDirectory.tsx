import Link from "next/link";
import { Field } from "@/components/ui/Field";
import { editorsContent } from "@/content";
import { editors } from "../data";
import { EditorAvatar } from "./EditorAvatar";
import { EditorsHeader } from "./EditorsHeader";

export function EditorDirectory() {
  return (
    <div className="editors-page">
      <a className="editors-skip-link" href="#editor-listesi">{editorsContent.directory.skip}</a>
      <EditorsHeader />

      <main>
        <section className="editors-hero" aria-labelledby="editorler-basligi">
          <div>
            <p className="editors-eyebrow">{editorsContent.directory.eyebrow}</p>
            <h1 id="editorler-basligi">{editorsContent.directory.title}</h1>
            <p className="editors-hero__description">{editorsContent.directory.description}</p>
          </div>
          <div className="editors-human-note">
            <span aria-hidden="true">✦</span>
            <p><strong>{editorsContent.directory.humanTitle}</strong>{editorsContent.directory.humanDescription}</p>
          </div>
        </section>

        <section className="editors-filters" aria-labelledby="filtreler-basligi">
          <div className="editors-section-heading editors-section-heading--compact">
            <p>{editorsContent.directory.filterEyebrow}</p>
            <h2 id="filtreler-basligi">{editorsContent.directory.filtersTitle}</h2>
          </div>
          <form className="editors-filter-grid">
            {editorsContent.directory.filters.map((filter) => (
              <Field control="select" label={filter.label} name={filter.label.toLocaleLowerCase("tr").replaceAll(" ", "-")} defaultValue="" key={filter.label}>
                {filter.values.map((value, index) => <option value={index === 0 ? "" : value} key={value}>{value}</option>)}
              </Field>
            ))}
          </form>
        </section>

        <section className="editor-directory" id="editor-listesi" aria-labelledby="editor-listesi-basligi">
          <div className="editors-section-heading editors-section-heading--row">
            <div>
              <p>{editorsContent.directory.listEyebrow}</p>
              <h2 id="editor-listesi-basligi">{editorsContent.directory.listTitle}</h2>
            </div>
            <span>{editors.length} {editorsContent.directory.editorSuffix}</span>
          </div>

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
                <Link className="button button--outline editor-card__link" href={`/editörler/${editor.slug}`}>
                  <span className="button__label">{editorsContent.directory.inspectProfile}</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
