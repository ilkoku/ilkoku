import Image from "next/image";
import Link from "next/link";
import mobileLogo from "@/assets/brand/ilkoku-logo-mobile.png";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { readingContent, tr } from "@/content";
import type { PublicWorkDetail } from "@/features/works/types";
import { BookCover } from "./BookCover";

function formatDate(value: string | null) {
  if (!value) return "Henüz yayınlanmadı";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(value));
}

function initials(value: string) {
  return value.split(" ").map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr");
}

export function BookShowcase({ work }: { work: PublicWorkDetail }) {
  const completion = work.status === "published" || work.status === "completed" ? 100 : 0;
  const tags = [work.genre, work.work_type === "novel" ? "Roman" : "Eser"];

  return (
    <div className="showcase-page">
      <a className="showcase-skip-link" href="#kitap-vitrini">{readingContent.showcase.skip}</a>

      <header className="showcase-topbar">
        <nav className="showcase-topbar__inner" aria-label={readingContent.showcase.tools}>
          <Link className="showcase-back" href="/">
            <span aria-hidden="true">←</span>
            <span>{readingContent.common.back}</span>
          </Link>
          <Link className="showcase-brand" href="/" aria-label={readingContent.common.homeLabel}>
            <Image src={mobileLogo} alt="" aria-hidden="true" width={36} height={36} priority />
            <span>{tr.brand.name}</span>
          </Link>
          <div className="showcase-actions">
            <Button variant="ghost" aria-label={readingContent.showcase.shareLabel}>{readingContent.common.share}</Button>
            <Button variant="outline" aria-label={readingContent.showcase.saveLabel}>{readingContent.common.save}</Button>
          </div>
        </nav>
      </header>

      <main id="kitap-vitrini">
        <section className="showcase-hero" aria-labelledby="kitap-basligi">
          <BookCover title={work.title} />
          <div className="showcase-hero__content">
            <p className="showcase-eyebrow">{readingContent.showcase.eyebrow}</p>
            <h1 id="kitap-basligi">{work.title}</h1>
            <Link className="showcase-author-link" href="#yazar">{work.authorName}</Link>
            <dl className="showcase-metadata">
              <div><dt>{readingContent.common.category}</dt><dd>{work.genre}</dd></div>
              <div><dt>{readingContent.showcase.status}</dt><dd>{work.status === "published" ? "Yayında" : "Tamamlandı"}</dd></div>
              <div><dt>{readingContent.common.totalChapters}</dt><dd>{work.chapterCount}</dd></div>
              <div><dt>{readingContent.showcase.reads}</dt><dd>—</dd></div>
              <div><dt>{readingContent.showcase.comment}</dt><dd>0</dd></div>
              <div><dt>{readingContent.showcase.publicationDate}</dt><dd>{formatDate(work.published_at)}</dd></div>
            </dl>
            <div className="showcase-progress">
              <div><span>{readingContent.common.completion}</span><strong>%{completion}</strong></div>
              <progress max={100} value={completion} aria-label={readingContent.common.completionLabel(completion)}>%{completion}</progress>
            </div>
            <Link className="button button--primary showcase-cta" href={`/oku/${work.slug}/bolum-1`}>
              <span className="button__label"><span aria-hidden="true">📖</span> {readingContent.showcase.firstChapter}</span>
            </Link>
          </div>
        </section>

        <div className="showcase-content-grid">
          <div className="showcase-main-column">
            <section className="showcase-section" aria-labelledby="tanitim-basligi">
              <div className="showcase-section__heading">
                <p>{readingContent.showcase.introduction}</p>
                <h2 id="tanitim-basligi">{readingContent.showcase.backCover}</h2>
              </div>
              <p className="showcase-synopsis">{work.summary || "Yazar bu eser için henüz bir tanıtım metni eklemedi."}</p>
              <ul className="showcase-tags" aria-label={readingContent.showcase.tags}>
                {tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            </section>

            <section className="showcase-section" aria-labelledby="yorumlar-basligi">
              <div className="showcase-section__heading showcase-section__heading--row">
                <div><p>{readingContent.showcase.readerOpinions}</p><h2 id="yorumlar-basligi">{readingContent.showcase.latestComments}</h2></div>
                <span>0 yorum</span>
              </div>
              <div className="showcase-comments" aria-label={readingContent.showcase.latestFiveComments}>
                <p>Bu eser için henüz okur yorumu yok.</p>
              </div>
            </section>
          </div>

          <aside className="showcase-aside" aria-label={readingContent.showcase.authorInfo}>
            <Card className="showcase-author-card" id="yazar">
              <p className="showcase-eyebrow">{readingContent.showcase.author}</p>
              <div className="showcase-author-card__identity">
                <span className="showcase-avatar" role="img" aria-label={`${work.authorName} profil fotoğrafı`}>{initials(work.authorName)}</span>
                <div><strong>{work.authorName}</strong><small>{readingContent.showcase.novelist}</small></div>
              </div>
              <p>Yazarın profil bilgileri yayınlandığında burada görünecek.</p>
            </Card>
          </aside>
        </div>

        <section className="showcase-similar" id="benzer-eserler" aria-labelledby="benzer-basligi">
          <div className="showcase-section__heading">
            <p>{readingContent.showcase.continueReading}</p>
            <h2 id="benzer-basligi">{readingContent.showcase.similarWorks}</h2>
          </div>
          <p>Benzer eserler gerçek yayın verileri oluştukça burada listelenecek.</p>
        </section>
      </main>
    </div>
  );
}
