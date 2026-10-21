import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import {
  evaluateBookIndexSeoGate,
  getBookIndexSeoGatePolicy,
  getBookIndexSeoHistorySpanDays,
  type BookIndexSeoGateSnapshot,
} from "./seo-gate";
import {
  getBookIndexPublicReadModel,
  type BookIndexPublicReadModel,
} from "./public-read-model";
import { getBookIndexReadinessSnapshot } from "./readiness";

export type BookIndexPublicPageContext = {
  gate: BookIndexSeoGateSnapshot;
  model: BookIndexPublicReadModel;
};

function policyConfigured() {
  const policy = getBookIndexSeoGatePolicy();

  return {
    policy,
    configured: Boolean(
      policy.enabled
        && policy.publicationEnabled
        && policy.policyVersion
        && policy.minCompositeSources !== null
        && policy.minMatchCoveragePercent !== null
        && policy.minHistoryDays !== null
        && policy.minTurkeyItems !== null,
    ),
  };
}

// Only the four numeric readiness signals are cached across public requests.
// The public book list is deliberately fetched fresh on every request.
// The SEO publishing gate itself is unchanged; at most 30s of evidence lag.
const getCachedPublicBookIndexSeoEvidence = unstable_cache(
  async () => {
    const readiness = await getBookIndexReadinessSnapshot();
    return {
      observedCompositeSources: readiness.observedCompositeSources,
      observedIndependentCompositeSources:
        readiness.observedCompositeIndependenceGroups,
      matchCoveragePercent: readiness.latestCompositeMatchCoveragePercent,
      historySpanDays: getBookIndexSeoHistorySpanDays(readiness),
    };
  },
  ["ilkoku-book-index-public-seo-evidence-v1"],
  { revalidate: 30 },
);

async function buildBookIndexPageContext(
  limit: number,
  policy = getBookIndexSeoGatePolicy(),
): Promise<BookIndexPublicPageContext> {
  const [evidence, model] = await Promise.all([
    getCachedPublicBookIndexSeoEvidence(),
    getBookIndexPublicReadModel(limit),
  ]);

  const gate = evaluateBookIndexSeoGate(policy, {
    ...evidence,
    turkeyItemCount: model.turkey.items.length,
  });

  return { gate, model };
}

export const getBookIndexPublicPageContext = cache(
  async (limit = 100): Promise<BookIndexPublicPageContext | null> => {
    const { policy, configured } = policyConfigured();
    if (!configured) return null;

    const context = await buildBookIndexPageContext(limit, policy);
    if (!context.gate.canPublish) return null;

    return context;
  },
);

export const getBookIndexSoftLaunchPageContext = cache(
  async (limit = 100): Promise<BookIndexPublicPageContext> =>
    buildBookIndexPageContext(limit),
);
