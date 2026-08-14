import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedGuideBySlug, parseGuideBody } from "@/lib/cms-guides";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPublishedGuideBySlug(slug);
  if (!guide) return {};
  const stored = parseGuideBody(guide.bodyJson);
  const description = guide.seoDescription || stored.summary || undefined;

  return {
    title: guide.seoTitle || `${guide.title} | İlkOku`,
    description,
    alternates: { canonical: guide.canonicalUrl || guide.slug },
    robots: guide.noIndex ? { index: false, follow: true } : undefined,
    openGraph: { title: guide.seoTitle || guide.title, description, type: "article" },
  };
}

function GuideBody({ body }: { body: string }) {
  const blocks = body.split(/\r?\n\r?\n/).map((block) => block.trim()).filter(Boolean);
  return (
    <div className="space-y-5 text-base leading-8 text-zinc-800">
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) return <h2 className="pt-4 text-2xl font-semibold tracking-tight" key={`${index}-${block}`}>{block.slice(3)}</h2>;
        const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
          return <ul className="list-disc space-y-2 pl-6" key={`${index}-${block.slice(0, 20)}`}>{lines.map((line) => <li key={line}>{line.slice(2)}</li>)}</ul>;
        }
        return <p key={`${index}-${block.slice(0, 24)}`}>{block}</p>;
      })}
    </div>
  );
}

export default async function GuideDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const guide = await getPublishedGuideBySlug(slug);
  if (!guide) notFound();
  const stored = parseGuideBody(guide.bodyJson);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-16">
      <article>
        <Link href="/rehber" className="text-sm font-semibold text-zinc-600">← Tüm rehberler</Link>
        <header className="mb-10 mt-8 border-b border-zinc-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">İlkOku Rehber</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">{guide.title}</h1>
          {stored.summary ? <p className="mt-4 text-base leading-7 text-zinc-600">{stored.summary}</p> : null}
          <p className="mt-4 text-xs text-zinc-500">Son güncelleme: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(guide.updatedAt))}</p>
        </header>
        <GuideBody body={stored.body ?? ""} />
      </article>
    </main>
  );
}
