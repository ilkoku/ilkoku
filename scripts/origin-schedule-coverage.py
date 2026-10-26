#!/usr/bin/env python3
"""Report gaps in GitHub Actions scheduled run coverage, without site requests."""
import json
import os
import sys
from datetime import datetime
from pathlib import Path

THRESHOLD_MINUTES = 20


def timestamp(value):
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError, OverflowError):
        return None


def append_if_set(name, value):
    path = os.environ.get(name)
    if path:
        with Path(path).open("a", encoding="utf-8") as stream:
            stream.write(value)


def main():
    try:
        payload = json.load(sys.stdin)
        runs = payload.get("workflow_runs", [])
        if not isinstance(runs, list):
            raise ValueError("workflow_runs must be a list")
    except (ValueError, TypeError, AttributeError):
        runs = []
        print("::warning::GitHub scheduled run history missing or invalid; coverage UNKNOWN")

    scheduled = [r for r in runs if isinstance(r, dict) and r.get("event") == "schedule"]
    current_id = os.environ.get("CURRENT_RUN_ID", "")
    current = next((r for r in scheduled if str(r.get("id")) == current_id), None)
    current_time = timestamp(current.get("created_at")) if current else None

    previous = None
    if current_id and current_time is not None:
        earlier = [r for r in scheduled
                   if (t := timestamp(r.get("created_at"))) is not None and t < current_time]
        if earlier:
            previous = max(earlier, key=lambda r: timestamp(r.get("created_at")))

    previous_time = timestamp(previous.get("created_at")) if previous else None
    measurable = current_time is not None and previous_time is not None
    gap = round((current_time - previous_time) / 60) if measurable else 0
    status = "UNKNOWN" if not measurable else ("GAP" if gap > THRESHOLD_MINUTES else "OK")
    before = previous.get("created_at", "unknown") if previous else "unknown"
    after = current.get("created_at", "unknown") if current else "unknown"
    print(f"SCHEDULE_COVERAGE status={status} gap_minutes={gap if measurable else 'n/a'} "
          f"previous_utc={before} current_utc={after}")
    if status != "OK":
        print(f"::warning::Origin scheduled-monitor coverage {status}. "
              "Missing checks do not establish website downtime.")

    append_if_set("GITHUB_OUTPUT",
                  f"coverage_gap={str(status == 'GAP').lower()}\n"
                  f"coverage_status={status}\n"
                  f"gap_minutes={gap}\n"
                  f"previous_utc={before}\n"
                  f"current_utc={after}\n")
    append_if_set("GITHUB_STEP_SUMMARY",
                  "### Origin scheduled-monitor coverage\n\n"
                  f"Status: **{status}**; observed gap: "
                  f"**{str(gap) + ' minutes' if measurable else 'unknown'}**.\n\n"
                  "GitHub schedules may be delayed or dropped. Missing executions "
                  "do not prove that the website was down. This checker makes no "
                  "production HTTP requests.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
