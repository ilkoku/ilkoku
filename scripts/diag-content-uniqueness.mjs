import { writeFileSync } from "node:fs";

const BASE="https://ilkoku.com";
const UA="IlkOku-Content-Uniqueness-Audit/1.0 (+https://ilkoku.com)";
const DELAY_MS=900;
const TIMEOUT_MS=25000;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

function decode(v=""){
  return v.replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&quot;",'"').replaceAll("&#39;","'").replaceAll("&#x27;","'");
}
function stripHtml(s=""){
  return decode(s
    .replace(/<script\b[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[\s\S]*?<\/style>/gi," ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi," ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi," ")
    .replace(/<[^>]+>/g," ")
  ).replace(/\s+/g," ").trim();
}
function mainText(html){
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    ?? html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]
    ?? html;
  return stripHtml(main);
}
function words(text){
  return text.toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}\s]/gu," ")
    .replace(/\s+/g," ").trim().split(" ").filter(Boolean);
}
function shingles(ws,n=5){
  const set=new Set();
  for(let i=0;i<=ws.length-n;i++) set.add(ws.slice(i,i+n).join(" "));
  return set;
}
function jac(a,b){
  let inter=0;
  const small=a.size<=b.size?a:b, big=a.size<=b.size?b:a;
  for(const x of small) if(big.has(x)) inter++;
  const union=a.size+b.size-inter;
  return union?inter/union:0;
}
function normUrl(v){
  try{
    const u=new URL(v,BASE); if(u.origin!==BASE) return null;
    u.hash="";u.search="";
    return u.href.replace(/\/$/,"");
  }catch{return null;}
}

const sm=await fetch(`${BASE}/sitemap.xml`,{headers:{"user-agent":UA},signal:AbortSignal.timeout(TIMEOUT_MS)});
if(!sm.ok) throw new Error(`sitemap HTTP ${sm.status}`);
const xml=await sm.text();
const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>normUrl(decode(m[1]))).filter(Boolean);

const rows=[];
for(let i=0;i<urls.length;i++){
  const url=urls[i];
  const res=await fetch(url,{redirect:"follow",headers:{"user-agent":UA,accept:"text/html"},signal:AbortSignal.timeout(TIMEOUT_MS)});
  if(res.status===403||res.status===429) throw new Error(`CIRCUIT_BREAKER ${res.status} ${url}`);
  const html=await res.text();
  const text=mainText(html);
  const ws=words(text);
  rows.push({url,status:res.status,wordCount:ws.length,text,shingles:shingles(ws)});
  console.log(`[${i+1}/${urls.length}] ${res.status} ${url} words=${ws.length}`);
  if(i+1<urls.length) await sleep(DELAY_MS);
}

const pairs=[];
for(let i=0;i<rows.length;i++){
  for(let j=i+1;j<rows.length;j++){
    const score=jac(rows[i].shingles,rows[j].shingles);
    if(score>=0.15) pairs.push({score:+score.toFixed(4),a:rows[i].url,b:rows[j].url});
  }
}
pairs.sort((a,b)=>b.score-a.score);
const thresholds=[0.2,0.3,0.4,0.5,0.6,0.7,0.8].map(t=>({threshold:t,count:pairs.filter(p=>p.score>=t).length}));
const maxByUrl=rows.map(r=>{
  let best=null;
  for(const p of pairs){
    if(p.a===r.url||p.b===r.url){
      if(!best||p.score>best.score) best={score:p.score,other:p.a===r.url?p.b:p.a};
    }
  }
  return {url:r.url,wordCount:r.wordCount,bestSimilarity:best?.score??0,closest:best?.other??null};
}).sort((a,b)=>b.bestSimilarity-a.bestSimilarity);

const families={};
for(const r of rows){
  let family="other";
  if(r.url.includes("/yazarlar-icin/")) family="yazarlar-icin";
  else if(r.url.includes("/editorler-icin/")) family="editorler-icin";
  else if(r.url.includes("/okurlar-icin/")) family="okurlar-icin";
  else if(r.url.includes("/en-cok-satanlar")) family="book-index";
  else if(r.url.includes("/yeni-cikanlar")) family="book-index";
  (families[family]??=[]).push(r);
}
const familyStats={};
for(const [name,list] of Object.entries(families)){
  const relevant=pairs.filter(p=>list.some(r=>r.url===p.a)&&list.some(r=>r.url===p.b));
  familyStats[name]={
    pages:list.length,
    medianWords:[...list].map(r=>r.wordCount).sort((a,b)=>a-b)[Math.floor(list.length/2)]??0,
    pairsAbove03:relevant.filter(p=>p.score>=.3).length,
    pairsAbove05:relevant.filter(p=>p.score>=.5).length,
    maxPair:relevant[0]??null
  };
}

const report={
  generatedAt:new Date().toISOString(),
  urls:rows.length,
  thresholds,
  topPairs:pairs.slice(0,50),
  pagesWithBestSimilarityAbove05:maxByUrl.filter(x=>x.bestSimilarity>=.5),
  pagesWithBestSimilarityAbove03:maxByUrl.filter(x=>x.bestSimilarity>=.3),
  familyStats,
  shortest:rows.map(r=>({url:r.url,wordCount:r.wordCount})).sort((a,b)=>a.wordCount-b.wordCount).slice(0,20)
};
writeFileSync("content-uniqueness-audit.json",JSON.stringify(report,null,2));
console.log("\n=== CONTENT UNIQUENESS SUMMARY ===");
console.log(JSON.stringify(report,null,2));
