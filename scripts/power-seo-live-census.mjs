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

// Count headings from the actual HTML response, not the upstream audit heuristic.
// Findings are review signals; a page is not declared deindexed because of H1 count.
function h1CountFromHtml(html) {
  return (html.match(/<h1\b[^>]*>/giu) || []).length;
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


// Inventory accessible image alternatives from the already-fetched live HTML.
// Empty alt is valid for decorative images; do not treat it as an SEO error.
function imageAltFromHtml(html) {
  const tags = html.match(/<img\b[^>]*>/giu) || [];
  const summary = {
    totalImages: tags.length,
    descriptiveAlt: 0,
    emptyAlt: 0,
    missingAltAttribute: 0,
    missingAltExplicitlyDecorative: 0,
    missingAltNeedsReview: 0,
    samples: [],
  };
  for (const tag of tags) {
    const altMatch = /\s+alt\s*=\s*(["'])(.*?)\1/iu.exec(tag);
    const ariaHidden = attribute(tag, "aria-hidden").toLowerCase() === "true";
    const role = attribute(tag, "role").toLowerCase();
    const isExplicitlyDecorative = ariaHidden || role === "presentation" || role === "none";
    if (!altMatch) {
      summary.missingAltAttribute += 1;
      if (isExplicitlyDecorative) {
        summary.missingAltExplicitlyDecorative += 1;
      } else {
        summary.missingAltNeedsReview += 1;
        if (summary.samples.length < 5) {
          // Public, truncated src is for manual identification, not auto-fixing.
          summary.samples.push(attribute(tag, "src").slice(0, 180));
        }
      }
    } else if (decodeEntity(altMatch[2]).trim()) {
      summary.descriptiveAlt += 1;
    } else {
      summary.emptyAlt += 1;
    }
  }
  return summary;
}


// Read-only inventory of published JSON-LD, including array roots and @graph.
// Missing structured data is not automatically an SEO error; schema must match
// genuinely visible page content and its breadcrumb hierarchy.
function structuredDataFromHtml(html) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)]
    .filter((match) => attribute(match[1], "type").toLowerCase() === "application/ld+json");
  const types = {};
  const breadcrumbs = [];
  const parseErrors = [];
  let nodes = 0;

  function inspectNode(value) {
    if (Array.isArray(value)) {
      for (const item of value) inspectNode(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const labels = (Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]])
      .filter((label) => typeof label === "string");
    if (labels.length) {
      nodes += 1;
      for (const label of labels) types[label] = (types[label] || 0) + 1;
      if (labels.includes("BreadcrumbList")) {
        breadcrumbs.push(value.itemListElement);
      }
    }
    if (Array.isArray(value["@graph"])) inspectNode(value["@graph"]);
  }

  for (const [index, script] of scripts.entries()) {
    try {
      inspectNode(JSON.parse(script[2]));
    } catch {
      parseErrors.push({ script: index + 1, problem: "invalid-json-ld" });
    }
  }
  return { scriptCount: scripts.length, nodes, types, breadcrumbs, parseErrors };
}

function inspectBreadcrumbHierarchy(schema, pageUrl, siteUrls) {
  const issues = [];
  const chains = [];
  for (const [chainIndex, elements] of schema.breadcrumbs.entries()) {
    const chain = [];
    if (!Array.isArray(elements) || elements.length < 2) {
      issues.push({ chain: chainIndex + 1, problem: "breadcrumb-list-too-short-or-invalid" });
      continue;
    }
    for (const [index, entry] of elements.entries()) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        issues.push({ chain: chainIndex + 1, position: index + 1, problem: "invalid-list-item" });
        continue;
      }
      if (entry["@type"] !== "ListItem" || Number(entry.position) !== index + 1) {
        issues.push({ chain: chainIndex + 1, position: index + 1, problem: "invalid-list-item-type-or-position" });
      }
      const name = typeof entry.name === "string" ? entry.name.trim()
        : (entry.item && typeof entry.item === "object" && typeof entry.item.name === "string"
          ? entry.item.name.trim() : "");
      if (!name) issues.push({ chain: chainIndex + 1, position: index + 1, problem: "missing-breadcrumb-name" });
      const raw = typeof entry.item === "string" ? entry.item
        : (entry.item && typeof entry.item === "object" ?
          (entry.item["@id"] || entry.item.url || "") : "");
      if (!raw && index !== elements.length - 1) {
        issues.push({ chain: chainIndex + 1, position: index + 1, problem: "missing-parent-target" });
      }
      // Google permits omitting the last item's target: it is the current page.
      const target = raw || (index === elements.length - 1 ? pageUrl : "");
      let normalized = "";
      if (typeof target === "string" && target) {
        try {
          const parsed = new URL(target, pageUrl);
          if (parsed.origin === ORIGIN && !parsed.search) normalized = normalize(parsed.toString());
        } catch { /* Recorded below, without following links. */ }
        if (!normalized) issues.push({ chain: chainIndex + 1, position: index + 1, problem: "off-origin-or-invalid-target" });
        else if (!siteUrls.has(normalized)) {
          // The last item can be an ancestor instead of the current page.
          // An off-sitemap breadcrumb is an editorial review candidate, not
          // proof of an invalid schema or a broken HTTP destination.
          issues.push({ chain: chainIndex + 1, position: index + 1, problem: "breadcrumb-target-not-in-public-sitemap" });
        }
      }
      chain.push({ position: index + 1, name, url: normalized });
    }
    chains.push(chain);
  }
  return { chains, issues };
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

// Extract same-origin links from HTML already downloaded for the census.
// Query strings and fragments do not create distinct sitemap vertices.
function internalLinksFromHtml(html, sourceUrl) {
  const targets = new Set();
  for (const tag of html.match(/<a\b[^>]*>/giu) || []) {
    const href = attribute(tag, "href");
    if (!href || href.startsWith("#")) continue;
    try {
      const resolved = new URL(href, sourceUrl);
      const target = normalize(resolved.toString());
      if (target) targets.add(target);
    } catch { /* Invalid href is not treated as a verified broken HTTP link. */ }
  }
  return [...targets].sort();
}

function buildInternalLinkReview(pages, sitemapUrls) {
  const incoming = new Map([...sitemapUrls].map((url) => [url, 0]));
  const offSitemap = new Map();
  let internalEdges = 0;
  const pageLinks = pages.map((page) => {
    const inside = [];
    const outside = [];
    for (const link of page.internalLinks) {
      if (sitemapUrls.has(link)) {
        inside.push(link);
        incoming.set(link, (incoming.get(link) || 0) + 1);
        internalEdges += 1;
      } else {
        outside.push(link);
        offSitemap.set(link, (offSitemap.get(link) || 0) + 1);
      }
    }
    return { url: page.url, insideSitemap: inside, outsideSitemap: outside };
  });
  const noIncomingCandidates = [...incoming.entries()]
    .filter(([url, count]) => url !== normalize(ORIGIN + "/") && count === 0)
    .map(([url]) => url);
  const outsideTargets = [...offSitemap.entries()]
    .map(([url, sourcePages]) => ({ url, sourcePages, classification: "manual-review-only" }))
    .sort((left, right) => right.sourcePages - left.sourcePages || left.url.localeCompare(right.url));
  return {
    scope: "Links extracted from the complete public XML sitemap cohort. Incoming links from outside this cohort are unknown; missing incoming links are candidates, not confirmed orphan pages. Off-sitemap URLs are not automatically broken.",
    scannedPages: pages.length, internalEdges, noIncomingCandidates,
    offSitemapTargets: outsideTargets, pageLinks,
  };
}

// Only check known public routes from links found in live sitemap HTML.
// Never probe private account, reading, admin, API, or editor workspaces.
// A target outside sitemap is not a broken link on its own.
const PUBLIC_OFF_SITEMAP_PATHS = new Set([
  "/giris", "/kayit", "/sifremi-unuttum", "/editorler",
]);
const MAX_PUBLIC_OFF_SITEMAP_REQUESTS = 16;

function publicOffSitemapPath(raw) {
  try {
    const url = new URL(raw);
    if (url.origin !== ORIGIN || url.search || url.hash || url.username || url.password) return null;
    if (PUBLIC_OFF_SITEMAP_PATHS.has(url.pathname) ||
        /^\/kitap\/demo-[a-z0-9-]+$/u.test(url.pathname)) return url.pathname;
  } catch { /* Unsafe or malformed target: never fetch it. */ }
  return null;
}

async function verifyPublicOffSitemapLinks(linkReview, options = {}) {
  const requester = options.requester || fetch;
  const pause = options.pause || ((ms) => new Promise((done) => setTimeout(done, ms)));
  const candidates = linkReview.offSitemapTargets
    .map((target) => ({ url: target.url, path: publicOffSitemapPath(target.url) }))
    .filter((target) => target.path !== null)
    .slice(0, MAX_PUBLIC_OFF_SITEMAP_REQUESTS);
  const results = [];
  let halted = false;

  for (const target of candidates) {
    let status = null;
    let redirectTo = null;
    let outcome = "unverified";
    try {
      const response = await requester(target.url, {
        method: "GET",
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "User-Agent": "IlkOku-PowerSEO-Public-Link-Verify/1.0", Accept: "text/html" },
      });
      // Read only status/Location. No sessions, body parsing, or redirect following.
      await response.body?.cancel().catch(() => undefined);
      status = response.status;
      const rawLocation = response.headers.get("location");
      if (rawLocation) {
        try {
          const destination = new URL(rawLocation, ORIGIN);
          if (destination.origin === ORIGIN) redirectTo = destination.pathname;
        } catch { /* Never expose an untrusted redirect destination. */ }
      }
      if (status >= 200 && status < 300) outcome = "reachable";
      else if (status >= 300 && status < 400) outcome = "redirect";
      else if (status === 404 || status === 410) outcome = "missing";
      else if (status === 401 || status === 403) outcome = "access-restricted";
      else if (status === 429 || status >= 500) outcome = "temporary-error";
    } catch { /* Timeouts/network errors are not 404s. */ }
    results.push({ path: target.path, status, outcome, redirectTo });
    if (status === 403 || status === 429) {
      halted = true;
      break;
    }
    await pause(300);
  }
  return {
    scope: "Only allowlisted public off-sitemap paths; private/protected paths intentionally skipped; no authentication, redirects, or content changes.",
    publicCandidates: candidates.length,
    checked: results.length,
    skippedPrivateOrOther: linkReview.offSitemapTargets.length - candidates.length,
    halted,
    results,
  };
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

async function inspect(url, retry = 0, firstAttemptFailure = "") {
  try {
    const { response, body } = await read(url, MAX_HTML_BYTES);
    // A single bounded retry for transient upstream 5xx. Persistent failures
    // remain visible and fail the census; 403/429 are never retried.
    if (response.status >= 500 && retry === 0) {
      await new Promise((done) => setTimeout(done, 950));
      return inspect(url, 1, `http-${response.status}`);
    }
    const ok = response.status === 200 &&
      (response.headers.get("content-type") || "").toLowerCase().includes("text/html");
    const canonical = ok ? canonicalFromHtml(body) : "";
    const robots = ok ? robotsFromHtml(body) : "";
    const description = ok ? descriptionFromHtml(body) : "";
    const mainText = ok ? mainTextFromHtml(body) : "";
    const h1Count = ok ? h1CountFromHtml(body) : null;
    const imageAlt = ok ? imageAltFromHtml(body) : null;
    const structuredData = ok ? structuredDataFromHtml(body) : null;
    const internalLinks = ok ? internalLinksFromHtml(body, url) : [];
    const title = ok ? /<title[^>]*>([\s\S]*?)<\/title>/iu.exec(body)?.[1]?.replace(/<[^>]+>/gu, " ").trim().slice(0, 170) || "" : "";
    return {
      url, status: response.status, ok, title, description, canonical, robots, h1Count, mainText, imageAlt, structuredData, internalLinks,
      canonicalMatches: !!canonical && normalize(canonical) === normalize(url),
      recoveredTransientFailure: retry > 0 && ok,
      firstAttemptFailure,
      error: ok ? "" : "Not HTTP 200 HTML",
    };
  } catch (e) {
    // Socket resets and timeouts should receive one, and only one, bounded
    // second attempt. Never retry permission, origin policy or parse failures.
    if (retry === 0 && (e instanceof TypeError || e?.name === "TimeoutError")) {
      await new Promise((done) => setTimeout(done, 950));
      return inspect(url, 1, e?.name === "TimeoutError" ? "timeout" : "network-type-error");
    }
    return { url, status: null, ok: false, title: "", description: "", canonical: "", robots: "", h1Count: null, mainText: "",
      imageAlt: null, structuredData: null, internalLinks: [], canonicalMatches: false, recoveredTransientFailure: false,
      firstAttemptFailure,
      error: e instanceof Error ? e.name : "Unknown error" };
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
    // Use an explicit callback: Array.map passes index and array as extra arguments,
    // which would be mistaken for inspect retry and first-failure metadata.
    results.push(...await Promise.all(urls.slice(i, i + CONCURRENCY).map((url) => inspect(url))));
    await new Promise((done) => setTimeout(done, 120));
  }
  const validPages = results.filter((item) => item.ok);
  const contentReview = compareMainContent(validPages);
  // Only summary metrics are persisted. Avoid duplicating entire article bodies in artifacts.
  const publicResults = results.map(({ mainText, structuredData, internalLinks, ...page }) => page);
  const siteUrls = new Set(urls.map(normalize));
  const linkReview = buildInternalLinkReview(validPages, siteUrls);
  const offSitemapHttp = await verifyPublicOffSitemapLinks(linkReview);
  const schemaReview = validPages.map((page) => {
    const audit = inspectBreadcrumbHierarchy(page.structuredData, page.url, siteUrls);
    return {
      url: page.url,
      scriptCount: page.structuredData.scriptCount,
      nodes: page.structuredData.nodes,
      types: page.structuredData.types,
      breadcrumbCount: page.structuredData.breadcrumbs.length,
      breadcrumbChains: audit.chains,
      findings: [...page.structuredData.parseErrors, ...audit.issues],
    };
  });
  const schemaIssues = schemaReview.filter((page) => page.findings.length);
  const schemaTypeTotals = {};
  for (const page of schemaReview) {
    for (const [type, count] of Object.entries(page.types)) {
      schemaTypeTotals[type] = (schemaTypeTotals[type] || 0) + count;
    }
  }
  const imageReview = validPages.filter((page) => page.imageAlt?.missingAltNeedsReview > 0)
    .map((page) => ({
      url: page.url,
      imageCount: page.imageAlt.totalImages,
      missingAltNeedsReview: page.imageAlt.missingAltNeedsReview,
      examples: page.imageAlt.samples,
      classification: "manual-review-only",
    }));
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

  // Preserve only an allowlisted failure category, never raw network exception text.
  // Successful retries must not erase evidence of initial HTTP 5xx or network problems.
  const firstAttemptFailuresByCause = {};
  for (const page of results.filter((item) => item.firstAttemptFailure)) {
    const cause = page.firstAttemptFailure;
    firstAttemptFailuresByCause[cause] = (firstAttemptFailuresByCause[cause] || 0) + 1;
  }

  const summary = {
    sitemapCount: urls.length,
    successfulHtml: results.filter((x) => x.ok).length,
    errors: results.filter((x) => !x.ok).length,
    recoveredTransientRequests: results.filter((x) => x.recoveredTransientFailure).length,
    firstAttemptHttp5xx: results.filter((x) => /^http-5\d\d$/u.test(x.firstAttemptFailure)).length,
    firstAttemptTimeouts: results.filter((x) => x.firstAttemptFailure === "timeout").length,
    firstAttemptNetworkErrors: results.filter((x) => x.firstAttemptFailure === "network-type-error").length,
    canonicalMatches: results.filter((x) => x.canonicalMatches).length,
    pagesWithOneH1: validPages.filter((x) => x.h1Count === 1).length,
    pagesWithoutH1: validPages.filter((x) => x.h1Count === 0).length,
    pagesWithMultipleH1: validPages.filter((x) => x.h1Count > 1).length,
    sitemapInternalLinkEdges: linkReview.internalEdges,
    sitemapNoIncomingLinkCandidates: linkReview.noIncomingCandidates.length,
    distinctOffSitemapLinkTargets: linkReview.offSitemapTargets.length,
    offSitemapPublicHttpChecked: offSitemapHttp.checked,
    offSitemapPublicHttpMissing: offSitemapHttp.results.filter((item) => item.outcome === "missing").length,
    offSitemapPublicHttpUnverified: offSitemapHttp.results.filter((item) => item.outcome === "unverified" || item.outcome === "temporary-error").length,
    offSitemapPublicHttpSkippedPrivateOrOther: offSitemapHttp.skippedPrivateOrOther,
    offSitemapPublicHttpHalted: Number(offSitemapHttp.halted),
    descriptionsPresent: validPages.filter((x) => !!x.description).length,
    mainContentPresent: validPages.filter((x) => !!x.mainText).length,
    mainContentAbsent: validPages.filter((x) => !x.mainText).length,
    imagesTotal: validPages.reduce((sum, page) => sum + page.imageAlt.totalImages, 0),
    imagesWithDescriptiveAlt: validPages.reduce((sum, page) => sum + page.imageAlt.descriptiveAlt, 0),
    imagesWithEmptyAlt: validPages.reduce((sum, page) => sum + page.imageAlt.emptyAlt, 0),
    imagesMissingAltAttribute: validPages.reduce((sum, page) => sum + page.imageAlt.missingAltAttribute, 0),
    imagesMissingAltNeedsReview: validPages.reduce((sum, page) => sum + page.imageAlt.missingAltNeedsReview, 0),
    imagesMissingAltExplicitlyDecorative: validPages.reduce((sum, page) => sum + page.imageAlt.missingAltExplicitlyDecorative, 0),
    pagesWithImageAltReview: imageReview.length,
    pagesWithJsonLd: schemaReview.filter((page) => page.scriptCount > 0).length,
    jsonLdScripts: schemaReview.reduce((count, page) => count + page.scriptCount, 0),
    jsonLdTypedNodes: schemaReview.reduce((count, page) => count + page.nodes, 0),
    pagesWithBreadcrumbs: schemaReview.filter((page) => page.breadcrumbCount > 0).length,
    breadcrumbLists: schemaReview.reduce((count, page) => count + page.breadcrumbCount, 0),
    pagesWithSchemaReviewFindings: schemaIssues.length,
    totalSchemaReviewFindings: schemaIssues.reduce((count, page) => count + page.findings.length, 0),
    invalidJsonLdScripts: schemaReview.reduce((count, page) =>
      count + page.findings.filter((finding) => finding.problem === "invalid-json-ld").length, 0),
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
    scope: "Read-only full live-sitemap SEO and internal-link census; no external inbound or Google index status",
  };
  const h1Review = validPages.filter((page) => page.h1Count !== 1)
    .map((page) => ({ url: page.url, h1Count: page.h1Count, classification: "manual-technical-review" }));
  const report = { checkedAt: new Date().toISOString(), origin: ORIGIN, summary, firstAttemptFailuresByCause, results: publicResults, h1Review, descriptionReview, duplicateDescriptions, nearDuplicateDescriptions, contentReview, imageReview, schemaReview, schemaIssues, schemaTypeTotals, linkReview, offSitemapHttp };
  const file = path.join(process.cwd(), "artifacts", "power-seo-live-census.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(summary));
  console.log(JSON.stringify({ firstAttemptFailuresByCause }));
  console.log(JSON.stringify({ offSitemapHttp }));
  for (const page of results.filter((x) => !x.ok || !x.canonicalMatches || /\bnoindex\b/iu.test(x.robots))) {
    console.log(JSON.stringify(page));
  }
  // Non-sitemap destinations are only review candidates, not confirmed 404s.
  for (const item of h1Review.slice(0, 25)) {
    console.log(JSON.stringify({ h1Review: item }));
  }
  for (const item of linkReview.offSitemapTargets.slice(0, 12)) {
    console.log(JSON.stringify({ offSitemapLinkReview: item }));
  }
  for (const url of linkReview.noIncomingCandidates.slice(0, 12)) {
    console.log(JSON.stringify({ noSitemapIncomingLinkReview: url }));
  }
  // Keep a bounded, inspectable evidence trail in GitHub logs as well as JSON.
  for (const item of schemaIssues.slice(0, 25)) {
    console.log(JSON.stringify({ schemaReviewFinding: { url: item.url, findings: item.findings } }));
  }
  for (const item of imageReview.slice(0, 25)) {
    console.log(JSON.stringify({ imageAltReview: item }));
  }
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
      "> Full public-sitemap metadata and same-origin link graph review. No external inbound link graph, sitewide PageRank, or verified HTTP 404 claim is inferred from absent sitemap links. Length and similarity thresholds are editorial review signals, not Google indexing requirements or penalties. Full per-page evidence is in the uploaded JSON artifact. Main-body overlap excludes common phrases present on four or more pages and flags candidates for editorial review only. Empty image alt can be intentional for decorative graphics; only absent alt attributes on non-explicitly-decorative images are flagged for human review. Schema/breadcrumb counts are factual; missing schema and multiple user-navigation breadcrumb trails are not automatic errors. A breadcrumb URL absent from the public sitemap is an editorial review signal, not proof of a broken link or Google indexing failure.",
      "",
    ].join("\n"));
  }
  if (summary.errors || summary.canonicalMissingOrDifferent || summary.noindexPagesInSitemap || summary.offSitemapPublicHttpMissing || summary.offSitemapPublicHttpHalted) process.exitCode = 1;
}

export { h1CountFromHtml, mainTextFromHtml, compareMainContent, imageAltFromHtml, structuredDataFromHtml, inspectBreadcrumbHierarchy, internalLinksFromHtml, buildInternalLinkReview, publicOffSitemapPath, verifyPublicOffSitemapLinks };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Live census failed");
    process.exitCode = 1;
  });
}
