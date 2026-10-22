import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getBookIndexInsights, getBookIndexPageInsights } from "@/lib/book-index/insights";
import type { BookIndexInsightKey } from "@/lib/book-index/insight-pages";
import { getBookIndexSoftLaunchPageContext } from "@/lib/book-index/public-access";
import {
  collectBookIndexTimings,
  timeBookIndexOperation,
} from "@/lib/book-index/performance-trace";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(request: Request) {
  // No profile, database work or timing data is exposed to unauthenticated
  // visitors or non-admin users. This endpoint performs read-only queries.
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, {
      status: 403,
      headers: responseHeaders,
    });
  }

  const requested = new URL(request.url).searchParams.get("insight");
  const validKeys: BookIndexInsightKey[] = [
    "newEntries", "risers", "everywhereSellers", "longSellers",
  ];
  if (requested !== null && !validKeys.some((key) => key === requested)) {
    return NextResponse.json({ ok: false, error: "invalid_insight" }, {
      status: 400,
      headers: responseHeaders,
    });
  }
  const insightKey = requested as BookIndexInsightKey | null;

  try {
    const { value, wallMs, timings } = await collectBookIndexTimings(async () => {
      // Match the real insight page's concurrent 100/50 request workload.
      const [context, insights] = await Promise.all([
        timeBookIndexOperation(
          "route.publicContext",
          () => getBookIndexSoftLaunchPageContext(100),
        ),
        timeBookIndexOperation(
          "route.insightsCalculation",
          () => insightKey
            ? getBookIndexPageInsights(insightKey, 50)
            : getBookIndexInsights(50),
        ),
      ]);

      return {
        publicationGate: context.gate.state,
        totalTurkeyRankingRows: context.model.turkey.items.length,
        sourceListCount: context.model.sourceLists.length,
        insightCounts: {
          longSellers: insights.longSellers.length,
          newEntries: insights.newEntries.length,
          risers: insights.risers.length,
          everywhereSellers: insights.everywhereSellers.length,
        },
      };
    });

    return NextResponse.json({
      ok: true,
      observedAtUtc: new Date().toISOString(),
      workload: insightKey
        ? `insight-page:${insightKey} publicContext(100) + selectedInsights(50)`
        : "insight-page: publicContext(100) + insights(50)",
      // Timed SQL calls include driver/connection queue time. Because the
      // shared MariaDB adapter connectionLimit is 1, parallel spans overlap.
      // This is not EXPLAIN ANALYZE or a pure database execution-time trace.
      interpretation: "spans include connection queue, Prisma and database time; parallel spans overlap",
      wallMs,
      timings,
      counts: value,
    }, { headers: responseHeaders });
  } catch {
    return NextResponse.json({ ok: false, error: "diagnostic_failed" }, {
      status: 503,
      headers: responseHeaders,
    });
  }
}
