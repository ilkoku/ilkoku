import assert from "node:assert/strict";
const endpoint = "https://ilkoku.com/mcp";
const version = "2026-07-28";
const meta = {"io.modelcontextprotocol/protocolVersion":version,"io.modelcontextprotocol/clientInfo":{name:"ilkoku-live-audit",version:"1.0.0"},"io.modelcontextprotocol/clientCapabilities":{}};
async function probe(label, options) {
  const response = await fetch(endpoint,{...options,redirect:"manual",signal:AbortSignal.timeout(12000)});
  const body = await response.text();
  console.log("MCP_LIVE_HTTP", JSON.stringify({label,status:response.status,type:response.headers.get("content-type"),cache:response.headers.get("cache-control"),robots:response.headers.get("x-robots-tag"),cfRay:response.headers.get("cf-ray"),body:body.slice(0,300)}));
  if (response.status === 429 || response.status === 403 && !response.headers.get("content-type")?.includes("application/json")) throw Error("Edge rejected request; no retry");
  return {response,body};
}
let id=0;
async function rpc(method,params={},extra={}) {
  const requestId=++id;
  const {response,body}=await probe(method+":"+String(params.name||""),{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/event-stream","MCP-Protocol-Version":version,"Mcp-Method":method,...(params.name?{"Mcp-Name":params.name}:{}),...extra},body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params:{...params,_meta:meta}})});
  assert.match(response.headers.get("cache-control")||"",/no-store/);
  return {status:response.status,data:JSON.parse(body)};
}
const get=await probe("GET",{method:"GET"});
assert.equal(get.response.status,405);
assert.equal(get.response.headers.get("allow"),"POST");
const listed=await rpc("tools/list");
assert.equal(listed.status,200);
assert.deepEqual(listed.data.result.tools.map(t=>t.name).sort(),["ilkoku_get_platform_info","ilkoku_list_public_resources"]);
const info=await rpc("tools/call",{name:"ilkoku_get_platform_info",arguments:{}});
assert.equal(info.status,200);
assert.equal(JSON.parse(info.data.result.content[0].text).name,"İlkOku");
const links=await rpc("tools/call",{name:"ilkoku_list_public_resources",arguments:{}});
assert.equal(links.status,200);
const urls=JSON.parse(links.data.result.content[0].text).resources;
assert.equal(urls.length,14);
assert.ok(urls.every(u=>new URL(u).origin==="https://ilkoku.com"));
const rejected=await rpc("tools/list",{},{"Origin":"https://example.invalid"});
assert.equal(rejected.status,403);
console.log("MCP_LIVE_PASS");
