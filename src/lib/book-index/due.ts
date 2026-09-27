const BOOK_INDEX_UNSUCCESSFUL_RETRY_MINUTES = 30;

type BookIndexDueStatus =
  | "running"
  | "success"
  | "no_change"
  | "partial"
  | "failed";

export function bookIndexRunDelayMinutes(
  status: BookIndexDueStatus,
  cadenceMinutes: number,
) {
  if (status === "success" || status === "no_change") {
    return cadenceMinutes;
  }

  return Math.min(cadenceMinutes, BOOK_INDEX_UNSUCCESSFUL_RETRY_MINUTES);
}

export function nextBookIndexDueAt(input: {
  startedAt: Date;
  status: BookIndexDueStatus;
  cadenceMinutes: number;
}) {
  return new Date(
    input.startedAt.getTime()
      + bookIndexRunDelayMinutes(input.status, input.cadenceMinutes) * 60_000,
  );
}
