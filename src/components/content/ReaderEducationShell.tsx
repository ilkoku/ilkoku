import Link from "next/link";
import type { ReactNode } from "react";

import LiveHomepageFooter from "@/app/onizleme/ana-sayfa-yeni/live-footer";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import {
  READER_EDUCATION_CATEGORIES,
  readerEducationPublicPath,
  type ReaderEducationCategory,
} from "@/lib/reader-education";

type ReaderEducationShellProps = {
  children: ReactNode;
  activeCategory: ReaderEducationCategory;
};

export function ReaderEducationShell({ children, activeCategory }: ReaderEducationShellProps) {
  return (
    <>
      <div className="min-h-screen bg-[#f8f6f0] text-[#171426]">
        <PublicSiteHeader />

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-10">
          <aside aria-label="Okur eğitimleri" className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[1.4rem] border border-[#2a2338]/10 bg-[#fffdf8] p-3 shadow-sm">
              <div className="px-3 pb-3 pt-2 text-xs font-extrabold uppercase tracking-[.16em] text-[#7c6d94]">Okur Eğitimleri</div>
              <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
                {READER_EDUCATION_CATEGORIES.map((category) => {
                  const active = category.slug === activeCategory.slug;
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={active
                        ? "shrink-0 rounded-xl bg-[#5b35dd] px-3 py-2.5 text-sm font-extrabold !text-white lg:block"
                        : "shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5f5869] transition hover:bg-[#f1edf8] hover:text-[#211746] lg:block"}
                      href={readerEducationPublicPath(category)}
                      key={category.slug}
                      style={active ? { color: "#fff" } : undefined}
                    >
                      {category.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>

      <LiveHomepageFooter
        signedIn={false}
        slogan="İlk cümle, ilk okurun, ilk adımın."
        copyright={`© ${new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.`}
      />
    </>
  );
}
