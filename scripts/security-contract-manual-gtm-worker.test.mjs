import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import gateway from "../workers/ilkoku-gtm-gateway/index.mjs";

const workingUrl = "https://ilkoku.com/ilkgtm/healthy?validate_geo=healthy";

test("Only the reserved exact İlkOku zone/path is proxied", async () => {
  const realFetch = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => { count++; return new Response("ok"); };
  try {
    for (const url of [
      "https://other.example/ilkgtm/healthy",
      "https://ilkoku.com/ilkgtm-evil/healthy",
      "https://ilkoku.com/"
    ]) {
      const response = await gateway.fetch(new Request(url));
      assert.equal(response.status, 404);
    }
    assert.equal(count, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("Worker forwards GTM ID, geolocation, method, body, query and first party path", async () => {
  const realFetch = globalThis.fetch;
  let seen;
  globalThis.fetch = async request => {
    seen = request;
    return new Response("ok", { status: 200 });
  };
  try {
    const request = new Request("https://ilkoku.com/ilkgtm/?id=GTM-W6NVSMNV&x=1", {
      method: "POST", headers: { "CF-Connecting-IP": "203.0.113.21", "content-type": "text/plain", "X-Forwarded-For": "spoofed" }, body: "test-payload"
    });
    Object.defineProperty(request, "cf", { value: { country: "TR", regionCode: "34", latitude: 41, longitude: 29, city: "Istanbul" } });
    const response = await gateway.fetch(request);
    assert.equal(await response.text(), "ok");
    assert.equal(seen.url, "https://fps.goog/ilkgtm/?id=GTM-W6NVSMNV&x=1");
    assert.equal(seen.method, "POST");
    assert.equal(await seen.text(), "test-payload");
    assert.equal(seen.headers.get("X-Gtg-Tag-Id"), "GTM-W6NVSMNV");
    assert.equal(seen.headers.get("X-Forwarded-For"), "203.0.113.21");
    assert.equal(seen.headers.get("X-Forwarded-Country"), "TR");
    assert.equal(seen.headers.get("X-Forwarded-Region"), "34");
    assert.match(seen.headers.get("X-Forwarded-Geolocation"), /latlong=41,29;city=Istanbul/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("Manual route does not inject JavaScript into any HTML response", () => {
  const source = readFileSync("workers/ilkoku-gtm-gateway/index.mjs", "utf8");
  assert.doesNotMatch(source, /HTMLRewriter|document\.head|<script/);
  const config = readFileSync("workers/ilkoku-gtm-gateway/wrangler.toml", "utf8");
  assert.match(config, /ilkoku\.com\/ilkgtm\/\*/);
  assert.doesNotMatch(config, /ilkoku\.com\/\*/);
});
