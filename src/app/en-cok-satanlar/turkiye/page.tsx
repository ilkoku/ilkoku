import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { TurkeyBookIndexView } from "@/features/book-index/public/BookIndexPublicView";
import { collectBookIndexTimings, type BookIndexTiming } from "@/lib/book-index/performance-trace";
import { getBookIndexSoftLaunchPageContext } from "@/lib/book-index/public-access";
import { createBookIndexItemListSchema, getBookIndexLastObservedAt } from "@/lib/book-index/seo";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

const baseUrl = "https://ilkoku.com";
const canonical = "/en-cok-satanlar/turkiye";
function pageTitle() {
  return `Türkiye'de En Çok Satan Kitaplar ${new Date().getFullYear()} | İlkOku`;
}

const description =
  "Türkiye'deki çok satan kitapların satış kanallarına göre sıralamasını inceleyin; kaynakları ve kitapların listedeki konumlarını karşılaştırın.";

export const dynamic = "force-dynamic";

// --- Optional server timing (BOOK_INDEX_TIMING=1) -------------------------
// Off by default: every helper below is a no-op and loadContext() calls the
// original request-cached loader directly. When on, only stage names and
// milliseconds are written, as one JSON line via console.info. No content.
function timingEnabled() {
  return process.env.BOOK_INDEX_TIMING === "1";
}

function nowMs() {
  return performance.now();
}

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
}

type ContextTrace = { wallMs: number; timings: BookIndexTiming[] };

// Request-scoped holder, shared by generateMetadata and the page render.
const getContextTraceHolder = cache((): { trace: ContextTrace | null } => ({ trace: null }));

const loadTracedContext = cache(async () => {
  const traced = await collectBookIndexTimings(() => getBookIndexSoftLaunchPageContext(1200));
  getContextTraceHolder().trace = { wallMs: traced.wallMs, timings: traced.timings };
  return traced.value;
});

function loadContext() {
  return timingEnabled()
    ? loadTracedContext()
    : getBookIndexSoftLaunchPageContext(1200);
}

function spanMs(timings: BookIndexTiming[], operation: string) {
  const entry = timings.find((item) => item.operation === operation);
  return entry ? entry.elapsedMs : null;
}

function logTiming(stages: Record<string, number | null>, trace: ContextTrace | null) {
  const timings = trace?.timings ?? [];
  const rankRows = spanMs(timings, "publicModel.turkeyRankRows");
  const activeLists = spanMs(timings, "rankRows.activeListsSql");
  const latestRuns = spanMs(timings, "rankRows.latestRunsSql");
  // The rank-row builder runs its two SQL steps in sequence, then transforms
  // rows in memory. Remainder = in-memory transform + sort (derived, not direct).
  const rowTransformMs = rankRows !== null && activeLists !== null && latestRuns !== null
    ? roundMs(Math.max(rankRows - activeLists - latestRuns, 0))
    : null;

  console.info(JSON.stringify({
    event: "book_index_timing",
    route: canonical,
    unit: "ms",
    stages: {
      ...stages,
      contextWall: trace ? trace.wallMs : null,
      rowTransformDerived: rowTransformMs,
    },
    // Spans may overlap (parallel) and include DB connection queue time.
    spans: timings.map((item) => ({
      stage: item.operation,
      ms: item.elapsedMs,
      outcome: item.outcome,
    })),
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  // Share the exact same request-scoped context with the page render;
  // a separate 100-row metadata request would repeat costly SQL work.
  const context = await loadContext();

  return createPublicPageMetadata({
    title: pageTitle(),
    description,
    canonical,
    image: "/en-cok-satanlar/opengraph-image",
    noIndex: context.model.turkey.availability !== "available",
  });
}

export default async function TurkeyBestsellersPage() {
  const timing = timingEnabled();
  const pageStart = timing ? nowMs() : 0;
  const context = await loadContext();
  const contextDoneAt = timing ? nowMs() : 0;
  const searchIndexable = context.model.turkey.availability === "available";
  if (context.model.turkey.availability !== "available") notFound();

  const lastObservedAt = getBookIndexLastObservedAt(context.model);
  const itemListStart = timing ? nowMs() : 0;
  const itemList = createBookIndexItemListSchema({
    name: "Türkiye'de En Çok Satan Kitaplar",
    url: `${baseUrl}${canonical}#ranking`,
    items: context.model.turkey.items,
  });
  const itemListDoneAt = timing ? nowMs() : 0;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `İlkOku Türkiye Kitap Endeksi · ${new Date().getFullYear()}`,
      description,
      url: `${baseUrl}${canonical}`,
      inLanguage: "tr-TR",
      image: `${baseUrl}/en-cok-satanlar/opengraph-image`,
      ...(lastObservedAt ? { dateModified: lastObservedAt.toISOString() } : {}),
      mainEntity: {
        "@id": `${baseUrl}${canonical}#ranking`,
      },
      isPartOf: {
        "@type": "WebSite",
        name: "İlkOku",
        url: baseUrl,
      },
    },
    {
      ...itemList,
      "@id": `${baseUrl}${canonical}#ranking`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Ana Sayfa",
          item: `${baseUrl}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "En Çok Satanlar",
          item: `${baseUrl}/en-cok-satanlar`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Türkiye",
          item: `${baseUrl}${canonical}`,
        },
      ],
    },
  ];

  const serializeStart = timing ? nowMs() : 0;
  const jsonLd = searchIndexable
    ? JSON.stringify(schema).replace(/</g, "\\u003c")
    : null;

  if (timing) {
    const end = nowMs();
    // pageFunction covers this function only (context wait + JSON-LD).
    // Rendering <TurkeyBookIndexView> and HTML/RSC streaming happen after it
    // returns and are not included; compare with TTFB to see that remainder.
    logTiming({
      contextWaitInPage: roundMs(contextDoneAt - pageStart),
      jsonLdBuild: roundMs(itemListDoneAt - itemListStart),
      jsonLdSerialize: roundMs(end - serializeStart),
      pageFunction: roundMs(end - pageStart),
    }, getContextTraceHolder().trace);
  }

  return (
    <>
      {searchIndexable ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd ?? "",
          }}
        />
      ) : null}
      <TurkeyBookIndexView model={context.model} />
    </>
  );
}
