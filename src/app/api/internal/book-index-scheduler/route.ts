import { timingSafeEqual } from "node:crypto";

import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { collectBookIndexListByCode } from "@/lib/book-index/collector";
import { getBookIndexReadinessSnapshot } from "@/lib/book-index/readiness";
import { runBookIndexScheduler } from "@/lib/book-index/scheduler";
import { getBookIndexSeoGateSnapshot } from "@/lib/book-index/seo-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_AUDIENCE = "ilkoku-book-index-scheduler";
const GITHUB_OIDC_JWKS = createRemoteJWKSet(
  new URL(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`),
);
const GITHUB_REPOSITORY = "ilkoku/ilkoku";
const GITHUB_REPOSITORY_ID = "1304046004";
const GITHUB_WORKFLOW_REF =
  "ilkoku/ilkoku/.github/workflows/book-index-scheduler.yml@refs/heads/main";
const ALLOWED_GITHUB_EVENTS = new Set([
  "workflow_dispatch",
  "schedule",
  "workflow_run",
]);


function configuredSecret() {
  return process.env.BOOK_INDEX_SCHEDULER_SECRET?.trim() ?? "";
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

function authorizedWithSecret(supplied: string) {
  const configured = configuredSecret();

  if (!configured || configured.length < 32 || !supplied) {
    return false;
  }

  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);

  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

async function authorizedWithGithubOidc(supplied: string) {
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

async function authorized(request: NextRequest) {
  const supplied = bearerToken(request);

  if (!supplied) return false;
  if (authorizedWithSecret(supplied)) return true;

  return authorizedWithGithubOidc(supplied);
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const forceNobel = request.nextUrl.searchParams.get("forceNobel") === "1";
    let forcedNobelRun: Awaited<ReturnType<typeof collectBookIndexListByCode>> | null = null;

    if (forceNobel) {
      forcedNobelRun = await collectBookIndexListByCode("nobelkitap-tr-live");
    }

    const result = await runBookIndexScheduler();
    const [readiness, seoGate] = await Promise.all([
      getBookIndexReadinessSnapshot(),
      getBookIndexSeoGateSnapshot(),
    ]);

    return NextResponse.json({
      ok: true,
      ...result,
      forcedNobelRun,
      readiness,
      seoGate,
    });
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
