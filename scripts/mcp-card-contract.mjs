import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPublicMcpEndpoint } from "../src/lib/public-mcp.mjs";

const card = JSON.parse(readFileSync(new URL("../src/lib/public-mcp-card.json", import.meta.url), "utf8"));
const handler = createPublicMcpEndpoint();
const version = card.protocolVersion;
const method = "tools/list";
try {
  assert.equal(card.serverInfo.name, "ilkoku-public");
  assert.equal(card.serverInfo.version, "1.0.0");
  assert.equal(card.transport.endpoint, "https://ilkoku.com/mcp");
  assert.equal(card.authentication.required, false);
  assert.deepEqual(Object.keys(card.capabilities), ["tools"]);
  const response = await handler.fetch(new Request(card.transport.endpoint, {
    method: "POST",
    headers: { Host: "ilkoku.com", "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": version, "Mcp-Method": method },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { _meta: { "io.modelcontextprotocol/protocolVersion": version, "io.modelcontextprotocol/clientInfo": {name:"card-test",version:"1.0.0"}, "io.modelcontextprotocol/clientCapabilities": {} } } }),
  }));
  assert.equal(response.status, 200);
  const actual = (await response.json()).result.tools;
  assert.deepEqual(card.tools.map(t=>t.name).sort(), actual.map(t=>t.name).sort());
  for (const advertised of card.tools) {
    const tool = actual.find(t=>t.name===advertised.name);
    assert.equal(tool.description, advertised.description);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.deepEqual(tool.inputSchema.properties, {});
    assert.deepEqual(tool.annotations, advertised.annotations);
  }
  console.log("MCP_CARD_CONTRACT_PASS");
} finally { await handler.close(); }
