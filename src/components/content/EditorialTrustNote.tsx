import Link from "next/link";

type EditorialTrustNoteProps = {
  context: "writing" | "reading" | "editing";
};

const contextCopy = {
  writing: "Bu rehber, tür mantığını, örnekleri ve uygulanabilir yazım adımlarını birbirinden ayırarak hazırlanır.",
  reading: "Bu eğitim, okuma becerisini, örnek çözümlemeyi ve uygulanabilir alıştırmaları birbirinden ayırarak hazırlanır.",
  editing: "Bu eğitim, metinden kanıt göstermeyi, kapsam sınırını ve uygulanabilir editöryal geri bildirimi birlikte ele alır.",
} as const;

export function EditorialTrustNote({ context }: EditorialTrustNoteProps) {
  return (
    <aside
      aria-label="İçerik ve editoryal şeffaflık"
      className="mt-6 rounded-[1.8rem] border border-[#6b52c7]/10 bg-[#fffdf8] p-6 shadow-[0_12px_36px_rgba(34,23,70,0.05)] sm:p-7"
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">
        İçerik ve editoryal şeffaflık
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#211746]">
        Hazırlayan: İlkOku
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#696270]">
        {contextCopy[context]} İçerik eğitim amaçlıdır; yayınevi kabul garantisi vermez ve hukuk, sağlık veya finans gibi uzmanlık gerektiren alanlarda profesyonel danışmanlığın yerine geçmez.
      </p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-extrabold">
        <Link
          className="text-[#5b35dd] underline decoration-[#5b35dd]/25 underline-offset-4"
          href="/editoryal-standartlar"
        >
          Editoryal standartlar
        </Link>
        <Link
          className="text-[#5b35dd] underline decoration-[#5b35dd]/25 underline-offset-4"
          href="/hakkimizda"
        >
          İlkOku hakkında
        </Link>
      </div>
      <p className="mt-4 text-xs leading-6 text-[#81798a]">
        Son sayfa güncellemesi: 6 Ekim 2026
      </p>
    </aside>
  );
}
