import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runEmailOperationsCheck } from "@/features/email-operations/service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function configuredSecret() {
  return process.env.EMAIL_OPERATIONS_SECRET?.trim()
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
      { error: "EMAIL_OPERATIONS_SECRET_MISSING" },
      { status: 503 },
    );
  }

  if (!authorized(request)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const result = await runEmailOperationsCheck();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "UNKNOWN_EMAIL_OPERATIONS_ERROR";

    console.error("EMAIL_OPERATIONS_RUN_FAILED", {
      error: message,
    });

    return NextResponse.json(
      { error: message, ok: false },
      { status: 500 },
    );
  }
}
