# İlkOku — runtime/origin evidence

## What it records
- Passive Node.js STARTED, EXIT and UNCAUGHT_EXCEPTION_MONITOR event records in the hosting stderr stream, with timestamp and PID, without changing default Node process lifecycle.
- Private runtime endpoint requires GitHub OIDC with an exact repository and workflow identity. It exposes boot time estimate, uptime and RSS only to that authorized job.
- Hourly read-only GitHub Actions job records process snapshot, HTTP status and CF-Ray for /iletisim and /sitemap.xml.
- The endpoint touches no database, files or cache; anonymous calls return 401 without process details.
- This is designed for sporadic 520/522, not a load test or auto-restart system.

## Limits
- GitHub hourly scheduling can run late and can miss short outages.
- SIGKILL/OOM does not invoke Node.js exit callbacks; Hostinger may rotate or omit stdout/stderr.
- If an error occurs, compare UTC run logs and processStartedAt to deployment history. Do not infer a provider-induced restart solely from PID changes.
- No indexation policy, robots rules, sitemap scope, Cloudflare DNS/WAF, or service startup flags are altered.
