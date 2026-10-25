// Manual first-party Google Tag Gateway for İlkOku.
// This Worker is deliberately separate from the automatic Cloudflare
// Google Tag Gateway integration, which injects scripts before consent.
// Google self-service docs: https://developers.google.com/tag-platform/tag-manager/gateway/setup-guide?setup=manual
const PATH = "/ilkgtm/";
const CONTAINER = "GTM-W6NVSMNV";
const UPSTREAM = "fps.goog";

function responseNotFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.hostname !== "ilkoku.com" || !url.pathname.startsWith(PATH)) {
      return responseNotFound();
    }

    // This is a fixed upstream, not a user-supplied proxy destination.
    // Keep original path, method, body, cookies and query parameters.
    url.hostname = UPSTREAM;
    url.protocol = "https:";
    url.port = "";
    const proxied = new Request(url.toString(), request);
    proxied.headers.delete("host");
    proxied.headers.set("X-Gtg-Implementation", "Snippet");
    proxied.headers.set("X-Gtg-Tag-Id", CONTAINER);

    const clientIp = request.headers.get("CF-Connecting-IP");
    if (clientIp) proxied.headers.set("X-Forwarded-For", clientIp);
    else proxied.headers.delete("X-Forwarded-For");

    const location = request.cf || {};
    if (location.country) proxied.headers.set("X-Forwarded-Country", location.country);
    else proxied.headers.delete("X-Forwarded-Country");
    if (location.regionCode) proxied.headers.set("X-Forwarded-Region", location.regionCode);
    else proxied.headers.delete("X-Forwarded-Region");
    if (location.latitude != null && location.longitude != null) {
      const city = String(location.city || "").replace(/[;\r\n]/g, " ").slice(0, 80);
      proxied.headers.set("X-Forwarded-Geolocation",
        "latlong=" + location.latitude + "," + location.longitude + ";city=" + city);
    } else {
      proxied.headers.delete("X-Forwarded-Geolocation");
    }

    return fetch(proxied);
  },
};
