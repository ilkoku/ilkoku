import type { Metadata } from "next";

import { EditorEducationShell } from "@/components/content/EditorEducationShell";
import { getEditorEducationCategory } from "@/lib/editor-education";

export const metadata: Metadata = {
  title: "Editörlüğe Başlama | İlkOku Editörlük Okulu",
  description: "İlkOku Editörlük Okulu için profesyonel editörlüğe başlangıç eğitim alanı.",
  robots: { index: false, follow: true },
};

export default function EditorlugeBaslamaShellPage() {
  const category = getEditorEducationCategory("editorluge-baslama");
  if (!category) return null;

  return (
    <EditorEducationShell activeCategory={category}>
      <article className="mx-auto max-w-5xl text-[#211746]">
        <header className="overflow-hidden rounded-[2.5rem] bg-[#17122f] px-7 py-10 text-white shadow-[0_24px_70px_rgba(23,18,47,0.22)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b7a8ff]">İlkOku · Editörlük Okulu</span>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">Editörlüğe Başlama</h1>
          <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#f2eefc] sm:text-2xl sm:leading-10">
            Profesyonel editörlüğün temelini, sorumluluk alanını ve çalışma sınırlarını sistemli biçimde öğren.
          </p>
        </header>
      </article>
    </EditorEducationShell>
  );
}
