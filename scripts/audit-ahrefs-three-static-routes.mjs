import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const routes=[
  {path:"/en-cok-satanlar",purpose:"Book index"},
  {path:"/editorler",purpose:"Editors directory"},
  {path:"/en-cok-satanlar/turkiye",purpose:"Türkiye book index"}
];
const base="/tmp/ilkoku-three-routes-audit";
mkdirSync(base,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const results=[];
const headersToKeep=new Set(["cf-cache-status","x-nextjs-cache","cache-control","server-timing","content-type","cf-ray","age","content-encoding"]);
for(let sample=1;sample<=3;sample++){
  for(const [index,route] of routes.entries()){
    const headerFile=base+"/headers-"+sample+"-"+index+".txt";
    const args=[
      "-sS","-L","--compressed",
      "--connect-timeout","8","--max-time","28",
      "--user-agent","IlkOku-Three-Route-TTFB-Evidence/1.0",
      "--dump-header",headerFile,
      "--output","/dev/null","--write-out","%{json}",
      "https://ilkoku.com"+route.path
    ];
    const cmd=spawnSync("curl",args,{encoding:"utf8",maxBuffer:1024*1024});
    let meta={};try{meta=JSON.parse(cmd.stdout.trim());}catch{}
    let headers={};
    try{
      const raw=(await import("node:fs")).readFileSync(headerFile,"utf8");
      for(const line of (raw.trim().split(/\r?\n\r?\n/).at(-1)||"").split(/\r?\n/)){
        const idx=line.indexOf(":");if(idx<1)continue;
        const key=line.slice(0,idx).trim().toLowerCase();
        if(headersToKeep.has(key))headers[key]=line.slice(idx+1).trim();
      }
    }catch{}
    const row={
      path:route.path,sample,
      status:meta.http_code||0,
      dnsMs:Math.round((meta.time_namelookup||0)*1000),
      connectionMs:Math.round((meta.time_connect||0)*1000),
      firstByteMs:Math.round((meta.time_starttransfer||0)*1000),
      afterTlsWaitMs:Math.round(((meta.time_starttransfer||0)-(meta.time_pretransfer||0))*1000),
      totalMs:Math.round((meta.time_total||0)*1000),
      bytes:Math.round(meta.size_download||0),
      headers,error:meta.errormsg||cmd.error?.message||cmd.stderr.trim()||null
    };
    console.log("MEASURE "+JSON.stringify(row));
    results.push(row);
    if(row.status!==200){
      writeFileSync(base+"/results.json",JSON.stringify(results,null,2));
      console.error("Stop: HTTP "+row.status+" for "+route.path);
      process.exit(1);
    }
    if(results.length<9)await sleep(1800);
  }
}
const med=values=>{
 const v=values.filter(Number.isFinite).sort((a,b)=>a-b);
 return v.length?v[Math.floor(v.length/2)]:null;
};
const summary=routes.map(route=>{
  const group=results.filter(x=>x.path===route.path);
  return {
    path:route.path,status:"3/3 HTTP 200",
    medianTtfbMs:med(group.map(x=>x.firstByteMs)),
    minTtfbMs:Math.min(...group.map(x=>x.firstByteMs)),
    maxTtfbMs:Math.max(...group.map(x=>x.firstByteMs)),
    medianAfterTlsMs:med(group.map(x=>x.afterTlsWaitMs)),
    medianTotalMs:med(group.map(x=>x.totalMs)),
    caches:[...new Set(group.map(x=>x.headers["cf-cache-status"]||"?"))].join("/"),
    nextCaches:[...new Set(group.map(x=>x.headers["x-nextjs-cache"]||"?"))].join("/")
  };
});
const markdown=[
  "# İlkOku — Ahrefs 3 other non-parameter URL measurements",
  "",
  "Read-only single GitHub Actions runner, three paced GETs per URL (9 total), not real-user Core Web Vitals.",
  "Measured site and edge can differ from October 19 Ahrefs crawler; TTFB includes network and does not prove CPU, DB or application cause.",
  "",
  "| URL | Requests | Median TTFB ms | TTFB min–max ms | Median after TLS ms | Median total ms | CF cache | Next cache |",
  "|---|---|---:|---:|---:|---:|---|---|",
  ...summary.map(r=>"| "+[r.path,r.status,r.medianTtfbMs,r.minTtfbMs+"–"+r.maxTtfbMs,r.medianAfterTlsMs,r.medianTotalMs,r.caches,r.nextCaches].join(" | ")+" |"),
  "",
  "| URL | Sample | HTTP | TTFB ms | Total ms | Bytes |",
  "|---|---:|---:|---:|---:|---:|",
  ...results.map(r=>"| "+[r.path,r.sample,r.status,r.firstByteMs,r.totalMs,r.bytes].join(" | ")+" |"),
  "",
  "No app, CMS, footer, menu, content, SEO, cache, or production change."
].join("\n");
writeFileSync(base+"/results.json",JSON.stringify({dateUtc:new Date().toISOString(),summary,results},null,2));
writeFileSync(base+"/report.md",markdown);
if(process.env.GITHUB_STEP_SUMMARY)(await import("node:fs")).appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
console.log(markdown);
