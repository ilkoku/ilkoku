import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { getBookIndexOperationsSnapshot } from "@/lib/book-index/operations";
import { getBookIndexPublicReadModel } from "@/lib/book-index/public-read-model";
import { getBookIndexReadinessSnapshot } from "@/lib/book-index/readiness";
import {
  evaluateBookIndexSeoGate,
  getBookIndexSeoGatePolicy,
} from "@/lib/book-index/seo-gate";

export const dynamic = "force-dynamic";

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_AUDIENCE = "ilkoku-book-index-readiness";
const GITHUB_OIDC_JWKS = createRemoteJWKSet(
  new URL(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`),
);
const GITHUB_REPOSITORY = "ilkoku/ilkoku";
const GITHUB_REPOSITORY_ID = "1304046004";
const GITHUB_WORKFLOW_REF =
  "ilkoku/ilkoku/.github/workflows/book-index-readiness.yml@refs/heads/main";
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

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const [readiness, publicReadModel, operations] = await Promise.all([
      getBookIndexReadinessSnapshot(),
      getBookIndexPublicReadModel(100),
      getBookIndexOperationsSnapshot(),
    ]);
    const seoGate = evaluateBookIndexSeoGate(
      getBookIndexSeoGatePolicy(),
      {
        observedCompositeSources: readiness.observedCompositeSources,
        observedIndependentCompositeSources:
          readiness.observedCompositeIndependenceGroups,
        matchCoveragePercent: readiness.matchCoveragePercent,
        historySpanDays: readiness.historySpanDays,
        turkeyItemCount: publicReadModel.turkey.items.length,
      },
    );

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      readiness: {
        publicRolloutState: readiness.publicRolloutState,
        observedCompositeSources: readiness.observedCompositeSources,
        observedCompositeIndependenceGroups:
          readiness.observedCompositeIndependenceGroups,
        externalBookCount: readiness.externalBookCount,
        matchedExternalBookCount: readiness.matchedExternalBookCount,
        unmatchedExternalBookCount: readiness.unmatchedExternalBookCount,
        matchCoveragePercent: readiness.matchCoveragePercent,
        booksOnAtLeast3IndependentCompositeSources:
          readiness.booksOnAtLeast3IndependentCompositeSources,
        nearThreeSourceCount: readiness.nearThreeSourceCount,
        nearThreeWithHistoricalThirdSourceCount:
          readiness.nearThreeWithHistoricalThirdSourceCount,
        historySpanHours: readiness.historySpanHours,
        historySpanDays: readiness.historySpanDays,
        minimumSourceSuccessfulRunCount:
          readiness.minimumSourceSuccessfulRunCount,
        minimumSourceHistorySpanHours:
          readiness.minimumSourceHistorySpanHours,
        leastSuccessfulRunCountSourceCodes:
          readiness.leastSuccessfulRunCountSourceCodes,
        shortestHistorySpanSourceCodes:
          readiness.shortestHistorySpanSourceCodes,
        unmatchedExternalBooksBySource:
          readiness.unmatchedExternalBooksBySource,
        unmatchedDuplicateIdentityGroupsBySource:
          readiness.unmatchedDuplicateIdentityGroupsBySource,
        unmatchedMissingAuthorBooksBySource:
          readiness.unmatchedMissingAuthorBooksBySource,
        unmatchedAmbiguousIdentityGroupsBySource:
          readiness.unmatchedAmbiguousIdentityGroupsBySource,
      },
      operations: {
        dueCount: operations.dueCount,
        maxOverdueMinutes: operations.maxOverdueMinutes,
        dueLists: operations.rows
          .filter((row) => row.due)
          .map((row) => ({
            listCode: row.listCode,
            sourceCode: row.sourceCode,
            nextDueAt: row.nextDueAt,
            latestRunStatus: row.latestRunStatus,
          })),
      },
      seoGate: {
        state: seoGate.state,
        canPublish: seoGate.canPublish,
      },
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "UNKNOWN_BOOK_INDEX_READINESS_ERROR";

    console.error("BOOK_INDEX_READINESS_PROBE_FAILED", {
      error: message,
    });

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
