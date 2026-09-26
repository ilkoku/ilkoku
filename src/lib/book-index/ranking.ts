import {
  getBookIndexSourceIndependenceGroup,
  TURKEY_INDEX_MIN_SOURCES,
} from "./sources";

export type BookIndexSourceVoteInput = {
  sourceCode: string;
  includeInTurkeyIndex: boolean;
  eligibleForComposite: boolean;
  rank: number;
  listSize: number;
  observedAt: Date;
  priority?: number;
};

export type BookIndexSourceVote = BookIndexSourceVoteInput & {
  normalizedScore: number;
};

export type TurkeyIndexScore = {
  eligible: boolean;
  sourceCount: number;
  score: number | null;
  votes: BookIndexSourceVote[];
};

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizeBookIndexRank(rank: number, listSize: number) {
  if (!Number.isInteger(rank) || !Number.isInteger(listSize)) {
    throw new Error("book_index_rank_must_be_integer");
  }

  if (rank < 1 || listSize < 1 || rank > listSize) {
    throw new Error("book_index_rank_out_of_range");
  }

  return roundScore(((listSize - rank + 1) / listSize) * 100);
}

function shouldReplaceVote(
  current: BookIndexSourceVoteInput,
  candidate: BookIndexSourceVoteInput,
) {
  const currentPriority = current.priority ?? 0;
  const candidatePriority = candidate.priority ?? 0;

  if (candidatePriority !== currentPriority) {
    return candidatePriority > currentPriority;
  }

  return candidate.observedAt.getTime() > current.observedAt.getTime();
}

// One source contributes at most one vote. If the caller supplies multiple
// eligible observations for the same source, an explicit list priority wins;
// ties resolve to the freshest observation.
export function collapseBookIndexSourceVotes(
  inputs: BookIndexSourceVoteInput[],
): BookIndexSourceVote[] {
  const bySource = new Map<string, BookIndexSourceVoteInput>();

  for (const input of inputs) {
    if (!input.includeInTurkeyIndex || !input.eligibleForComposite) continue;

    const current = bySource.get(input.sourceCode);
    if (!current || shouldReplaceVote(current, input)) {
      bySource.set(input.sourceCode, input);
    }
  }

  return [...bySource.values()]
    .map((vote) => ({
      ...vote,
      normalizedScore: normalizeBookIndexRank(vote.rank, vote.listSize),
    }))
    .sort((a, b) => a.sourceCode.localeCompare(b.sourceCode));
}

function independentOperatorScores(votes: BookIndexSourceVote[]) {
  const byIndependenceGroup = new Map<string, BookIndexSourceVote[]>();

  for (const vote of votes) {
    const independenceGroup = getBookIndexSourceIndependenceGroup(
      vote.sourceCode,
    );
    const groupVotes = byIndependenceGroup.get(independenceGroup) ?? [];
    groupVotes.push(vote);
    byIndependenceGroup.set(independenceGroup, groupVotes);
  }

  return [...byIndependenceGroup.entries()]
    .map(([independenceGroup, groupVotes]) => ({
      independenceGroup,
      sourceCodes: groupVotes
        .map((vote) => vote.sourceCode)
        .sort((a, b) => a.localeCompare(b)),
      normalizedScore: roundScore(
        groupVotes.reduce(
          (total, vote) => total + vote.normalizedScore,
          0,
        ) / groupVotes.length,
      ),
    }))
    .sort((a, b) => a.independenceGroup.localeCompare(b.independenceGroup));
}

export function computeTurkeyBookIndexScore(
  inputs: BookIndexSourceVoteInput[],
): TurkeyIndexScore {
  const votes = collapseBookIndexSourceVotes(inputs);
  const operatorScores = independentOperatorScores(votes);
  const sourceCount = operatorScores.length;

  if (sourceCount < TURKEY_INDEX_MIN_SOURCES) {
    return {
      eligible: false,
      sourceCount,
      score: null,
      votes,
    };
  }

  const average =
    operatorScores.reduce(
      (total, operator) => total + operator.normalizedScore,
      0,
    ) / sourceCount;

  return {
    eligible: true,
    sourceCount,
    score: roundScore(average),
    votes,
  };
}
