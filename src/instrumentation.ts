// Passive process-level diagnostics. No shutdown/signal interception.
let installed = false;
function record(phase: string, detail: Record<string, string | number> = {}) {
  process.stderr.write(JSON.stringify({
    event: "ILKOKU_RUNTIME_LIFECYCLE",
    phase,
    observedAt: new Date().toISOString(),
    pid: process.pid,
    uptimeSeconds: Math.round(process.uptime()),
    ...detail,
  }) + "\n");
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
