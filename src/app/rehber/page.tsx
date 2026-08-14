import Link from "next/link";
import { prisma } from "@/lib/prisma";

type GuideRow = {
  slug: string;
  title: string;
  description: string | null;
  updatedAt: Date;
};

export const dynamic = "force-dynamic";

export default async function GuidesPage() {
  let guides: GuideRow[] = [];

  try {
    guides = await prisma.$queryRaw<GuideRow[]>`
      SELECT slug, title, description, updatedAt
      FROM ContentPage
      WHERE slug LIKE 'rehber/%'
        AND status = 'published'
      ORDER BY updatedAt DESC
      LIMIT 100
    `;
  } catch {
    guides = [];
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16">
      <header className="mb-10 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">İlkOku</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Rehber & İçerikler</h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">
          Yazarlık, okuma, editörlük ve yayıncılık yolculuğuna yardımcı olacak İlkOku içerikleri.
        </p>
      </header>

      {guides.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 p-6">
          <strong>Henüz yayınlanmış rehber yok.</strong>
          <p className="mt-2 text-sm text-zinc-600">Yeni rehberler yayınlandığında burada görünecek.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/${guide.slug}`}
              className="rounded-2xl border border-zinc-200 p-6 transition hover:border-zinc-400"
            >
              <h2 className="text-xl font-semibold">{guide.title}</h2>
              {guide.description ? (
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600">{guide.description}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
