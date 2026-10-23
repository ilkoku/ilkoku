// Temporary read-only controlled browser diagnostic: never merge or send artificial GA4 events.
import { chromium } from "@playwright/test";
import { classifyGa4Request } from "./seo-ga4-live-hit-rules.mjs";

const directUrl = "https://www.googletagmanager.com/gtm.js?id=GTM-W6NVSMNV";
const response = await fetch(directUrl, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw Error("direct Google tag script unavailable: " + response.status);
const directBody = await response.text();
if (!directBody.includes("GTM-W6NVSMNV")) throw Error("Direct script was not the expected GTM container");

const browser = await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
try {
  for (const mode of ["manual", "direct-body"]) {
    const context = await browser.newContext({locale:"tr-TR",serviceWorkers:"block",reducedMotion:"reduce"});
    const page = await context.newPage();
    const hits=[];
    let manualScriptCount=0;
    try {
      // These interceptors modify only this isolated browser session, not the live site.
      // Suppress consent-bypassing Cloudflare automatic scripts equally in both cases.
      await page.route(/\/1q6z(?:\/|$|\?)/, route => route.abort("blockedbyclient"));
      await page.route(/https:\/\/www\.googletagmanager\.com\/gtm\.js/, route => route.abort("blockedbyclient"));
      await page.route(/^https:\/\/ilkoku\.com\/ilkgtm\/\?id=GTM-/, async route=>{
        manualScriptCount++;
        if (mode === "direct-body") {
          await route.fulfill({status:200,contentType:"application/javascript; charset=UTF-8",body:directBody});
        } else await route.continue();
      });
      page.on("request", request => {
        const x=classifyGa4Request(request.url(),request.postData()||"");
        if (x?.type==="ga4-hit") hits.push({event:x.event,firstParty:x.firstParty});
      });
      const response=await page.goto("https://ilkoku.com/",{waitUntil:"domcontentloaded",timeout:35000});
      if(response?.status()!==200)throw Error("home HTTP "+response?.status());
      await page.getByRole("button",{name:"Tümünü kabul et"}).click({timeout:25000});
      await page.waitForFunction(()=>document.documentElement.dataset.ilkokuAnalyticsGtm==="loaded",{timeout:16000});
      await page.waitForTimeout(5500);
      const nav=await page.goto("https://ilkoku.com/nasil-calisir",{waitUntil:"domcontentloaded",timeout:35000});
      if(nav?.status()!==200)throw Error("internal HTTP "+nav?.status());
      await page.waitForTimeout(5000);
      const cta=page.locator(".how-hero__actions a").first();
      let clicked=false;
      if(await cta.count()) {
        await cta.evaluate(a=>a.addEventListener("click",e=>e.preventDefault(),{capture:true,once:true}));
        await cta.click();clicked=true;
        await page.waitForTimeout(3500);
      }
      const state=await page.evaluate(()=>({
        consent:document.documentElement.dataset.ilkokuAnalyticsConsent,
        gtm:document.documentElement.dataset.ilkokuAnalyticsGtm,
        appGtmSource:(document.getElementById("ilkoku-gtm-script")?.getAttribute("src")||"").split("?")[0],
        ctaEvent:(window.dataLayer||[]).some(x=>x&&typeof x==="object"&&x.event==="site_cta_click")
      }));
      const events={};for(const x of hits)events[x.event]=(events[x.event]||0)+1;
      console.log("CONTROLLED_GTM_COMPARE "+JSON.stringify({mode,manualScriptCount,clicked,state,hitTotal:hits.length,events,firstPartyHits:hits.filter(x=>x.firstParty).length}));
    }catch(e){console.error("CONTROLLED_GTM_COMPARE_ERROR "+JSON.stringify({mode,error:String(e),hitTotal:hits.length,manualScriptCount}));process.exitCode=1;}
    finally{await context.close();}
  }
}finally{await browser.close();}
