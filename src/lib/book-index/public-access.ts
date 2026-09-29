import "server-only";

import { cache } from "react";

import {
  evaluateBookIndexSeoGate,
  getBookIndexSeoGatePolicy,
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

async function buildBookIndexPageContext(
  limit: number,
  policy = getBookIndexSeoGatePolicy(),
): Promise<BookIndexPublicPageContext> {
  const [readiness, model] = await Promise.all([
    getBookIndexReadinessSnapshot(),
    getBookIndexPublicReadModel(limit),
  ]);

  const gate = evaluateBookIndexSeoGate(policy, {
    observedCompositeSources: readiness.observedCompositeSources,
    observedIndependentCompositeSources:
      readiness.observedCompositeIndependenceGroups,
    matchCoveragePercent: readiness.latestCompositeMatchCoveragePercent,
    historySpanDays: readiness.historySpanDays,
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
