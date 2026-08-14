import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { parseCmsPageBody } from "@/lib/cms-pages";
import { normalizeCmsRedirectPath, parseCmsRedirectValue } from "@/lib/cms-redirects";
import { prisma } from "@/lib/prisma";

type RedirectRow = { valueJson: string };
type PublicPageRow = {
  slug: string;
  title: string;
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
};

type PageProps = { params: Promise<{ path: string[] }> };

export const dynamic = "force-dynamic";

function sourceFromPath(path: string[]) {
  return `/${path.join("/")}`.replace(/\/{2,}/g, "/");
}

async function loadPublicPage(source: string) {
  if (source.split("/").filter(Boolean).length !== 1) return null;
  try {
    const rows = await prisma.$queryRaw<PublicPageRow[]>`
      SELECT slug, title, bodyJson, seoTitle, seoDescription, canonicalUrl, noIndex
      FROM ContentPage
      WHERE slug = ${source}
        AND contentKey LIKE 'page:tr:%'
        AND status = 'published'
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params;
  const source = sourceFromPath(path);
  const page = await loadPublicPage(source);
  if (!page) return {};
  const body = parseCmsPageBody(page.bodyJson);
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || body.summary || undefined,
    alternates: { canonical: page.canonicalUrl || page.slug },
    robots: page.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: page.seoTitle || page.title,
      description: page.seoDescription || body.summary || undefined,
      type: "website",
      locale: "tr_TR",
    },
  };
}

export default async function CmsPageOrRedirectFallback({ params }: PageProps) {
  const { path } = await params;
  const source = sourceFromPath(path);
  const page = await loadPublicPage(source);

  if (page) {
    const content = parseCmsPageBody(page.bodyJson);
    const blocks = content.body.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
    return (
      <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#fbfaff 0%,#f4f1ff 100%)", color: "#171426", padding: "clamp(1.25rem,4vw,3rem) 1rem 4rem" }}>
        <article style={{ width: "min(900px,100%)", margin: "0 auto" }}>
          <nav style={{ marginBottom: "clamp(2rem,5vw,4rem)", display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
            <Link href="/" style={{ fontWeight: 800, color: "#5b35dd", textDecoration: "none" }}>İlkOku</Link>
            <Link href="/" style={{ color: "#4f4964", textDecoration: "none", fontSize: ".9rem" }}>Ana sayfa →</Link>
          </nav>
          <header style={{ marginBottom: "2.4rem" }}>
            <h1 style={{ margin: 0, fontSize: "clamp(2.25rem,6vw,4.8rem)", lineHeight: 1.02, letterSpacing: "-.045em" }}>{page.title}</h1>
            {content.summary ? <p style={{ margin: "1.35rem 0 0", maxWidth: 760, fontSize: "clamp(1.02rem,2vw,1.2rem)", lineHeight: 1.75, color: "#655e78" }}>{content.summary}</p> : null}
          </header>
          <section style={{ background: "rgba(255,255,255,.88)", border: "1px solid rgba(91,53,221,.12)", borderRadius: 20, padding: "clamp(1.3rem,4vw,3rem)", boxShadow: "0 18px 50px rgba(43,31,91,.06)", fontSize: "1rem", lineHeight: 1.88 }}>
            {blocks.map((block, index) => {
              if (block.startsWith("## ")) return <h2 key={index} style={{ margin: index === 0 ? "0 0 1rem" : "2.2rem 0 1rem", fontSize: "1.55rem" }}>{block.slice(3)}</h2>;
              return <p key={index} style={{ margin: index === 0 ? 0 : "1.25rem 0 0", whiteSpace: "pre-line" }}>{block}</p>;
            })}
          </section>
        </article>
      </main>
    );
  }

  let normalizedSource = "";
  try {
    normalizedSource = normalizeCmsRedirectPath(source, "source");
  } catch {
    notFound();
  }

  let rows: RedirectRow[] = [];
  try {
    rows = await prisma.$queryRaw<RedirectRow[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'redirect'
        AND contentKey = ${normalizedSource}
        AND status = 'published'
      LIMIT 1
    `;
  } catch {
    notFound();
  }

  const value = rows[0] ? parseCmsRedirectValue(rows[0].valueJson) : null;
  if (!value || value.source !== normalizedSource) notFound();
  permanentRedirect(value.target);
}
