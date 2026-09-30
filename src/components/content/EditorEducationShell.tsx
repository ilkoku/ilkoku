import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import LiveHomepageFooter from "@/features/homepage/live-footer";
import {
  getEditorEducationGuideRecord,
  getEditorEducationPublishedTextRecord,
} from "@/lib/cms-editor-education";
import {
  EDITOR_EDUCATION_CATEGORIES,
  editorEducationPublicPath,
  type EditorEducationCategory,
} from "@/lib/editor-education";
import {
  applyEditorEducationTextOverrides,
  type EditorEducationTextOverrides,
} from "@/lib/editor-education-text";

type EditorEducationShellProps = {
  children: ReactNode;
  activeCategory: EditorEducationCategory;
  textOverrides?: EditorEducationTextOverrides;
  previewMode?: boolean;
};

export async function EditorEducationShell({
  children,
  activeCategory,
  textOverrides,
  previewMode = false,
}: EditorEducationShellProps) {
  const [guide, publishedText] = await Promise.all([
    getEditorEducationGuideRecord(activeCategory.slug).catch(() => null),
    typeof textOverrides === "undefined"
      ? getEditorEducationPublishedTextRecord(activeCategory.slug).catch(() => null)
      : Promise.resolve(null),
  ]);
  const cover = guide?.visuals.cover;
  const effectiveOverrides = typeof textOverrides === "undefined"
    ? publishedText?.overrides ?? {}
    : textOverrides;
  const renderedChildren = applyEditorEducationTextOverrides(children, effectiveOverrides);

  return (
    <>
      {previewMode ? (
        <div className="sticky top-0 z-50 border-b border-[#5b35dd]/20 bg-[#efeaff] px-4 py-2 text-center text-xs font-extrabold tracking-[0.08em] text-[#4b2bc5]">
          TASLAK ÖNİZLEME · Bu görünüm henüz canlı değildir
        </div>
      ) : null}

      <div className="min-h-screen bg-[#f8f6f0] text-[#171426]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-10">
          <aside aria-label="Editör eğitimleri" className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[1.4rem] border border-[#2a2338]/10 bg-[#fffdf8] p-3 shadow-sm">
              <div className="px-3 pb-3 pt-2 text-xs font-extrabold uppercase tracking-[.16em] text-[#7c6d94]">Editör Eğitimleri</div>
              <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
                {EDITOR_EDUCATION_CATEGORIES.map((category) => {
                  const active = category.slug === activeCategory.slug;
                  const className = active
                    ? "shrink-0 rounded-xl bg-[#5b35dd] px-3 py-2.5 text-sm font-extrabold !text-white lg:block"
                    : category.live
                      ? "shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5f5869] transition hover:bg-[#f1edf8] hover:text-[#211746] lg:block"
                      : "shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#8a8492] lg:block";

                  if (category.live) {
                    return (
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={className}
                        href={editorEducationPublicPath(category)}
                        key={category.slug}
                        style={active ? { color: "#fff" } : undefined}
                      >
                        {category.title}
                      </Link>
                    );
                  }

                  return (
                    <div aria-disabled="true" className={className} key={category.slug}>
                      {category.title}
                    </div>
                  );
                })}
              </div>
            </div>

            {cover ? (
              <figure className="mt-4 hidden overflow-hidden rounded-[1.4rem] border border-[#2a2338]/10 bg-[#fffdf8] p-2 shadow-sm lg:block">
                <Image
                  src={cover.url}
                  alt={cover.altText || `${activeCategory.title} eğitim kapak görseli`}
                  width={cover.recommendedWidth}
                  height={cover.recommendedHeight}
                  className="h-auto w-full rounded-[1rem] object-contain"
                  unoptimized
                />
                <figcaption className="px-2 pb-1 pt-2 text-[11px] font-semibold leading-5 text-[#7c6d94]">
                  {activeCategory.title}
                </figcaption>
              </figure>
            ) : null}
          </aside>

          <div className="min-w-0">{renderedChildren}</div>
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
