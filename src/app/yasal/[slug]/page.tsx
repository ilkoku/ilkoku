import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedLegalDocumentState } from "@/lib/cms-legal-public-store";
import { contactEmail, legalNavigation, legalPages } from "@/lib/legal-public-content";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";
import "../legal.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type CmsBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };
type CmsSection = { title?: string; blocks: CmsBlock[] };

export function generateStaticParams() {
  return Object.keys(legalPages).map((slug) => ({ slug }));
}

function parseCmsBody(body: string): CmsSection[] {
  const sections: CmsSection[] = [];
  let current: CmsSection = { blocks: [] };

  const flush = () => {
    if (current.title || current.blocks.length > 0) sections.push(current);
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      flush();
      current = { title: line.slice(3).trim(), blocks: [] };
      continue;
    }

    if (line.startsWith("- ")) {
      const item = line.slice(2).trim();
      const previous = current.blocks[current.blocks.length - 1];
      if (previous?.kind === "list") previous.items.push(item);
      else current.blocks.push({ kind: "list", items: [item] });
      continue;
    }

    current.blocks.push({ kind: "paragraph", text: line });
  }

  flush();
  return sections;
}

function CmsLegalBody({ body }: { body: string }) {
  return <>{parseCmsBody(body).map((section, sectionIndex) => (
    <section className="legal-section" key={`${sectionIndex}-${section.title || "giris"}`}>
      {section.title ? <h2>{section.title}</h2> : null}
      {section.blocks.map((block, blockIndex) => block.kind === "list"
        ? <ul key={`list-${sectionIndex}-${blockIndex}`}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
        : <p key={`paragraph-${sectionIndex}-${blockIndex}`}>{block.text}</p>)}
    </section>
  ))}</>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fallback = legalPages[slug];
  if (!fallback) return {};

  const trState = await getPublishedLegalDocumentState(slug, "tr");
  const cms = trState.state === "valid" ? trState.document : null;
  const title = cms?.seoTitle?.trim() || cms?.title || `${fallback.title} | İlkOku`;
  const description = cms?.seoDescription?.trim() || cms?.description || fallback.description;
  const canonical = cms?.canonicalUrl?.trim() || `/yasal/${slug}`;

  return createPublicPageMetadata({
    title,
    description,
    canonical,
    noIndex: Boolean(cms?.noIndex),
    languages: {
      "tr-TR": `/yasal/${slug}`,
      "x-default": `/yasal/${slug}`,
    },
  });
}

export default async function LegalPageRoute({ params }: PageProps) {
  const { slug } = await params;
  const fallback = legalPages[slug];
  if (!fallback) notFound();

  const state = await getPublishedLegalDocumentState(slug, "tr");
  const cms = state.state === "valid" ? state.document : null;
  const title = cms?.title || fallback.title;
  const description = cms?.description || fallback.description;
  const updatedLabel = cms?.updatedLabel || fallback.updatedAt;

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
            <h1>{title}</h1>
            <p>{description}</p>
            <small>Son güncelleme: {updatedLabel}</small>
          </div>

          {cms ? <CmsLegalBody body={cms.body} /> : fallback.sections.map((section) => (
            <section className="legal-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets ? <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}
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
