import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { runBookIndexScheduler } from "@/lib/book-index/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function configuredSecret() {
  return process.env.BOOK_INDEX_SCHEDULER_SECRET?.trim() ?? "";
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
      { ok: false, error: "BOOK_INDEX_SCHEDULER_SECRET_MISSING" },
      { status: 503 },
    );
  }

  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const result = await runBookIndexScheduler();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "UNKNOWN_BOOK_INDEX_SCHEDULER_ERROR";

    console.error("BOOK_INDEX_SCHEDULER_RUN_FAILED", {
      error: message,
    });

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
