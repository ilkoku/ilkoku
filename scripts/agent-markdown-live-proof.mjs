import assert from "node:assert/strict";
const root = "https://ilkoku.com";
async function request(label, path, accept, {method="GET",headers={}}={}) {
  const r=await fetch(root+path,{method,headers:{Accept:accept,...headers},redirect:"manual",signal:AbortSignal.timeout(12000)});
  const body=await r.text();
  const h={type:r.headers.get("content-type")||"",vary:r.headers.get("vary")||"",cache:r.headers.get("cache-control")||"",cfCache:r.headers.get("cf-cache-status"),link:r.headers.get("link")||""};
  console.log("AGENT_MARKDOWN_HTTP",JSON.stringify({label,status:r.status,...h,length:body.length}));
  assert.ok(![403,429].includes(r.status),"Edge rejection; stop without retry");
  assert.equal(r.status,200,label);
  return {body,...h};
}
function html(x, label, vary=true) {
  assert.match(x.type,/^text\/html\b/i,label);
  assert.match(x.body,/<html\b/i,label);
  if(vary) {
    assert.ok(x.vary.toLowerCase().split(",").map(s=>s.trim()).includes("accept"),label+" Vary");
    assert.ok(x.vary.toLowerCase().split(",").map(s=>s.trim()).includes("rsc"),label+" Next RSC Vary");
  }
}
function markdown(x,label,head=false) {
  assert.match(x.type,/^text\/markdown\b/i,label);
  assert.match(x.cache,/no-store/i,label);
  assert.ok(x.vary.toLowerCase().split(",").map(s=>s.trim()).includes("accept"),label+" Vary");
  assert.notEqual(x.cfCache,"HIT",label+" must bypass edge cache");
  if(head) assert.equal(x.body,"");
  else {
    assert.match(x.body,/^# İlkOku/);
    assert.doesNotMatch(x.body,/<html\b/i);
    assert.ok(x.body.includes("https://ilkoku.com/iletisim"));
  }
}
html(await request("html-before","/","text/html"),"html-before");
markdown(await request("markdown","/","text/markdown"),"markdown");
html(await request("html-after","/","text/html"),"html-after");
markdown(await request("head","/","text/markdown",{method:"HEAD"}),"head",true);
html(await request("q-zero","/","text/markdown;q=0, text/html"),"q-zero");
html(await request("mixed","/","text/html, text/markdown"),"mixed");
html(await request("query","/?agent-negotiation-proof=1","text/markdown"),"query");
html(await request("cookie","/","text/markdown",{headers:{Cookie:"agent_negotiation_probe=1"}}),"cookie");
html(await request("login","/giris","text/markdown"),"login",false);
markdown(await request("direct","/agent/home.md","text/markdown"),"direct");
console.log("AGENT_MARKDOWN_LIVE_PASS");
