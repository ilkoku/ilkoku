import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runCmsPublishingScheduler } from "@/lib/cms-scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const configured = process.env.WRITER_DAILY_SUMMARY_SECRET?.trim();
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!configured || configured.length < 32 || !supplied) return false;
  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: NextRequest) {
  if (!process.env.WRITER_DAILY_SUMMARY_SECRET?.trim()) {
    return NextResponse.json({ ok: false, error: "CMS_SCHEDULER_SECRET_MISSING" }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const result = await runCmsPublishingScheduler();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_CMS_SCHEDULER_ERROR";
    console.error("CMS_SCHEDULER_RUN_FAILED", { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
