#!/usr/bin/env python3
"""Bounded, paired diagnostic: one read-only Cloudflare and one direct-origin GET per minute.
No DNS or TLS settings are altered. Only /api/build-info is requested.
All curl timing values are runner-to-target; not Cloudflare-to-Hostinger TLS.
"""
import concurrent.futures
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

SEGMENT = int(os.environ["SEGMENT_NUMBER"])
ANCHOR = int(os.environ["ANCHOR_EPOCH"])
INTERVAL = 60
STOP_AT = ANCHOR + SEGMENT * 288 * INTERVAL
OUT = Path("paired-diagnostics")
OUT.mkdir(exist_ok=True)
LOG = OUT / ("segment-%02d.jsonl" % SEGMENT)
SUMMARY = OUT / ("segment-%02d-summary.json" % SEGMENT)
URL = "https://ilkoku.com/api/build-info"
FMT = "%{http_code}|%{remote_ip}|%{http_version}|%{time_connect}|%{time_appconnect}|%{time_starttransfer}|%{time_total}|%{ssl_verify_result}"

def probe(kind):
    with tempfile.TemporaryDirectory() as td:
        hdr = Path(td) / "headers.txt"
        cmd = ["curl", "--http2", "--silent", "--show-error", "--retry", "0",
               "--connect-timeout", "6", "--max-time", "12", "--noproxy", "*",
               "--user-agent", "IlkOku-Paired-Origin-Edge/1.0",
               "-H", "Cache-Control: no-store",
               "--dump-header", str(hdr), "--output", os.devnull,
               "--write-out", FMT]
        if kind == "origin":
            cmd += ["--resolve", "ilkoku.com:443:82.198.229.51"]
        cmd.append(URL)
        try:
            p = subprocess.run(cmd, text=True, capture_output=True, timeout=16)
            values = p.stdout.strip().split("|")
            values += [""] * max(0, 8 - len(values))
            ray = None
            if hdr.exists():
                for line in hdr.read_text(errors="replace").splitlines():
                    if line.lower().startswith("cf-ray:"):
                        ray = line.split(":", 1)[1].strip()
            return dict(code=values[0] or "000", curl_exit=p.returncode,
                        remote_ip=values[1], http_version=values[2],
                        tcp_s=values[3], tls_s=values[4], ttfb_s=values[5],
                        total_s=values[6], cert_verify_result=values[7],
                        ray=ray if kind == "cloudflare" else None,
                        curl_error=p.stderr.strip()[:240] if p.returncode else None)
        except Exception as e:
            return dict(code="000", curl_exit=-1, error=type(e).__name__ + ": " + str(e)[:160])

def main():
    counts = dict(pairs=0, incidents=0, blocked=0, origin_fail=0, cloudflare_fail=0)
    first = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if time.time() >= STOP_AT:
        print("::error::Segment start passed its intended deadline; monitoring gap")
        return 1
    next_tick = time.monotonic()
    rc = 0
    with LOG.open("a", buffering=1) as f, concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        while time.time() < STOP_AT:
            observed = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds")
            a = pool.submit(probe, "origin")
            b = pool.submit(probe, "cloudflare")
            direct, edge = a.result(), b.result()
            record = {"observed_utc": observed, "path": "/api/build-info",
                      "origin": direct, "cloudflare": edge}
            f.write(json.dumps(record, sort_keys=True) + "\n")
            counts["pairs"] += 1
            origin_bad = direct.get("curl_exit") != 0 or direct.get("code") != "200"
            edge_bad = edge.get("curl_exit") != 0 or edge.get("code") != "200"
            if origin_bad:
                counts["origin_fail"] += 1
            if edge_bad:
                counts["cloudflare_fail"] += 1
            if origin_bad or edge_bad:
                counts["incidents"] += 1
                print("PAIR_INCIDENT " + json.dumps(record, sort_keys=True), flush=True)
            elif counts["pairs"] % 5 == 0:
                print("PAIR_HEALTHY at " + observed + " pairs=" + str(counts["pairs"]), flush=True)
            if direct.get("code") in ("403", "429") or edge.get("code") in ("403", "429"):
                counts["blocked"] = 1
                print("::error::403/429 circuit breaker: stopping all further diagnostic requests", flush=True)
                rc = 2
                break
            next_tick += INTERVAL
            remaining = min(next_tick - time.monotonic(), STOP_AT - time.time())
            if remaining > 0:
                time.sleep(remaining)
    result = {"segment": SEGMENT, "anchor_utc": datetime.datetime.fromtimestamp(ANCHOR, datetime.timezone.utc).isoformat(),
              "segment_start_utc": first, "segment_end_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "counts": counts, "stop_utc": datetime.datetime.fromtimestamp(STOP_AT, datetime.timezone.utc).isoformat(),
              "note": "Only paired sampled instants are measured. A passing pair does not prove uninterrupted service."}
    SUMMARY.write_text(json.dumps(result, indent=2))
    with open(os.environ.get("GITHUB_STEP_SUMMARY", os.devnull), "a") as s:
        s.write("### Paired origin vs Cloudflare segment %s\n\n" % SEGMENT)
        s.write("Pairs: %s; paired incidents: %s; origin failures: %s; Cloudflare failures: %s; circuit breaker: %s\n\n" % 
                (counts["pairs"], counts["incidents"], counts["origin_fail"], counts["cloudflare_fail"], counts["blocked"]))
        s.write("Times and cf-ray (when provided) appear in the segment artifact. Results are sample-based, not full coverage.\n")
    print("SEGMENT_RESULT " + json.dumps(result, sort_keys=True), flush=True)
    return rc

if __name__ == "__main__":
    sys.exit(main())
