import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { backfillIdefixHistoricalMetadata } from "@/lib/book-index/idefix-history-backfill";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_AUDIENCE = "ilkoku-book-index-idefix-history-backfill";
const GITHUB_OIDC_JWKS = createRemoteJWKSet(
  new URL(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`),
);
const GITHUB_REPOSITORY = "ilkoku/ilkoku";
const GITHUB_REPOSITORY_ID = "1304046004";
const GITHUB_WORKFLOW_REF =
  "ilkoku/ilkoku/.github/workflows/book-index-idefix-history-backfill.yml@refs/heads/main";
const ALLOWED_GITHUB_EVENTS = new Set([
  "push",
  "workflow_dispatch",
]);

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

async function authorized(request: NextRequest) {
  const supplied = bearerToken(request);
  if (!supplied) return false;

  try {
    const { payload } = await jwtVerify(supplied, GITHUB_OIDC_JWKS, {
      issuer: GITHUB_OIDC_ISSUER,
      audience: GITHUB_OIDC_AUDIENCE,
    });

    return payload.repository === GITHUB_REPOSITORY
      && payload.repository_id === GITHUB_REPOSITORY_ID
      && payload.workflow_ref === GITHUB_WORKFLOW_REF
      && payload.ref === "refs/heads/main"
      && typeof payload.event_name === "string"
      && ALLOWED_GITHUB_EVENTS.has(payload.event_name);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const result = await backfillIdefixHistoricalMetadata();

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "UNKNOWN_BOOK_INDEX_IDEFIX_HISTORY_BACKFILL_ERROR";

    console.error("BOOK_INDEX_IDEFIX_HISTORY_BACKFILL_FAILED", {
      error: message,
    });

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
