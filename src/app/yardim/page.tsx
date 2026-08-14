import { prisma } from "@/lib/prisma";

type Row = { valueJson: string };
type Faq = {
  question?: string;
  answer?: string;
  category?: string;
  audience?: string;
  position?: number;
};

const audienceLabels: Record<string, string> = {
  all: "Herkes için",
  reader: "Okuyucular için",
  writer: "Yazarlar için",
  editor: "Editörler için",
  publisher: "Yayınevleri için",
};

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  let items: Faq[] = [];
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'faq' AND status = 'published'
      ORDER BY updatedAt ASC
      LIMIT 300
    `;
    items = rows
      .map((row) => {
        try {
          return JSON.parse(row.valueJson) as Faq;
        } catch {
          return {};
        }
      })
      .filter((item) => item.question && item.answer)
      .sort((a, b) => {
        const positionDiff = (a.position ?? 0) - (b.position ?? 0);
        if (positionDiff !== 0) return positionDiff;
        return (a.category || "Genel").localeCompare(b.category || "Genel", "tr");
      });
  } catch {
    items = [];
  }

  const categories = Array.from(new Set(items.map((item) => item.category || "Genel")));

  return (
    <main style={{ minHeight: "100vh", background: "#f7f5fb", padding: "4rem 1.25rem" }}>
      <div style={{ width: "min(100%, 860px)", margin: "0 auto" }}>
        <header style={{ marginBottom: "2rem" }}>
          <span style={{ color: "#6847e8", fontWeight: 800, fontSize: ".78rem", letterSpacing: ".08em" }}>İLKOKU</span>
          <h1 style={{ margin: ".5rem 0", fontSize: "clamp(2rem,5vw,3.4rem)" }}>Yardım Merkezi</h1>
          <p style={{ color: "#716d80", lineHeight: 1.7 }}>İlkOku hakkında sık sorulan sorular ve rol bazlı yardım içerikleri.</p>
        </header>

        {items.length === 0 ? (
          <section style={{ padding: "2rem", background: "white", borderRadius: "1rem", border: "1px solid #e8e5f0" }}>
            <strong>Yardım içerikleri hazırlanıyor.</strong>
          </section>
        ) : categories.map((category) => (
          <section key={category} style={{ marginBottom: "2rem" }}>
            <h2>{category}</h2>
            <div style={{ display: "grid", gap: ".75rem" }}>
              {items.filter((item) => (item.category || "Genel") === category).map((item, index) => (
                <details key={`${category}-${index}`} style={{ padding: "1rem 1.15rem", background: "white", border: "1px solid #e8e5f0", borderRadius: ".9rem" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 750 }}>{item.question}</summary>
                  <div style={{ marginTop: ".8rem" }}>
                    <span style={{ display: "inline-block", marginBottom: ".35rem", color: "#6847e8", fontSize: ".78rem", fontWeight: 750 }}>
                      {audienceLabels[item.audience || "all"] || audienceLabels.all}
                    </span>
                    <p style={{ margin: 0, color: "#5f5a6c", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{item.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
