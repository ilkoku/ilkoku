import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  defaultWriterMotivations,
  normalizeWriterMotivations,
  WRITER_MOTIVATION_KEY,
  WRITER_MOTIVATION_NAMESPACE,
} from "@/lib/writer-motivation-config";

type WriterMotivationConfig = {
  version: 1;
  motivations: string[];
};

type MotivationRow = {
  valueJson: string;
};

type ActiveDaySummaryRow = {
  total: bigint | number | string;
  todayRecorded: bigint | number | string | null;
};

export type WriterEngagementView = {
  activeDayCount: number;
  activeDayMessage: string;
  motivation: string;
};

export type WriterMotivationCmsState =
  | {
      state: "ready";
      motivations: string[];
      firstRun: boolean;
    }
  | {
      state: "invalid" | "read-error";
    };

function positiveInteger(value: bigint | number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function getIstanbulDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Istanbul",
    year: "numeric",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function parseWriterMotivationConfig(valueJson: string): WriterMotivationConfig | null {
  try {
    const value = JSON.parse(valueJson) as Record<string, unknown>;
    const motivations = normalizeWriterMotivations(value.motivations);
    if (value.version !== 1 || !motivations) return null;
    return { version: 1, motivations };
  } catch {
    return null;
  }
}

async function readWriterMotivationRow() {
  const rows = await prisma.$queryRaw<MotivationRow[]>`
    SELECT valueJson
    FROM SiteContent
    WHERE namespace = ${WRITER_MOTIVATION_NAMESPACE}
      AND contentKey = ${WRITER_MOTIVATION_KEY}
      AND status = 'published'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getPublishedWriterMotivations() {
  try {
    const row = await readWriterMotivationRow();
    if (!row) return [...defaultWriterMotivations];
    return parseWriterMotivationConfig(row.valueJson)?.motivations ?? [...defaultWriterMotivations];
  } catch (error) {
    console.error("WRITER_MOTIVATIONS_READ_FAILED", error);
    return [...defaultWriterMotivations];
  }
}

export async function loadWriterMotivationsForCms(): Promise<WriterMotivationCmsState> {
  try {
    const row = await readWriterMotivationRow();
    if (!row) {
      return {
        state: "ready",
        motivations: [...defaultWriterMotivations],
        firstRun: true,
      };
    }

    const parsed = parseWriterMotivationConfig(row.valueJson);
    if (!parsed) return { state: "invalid" };

    return {
      state: "ready",
      motivations: parsed.motivations,
      firstRun: false,
    };
  } catch {
    return { state: "read-error" };
  }
}

async function readWriterActiveDaySummary(userId: string, dayKey: string) {
  const rows = await prisma.$queryRaw<ActiveDaySummaryRow[]>`
    SELECT
      COUNT(*) AS total,
      MAX(CASE WHEN dayKey = ${dayKey} THEN 1 ELSE 0 END) AS todayRecorded
    FROM WriterActiveDay
    WHERE userId = ${userId}
  `;

  return {
    activeDayCount: positiveInteger(rows[0]?.total),
    todayRecorded: positiveInteger(rows[0]?.todayRecorded) > 0,
  };
}

export async function recordWriterActiveDay(userId: string) {
  const dayKey = getIstanbulDayKey();

  await prisma.$executeRaw`
    INSERT INTO WriterActiveDay (id, userId, dayKey, createdAt)
    VALUES (${randomUUID()}, ${userId}, ${dayKey}, CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE userId = VALUES(userId)
  `;

  const summary = await readWriterActiveDaySummary(userId, dayKey);
  return summary.activeDayCount;
}

function getWriterActiveDayMessage(activeDayCount: number) {
  if (activeDayCount <= 1) return "İlk günün. Başlangıç yapıldı.";
  if (activeDayCount <= 3) return "Ritmini kuruyorsun.";
  if (activeDayCount <= 7) return "Düzenin oluşuyor.";
  if (activeDayCount <= 14) return "Ritmini koruyorsun.";
  if (activeDayCount <= 29) return "İstikrarın güçleniyor.";
  return "İlkOku ritmin yerleşti.";
}

export async function getWriterEngagementPreview(userId: string): Promise<WriterEngagementView> {
  const dayKey = getIstanbulDayKey();
  let activeDayCount = 1;

  try {
    const summary = await readWriterActiveDaySummary(userId, dayKey);
    activeDayCount = summary.todayRecorded
      ? Math.max(1, summary.activeDayCount)
      : summary.activeDayCount + 1;
  } catch (error) {
    console.error("WRITER_ACTIVE_DAY_SUMMARY_FAILED", error);
  }

  const motivations = await getPublishedWriterMotivations();
  const motivationIndex = Math.min(
    Math.max(activeDayCount - 1, 0),
    motivations.length - 1,
  );

  return {
    activeDayCount,
    activeDayMessage: getWriterActiveDayMessage(activeDayCount),
    motivation: motivations[motivationIndex] ?? defaultWriterMotivations[0],
  };
}
