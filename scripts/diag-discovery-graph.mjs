import { writeFileSync } from "node:fs";

const BASE = "https://ilkoku.com";
const UA = "IlkOku-Discovery-Graph-Audit/1.0 (+https://ilkoku.com)";
const DELAY_MS = 900;
const TIMEOUT_MS = 25000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const normUrl = (value) => {
  try {
    const u = new URL(value, BASE);
    if (u.origin !== BASE) return null;
    u.hash = "";
    u.search = "";
    return u.href.replace(/\/$/, "");
  } catch { return null; }
};
const home = BASE;

function decode(v="") {
  return v.replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&quot;",'"').replaceAll("&#39;","'").replaceAll("&#x27;","'");
}
function stripHtml(s="") {
  return decode(s
    .replace(/<script\b[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[\s\S]*?<\/style>/gi," ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi," ")
    .replace(/<[^>]+>/g," ")
  ).replace(/\s+/g," ").trim();
}
function linksOf(html) {
  const out=[];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url=normUrl(decode(m[1]));
    if (!url) continue;
    out.push({url,text:stripHtml(m[2]).slice(0,180)});
  }
  return out;
}
function mainText(html) {
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return stripHtml(main);
}
function shingleSet(text, n=5) {
  const words=text.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim().split(" ").filter(Boolean);
  const set=new Set();
  for(let i=0;i<=words.length-n;i++) set.add(words.slice(i,i+n).join(" "));
  return set;
}
function jaccard(a,b) {
  let inter=0;
  for(const x of a) if(b.has(x)) inter++;
  const union=a.size+b.size-inter;
  return union?inter/union:0;
}

const smRes=await fetch(`${BASE}/sitemap.xml`,{headers:{"user-agent":UA},signal:AbortSignal.timeout(TIMEOUT_MS)});
if(!smRes.ok) throw new Error(`sitemap HTTP ${smRes.status}`);
const sitemap=await smRes.text();
const entries=[...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map(m=>{
  const block=m[1];
  const loc=decode(block.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1]?.trim()??"");
  const lastmod=block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1]?.trim()??"";
  return {url:normUrl(loc)||loc,lastmod};
}).filter(x=>x.url.startsWith(BASE));
const sitemapSet=new Set(entries.map(e=>e.url));
const rows=[];
for(let i=0;i<entries.length;i++){
  const entry=entries[i];
  const res=await fetch(entry.url,{redirect:"follow",headers:{"user-agent":UA,accept:"text/html"},signal:AbortSignal.timeout(TIMEOUT_MS)});
  if(res.status===403||res.status===429) throw new Error(`CIRCUIT_BREAKER ${res.status} ${entry.url}`);
  const html=await res.text();
  const allLinks=linksOf(html);
  const internalSitemapLinks=allLinks.filter(l=>sitemapSet.has(l.url));
  const text=mainText(html);
  rows.push({
    url:entry.url,status:res.status,lastmod:entry.lastmod,
    wordCount:text.split(/\s+/).filter(Boolean).length,
    links:[...new Map(internalSitemapLinks.map(l=>[l.url,l])).values()]
  });
  console.log(`[${i+1}/${entries.length}] ${res.status} ${entry.url} links=${internalSitemapLinks.length}`);
  if(i+1<entries.length) await sleep(DELAY_MS);
}

const indegree=new Map(entries.map(e=>[e.url,0]));
const anchors=new Map(entries.map(e=>[e.url,[]]));
for(const row of rows){
  for(const l of row.links){
    indegree.set(l.url,(indegree.get(l.url)||0)+1);
    anchors.get(l.url)?.push({from:row.url,text:l.text});
  }
}
const adjacency=new Map(rows.map(r=>[r.url,r.links.map(l=>l.url)]));
const dist=new Map([[home,0]]);
const q=[home];
while(q.length){
  const u=q.shift();
  const d=dist.get(u);
  for(const v of adjacency.get(u)||[]){
    if(!dist.has(v)){dist.set(v,d+1);q.push(v);}
  }
}
const noInbound=rows.filter(r=>(indegree.get(r.url)||0)===0 && r.url!==home).map(r=>r.url);
const onlyOneInbound=rows.filter(r=>(indegree.get(r.url)||0)===1 && r.url!==home).map(r=>({url:r.url,from:anchors.get(r.url)}));
const unreachable=rows.filter(r=>!dist.has(r.url)).map(r=>r.url);
const depths={};
for(const r of rows){
  const d=dist.has(r.url)?String(dist.get(r.url)):"unreachable";
  depths[d]=(depths[d]||0)+1;
}

const lastmodGroups={};
for(const e of entries){
  const key=e.lastmod||"(missing)";
  lastmodGroups[key]=(lastmodGroups[key]||0)+1;
}
const wordCounts=rows.map(r=>r.wordCount).sort((a,b)=>a-b);
const report={
  generatedAt:new Date().toISOString(),
  sitemapUrlCount:entries.length,
  lastmodGroups:Object.entries(lastmodGroups).sort((a,b)=>b[1]-a[1]),
  missingLastmod:entries.filter(e=>!e.lastmod).map(e=>e.url),
  noInboundCount:noInbound.length,
  noInbound,
  onlyOneInboundCount:onlyOneInbound.length,
  onlyOneInbound:onlyOneInbound.slice(0,80),
  unreachableFromHomeCount:unreachable.length,
  unreachableFromHome:unreachable,
  depthDistribution:depths,
  inDegreeBottom:rows.map(r=>({url:r.url,inDegree:indegree.get(r.url)||0,depth:dist.get(r.url)??null})).sort((a,b)=>a.inDegree-b.inDegree||((b.depth??99)-(a.depth??99))).slice(0,50),
  wordCount:{min:wordCounts[0],p25:wordCounts[Math.floor(wordCounts.length*.25)],median:wordCounts[Math.floor(wordCounts.length*.5)],p75:wordCounts[Math.floor(wordCounts.length*.75)],max:wordCounts.at(-1)},
};
writeFileSync("discovery-graph-audit.json",JSON.stringify({report,rows},null,2));
console.log("\n=== DISCOVERY GRAPH SUMMARY ===");
console.log(JSON.stringify(report,null,2));
