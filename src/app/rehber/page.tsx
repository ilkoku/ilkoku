import type { Metadata } from "next";
import Link from "next/link";

import {
  foundationalGuides,
} from "@/content/public-guides";
import { parseGuideBody } from "@/lib/cms-guides";
import { prisma } from "@/lib/prisma";

type GuideRow = {
  bodyJson: string;
  seoDescription: string | null;
  slug: string;
  title: string;
  updatedAt: Date;
};

type GuideCard = {
  slug: string;
  summary: string;
  title: string;
  updatedAt: Date;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yazarlık ve Yayıncılık Rehberleri | İlkOku",
  description:
    "Yazarlar, okurlar, editörler ve yayınevleri için eser geliştirme, geri bildirim, inceleme ve yayıncılık rehberleri.",
  alternates: {
    canonical: "/rehber",
  },
};

function guideArea(slug: string) {
  if (slug.includes("okur")) return "Okurlar için";
  if (slug.includes("editor")) return "Editörlük";
  if (slug.includes("yayinevi")) return "Yayıncılık";
  if (slug.includes("pasaportu")) return "Eser süreci";
  return "Yazarlar için";
}

export default async function GuidesPage() {
  let cmsGuides: GuideRow[] = [];

  try {
    cmsGuides = await prisma.$queryRaw<GuideRow[]>`
      SELECT slug, title, bodyJson, seoDescription, updatedAt
      FROM ContentPage
      WHERE contentKey LIKE 'guide:%'
        AND contentKey NOT LIKE 'guide:en:%'
        AND status = 'published'
        AND noIndex = false
      ORDER BY publishedAt DESC, updatedAt DESC
      LIMIT 100
    `;
  } catch {
    cmsGuides = [];
  }

  const guideBySlug = new Map<string, GuideCard>(
    foundationalGuides.map((guide) => [
      `/rehber/${guide.slug}`,
      {
        slug: `/rehber/${guide.slug}`,
        summary: guide.summary,
        title: guide.title,
        updatedAt: new Date(guide.updatedAt),
      },
    ]),
  );

  for (const guide of cmsGuides) {
    const stored = parseGuideBody(guide.bodyJson);

    guideBySlug.set(guide.slug, {
      slug: guide.slug,
      summary:
        stored.summary ||
        guide.seoDescription ||
        "İlkOku rehber içeriği",
      title: guide.title,
      updatedAt: guide.updatedAt,
    });
  }

  const guides = [...guideBySlug.values()].sort(
    (left, right) =>
      right.updatedAt.getTime() -
      left.updatedAt.getTime(),
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#faf9ff] to-[#f3f0ff] px-4 py-8 text-[#171426] sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <nav
          aria-label="Genel gezinme"
          className="mb-14 flex flex-wrap items-center justify-between gap-4 text-sm"
        >
          <Link
            className="font-extrabold text-[#5b35dd]"
            href="/"
          >
            İlkOku
          </Link>
          <div className="flex flex-wrap gap-4 font-semibold text-[#625b72]">
            <Link href="/eserler">Eserler</Link>
            <Link href="/yazarlar">Yazarlar</Link>
            <Link href="/turler">Türler</Link>
          </div>
        </nav>

        <header className="max-w-4xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#6847e8]">
            AÇIK EDİTORYAL KÜTÜPHANE
          </p>
          <h1 className="mt-4 text-[clamp(2.8rem,7vw,5.8rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[#11102f]">
            Yazmak, okumak ve yayımlamak için gerçek rehberler.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[#655e78] sm:text-lg">
            İlkOku süreçlerini ve iyi uygulamaları açıklayan
            bu içerikler kayıt olmadan okunabilir. Tanıtım
            yazısından bağımsız editör incelemesine kadar her
            rehber somut bir çalışma ihtiyacına cevap verir.
          </p>
        </header>

        <section
          aria-labelledby="rehber-listesi"
          className="mt-14"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6847e8]">
                KONU KONU İLERLE
              </p>
              <h2
                className="mt-2 text-3xl font-semibold tracking-[-0.035em]"
                id="rehber-listesi"
              >
                Tüm rehberler
              </h2>
            </div>
            <span className="rounded-full border border-[#6847e8]/15 bg-white px-4 py-2 text-xs font-bold text-[#5b35dd]">
              {guides.length} içerik
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {guides.map((guide, index) => (
              <Link
                className="group rounded-[1.35rem] border border-[#6847e8]/12 bg-white/90 p-6 shadow-[0_1rem_3rem_rgba(48,32,112,0.055)] transition hover:-translate-y-1 hover:border-[#6847e8]/30 hover:shadow-[0_1.25rem_3.5rem_rgba(48,32,112,0.1)] sm:p-8"
                href={guide.slug}
                key={guide.slug}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6847e8]">
                    {guideArea(guide.slug)}
                  </span>
                  <span className="text-xs font-bold text-[#aaa3b5]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#20193b] transition group-hover:text-[#5b35dd]">
                  {guide.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#6a6378]">
                  {guide.summary}
                </p>
                <span className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-[#5b35dd]">
                  Rehberi oku
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <aside className="mt-14 grid gap-5 rounded-[1.5rem] bg-[#201839] p-7 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-semibold">
              Rehberden gerçek eserlere geç
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9d2eb]">
              Yayımlanmış eserleri, yazar vitrinlerini ve tür
              sayfalarını aynı public keşif ağı içinde incele.
            </p>
          </div>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-[#4b2dbf]"
            href="/eserler"
          >
            Eserleri keşfet
          </Link>
        </aside>
      </div>
    </main>
  );
}
