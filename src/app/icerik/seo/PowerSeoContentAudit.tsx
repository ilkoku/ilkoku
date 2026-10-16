import { analyzeContent } from "@power-seo/content-analysis";

type Props = {
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  slug: string;
  bodyJson: string | null;
  noIndex: boolean;
};

const STRUCTURAL_CHECKS = new Set([
  "title-presence",
  "meta-description-presence",
  "heading-structure",
  "single-h1",
  "word-count",
  "internal-links",
  "external-links",
  "image-alt",
  "canonical-url",
]);

function escapeText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Only analyze authored CMS body fields. Never invent missing content or keyphrases.
function cmsAnalysisHtml(raw: string, pageTitle: string): string | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  const html: string[] = [];
  let bodyFound = false;
  const add = (tag: "h2" | "h3" | "p", source: unknown) => {
    if (typeof source !== "string" || !source.trim()) return;
    html.push(`<${tag}>${escapeText(source.slice(0, 12000))}</${tag}>`);
    if (tag === "p") bodyFound = true;
  };
  add("p", data.summary);
  add("p", data.body);
  for (const rawBlock of blocks.slice(0, 80)) {
    if (!rawBlock || typeof rawBlock !== "object" || Array.isArray(rawBlock)) continue;
    const block = rawBlock as Record<string, unknown>;
    add("h2", block.heading);
    add("p", block.body);
    add("p", block.text);
    add("p", block.intro);
    add("p", block.quote);
    if (!Array.isArray(block.items)) continue;
    for (const rawItem of block.items.slice(0, 20)) {
      if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) continue;
      const item = rawItem as Record<string, unknown>;
      add("h3", item.title);
      add("p", item.text);
      add("p", item.answer);
    }
  }
  if (!bodyFound) return null;
  return `<h1>${escapeText(pageTitle)}</h1>${html.join("")}`;
}

export function PowerSeoContentAudit(props: Props) {
  const html = props.bodyJson ? cmsAnalysisHtml(props.bodyJson, props.title) : null;
  if (!html) {
    return (
      <section aria-label="Power-SEO içerik analizi">
        <h3>Power-SEO — İçerik analizi</h3>
        <p>Bu kayıt için incelenebilir CMS gövdesi bulunamadı. Eksik veriyle yanıltıcı puan üretmiyoruz.</p>
      </section>
    );
  }

  const analysis = analyzeContent({
    content: html,
    title: props.seoTitle?.trim() || props.title,
    metaDescription: props.seoDescription?.trim() || "",
    canonicalUrl: props.canonicalUrl?.trim() || undefined,
    siteUrl: "https://ilkoku.com",
    slug: props.slug,
    locale: "tr-TR",
  });
  // The library's English-language readability, E-E-A-T and intent heuristics
  // are not reliable for Turkish. Display only language-neutral checks.
  const checks = analysis.results.filter((item) =>
    STRUCTURAL_CHECKS.has(item.id) && item.status !== "na" && item.maxScore > 0,
  );
  const earned = checks.reduce((sum, item) => sum + item.score, 0);
  const possible = checks.reduce((sum, item) => sum + item.maxScore, 0);
  const score = possible ? Math.round((earned / possible) * 100) : null;

  return (
    <section aria-label="Power-SEO içerik analizi">
      <h3>Power-SEO — Yapısal içerik denetimi</h3>
      {score === null ? (
        <p>Yapısal kontroller için yeterli ölçüm bulunamadı.</p>
      ) : (
        <p><strong>{score}/100</strong> · {checks.length} uygulanabilir yapısal kontrol</p>
      )}
      <p>
        Bu puan yalnız doğrulanabilir yapısal kontrolleri gösterir; Google sıralaması,
        indeksleme garantisi veya Türkçe metnin editoryal kalite puanı değildir.
        {props.noIndex ? " Bu sayfa bilinçli olarak noindex durumundadır." : ""}
      </p>
      {checks.length > 0 ? (
        <ul>
          {checks.map((check) => (
            <li key={check.id}>
              <strong>{check.title}</strong>: {check.status === "good" ? "Uygun" : check.status === "ok" ? "Öneri" : "İyileştirilmeli"} — {check.description}
            </li>
          ))}
        </ul>
      ) : null}
      <p>Odak anahtar kelimesi kayıtlı olmadığı için kelime yoğunluğu puanı oluşturulmadı.</p>
    </section>
  );
}
