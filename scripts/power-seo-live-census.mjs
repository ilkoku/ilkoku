import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ORIGIN = "https://ilkoku.com";
const MAX_URLS = 400;
const MAX_HTML_BYTES = 1_500_000;
const TIMEOUT_MS = 12_000;
const CONCURRENCY = 2;

function decodeEntity(value) {
  return value.replace(/&amp;/gu, "&").replace(/&quot;/gu, '"').replace(/&#39;/gu, "'");
}

function attribute(tag, name) {
  const result = new RegExp("\\b" + name + "\\s*=\\s*([\"'])(.*?)\\1", "iu").exec(tag);
  return result ? decodeEntity(result[2]).trim() : "";
}

function canonicalFromHtml(html) {
  for (const tag of html.match(/<link\b[^>]*>/giu) || []) {
    if (attribute(tag, "rel").toLowerCase().split(/\s+/u).includes("canonical")) {
      return attribute(tag, "href");
    }
  }
  return "";
}

function robotsFromHtml(html) {
  for (const tag of html.match(/<meta\b[^>]*>/giu) || []) {
    if (attribute(tag, "name").toLowerCase() === "robots") return attribute(tag, "content");
  }
  return "";
}

function descriptionFromHtml(html) {
  for (const tag of html.match(/<meta\b[^>]*>/giu) || []) {
    if (attribute(tag, "name").toLowerCase() === "description") {
      return attribute(tag, "content");
    }
  }
  return "";
}

function comparableDescription(value) {
  return value.normalize("NFC").toLocaleLowerCase("tr-TR").replace(/\s+/gu, " ").trim();
}

// Review-only: fixed word windows expose templated near-duplicates without
// claiming that similar text is inherently an SEO error or Google penalty.
function descriptionWordShingles(value, size = 4) {
  const words = comparableDescription(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const shingles = new Set();
  for (let i = 0; i <= words.length - size; i += 1) {
    shingles.add(words.slice(i, i + size).join(" "));
  }
  return shingles;
}

function descriptionSimilarity(a, b) {
  const left = descriptionWordShingles(a);
  const right = descriptionWordShingles(b);
  if (!left.size || !right.size) return 0;
  let common = 0;
  for (const phrase of left) if (right.has(phrase)) common += 1;
  return common / (left.size + right.size - common);
}

// Read only the public <main> content already downloaded by the census.
// Exclude layout navigation and secondary rails before comparing pages.
function mainTextFromHtml(html) {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/iu.exec(html)?.[1] || "";
  if (!main) return "";
  return main
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<(script|style|svg|nav|aside|footer)\b[^>]*>[\s\S]*?<\/\1>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&(?:amp|nbsp|quot|apos|lt|gt);/giu, (entity) => ({
      "&amp;": "&", "&nbsp;": " ", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">",
    })[entity.toLowerCase()] || entity)
    .replace(/&#(?:x([0-9a-f]+)|([0-9]+));/giu, (value, hex, dec) => {
      const codepoint = Number.parseInt(hex || dec, hex ? 16 : 10);
      return codepoint > 0 && codepoint <= 0x10ffff ? String.fromCodePoint(codepoint) : value;
    })
    .replace(/\s+/gu, " ").trim();
}

function comparableMainText(value) {
  return value.normalize("NFC").toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function mainWordShingles(value, size = 8) {
  const words = comparableMainText(value).split(/\s+/u).filter(Boolean);
  const phrases = new Set();
  for (let i = 0; i + size <= words.length; i += 1) phrases.add(words.slice(i, i + size).join(" "));
  return { wordCount: words.length, phrases };
}

function compareMainContent(pages) {
  const documentFrequency = new Map();
  const snapshots = pages.map((page) => {
    const { wordCount, phrases } = mainWordShingles(page.mainText);
    for (const phrase of phrases) documentFrequency.set(phrase, (documentFrequency.get(phrase) || 0) + 1);
    return { url: page.url, wordCount, raw: phrases, normalized: comparableMainText(page.mainText) };
  });
  // A phrase present on four or more pages is treated as likely common boilerplate.
  // The 8-word threshold is editorial triage, not an indexing or duplicate-content rule.
  for (const item of snapshots) {
    item.distinct = new Set([...item.raw].filter((phrase) => documentFrequency.get(phrase) < 4));
  }

  const duplicates = new Map();
  for (const page of snapshots) {
    if (page.wordCount < 100) continue;
    const group = duplicates.get(page.normalized) || [];
    group.push(page.url);
    duplicates.set(page.normalized, group);
  }
  const exactDuplicateMainBodies = [...duplicates.values()].filter((urls) => urls.length > 1)
    .map((urls) => ({ count: urls.length, urls }));

  const contentOverlapCandidates = [];
  for (let i = 0; i < snapshots.length; i += 1) {
    for (let j = i + 1; j < snapshots.length; j += 1) {
      const left = snapshots[i];
      const right = snapshots[j];
      if (left.wordCount < 100 || right.wordCount < 100 || !left.distinct.size || !right.distinct.size) continue;
      let sharedDistinct = 0;
      for (const phrase of left.distinct) if (right.distinct.has(phrase)) sharedDistinct += 1;
      const shorterDistinct = Math.min(left.distinct.size, right.distinct.size);
      const overlapOfShorter = sharedDistinct / shorterDistinct;
      if (sharedDistinct >= 20 && overlapOfShorter >= 0.2) {
        contentOverlapCandidates.push({
          first: left.url, second: right.url,
          firstWords: left.wordCount, secondWords: right.wordCount,
          sharedDistinctPhrases: sharedDistinct,
          overlapOfShorter: Math.round(overlapOfShorter * 1000) / 1000,
          classification: "manual-editorial-review-only",
        });
      }
    }
  }
  contentOverlapCandidates.sort((a, b) => b.overlapOfShorter - a.overlapOfShorter);
  return {
    exactDuplicateMainBodies,
    contentOverlapCandidates,
    mainContentStats: snapshots.map(({ url, wordCount, raw, distinct }) => ({
      url, wordCount, phraseCount: raw.size, distinctivePhraseCount: distinct.size,
      review: wordCount < 100 ? "short-content-review-only" : "",
    })),
  };
}

function normalize(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin === ORIGIN
      ? (parsed.origin + parsed.pathname.replace(/\/+$/u, "")).toLowerCase()
      : "";
  } catch {
    return "";
  }
}

async function read(url, limit) {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "IlkOku-PowerSEO-LiveCensus/1.0" },
  });
  const bytes = Number(response.headers.get("content-length") || 0);
  if (bytes > limit) throw new Error("Response content-length exceeds safety limit");
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > limit) throw new Error("Response exceeds safety limit");
  return { response, body: new TextDecoder().decode(buffer) };
}

function parseSitemap(xml) {
  if (!/<urlset(?:\s|>)/iu.test(xml)) throw new Error("Expected sitemap urlset");
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/giu)].map((match) => {
    const raw = /<loc>\s*([^<]+)\s*<\/loc>/iu.exec(match[1])?.[1];
    if (!raw) throw new Error("Sitemap entry lacks loc");
    const url = new URL(decodeEntity(raw));
    if (url.origin !== ORIGIN || url.search || url.hash || url.username || url.password) {
      throw new Error("Sitemap contains an unsafe/off-origin URL");
    }
    return url.toString();
  });
  if (urls.length < 120 || urls.length > MAX_URLS || new Set(urls).size !== urls.length) {
    throw new Error("Unexpected incomplete, duplicate or oversized sitemap: " + urls.length);
  }
  return urls;
}

async function inspect(url) {
  try {
    const { response, body } = await read(url, MAX_HTML_BYTES);
    const ok = response.status === 200 &&
      (response.headers.get("content-type") || "").toLowerCase().includes("text/html");
    const canonical = ok ? canonicalFromHtml(body) : "";
    const robots = ok ? robotsFromHtml(body) : "";
    const description = ok ? descriptionFromHtml(body) : "";
    const mainText = ok ? mainTextFromHtml(body) : "";
    const title = ok ? /<title[^>]*>([\s\S]*?)<\/title>/iu.exec(body)?.[1]?.replace(/<[^>]+>/gu, " ").trim().slice(0, 170) || "" : "";
    return {
      url, status: response.status, ok, title, description, canonical, robots, mainText,
      canonicalMatches: !!canonical && normalize(canonical) === normalize(url),
      error: ok ? "" : "Not HTTP 200 HTML",
    };
  } catch (e) {
    return { url, status: null, ok: false, title: "", description: "", canonical: "", robots: "", mainText: "",
      canonicalMatches: false, error: e instanceof Error ? e.name : "Unknown error" };
  }
}

async function main() {
  const { response, body } = await read(ORIGIN + "/sitemap.xml", 1_500_000);
  if (response.status !== 200 || !(response.headers.get("content-type") || "").includes("xml")) {
    throw new Error("Live sitemap not HTTP 200 XML");
  }
  const urls = parseSitemap(body);
  const results = [];
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    results.push(...await Promise.all(urls.slice(i, i + CONCURRENCY).map(inspect)));
    await new Promise((done) => setTimeout(done, 120));
  }
  const validPages = results.filter((item) => item.ok);
  const contentReview = compareMainContent(validPages);
  // Only summary metrics are persisted. Avoid duplicating entire article bodies in artifacts.
  const publicResults = results.map(({ mainText, ...page }) => page);
  const descriptionGroups = new Map();
  for (const page of validPages) {
    const normalized = comparableDescription(page.description);
    if (!normalized) continue;
    const matching = descriptionGroups.get(normalized) || [];
    matching.push(page.url);
    descriptionGroups.set(normalized, matching);
  }
  const duplicateDescriptions = [...descriptionGroups.values()]
    .filter((urls) => urls.length > 1)
    .map((urls) => ({ count: urls.length, urls }));

  const nearDuplicateDescriptions = [];
  for (let i = 0; i < validPages.length; i += 1) {
    for (let j = i + 1; j < validPages.length; j += 1) {
      const left = validPages[i];
      const right = validPages[j];
      if (left.description.length < 60 || right.description.length < 60 ||
          comparableDescription(left.description) === comparableDescription(right.description)) continue;
      const similarity = descriptionSimilarity(left.description, right.description);
      if (similarity >= 0.8) {
        nearDuplicateDescriptions.push({
          first: left.url,
          second: right.url,
          similarity: Math.round(similarity * 1000) / 1000,
        });
      }
    }
  }
  const descriptionReview = validPages.flatMap((page) => {
    const findings = [];
    if (!page.description) findings.push("description-missing");
    if (page.description && page.description.length < 60) findings.push("description-short-review");
    if (page.description.length > 180) findings.push("description-long-review");
    return findings.length ? [{ url: page.url, description: page.description, length: page.description.length, findings }] : [];
  });

  const summary = {
    sitemapCount: urls.length,
    successfulHtml: results.filter((x) => x.ok).length,
    errors: results.filter((x) => !x.ok).length,
    canonicalMatches: results.filter((x) => x.canonicalMatches).length,
    descriptionsPresent: validPages.filter((x) => !!x.description).length,
    mainContentPresent: validPages.filter((x) => !!x.mainText).length,
    mainContentAbsent: validPages.filter((x) => !x.mainText).length,
    shortMainContentReview: contentReview.mainContentStats.filter((x) => x.wordCount < 100).length,
    exactDuplicateMainContentGroups: contentReview.exactDuplicateMainBodies.length,
    mainContentOverlapReviewPairs: contentReview.contentOverlapCandidates.length,
    descriptionsMissing: validPages.filter((x) => !x.description).length,
    descriptionsUnder60Review: validPages.filter((x) => x.description && x.description.length < 60).length,
    descriptionsOver180Review: validPages.filter((x) => x.description.length > 180).length,
    duplicateDescriptionGroups: duplicateDescriptions.length,
    nearDuplicateDescriptionPairs: nearDuplicateDescriptions.length,
    canonicalMissingOrDifferent: results.filter((x) => x.ok && !x.canonicalMatches).length,
    noindexPagesInSitemap: results.filter((x) => /\bnoindex\b/iu.test(x.robots)).length,
    scope: "Live sitemap-only census; not Google index status or complete internal-link graph",
  };
  const report = { checkedAt: new Date().toISOString(), origin: ORIGIN, summary, results: publicResults, descriptionReview, duplicateDescriptions, nearDuplicateDescriptions, contentReview };
  const file = path.join(process.cwd(), "artifacts", "power-seo-live-census.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(summary));
  for (const page of results.filter((x) => !x.ok || !x.canonicalMatches || /\bnoindex\b/iu.test(x.robots))) {
    console.log(JSON.stringify(page));
  }
  // Keep a bounded, inspectable evidence trail in GitHub logs as well as JSON.
  for (const item of contentReview.contentOverlapCandidates.slice(0, 25)) {
    console.log(JSON.stringify({ contentOverlapReview: item }));
  }
  for (const item of contentReview.exactDuplicateMainBodies.slice(0, 10)) {
    console.log(JSON.stringify({ exactMainDuplicate: item }));
  }
  for (const item of contentReview.mainContentStats.filter((x) => x.wordCount < 100).slice(0, 25)) {
    console.log(JSON.stringify({ shortOrMissingMainReview: item }));
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
      "## Power-SEO read-only live sitemap census",
      "",
      "| Metric | Count |",
      "| --- | ---: |",
      ...Object.entries(summary).filter(([,value]) => typeof value === "number").map(([k,v]) => "| " + k + " | " + v + " |"),
      "",
      "> Sitemap-only metadata readiness review. Length and similarity thresholds are editorial review signals, not Google indexing requirements or penalties. Full per-page evidence is in the uploaded JSON artifact. Main-body overlap excludes common phrases present on four or more pages and flags candidates for editorial review only.",
      "",
    ].join("\n"));
  }
  if (summary.errors || summary.canonicalMissingOrDifferent || summary.noindexPagesInSitemap) process.exitCode = 1;
}

export { mainTextFromHtml, compareMainContent };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Live census failed");
    process.exitCode = 1;
  });
}
