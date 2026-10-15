// Classify URL shape only. NEVER persist raw query strings, cookies, IPs or
// measurement payloads: they may contain visitor identifiers.
const hitPath = /\/(?:g\/collect|j\/collect|mp\/collect|collect)$/i;
const analyticsHosts = /(^|\.)google-analytics\.com$|^analytics\.google\.com$/i;

export function classifyGa4Request(rawUrl, postBody = "") {
  let url;
  try { url = new URL(rawUrl); }
  catch { return null; }
  const path = url.pathname;
  const firstParty = url.hostname === "ilkoku.com" && path.startsWith("/ilkgtm/");
  const googleHost = analyticsHosts.test(url.hostname);
  if (firstParty && path === "/ilkgtm/healthy") return { type: "gateway-health" };
  if (firstParty && /^\/ilkgtm\/ag\/g\/c$/i.test(path)) return { type: "tag-configuration" };
  if (!firstParty && !googleHost) return null;
  if (!hitPath.test(path)) return null;
  // GA4 sometimes sends URL-encoded events in POST bodies. Inspect only
  // event name + public measurement ID in memory; discard all other values.
  // One request may hold a batch of newline-separated events.
  const lines = typeof postBody === "string" ? postBody.split(/\r?\n/) : [];
  const bodyParts = lines.map((line) => new URLSearchParams(line));
  const bodyParam = (key) => bodyParts.map((part) => part.get(key)).find(Boolean) || null;
  const eventName = url.searchParams.get("en") || bodyParam("en");
  const measurementId = url.searchParams.get("tid") || bodyParam("tid");
  return {
    type: "ga4-hit",
    firstParty,
    event: eventName && /^[A-Za-z0-9_]{1,64}$/.test(eventName) ? eventName : "unknown",
    measurement: measurementId && /^G-[A-Z0-9]{5,20}$/i.test(measurementId) ? measurementId : "unknown",
  };
}

export function summarizeHits(items) {
  const hits = items.filter((item) => item.type === "ga4-hit");
  const events = {};
  for (const item of hits) events[item.event] = (events[item.event] || 0) + 1;
  return {
    count: hits.length,
    events,
    firstPartyCount: hits.filter((item) => item.firstParty).length,
    status2xx: hits.filter((item) => item.status >= 200 && item.status < 300).length,
  };
}
