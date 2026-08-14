import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type Row = { valueJson: string };
type Faq = { question?: string; answer?: string; category?: string; audience?: string; position?: number };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Help Center | İlkOku",
  description: "Frequently asked questions and role-based help for İlkOku.",
  alternates: { canonical: "https://ilkoku.com/en/yardim", languages: { "tr-TR": "https://ilkoku.com/yardim", en: "https://ilkoku.com/en/yardim" } },
};

const audienceLabels: Record<string, string> = {
  all: "Everyone",
  reader: "Reader",
  writer: "Writer",
  editor: "Editor",
  publisher: "Publisher",
};

export default async function EnglishHelpPage() {
  if (!(await isCmsLocaleEnabled("en"))) notFound();
  const namespace = cmsLocaleNamespace("faq", "en");
  let items: Faq[] = [];

  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = ${namespace} AND status = 'published'
      ORDER BY updatedAt ASC
      LIMIT 300
    `;
    items = rows.map((row) => {
      try { return JSON.parse(row.valueJson) as Faq; } catch { return {}; }
    }).filter((item) => item.question && item.answer)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  } catch { items = []; }

  const categories = Array.from(new Set(items.map((item) => item.category || "General")));

  return (
    <main style={{ minHeight: "100vh", background: "#f7f5fb", padding: "4rem 1.25rem" }}>
      <div style={{ width: "min(100%, 860px)", margin: "0 auto" }}>
        <header style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}><span style={{ color: "#6847e8", fontWeight: 800, fontSize: ".78rem", letterSpacing: ".08em" }}>İLKOKU</span><div style={{ display: "flex", gap: ".8rem" }}><Link href="/en">Home</Link><Link href="/yardim">Türkçe</Link></div></div>
          <h1 style={{ margin: ".5rem 0", fontSize: "clamp(2rem,5vw,3.4rem)" }}>Help Center</h1>
          <p style={{ color: "#716d80", lineHeight: 1.7 }}>Frequently asked questions and role-based help for İlkOku.</p>
        </header>

        {items.length === 0 ? (
          <section style={{ padding: "2rem", background: "white", borderRadius: "1rem", border: "1px solid #e8e5f0" }}><strong>English help content is being prepared.</strong></section>
        ) : categories.map((category) => (
          <section key={category} style={{ marginBottom: "2rem" }}>
            <h2>{category}</h2>
            <div style={{ display: "grid", gap: ".75rem" }}>
              {items.filter((item) => (item.category || "General") === category).map((item, index) => (
                <details key={`${category}-${index}`} style={{ padding: "1rem 1.15rem", background: "white", border: "1px solid #e8e5f0", borderRadius: ".9rem" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 750 }}>{item.question} <small style={{ color: "#8a8495", marginLeft: ".4rem" }}>· {audienceLabels[item.audience || "all"] || "Everyone"}</small></summary>
                  <p style={{ margin: ".8rem 0 0", color: "#5f5a6c", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
