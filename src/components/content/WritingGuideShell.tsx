import Link from "next/link";
import type { ReactNode } from "react";

import { GENRE_CATEGORIES, getGenresByCategory } from "@/lib/genres";

const LIVE_WRITING_GUIDE_HREFS: Record<string, string> = {
  roman: "/yazarlar-icin/kurgu/roman",
  oyku: "/yazarlar-icin/kurgu/oyku",
  novella: "/yazarlar-icin/kurgu/novella",
};

type WritingGuideShellProps = {
  children: ReactNode;
  activeCategory: (typeof GENRE_CATEGORIES)[number];
  activeGenreSlug: string;
};

export function WritingGuideShell({ children, activeCategory, activeGenreSlug }: WritingGuideShellProps) {
  const genres = getGenresByCategory(activeCategory);

  return (
    <div className="bg-[#f8f6f0] text-[#171426]">
      <nav aria-label="Yazarlık rehberi kategorileri" className="border-b border-[#2a2338]/10 bg-[#fffdf8] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1">
          {GENRE_CATEGORIES.map((category) => {
            const active = category === activeCategory;
            return (
              <span
                aria-current={active ? "page" : undefined}
                className={active
                  ? "shrink-0 rounded-full bg-[#211746] px-4 py-2 text-sm font-extrabold text-white"
                  : "shrink-0 rounded-full border border-[#2a2338]/10 bg-white px-4 py-2 text-sm font-bold text-[#6c6575]"}
                key={category}
              >
                {category}
              </span>
            );
          })}
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-10">
        <aside aria-label={`${activeCategory} eser türleri`} className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[1.4rem] border border-[#2a2338]/10 bg-[#fffdf8] p-3 shadow-sm">
            <div className="px-3 pb-3 pt-2 text-xs font-extrabold uppercase tracking-[.16em] text-[#7c6d94]">{activeCategory}</div>
            <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
              {genres.map((genre) => {
                const active = genre.slug === activeGenreSlug;
                const href = LIVE_WRITING_GUIDE_HREFS[genre.slug];
                const className = active
                  ? "shrink-0 rounded-xl bg-[#5b35dd] px-3 py-2.5 text-sm font-extrabold text-white lg:block"
                  : "shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5f5869] lg:block";

                if (href) {
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={className}
                      href={href}
                      key={genre.slug}
                    >
                      {genre.label}
                    </Link>
                  );
                }

                return (
                  <div className={className} key={genre.slug}>
                    {genre.label}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
