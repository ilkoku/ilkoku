import Link from "next/link";

type PublicEditorialDocumentProps = {
  eyebrow: string;
  title: string;
  summary?: string;
  body: string;
  backHref: string;
  backLabel: string;
  updatedAt?: Date | string | null;
  relatedLinks?: readonly {
    description: string;
    href: string;
    label: string;
  }[];
};

function formatUpdatedAt(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(date);
}

function headingId(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tableCells(line: string) {
  return line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  const cells = tableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function EditorialBody({ body }: { body: string }) {
  const blocks = body
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6 text-[1.02rem] leading-8 text-[#302b42]">
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) {
          const title = block.slice(3);
          return (
            <h2 className="scroll-mt-8 pt-5 text-2xl font-semibold tracking-[-0.025em] text-[#17142f] sm:text-3xl" id={headingId(title)} key={`${index}-${block}`}>
              {title}
            </h2>
          );
        }

        if (block.startsWith("### ")) {
          const title = block.slice(4);
          return (
            <h3 className="scroll-mt-8 pt-3 text-xl font-semibold tracking-[-0.02em] text-[#24203f]" id={headingId(title)} key={`${index}-${block}`}>
              {title}
            </h3>
          );
        }

        const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (lines.length >= 2 && lines[0].includes("|") && isTableSeparator(lines[1])) {
          const headers = tableCells(lines[0]);
          const rows = lines.slice(2).map(tableCells);
          return (
            <div className="overflow-x-auto rounded-2xl border border-[#6847e8]/12" key={`${index}-table`}>
              <table className="min-w-full border-collapse text-left text-sm leading-6">
                <thead className="bg-[#f4f1ff] text-[#241b45]">
                  <tr>{headers.map((header) => <th className="whitespace-nowrap border-b border-[#6847e8]/12 px-4 py-3 font-extrabold" key={header}>{header}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#6847e8]/10 bg-white">
                  {rows.map((row, rowIndex) => (
                    <tr key={`${index}-${rowIndex}`}>
                      {headers.map((header, cellIndex) => (
                        <td className="min-w-36 px-4 py-3 align-top text-[#4b465a]" key={`${header}-${cellIndex}`}>
                          {row[cellIndex] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
          return (
            <ul className="space-y-3 pl-1" key={`${index}-${block.slice(0, 24)}`}>
              {lines.map((line) => (
                <li className="flex gap-3" key={line}>
                  <span aria-hidden="true" className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#6847e8]" />
                  <span>{line.slice(2)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (lines.length > 0 && lines.every((line) => /^\d+\.\s/.test(line))) {
          return (
            <ol className="list-decimal space-y-3 pl-6" key={`${index}-${block.slice(0, 24)}`}>
              {lines.map((line) => <li key={line}>{line.replace(/^\d+\.\s/, "")}</li>)}
            </ol>
          );
        }

        return <p className="whitespace-pre-line" key={`${index}-${block.slice(0, 30)}`}>{block}</p>;
      })}
    </div>
  );
}

export function PublicEditorialDocument({
  eyebrow,
  title,
  summary,
  body,
  backHref,
  backLabel,
  updatedAt,
  relatedLinks = [],
}: PublicEditorialDocumentProps) {
  const updatedLabel = formatUpdatedAt(updatedAt);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#faf9ff] to-[#f4f1ff] px-4 py-6 text-[#171426] sm:px-6 sm:py-10 lg:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <nav aria-label="Sayfa yolu" className="mb-10 flex flex-wrap items-center justify-between gap-4 text-sm sm:mb-14">
          <Link className="font-extrabold tracking-[-0.02em] text-[#5b35dd] no-underline" href="/">İlkOku</Link>
          <Link className="font-semibold text-[#5d566f] no-underline transition hover:text-[#4b2dbf]" href={backHref}>← {backLabel}</Link>
        </nav>

        <article>
          <header className="mx-auto mb-8 max-w-4xl text-center sm:mb-10">
            <span className="inline-flex items-center rounded-full border border-[#6847e8]/15 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#5b35dd] shadow-sm">
              {eyebrow}
            </span>
            <h1 className="mt-6 text-[clamp(2.7rem,7vw,5.4rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#11102f]">
              {title}
            </h1>
            {summary ? <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[#655e78] sm:text-lg">{summary}</p> : null}
            {updatedLabel ? <p className="mt-5 text-xs font-medium text-[#8a8499]">Son güncelleme: {updatedLabel}</p> : null}
          </header>

          <section className="relative overflow-hidden rounded-[1.75rem] border border-[#6847e8]/12 bg-white/90 p-6 shadow-[0_1.5rem_4rem_rgba(48,32,112,0.08)] sm:p-10 lg:p-14">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#6847e8]/65 to-transparent" />
            <EditorialBody body={body} />
          </section>

          {relatedLinks.length > 0 ? (
            <aside className="mt-8 sm:mt-10" aria-labelledby="related-public-links">
              <h2 className="text-center text-2xl font-semibold tracking-[-0.025em] text-[#17142f]" id="related-public-links">
                İlkOku içinde devam et
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {relatedLinks.map((link) => (
                  <Link className="rounded-2xl border border-[#6847e8]/12 bg-white p-5 no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-[#6847e8]/30 hover:shadow-md" href={link.href} key={link.href}>
                    <strong className="text-[#4b2dbf]">{link.label} →</strong>
                    <span className="mt-2 block text-sm leading-6 text-[#655e78]">{link.description}</span>
                  </Link>
                ))}
              </div>
            </aside>
          ) : null}

          <div className="mt-8 flex justify-center sm:mt-10">
            <Link className="inline-flex items-center rounded-full border border-[#6847e8]/18 bg-white px-5 py-3 text-sm font-semibold text-[#4b2dbf] no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-[#6847e8]/35 hover:shadow-md" href={backHref}>
              ← {backLabel}
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
