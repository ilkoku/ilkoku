const BASE="https://ilkoku.com";
const UA="IlkOku-Authorship-Trust-Audit/1.0 (+https://ilkoku.com)";
const DELAY_MS=900;
const TIMEOUT_MS=25000;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

function decode(v=""){return v.replaceAll("&amp;","&").replaceAll("&quot;",'"').replaceAll("&#39;","'").replaceAll("&#x27;","'");}
function normUrl(v){try{const u=new URL(v,BASE);if(u.origin!==BASE)return null;u.hash="";u.search="";return u.href.replace(/\/$/,"");}catch{return null;}}
function textOnly(html=""){return decode(html.replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();}

const sm=await fetch(`${BASE}/sitemap.xml`,{headers:{"user-agent":UA},signal:AbortSignal.timeout(TIMEOUT_MS)});
if(!sm.ok) throw new Error(`sitemap HTTP ${sm.status}`);
const xml=await sm.text();
const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(m=>normUrl(decode(m[1])))
  .filter(u=>u&&u.includes("/yazarlar-icin/"))
  .filter(u=>{
    const path=new URL(u).pathname;
    return path.split("/").filter(Boolean).length===3;
  });

const rows=[];
for(let i=0;i<urls.length;i++){
  const url=urls[i];
  const res=await fetch(url,{headers:{"user-agent":UA,accept:"text/html"},redirect:"follow",signal:AbortSignal.timeout(TIMEOUT_MS)});
  if(res.status===403||res.status===429) throw new Error(`CIRCUIT_BREAKER ${res.status} ${url}`);
  const html=await res.text();
  const visible=textOnly(html);
  const jsonlds=[...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1].trim());
  let hasArticle=false, hasAuthor=false, authorValues=[];
  for(const raw of jsonlds){
    try{
      const data=JSON.parse(raw);
      const stack=Array.isArray(data)?[...data]:[data];
      while(stack.length){
        const x=stack.pop();
        if(!x||typeof x!=="object") continue;
        if(x["@type"]==="Article"||x["@type"]==="BlogPosting"||x["@type"]==="HowTo") hasArticle=true;
        if(x.author){
          hasAuthor=true;
          const vals=Array.isArray(x.author)?x.author:[x.author];
          for(const a of vals){
            if(typeof a==="string") authorValues.push(a);
            else if(a&&typeof a==="object") authorValues.push(a.name||a.url||JSON.stringify(a));
          }
        }
        for(const v of Object.values(x)) if(v&&typeof v==="object") stack.push(...(Array.isArray(v)?v:[v]));
      }
    }catch{}
  }
  const visibleByline=/\b(yazan|yazar|hazırlayan|hazirlayan|editör|editor|gözden geçiren|gozden geciren|inceleyen)\b/i.test(visible.slice(0,5000));
  rows.push({url,status:res.status,hasArticle,hasAuthor,authorValues:[...new Set(authorValues)],visibleByline});
  console.log(`[${i+1}/${urls.length}] ${url} article=${hasArticle} author=${hasAuthor} byline=${visibleByline}`);
  if(i+1<urls.length) await sleep(DELAY_MS);
}

const summary={
  pages:rows.length,
  articleSchemaCount:rows.filter(r=>r.hasArticle).length,
  authorSchemaCount:rows.filter(r=>r.hasAuthor).length,
  visibleBylineCount:rows.filter(r=>r.visibleByline).length,
  noArticleSchema:rows.filter(r=>!r.hasArticle).map(r=>r.url),
  noAuthorSchema:rows.filter(r=>!r.hasAuthor).map(r=>r.url),
  noVisibleByline:rows.filter(r=>!r.visibleByline).map(r=>r.url),
  authorValues:[...new Set(rows.flatMap(r=>r.authorValues))]
};
console.log("\n=== AUTHORSHIP TRUST SUMMARY ===");
console.log(JSON.stringify(summary,null,2));
