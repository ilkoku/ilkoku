// Pure helpers for the read-only GSC census. Do not submit URLs or mutate Search Console.
// The public sitemap is the current content-freshness source; verified historical
// update timestamps remain a fallback if a URL has no usable <lastmod>.
export function extractSitemapLastmodByUrl(xml) {
  const dates = new Map();
  for (const [, block] of xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/giu)) {
    const loc = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/iu)?.[1]?.trim();
    const lastmod = block.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/iu)?.[1]?.trim();
    if (!loc || !lastmod) continue;

    const ms = Date.parse(lastmod);
    if (!Number.isFinite(ms)) {
      throw new Error("Invalid sitemap lastmod for " + loc + ": " + lastmod);
    }
    dates.set(loc, new Date(ms).toISOString());
  }
  return dates;
}

export function latestVerifiedContentUpdate(trackedUpdateAt, sitemapLastmod) {
  const timestamps = [trackedUpdateAt, sitemapLastmod]
    .filter(Boolean)
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
}
