// Explicitly manual, read-only public JavaScript delivery check.
// Do not open pages, accept consent, click CTA, or send analytics requests.
import { createHash } from "node:crypto";

const urls = {
  manual: "https://ilkoku.com/ilkgtm/?id=GTM-W6NVSMNV",
  direct: "https://www.googletagmanager.com/gtm.js?id=GTM-W6NVSMNV",
};
for (const [source, url] of Object.entries(urls)) {
  const response = await fetch(url, {
    headers: { "User-Agent": "IlkOku-ReadOnly-GTM-Content-QA/20261025" },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(source + " HTTP " + response.status);
  const data = await response.arrayBuffer();
  if (data.byteLength === 0) throw new Error(source + " returned empty script");
  const text = Buffer.from(data).toString("utf8");
  console.log("GTM_PUBLIC_SCRIPT_ONLY " + JSON.stringify({
    source,
    status: response.status,
    mime: response.headers.get("content-type"),
    bytes: data.byteLength,
    sha256: createHash("sha256").update(Buffer.from(data)).digest("hex"),
    hasContainer: text.includes("GTM-W6NVSMNV"),
    hasGa4Destination: text.includes("G-MCF2YN9SL8"),
    hasCtaEvent: text.includes("site_cta_click"),
  }));
}
