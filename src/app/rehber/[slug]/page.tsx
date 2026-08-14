import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type GuideRow = {
  title: string;
  bodyJson: string;
  seoDescription: string | null;
  updatedAt: Date;
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

function readGuideBody(bodyJson: string) {
  try {
    const body = JSON.parse(bodyJson) as Record<string, unknown>;
    for (const key of ["body", "content", "description"]) {
      if (typeof body[key] === "string" && body[key]) return body[key] as string;
    }
  } catch {
    return "";
  }

  return "";
}

export default async function GuideDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const fullSlug = `rehber/${slug}`;

  let guide: GuideRow | null = null;

  try {
    const rows = await prisma.$queryRaw<GuideRow[]>`
      SELECT title, bodyJson, seoDescription, updatedAt
      FROM ContentPage
      WHERE slug = ${fullSlug}
        AND status = 'published'
      LIMIT 1
    `;
    guide = rows[0] ?? null;
  } catch {
    guide = null;
  }

  if (!guide) notFound();

  const body = readGuideBody(guide.bodyJson);
  const paragraphs = body.split(/\r?\n\r?\n/).map((item) => item.trim()).filter(Boolean);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-16">
      <article>
        <header className="mb-10 border-b border-zinc-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">İlkOku Rehber</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">{guide.title}</h1>
          {guide.seoDescription ? (
            <p className="mt-4 text-base leading-7 text-zinc-600">{guide.seoDescription}</p>
          ) : null}
          <p className="mt-4 text-xs text-zinc-500">
            Son güncelleme: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(guide.updatedAt))}
          </p>
        </header>

        <div className="space-y-5 text-base leading-8 text-zinc-800">
          {paragraphs.length > 0 ? paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
          )) : (
            <p>Bu rehber içeriği henüz hazırlanıyor.</p>
          )}
        </div>
      </article>
    </main>
  );
}
