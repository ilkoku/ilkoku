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

## Timing provenance and error-class attribution

The passive `origin-incident-trap.sh` observes requests against **proxied**
`https://ilkoku.com`; it does not connect directly to Hostinger.
Its `client_edge_ip`, `client_edge_dns_complete_sec`,
`client_edge_tcp_connected_sec`, `client_edge_tls_complete_sec`,
`client_edge_ttfb_sec` and `client_edge_total_sec` columns are cumulative
curl timings for the **GitHub runner to Cloudflare edge** leg.
They are not Cloudflare-to-Hostinger TCP or TLS measurements. The older
`remote_ip`, `dns_sec`, `tcp_sec`, `tls_sec`, `ttfb_sec`, `total_sec`
columns in historical incident comments have the same edge-only meaning.

A `520`, `521`, `522`, or `525` response proves only the reported edge
outcome; the script cannot diagnose origin-side 443 TLS alerts, listener
accepts, reverse-proxy resets, upstream response codes, or provider LB health.
Obtain Hostinger server-side 443/proxy logs at UTC timestamp and Cloudflare
Ray ID before declaring or changing a root cause.

The sampled `served_commit_sha` documents the **first sampled request**
that served a build identity. It is *not* the deployment start or end time.

Schema version note: the renamed TSV columns clarify provenance, but
historical issue comments retain the original ambiguous names. Downstream
analysis must map the old fields to the new `client_edge_*` fields rather
than merge them into an origin-TLS dataset. The probe cadence, paths, request
volume, circuit breakers, credential handling and network targets are
unchanged by this documentation/labeling correction.
