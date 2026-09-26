import "server-only";

import { getBookIndexPublicReadModel } from "./public-read-model";
import { getBookIndexReadinessSnapshot } from "./readiness";

export type BookIndexSeoGateState =
  | "disabled"
  | "policy_incomplete"
  | "insufficient_evidence"
  | "eligible";

export type BookIndexSeoGateFailure =
  | "composite_sources"
  | "match_coverage"
  | "history_span"
  | "turkey_items";

export type BookIndexSeoGatePolicy = {
  enabled: boolean;
  publicationEnabled: boolean;
  policyVersion: string | null;
  minCompositeSources: number | null;
  minMatchCoveragePercent: number | null;
  minHistoryDays: number | null;
  minTurkeyItems: number | null;
};

export type BookIndexSeoGateEvidence = {
  observedCompositeSources: number;
  observedIndependentCompositeSources: number;
  matchCoveragePercent: number;
  historySpanDays: number;
  turkeyItemCount: number;
};

export type BookIndexSeoGateSnapshot = {
  state: BookIndexSeoGateState;
  policy: BookIndexSeoGatePolicy;
  evidence: BookIndexSeoGateEvidence;
  failures: BookIndexSeoGateFailure[];
  canPublish: boolean;
};

function parseOptionalInteger(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function parseOptionalPercentage(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return parsed;
}

export function getBookIndexSeoGatePolicy(
  env: NodeJS.ProcessEnv = process.env,
): BookIndexSeoGatePolicy {
  return {
    enabled: env.BOOK_INDEX_SEO_GATE_ENABLED === "true",
    publicationEnabled: env.BOOK_INDEX_SEO_PUBLISH_ENABLED === "true",
    policyVersion: env.BOOK_INDEX_SEO_POLICY_VERSION?.trim() || null,
    minCompositeSources: parseOptionalInteger(
      env.BOOK_INDEX_SEO_MIN_COMPOSITE_SOURCES,
    ),
    minMatchCoveragePercent: parseOptionalPercentage(
      env.BOOK_INDEX_SEO_MIN_MATCH_COVERAGE_PERCENT,
    ),
    minHistoryDays: parseOptionalInteger(
      env.BOOK_INDEX_SEO_MIN_HISTORY_DAYS,
    ),
    minTurkeyItems: parseOptionalInteger(
      env.BOOK_INDEX_SEO_MIN_TURKEY_ITEMS,
    ),
  };
}

function policyComplete(policy: BookIndexSeoGatePolicy) {
  return Boolean(
    policy.policyVersion
      && policy.minCompositeSources !== null
      && policy.minMatchCoveragePercent !== null
      && policy.minHistoryDays !== null
      && policy.minTurkeyItems !== null,
  );
}

export function evaluateBookIndexSeoGate(
  policy: BookIndexSeoGatePolicy,
  evidence: BookIndexSeoGateEvidence,
): BookIndexSeoGateSnapshot {
  if (!policy.enabled) {
    return {
      state: "disabled",
      policy,
      evidence,
      failures: [],
      canPublish: false,
    };
  }

  if (!policyComplete(policy)) {
    return {
      state: "policy_incomplete",
      policy,
      evidence,
      failures: [],
      canPublish: false,
    };
  }

  const failures: BookIndexSeoGateFailure[] = [];

  if (evidence.observedIndependentCompositeSources < policy.minCompositeSources!) {
    failures.push("composite_sources");
  }
  if (evidence.matchCoveragePercent < policy.minMatchCoveragePercent!) {
    failures.push("match_coverage");
  }
  if (evidence.historySpanDays < policy.minHistoryDays!) {
    failures.push("history_span");
  }
  if (evidence.turkeyItemCount < policy.minTurkeyItems!) {
    failures.push("turkey_items");
  }

  const state: BookIndexSeoGateState =
    failures.length > 0 ? "insufficient_evidence" : "eligible";

  return {
    state,
    policy,
    evidence,
    failures,
    canPublish: state === "eligible" && policy.publicationEnabled,
  };
}

export async function getBookIndexSeoGateSnapshot(): Promise<BookIndexSeoGateSnapshot> {
  const policy = getBookIndexSeoGatePolicy();

  const [readiness, publicReadModel] = await Promise.all([
    getBookIndexReadinessSnapshot(),
    getBookIndexPublicReadModel(100),
  ]);

  return evaluateBookIndexSeoGate(policy, {
    observedCompositeSources: readiness.observedCompositeSources,
    observedIndependentCompositeSources:
      readiness.observedCompositeIndependenceGroups,
    matchCoveragePercent: readiness.matchCoveragePercent,
    historySpanDays: readiness.historySpanDays,
    turkeyItemCount: publicReadModel.turkey.items.length,
  });
}
