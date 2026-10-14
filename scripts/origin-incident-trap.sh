#!/usr/bin/env bash
# Read-only Cloudflare-edge incident samples. Do not query the origin IP directly.
set -Eeuo pipefail

BASE_URL="https://ilkoku.com"
EVIDENCE_DIR="${GITHUB_WORKSPACE:-$PWD}/origin-trap-evidence"
mkdir -p "$EVIDENCE_DIR"
SAMPLE_COUNT="${SAMPLE_COUNT:-4}"
SAMPLE_INTERVAL="${SAMPLE_INTERVAL:-15}"
INCIDENT=false
BLOCKED=false
TSV="$EVIDENCE_DIR/probes.tsv"
printf 'observed_utc\tpath\thttp_code\tcf_ray\tcurl_exit\tremote_ip\tdns_sec\ttcp_sec\ttls_sec\tttfb_sec\ttotal_sec\n' > "$TSV"

header_value() {
  local name="$1" path="$2"
  grep -im1 "^${name}:" "$path" | cut -d: -f2- | tr -d '\r ' | tr -cd 'A-Za-z0-9._:-' || true
}

probe() {
  local path="$1" count="$2"
  local utc headers body curl_err raw ec code ip dns tcp tls ttfb total ray
  utc="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  headers="$EVIDENCE_DIR/headers-${count}.txt"
  body="$EVIDENCE_DIR/body-${count}.txt"
  curl_err="$EVIDENCE_DIR/curl-${count}.txt"
  ec=0
  raw="$(curl --http2 --silent --show-error --retry 0 \
    --connect-timeout 6 --max-time 15 \
    --user-agent 'IlkOku-Origin-Trap/1.0' \
    -H 'Cache-Control: no-store' \
    --dump-header "$headers" --output "$body" \
    --write-out '%{http_code}\t%{remote_ip}\t%{time_namelookup}\t%{time_connect}\t%{time_appconnect}\t%{time_starttransfer}\t%{time_total}' \
    "${BASE_URL}${path}" 2>"$curl_err")" || ec=$?
  IFS=$'\t' read -r code ip dns tcp tls ttfb total <<< "$raw"
  code="${code:-000}"
  ray="$(header_value 'cf-ray' "$headers")"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$utc" "$path" "$code" "${ray:-none}" "$ec" "${ip:-none}" \
    "${dns:-n/a}" "${tcp:-n/a}" "${tls:-n/a}" "${ttfb:-n/a}" "${total:-n/a}" >> "$TSV"
  echo "TRAP_SAMPLE UTC=$utc path=$path HTTP=$code curl_exit=$ec ray=${ray:-none} remote_ip=${ip:-none} total_sec=${total:-n/a}"
  # Public repo: retain only vetted edge headers; never publish response bodies or Set-Cookie.
  grep -iE '^(HTTP/|cf-ray:|server:|cf-cache-status:|retry-after:|content-type:)' "$headers" > "$headers.safe" || true
  mv "$headers.safe" "$headers"
  rm -f "$body"
  if [[ "$code" == '403' || "$code" == '429' ]]; then
    BLOCKED=true
    echo "::warning::Circuit breaker: HTTP $code. Stopping all production probes."
    return
  fi
  if [[ "$ec" != 0 || "$code" != '200' ]]; then
    INCIDENT=true
    echo "::error::Origin trap observed HTTP $code / curl exit $ec / Cloudflare Ray ${ray:-none} at $utc"
  else
    rm -f "$body" "$curl_err" "$headers"
  fi
}

for (( n=1; n<=SAMPLE_COUNT; n++ )); do
  probe '/api/build-info' "dynamic-${n}"
  if [[ "$BLOCKED" == true ]]; then break; fi
  if (( n == 1 )); then
    probe '/sitemap.xml' 'sitemap'
    if [[ "$BLOCKED" == true ]]; then break; fi
  fi
  if (( n < SAMPLE_COUNT )); then sleep "$SAMPLE_INTERVAL"; fi
done

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo '### İlkOku Cloudflare edge incident trap'
    echo
    echo "Result: incident=${INCIDENT}; blocked=${BLOCKED}"
    echo 'Scheduler: every 5 minutes (GitHub may delay scheduled runs).'
    echo 'Sampling: four dynamic requests spaced 15 seconds apart, plus one sitemap request.'
    echo 'A passing sample does not prove zero outages between probes.'
    echo
    echo '~~~text'
    cat "$TSV"
    echo '~~~'
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "incident=${INCIDENT}" >> "$GITHUB_OUTPUT"
  echo "blocked=${BLOCKED}" >> "$GITHUB_OUTPUT"
fi

if [[ "$BLOCKED" == true ]]; then
  echo 'TRAP_RESULT MONITOR_BLOCKED'
elif [[ "$INCIDENT" == true ]]; then
  echo 'TRAP_RESULT INCIDENT'
else
  echo 'TRAP_RESULT PASS'
fi
