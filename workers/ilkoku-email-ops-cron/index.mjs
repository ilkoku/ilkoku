/**
 * Independent hourly backup for the authenticated İlkOku email-operations check.
 *
 * Cloudflare scheduled events are separate from GitHub Actions schedules.
 * This Worker has NO public HTTP handler, no DNS route, and never sends mail.
 * It only calls the existing authenticated operations-check endpoint.
 */
const ENDPOINT = "https://ilkoku.com/api/internal/email-operations";
const MAX_RESPONSE_BYTES = 8192;

export async function callEmailOperations(env, fetchImpl = fetch) {
  const secret = env?.EMAIL_OPERATIONS_SECRET;
  if (typeof secret !== "string" || secret.trim().length < 32) {
    throw new Error("EMAIL_OPERATIONS_CRON_SECRET_MISSING");
  }

  const response = await fetchImpl(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: "application/json",
      "Cache-Control": "no-store",
      "X-IlkOku-Scheduler": "cloudflare",
    },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(180_000),
  });

  // Never log response body or Authorization. A failing HTTP call is a failed cron event.
  if (!response.ok) {
    throw new Error(`EMAIL_OPERATIONS_CRON_HTTP_${response.status}`);
  }
  const body = await response.text();
  if (body.length > MAX_RESPONSE_BYTES) {
    throw new Error("EMAIL_OPERATIONS_CRON_RESPONSE_TOO_LARGE");
  }
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error("EMAIL_OPERATIONS_CRON_INVALID_JSON");
  }
  if (json?.ok !== true || !Number.isFinite(Date.parse(json.checkedAt))) {
    throw new Error("EMAIL_OPERATIONS_CRON_INVALID_RESULT");
  }

  // Aggregate-only log: no email addresses, message bodies or credentials.
  console.log("EMAIL_OPERATIONS_CRON_OK", JSON.stringify({
    checkedAt: json.checkedAt,
    failedLastHour: json.failedLastHour,
    pendingCount: json.pendingCount,
    staleMarked: json.staleMarked,
    unresolvedFailed: json.unresolvedFailed,
  }));
  return json;
}

export default {
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(callEmailOperations(env));
  },
};
