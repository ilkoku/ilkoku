import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contactEmail, legalNavigation, legalPages } from "@/lib/legal-public-content";
import "../legal.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return Object.keys(legalPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = legalPages[slug];

  if (!page) return {};

  return {
    title: `${page.title} | İlkOku`,
    description: page.description,
    alternates: { canonical: `/yasal/${slug}` },
  };
}

export default async function LegalPageRoute({ params }: PageProps) {
  const { slug } = await params;
  const page = legalPages[slug];
  if (!page) notFound();

  return (
    <main className="legal-page">
      <header className="legal-header">
        <div className="legal-shell legal-header__inner">
          <Link className="legal-brand" href="/">İlkOku</Link>
          <Link className="legal-back" href="/">Ana sayfaya dön</Link>
        </div>
      </header>

      <div className="legal-shell legal-layout">
        <nav className="legal-nav" aria-label="Yasal sayfalar">
          {legalNavigation.map(([hrefSlug, label]) => (
            <Link className={hrefSlug === slug ? "is-active" : undefined} href={`/yasal/${hrefSlug}`} key={hrefSlug}>
              {label}
            </Link>
          ))}
        </nav>

        <article className="legal-document">
          <div className="legal-document__head">
            <span>İlkOku · Yasal</span>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
            <small>Son güncelleme: {page.updatedAt}</small>
          </div>

          {page.sections.map((section) => (
            <section className="legal-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets ? (
                <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>
              ) : null}
            </section>
          ))}

          <div className="legal-contact">
            <strong>İletişim</strong>
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </div>
        </article>
      </div>
    </main>
  );
}
