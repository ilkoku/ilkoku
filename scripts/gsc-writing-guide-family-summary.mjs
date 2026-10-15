// Pure, read-only classification of Google URL Inspection results by public
// writing-school family. Do not confuse "unknown" with a crawl/indexing error.
const WRITING_FAMILIES = [
  { slug: "kurgu", label: "Kurgu" },
  { slug: "edebiyat", label: "Edebiyat" },
  { slug: "senaryo-ve-sahne", label: "Senaryo ve Sahne" },
  { slug: "akademik", label: "Akademik" },
  { slug: "bilgilendirici", label: "Bilgilendirici" },
  { slug: "cocuk-ve-genclik", label: "Çocuk ve Gençlik" },
  { slug: "cizgi-anlati", label: "Çizgi Anlatı" },
];

function classifyInspection(item) {
  if (item.error) return "errors";
  if (item.verdict === "PASS") return "indexed";
  const state = String(item.coverageState ?? "").toLocaleLowerCase("tr-TR");
  if (state.includes("google tarafından bilinmiyor") || (state.includes("unknown") && state.includes("google"))) return "unknown";
  if (state.includes("keşfedildi") || state.includes("discovered")) return "discovered";
  if (state.includes("tarandı") || state.includes("crawled")) return "crawledNotIndexed";
  return "other";
}

export function summarizeWritingGuideFamilies(results) {
  const families = WRITING_FAMILIES.map(({ slug, label }) => ({
    slug, label, total: 0, indexed: 0, crawledNotIndexed: 0,
    discovered: 0, unknown: 0, errors: 0, other: 0,
  }));
  const bySlug = new Map(families.map((family) => [family.slug, family]));

  for (const item of results) {
    if (typeof item.inspectionUrl !== "string") continue;
    let url;
    try { url = new URL(item.inspectionUrl); } catch { continue; }
    if (url.origin !== "https://ilkoku.com") continue;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 3 || parts[0] !== "yazarlar-icin" || !parts[2]) continue;
    const family = bySlug.get(parts[1]);
    if (!family) continue;
    family.total += 1;
    family[classifyInspection(item)] += 1;
  }

  return families;
}
