import assert from "node:assert/strict";
import { createPublicMcpEndpoint } from "../src/lib/public-mcp.mjs";

const handler = createPublicMcpEndpoint();
const version = "2026-07-28";
const meta = {
  "io.modelcontextprotocol/protocolVersion": version,
  "io.modelcontextprotocol/clientInfo": { name: "ilkoku-ci", version: "1.0.0" },
  "io.modelcontextprotocol/clientCapabilities": {},
};
let id = 0;
async function rpc(method, params = {}, extraHeaders = {}) {
  const headers = {
    Host: "ilkoku.com",
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": version,
    "Mcp-Method": method,
    ...(params.name ? { "Mcp-Name": params.name } : {}),
    ...extraHeaders,
  };
  const requestId = ++id;
  const response = await handler.fetch(new Request("https://ilkoku.com/mcp", {
    method: "POST", headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params: { ...params, _meta: meta } }),
  }));
  const body = await response.json();
  assert.equal(body.id, requestId);
  return { status: response.status, body };
}

try {
  const listed = await rpc("tools/list");
  assert.equal(listed.status, 200);
  assert.deepEqual(listed.body.result.tools.map(t => t.name).sort(), [
    "ilkoku_get_platform_info", "ilkoku_list_public_resources",
  ]);
  for (const tool of listed.body.result.tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
  }
  const info = await rpc("tools/call", { name: "ilkoku_get_platform_info", arguments: {} });
  assert.equal(info.status, 200);
  const platform = JSON.parse(info.body.result.content[0].text);
  assert.equal(platform.name, "İlkOku");
  assert.equal(platform.roles.length, 4);
  const resources = await rpc("tools/call", { name: "ilkoku_list_public_resources", arguments: {} });
  assert.equal(resources.status, 200);
  const urls = JSON.parse(resources.body.result.content[0].text).resources;
  assert.equal(urls.length, 14);
  for (const url of urls) assert.equal(new URL(url).origin, "https://ilkoku.com");
  const invalid = await rpc("tools/call", { name: "ilkoku_get_platform_info", arguments: { extra: true } });
  assert.ok(invalid.body.error || invalid.body.result?.isError);
  const mismatch = await rpc("tools/call", { name: "ilkoku_get_platform_info", arguments: {} }, { "Mcp-Name": "ilkoku_list_public_resources" });
  assert.equal(mismatch.status, 400);
  assert.equal(mismatch.body.error.code, -32020);
  for (const headers of [
    { Host: "evil.example" },
    { Host: "ilkoku.com", Origin: "https://evil.example" },
    { Host: "ilkoku.com", Origin: "null" },
  ]) {
    const response = await handler.fetch(new Request("https://ilkoku.com/mcp", { method: "POST", headers, body: "{}" }));
    assert.equal(response.status, 403);
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
  const badMethod = await handler.fetch(new Request("https://ilkoku.com/mcp", { headers: { Host: "ilkoku.com" } }));
  assert.equal(badMethod.status, 405);
  const big = await handler.fetch(new Request("https://ilkoku.com/mcp", {
    method: "POST", headers: { Host: "ilkoku.com", "Content-Length": "8193" }, body: "{}",
  }));
  assert.equal(big.status, 413);
  const chunked = await handler.fetch(new Request("https://ilkoku.com/mcp", {
    method: "POST", headers: { Host: "ilkoku.com", "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": version, "Mcp-Method": "tools/list" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 99, method: "tools/list", params: { _meta: meta, padding: "x".repeat(9000) } }),
  }));
  assert.equal(chunked.status, 413);
  const compressed = await handler.fetch(new Request("https://ilkoku.com/mcp", {
    method: "POST", headers: { Host: "ilkoku.com", "Content-Encoding": "gzip" }, body: "{}",
  }));
  assert.equal(compressed.status, 415);
  console.log("MCP_SECURITY_PROBE_PASS: host, origin, method, cache, declared and actual body size, encoding");
  console.log("MCP_SDK_PROBE_PASS: list, calls, strict inputs, origin-only resource URLs, header mismatch");
} finally {
  await handler.close();
}
