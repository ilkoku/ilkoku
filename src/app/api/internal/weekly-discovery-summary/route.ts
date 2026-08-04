import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runWeeklyDiscoverySummaries } from "@/features/weekly-discovery-summary/service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function configuredSecret() {
  return process.env.SUMMARY_JOBS_SECRET?.trim()
    || process.env.WRITER_DAILY_SUMMARY_SECRET?.trim()
    || "";
}

function authorized(request: NextRequest) {
  const configured = configuredSecret();
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!configured || configured.length < 32 || !supplied) {
    return false;
  }

  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);

  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: NextRequest) {
  if (!configuredSecret()) {
    return NextResponse.json(
      { error: "SUMMARY_JOBS_SECRET_MISSING" },
      { status: 503 },
    );
  }

  if (!authorized(request)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const weekStart = request.nextUrl.searchParams.get("weekStart");

  try {
    const result = await runWeeklyDiscoverySummaries(weekStart);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "UNKNOWN_WEEKLY_DISCOVERY_SUMMARY_ERROR";

    console.error("WEEKLY_DISCOVERY_SUMMARY_RUN_FAILED", {
      error: message,
      weekStart,
    });

    return NextResponse.json(
      { error: message, ok: false },
      { status: message === "INVALID_WEEK_START" ? 400 : 500 },
    );
  }
}
