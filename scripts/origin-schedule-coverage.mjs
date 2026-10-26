#!/usr/bin/env node
// Inspect GitHub Actions schedule history; no production or outside network access.
import { appendFileSync, readFileSync } from "node:fs";
const currentId = process.env.CURRENT_RUN_ID ?? "";
const thresholdMinutes = 20;
let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
  if (!Array.isArray(payload.workflow_runs)) throw new Error("Missing workflow_runs");
} catch (error) {
  console.log("::warning::Scheduled monitor coverage unavailable: invalid run history");
  process.exitCode = 1;
}
if (process.exitCode !== 1) {
  const runs = payload.workflow_runs.filter((run) => run?.event === "schedule");
  const current = runs.find((run) => String(run.id) === currentId);
  const now = Date.parse(current?.created_at ?? "");
  const previous = runs.filter((run) =>
    run !== current && Number.isFinite(Date.parse(run.created_at)) &&
    Date.parse(run.created_at) < now
  ).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  const then = Date.parse(previous?.created_at ?? "");
  const measured = Boolean(currentId) && Number.isFinite(now) && Number.isFinite(then);
  const minutes = measured ? Math.round((now - then) / 60000) : 0;
  const status = !measured ? "UNKNOWN" : minutes > thresholdMinutes ? "GAP" : "OK";
  console.log("SCHEDULE_COVERAGE status=" + status +
    " gap_minutes=" + (measured ? minutes : "n/a") +
    " previous_utc=" + (previous?.created_at ?? "unknown") +
    " current_utc=" + (current?.created_at ?? "unknown"));
  if (status !== "OK") console.log("::warning::Scheduled origin checks " +
    (status === "GAP" ? "have a " + minutes + "-minute gap" : "lack usable history") +
    "; absent checks are NOT proof of downtime");
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT,
    "coverage_gap=" + (status === "GAP") + "\n" +
    "gap_minutes=" + minutes + "\n" +
    "previous_utc=" + (previous?.created_at ?? "unknown") + "\n" +
    "current_utc=" + (current?.created_at ?? "unknown") + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    "### Origin scheduled-monitor coverage\n\n" +
    "**Status:** " + status + "; **gap:** " +
    (measured ? minutes + " minutes" : "unknown") + ".\n\n" +
    "GitHub schedule may delay or drop events; missing checks do not imply an outage. " +
    "No production HTTP requests are added by this coverage analysis.\n\n");
}
