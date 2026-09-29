import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { getBookIndexOperationsSnapshot } from "@/lib/book-index/operations";
import { BOOK_INDEX_LISTS } from "@/lib/book-index/lists";
import { getBookIndexPublicReadModel } from "@/lib/book-index/public-read-model";
import { getBookIndexReadinessSnapshot } from "@/lib/book-index/readiness";
import {
  evaluateBookIndexSeoGate,
  getBookIndexSeoGatePolicy,
} from "@/lib/book-index/seo-gate";

export const dynamic = "force-dynamic";

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_AUDIENCE = "ilkoku-book-index-readiness";
const GITHUB_OIDC_HEADER = "x-ilkoku-github-oidc";
const GITHUB_OIDC_JWKS = createRemoteJWKSet(
  new URL(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`),
);
const GITHUB_REPOSITORY = "ilkoku/ilkoku";
const GITHUB_REPOSITORY_ID = "1304046004";
const GITHUB_WORKFLOW_REF =
  "ilkoku/ilkoku/.github/workflows/book-index-readiness.yml@refs/heads/main";
const ALLOWED_GITHUB_EVENTS = new Set([
  "workflow_dispatch",
  "workflow_run",
  "schedule",
]);

function oidcToken(request: NextRequest) {
  const forwarded = request.headers.get(GITHUB_OIDC_HEADER)?.trim() ?? "";
  if (forwarded) return forwarded;

  const authorization = request.headers.get("authorization")?.trim() ?? "";

  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

async function authorized(request: NextRequest) {
  const supplied = oidcToken(request);
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
    const enabledNewReleaseCodes = new Set(
      BOOK_INDEX_LISTS
        .filter((list) => list.enabled && list.categoryKey === "new-releases")
        .map((list) => list.code),
    );
    const newReleaseLists = operations.rows
      .filter((row) => row.listCode.endsWith("-new-releases"))
      .map((row) => ({
        listCode: row.listCode,
        sourceCode: row.sourceCode,
        enabled: enabledNewReleaseCodes.has(row.listCode),
        cadenceMinutes: row.cadenceMinutes,
        persisted: row.persisted,
        active: row.active,
        sourceStatus: row.sourceStatus,
        latestRunStatus: row.latestRunStatus,
        latestRunAt: row.latestRunAt,
        latestRunCompletedAt: row.latestRunCompletedAt,
        latestRunItems: row.latestRunItems,
        latestRunErrorCode: row.latestRunErrorCode,
        lastSuccessfulRunAt: row.lastSuccessfulRunAt,
        nextDueAt: row.nextDueAt,
        due: row.due,
      }));
    const seoGate = evaluateBookIndexSeoGate(
      getBookIndexSeoGatePolicy(),
      {
        observedCompositeSources: readiness.observedCompositeSources,
        observedIndependentCompositeSources:
          readiness.observedCompositeIndependenceGroups,
        matchCoveragePercent: readiness.latestCompositeMatchCoveragePercent,
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
        latestCompositeExternalBookCount:
          readiness.latestCompositeExternalBookCount,
        latestCompositeMatchedExternalBookCount:
          readiness.latestCompositeMatchedExternalBookCount,
        latestCompositeUnmatchedExternalBookCount:
          readiness.latestCompositeUnmatchedExternalBookCount,
        latestCompositeUnmatchedBooksBySource:
          readiness.latestCompositeUnmatchedBooksBySource,
        latestCompositeUnmatchedSamples:
          readiness.latestCompositeUnmatchedSamples,
        latestCompositeMatchCoveragePercent:
          readiness.latestCompositeMatchCoveragePercent,
        booksOnAtLeast3IndependentCompositeSources:
          readiness.booksOnAtLeast3IndependentCompositeSources,
        nearThreeSourceCount: readiness.nearThreeSourceCount,
        nearThreeWithHistoricalThirdSourceCount:
          readiness.nearThreeWithHistoricalThirdSourceCount,
        kitapStoreCanaryHealth:
          readiness.kitapStoreCanaryHealth,
        kitapStoreCanaryObservationCount:
          readiness.kitapStoreCanaryObservationCount,
        kitapStoreCanaryMatchedObservationCount:
          readiness.kitapStoreCanaryMatchedObservationCount,
        kitapStoreCanaryUnmatchedObservationCount:
          readiness.kitapStoreCanaryUnmatchedObservationCount,
        kitapStoreCanaryDuplicateMasterObservationCount:
          readiness.kitapStoreCanaryDuplicateMasterObservationCount,
        kitapStoreCanaryDuplicateMasterSamples:
          readiness.kitapStoreCanaryDuplicateMasterSamples,
        kitapStoreCanaryShadowBookCount:
          readiness.kitapStoreCanaryShadowBookCount,
        kitapStoreCanaryShadowOverlapWithCompositeCount:
          readiness.kitapStoreCanaryShadowOverlapWithCompositeCount,
        kitapStoreCanaryShadowWouldReach3StorefrontCount:
          readiness.kitapStoreCanaryShadowWouldReach3StorefrontCount,
        kitapStoreCanaryShadowWouldReach3IndependentCount:
          readiness.kitapStoreCanaryShadowWouldReach3IndependentCount,
        kitapStoreCanaryShadowPairOverlap:
          readiness.kitapStoreCanaryShadowPairOverlap,
        kitapStoreCanaryShadowSamples:
          readiness.kitapStoreCanaryShadowSamples,
        kitapSecGeneralCanaryHealth:
          readiness.kitapSecGeneralCanaryHealth,
        kitapSecGeneralCanaryShadowBookCount:
          readiness.kitapSecGeneralCanaryShadowBookCount,
        kitapSecGeneralCanaryShadowOverlapWithCompositeCount:
          readiness.kitapSecGeneralCanaryShadowOverlapWithCompositeCount,
        kitapSecGeneralCanaryShadowWouldReach3StorefrontCount:
          readiness.kitapSecGeneralCanaryShadowWouldReach3StorefrontCount,
        kitapSecGeneralCanaryShadowWouldReach3IndependentCount:
          readiness.kitapSecGeneralCanaryShadowWouldReach3IndependentCount,
        kitapSecGeneralCanaryShadowPairOverlap:
          readiness.kitapSecGeneralCanaryShadowPairOverlap,
        kitapSecGeneralCanaryShadowSamples:
          readiness.kitapSecGeneralCanaryShadowSamples,
        pandoraCanaryHealth:
          readiness.pandoraCanaryHealth,
        pandoraCanaryShadowBookCount:
          readiness.pandoraCanaryShadowBookCount,
        pandoraCanaryShadowOverlapWithCompositeCount:
          readiness.pandoraCanaryShadowOverlapWithCompositeCount,
        pandoraCanaryShadowWouldReach3StorefrontCount:
          readiness.pandoraCanaryShadowWouldReach3StorefrontCount,
        pandoraCanaryShadowWouldReach3IndependentCount:
          readiness.pandoraCanaryShadowWouldReach3IndependentCount,
        pandoraCanaryShadowPairOverlap:
          readiness.pandoraCanaryShadowPairOverlap,
        pandoraCanaryShadowSamples:
          readiness.pandoraCanaryShadowSamples,
        kitapAmbariCanaryHealth:
          readiness.kitapAmbariCanaryHealth,
        kitapAmbariCanaryShadowBookCount:
          readiness.kitapAmbariCanaryShadowBookCount,
        kitapAmbariCanaryShadowOverlapWithCompositeCount:
          readiness.kitapAmbariCanaryShadowOverlapWithCompositeCount,
        kitapAmbariCanaryShadowWouldReach3StorefrontCount:
          readiness.kitapAmbariCanaryShadowWouldReach3StorefrontCount,
        kitapAmbariCanaryShadowWouldReach3IndependentCount:
          readiness.kitapAmbariCanaryShadowWouldReach3IndependentCount,
        kitapAmbariCanaryShadowPairOverlap:
          readiness.kitapAmbariCanaryShadowPairOverlap,
        kitapAmbariCanaryShadowSamples:
          readiness.kitapAmbariCanaryShadowSamples,
        normalizedIdentityKeysOnAtLeast2Sources:
          readiness.normalizedIdentityKeysOnAtLeast2Sources,
        normalizedIdentityKeysOnAtLeast3Sources:
          readiness.normalizedIdentityKeysOnAtLeast3Sources,
        isbn13KeysOnAtLeast2Sources:
          readiness.isbn13KeysOnAtLeast2Sources,
        isbn13KeysOnAtLeast3Sources:
          readiness.isbn13KeysOnAtLeast3Sources,
        splitMasterCollisionCount:
          readiness.splitMasterCollisionCount,
        normalizedTitleDifferentAuthorCount:
          readiness.normalizedTitleDifferentAuthorCount,
        normalizedTitleDifferentAuthorSamples:
          readiness.normalizedTitleDifferentAuthorSamples.slice(0, 4),
        editionFamilyVariantOverlapCount:
          readiness.editionFamilyVariantOverlapCount,
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
        unmatchedMissingAuthorWithIsbnBooksBySource:
          readiness.unmatchedMissingAuthorWithIsbnBooksBySource,
        unmatchedMissingAuthorWithoutIsbnBooksBySource:
          readiness.unmatchedMissingAuthorWithoutIsbnBooksBySource,
        unmatchedAmbiguousIdentityGroupsBySource:
          readiness.unmatchedAmbiguousIdentityGroupsBySource,
      },
      operations: {
        schedulerSecretConfigured:
          operations.schedulerSecretConfigured,
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
        newReleaseLists,
      },
      seoGate: {
        state: seoGate.state,
        canPublish: seoGate.canPublish,
        failures: seoGate.failures,
        evidence: seoGate.evidence,
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
