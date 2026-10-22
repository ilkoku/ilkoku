import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getBookIndexInsights } from "@/lib/book-index/insights";
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

export async function GET() {
  // No profile, database work or timing data is exposed to unauthenticated
  // visitors or non-admin users. This endpoint performs read-only queries.
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, {
      status: 403,
      headers: responseHeaders,
    });
  }

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
          () => getBookIndexInsights(50),
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
      workload: "insight-page: publicContext(100) + insights(50)",
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
