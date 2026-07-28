import { insertSubmission, withdrawAuthorSubmission } from "./repository";

export function createSubmission(
  authorId: string,
  input: { coverLetter: string; publisherId: string; workId: string },
) {
  return insertSubmission({ authorId, ...input });
}

export async function withdrawSubmission(authorId: string, id: string) {
  const result = await withdrawAuthorSubmission(authorId, id);
  if (result.count === 0) throw new Error("SUBMISSION_NOT_FOUND");
}
