import {
  createPublisherSubmissionLocked,
  withdrawPublisherSubmissionLocked,
} from "@/features/publisher-submissions/writer-submission-state";

export function createSubmission(
  authorId: string,
  input: { coverLetter: string; publisherId: string; workId: string },
) {
  return createPublisherSubmissionLocked({ authorId, ...input });
}

export async function withdrawSubmission(authorId: string, id: string) {
  const result = await withdrawPublisherSubmissionLocked(authorId, id);
  if (result.count === 0) throw new Error("SUBMISSION_NOT_FOUND");
}
