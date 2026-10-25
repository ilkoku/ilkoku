import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

export type BookIndexTiming = {
  operation: string;
  elapsedMs: number;
  outcome: "ok" | "error";
};

const timingContext = new AsyncLocalStorage<BookIndexTiming[]>();

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
}

// Zero SQL or logging overhead outside an explicitly requested admin trace.
export async function timeBookIndexOperation<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const entries = timingContext.getStore();
  if (!entries) return fn();

  const start = performance.now();
  try {
    const value = await fn();
    entries.push({ operation, elapsedMs: roundMs(performance.now() - start), outcome: "ok" });
    return value;
  } catch (error) {
    entries.push({ operation, elapsedMs: roundMs(performance.now() - start), outcome: "error" });
    throw error;
  }
}

export async function collectBookIndexTimings<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; wallMs: number; timings: BookIndexTiming[] }> {
  const entries: BookIndexTiming[] = [];
  const start = performance.now();
  const value = await timingContext.run(entries, fn);
  return {
    value,
    wallMs: roundMs(performance.now() - start),
    // Parallel timings overlap: do not add them to infer elapsed request time.
    timings: [...entries],
  };
}
