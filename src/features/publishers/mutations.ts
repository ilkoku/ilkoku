import {
  createLegacyPublisherSubmission,
  withdrawLegacyPublisherSubmission,
} from "@/features/publisher-submissions/legacy-security";

export function createSubmission(
  authorId: string,
  input: { coverLetter: string; publisherId: string; workId: string },
) {
  return createLegacyPublisherSubmission({ authorId, ...input });
}

export async function withdrawSubmission(authorId: string, id: string) {
  const result = await withdrawLegacyPublisherSubmission(authorId, id);
  if (result.count === 0) throw new Error("SUBMISSION_NOT_FOUND");
}
