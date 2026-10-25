// Passive process-level diagnostics. No shutdown/signal interception.
// Separate informational lifecycle events from failures in Hostinger runtime logs.
let installed = false;
function record(phase: string, detail: Record<string, string | number> = {}) {
  const line = JSON.stringify({
    event: "ILKOKU_RUNTIME_LIFECYCLE",
    phase,
    observedAt: new Date().toISOString(),
    pid: process.pid,
    uptimeSeconds: Math.round(process.uptime()),
    ...detail,
  }) + "\n";
  // SIGTERM-style exit 143 may be expected during redeployment; don't count
  // startup/normal shutdown as errors. Keep true failures on stderr.
  const isError = phase === "UNCAUGHT_EXCEPTION_MONITOR"
    || (phase === "EXIT" && detail.exitCode !== 0 && detail.exitCode !== 143);
  if (isError) process.stderr.write(line);
  else process.stdout.write(line);
}
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || installed) return;
  installed = true;
  record("STARTED");
  process.once("exit", code => record("EXIT", { exitCode: code }));
  // Observe uncaught failures without changing Node.js crash behavior.
  process.on("uncaughtExceptionMonitor", (error, origin) => {
    record("UNCAUGHT_EXCEPTION_MONITOR", {
      errorName: error instanceof Error ? error.name : "UNKNOWN",
      origin,
    });
  });
}
