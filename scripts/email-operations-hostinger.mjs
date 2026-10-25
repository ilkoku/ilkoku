/**
 * Hostinger Node.js Cron Jobs entry point for the existing protected email
 * operations check. Uses the site's env file supplied by Hostinger's
 * pre-filled `node --env-file=...` command; never store the secret here.
 *
 * Run the deployed file via the Hostinger Node.js cron command.
 * Does NOT send mail and does NOT create another email scheduler.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ENDPOINT = "https://ilkoku.com/api/internal/email-operations";

export async function runHostingerEmailOperations(
  env = process.env,
  fetchImpl = fetch,
) {
  const secret = (
    env.EMAIL_OPERATIONS_SECRET || env.WRITER_DAILY_SUMMARY_SECRET || ""
  ).trim();
  if (secret.length < 32) {
    throw new Error("EMAIL_OPERATIONS_SECRET_MISSING");
  }

  const response = await fetchImpl(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "X-IlkOku-Scheduler": "hostinger",
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(240_000),
  });

  if (!response.ok) {
    throw new Error(`EMAIL_OPERATIONS_HTTP_${response.status}`);
  }
  const result = await response.json().catch(() => null);
  if (
    result?.ok !== true ||
    result?.skipped !== false ||
    typeof result.checkedAt !== "string"
  ) {
    throw new Error("EMAIL_OPERATIONS_INVALID_RESPONSE");
  }
  return {
    checkedAt: result.checkedAt,
    failedLastHour: result.failedLastHour,
    pendingCount: result.pendingCount,
  };
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  runHostingerEmailOperations()
    .then((result) => {
      console.log(JSON.stringify({ event: "EMAIL_OPERATIONS_CRON_OK", ...result }));
    })
    .catch((error) => {
      // Only controlled error codes, no HTTP body, no authorization header.
      const code = typeof error?.message === "string" &&
        /^EMAIL_OPERATIONS_[A-Z0-9_]+$/.test(error.message)
        ? error.message
        : "EMAIL_OPERATIONS_CRON_FAILED";
      console.error(code);
      process.exitCode = 1;
    });
}
