import fs from "node:fs";
import path from "node:path";

const routes = [
  "/yazarlar-icin/kurgu/roman",
  "/okurlar-icin/okumaya-baslama",
  "/editorler-icin/egitim/editorluge-baslama",
  "/yayinevleri-icin",
];
const dir = "artifacts/ilkoku-lcp-3runs";
const round = (value) => Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
const median = (values) => [...values].sort((a, b) => a-b)[1];
const total = [];
for (const route of routes) {
  const samples = [];
  for (let n=1;n<=3;n++) {
    const report=JSON.parse(fs.readFileSync(path.join(dir, "run-"+n+"-"+routes.indexOf(route)+".json"),"utf8"));
    const url=new URL(report.finalDisplayedUrl||report.finalUrl);
    if (url.origin!=="https://ilkoku.com"||url.pathname!==route||report.runtimeError||
        report.configSettings?.formFactor!=="mobile")
      throw new Error("Invalid benchmark report: "+route+" #"+n);
    const audits=report.audits;
    const lcp=audits["largest-contentful-paint"]?.numericValue;
    const cls=audits["cumulative-layout-shift"]?.numericValue;
    const fcp=audits["first-contentful-paint"]?.numericValue;
    const tbt=audits["total-blocking-time"]?.numericValue;
    if (!Number.isFinite(lcp)||!Number.isFinite(cls))throw new Error("Missing metrics for "+route+" "+n);
    const breakdown=audits["lcp-breakdown-insight"]?.details?.items
      ?.find((x)=>x.type==="table")?.items||[];
    const phases=Object.fromEntries(breakdown.map((x)=>[x.subpart,round(x.duration)]));
    const lcpElement=audits["largest-contentful-paint-element"]?.details?.items
      ?.find((x)=>x.type==="table")?.items?.[0]?.node||{};
    const resources=audits["network-requests"]?.details?.items||[];
    const imageResource=resources.find((x)=>x.resourceType==="Image"&&/for-publishers-w750-q60-v1\.webp/.test(x.url||""));
    const css=resources.filter((x)=>x.resourceType==="Stylesheet");
    const blocked=audits["render-blocking-insight"]?.details?.items||[];
    const sample={
      route,run:n,score:round((report.categories?.performance?.score??0)*100),
      lcpMs:round(lcp),fcpMs:round(fcp),tbtMs:round(tbt),cls:round(cls),
      serverResponseMs:round(audits["server-response-time"]?.numericValue),
      lcpSelector:lcpElement.selector||null,phases,
      cssCount:css.length,cssTransferredBytes:css.reduce((sum,x)=>sum+(x.transferSize||0),0),
      jsTransferredBytes:resources.filter((x)=>x.resourceType==="Script").reduce((sum,x)=>sum+(x.transferSize||0),0),
      imageRequest:imageResource?{url:imageResource.url,
        transferSize:imageResource.transferSize,
        start:round(imageResource.networkRequestTime),
        end:round(imageResource.networkEndTime)}:null,
      renderBlockingCssUrls:blocked.filter((x)=>typeof x.url==="string"&&x.url.includes(".css")).map((x)=>x.url),
    };
    samples.push(sample);
    console.log("LCP_LAB_SAMPLE "+JSON.stringify(sample));
  }
  const aggregate={
    route,runCount:3,
    scoreMedian:median(samples.map(x=>x.score)),
    lcpMedianMs:median(samples.map(x=>x.lcpMs)),
    lcpRangeMs:[Math.min(...samples.map(x=>x.lcpMs)),Math.max(...samples.map(x=>x.lcpMs))],
    fcpMedianMs:median(samples.map(x=>x.fcpMs)),
    tbtMedianMs:median(samples.map(x=>x.tbtMs)),
    clsMedian:median(samples.map(x=>x.cls)),
    serverResponseMedianMs:median(samples.map(x=>x.serverResponseMs).filter(Number.isFinite)),
    lcpSelectors:[...new Set(samples.map(x=>x.lcpSelector))],
    samples,
  };
  total.push(aggregate);
  console.log("LCP_LAB_AGGREGATE "+JSON.stringify({...aggregate,samples:undefined}));
}
const build=JSON.parse(fs.readFileSync(path.join(dir,"build-info.json"),"utf8"));
const output={observedAt:new Date().toISOString(),site:"https://ilkoku.com",
  liveCommitSha:build.commitSha,method:"Lighthouse v12.8.2 mobile simulation; 3 passes, each 4 routes; lab only, not CrUX",
  rows:total};
fs.writeFileSync(path.join(dir,"summary.json"),JSON.stringify(output,null,2));
console.log("LCP_LAB_DONE "+JSON.stringify({sha:build.commitSha,routes:total.length,samples:total.length*3}));
