import "server-only";

import { createHash, createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

interface HeaderReader {
  get(name: string): string | null;
}

interface ReadingAccessInput {
  chapterId: string;
  requestHeaders: HeaderReader;
  sessionId: string;
  userId: string;
  workId: string;
}

type DeviceClass =
  | "mobile"
  | "tablet"
  | "desktop"
  | "bot"
  | "unknown";

const ACCESS_WINDOW_MS = 15 * 60 * 1000;
const RAPID_WINDOW_MS = 10 * 60 * 1000;
const SIGNAL_WINDOW_MS = 60 * 60 * 1000;
const RAPID_CHAPTER_LIMIT = 12;
const DEVICE_LIMIT = 3;
const NETWORK_LIMIT = 4;
const RULE_VERSION = 1;

function normalizedHeader(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 1000) : null;
}

function requestNetwork(headers: HeaderReader) {
  const candidate =
    normalizedHeader(headers.get("cf-connecting-ip")) ||
    normalizedHeader(headers.get("x-real-ip")) ||
    normalizedHeader(headers.get("x-forwarded-for"))
      ?.split(",")[0]
      ?.trim() ||
    null;

  return candidate?.slice(0, 128) ?? null;
}

function classifyDevice(userAgent: string | null): DeviceClass {
  if (!userAgent) return "unknown";

  if (
    /bot|crawler|spider|slurp|headless|lighthouse/i.test(
      userAgent,
    )
  ) {
    return "bot";
  }

  if (/ipad|tablet|kindle|silk/i.test(userAgent)) {
    return "tablet";
  }

  if (
    /mobile|iphone|ipod|android.*mobile|windows phone/i.test(
      userAgent,
    )
  ) {
    return "mobile";
  }

  return "desktop";
}

function protectedHash(
  value: string | null,
  category: "network" | "user-agent",
) {
  const secret = process.env.READING_ACCESS_HASH_SECRET?.trim();

  if (!value || !secret || secret.length < 64) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`${category}:${value}`)
    .digest("hex");
}

function createDedupeKey(input: ReadingAccessInput, now: Date) {
  const bucket = Math.floor(now.getTime() / ACCESS_WINDOW_MS);

  return createHash("sha256")
    .update(
      [
        "reading-access-v1",
        input.userId,
        input.sessionId,
        input.chapterId,
        bucket,
      ].join(":"),
    )
    .digest("hex");
}

async function recordReadingAccess(input: ReadingAccessInput) {
  const now = new Date();
  const userAgent = normalizedHeader(
    input.requestHeaders.get("user-agent"),
  );
  const network = requestNetwork(input.requestHeaders);
  const userAgentHash = protectedHash(userAgent, "user-agent");
  const ipHash = protectedHash(network, "network");
  const deviceClass = classifyDevice(userAgent);
  const dedupeKey = createDedupeKey(input, now);

  const access = await prisma.readingAccess.upsert({
    where: { dedupeKey },
    create: {
      chapterId: input.chapterId,
      dedupeKey,
      deviceClass,
      ipHash,
      lastSeenAt: now,
      openedAt: now,
      ruleVersion: RULE_VERSION,
      sessionId: input.sessionId,
      userAgentHash,
      userId: input.userId,
      workId: input.workId,
    },
    update: {
      deviceClass,
      ipHash,
      lastSeenAt: now,
      userAgentHash,
      viewCount: { increment: 1 },
    },
    select: {
      id: true,
      riskLevel: true,
    },
  });

  const rapidStart = new Date(now.getTime() - RAPID_WINDOW_MS);
  const signalStart = new Date(now.getTime() - SIGNAL_WINDOW_MS);

  const [chapters, devices, networks] = await Promise.all([
    prisma.readingAccess.findMany({
      where: {
        lastSeenAt: { gte: rapidStart },
        userId: input.userId,
      },
      distinct: ["chapterId"],
      select: { chapterId: true },
    }),
    prisma.readingAccess.findMany({
      where: {
        lastSeenAt: { gte: signalStart },
        userAgentHash: { not: null },
        userId: input.userId,
      },
      distinct: ["userAgentHash"],
      select: { userAgentHash: true },
    }),
    prisma.readingAccess.findMany({
      where: {
        ipHash: { not: null },
        lastSeenAt: { gte: signalStart },
        userId: input.userId,
      },
      distinct: ["ipHash"],
      select: { ipHash: true },
    }),
  ]);

  const flags: string[] = [];
  let riskScore = 0;

  if (chapters.length >= RAPID_CHAPTER_LIMIT) {
    flags.push("rapid_navigation");
    riskScore += 50;
  }

  if (devices.length >= DEVICE_LIMIT) {
    flags.push("multiple_devices");
    riskScore += 25;
  }

  if (networks.length >= NETWORK_LIMIT) {
    flags.push("network_churn");
    riskScore += 25;
  }

  if (!flags.length) {
    return {
      accessId: access.id,
      riskLevel: access.riskLevel,
    };
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.readingAccess.update({
      where: { id: access.id },
      data: {
        riskFlags: JSON.stringify(flags),
        riskLevel: "watch",
        riskScore: Math.min(100, riskScore),
        ruleVersion: RULE_VERSION,
      },
    });

    const recentAudit = await transaction.auditLog.findFirst({
      where: {
        action: "reading_access_flagged",
        actorId: input.userId,
        createdAt: { gte: signalStart },
      },
      select: { id: true },
    });

    if (!recentAudit) {
      await transaction.auditLog.create({
        data: {
          action: "reading_access_flagged",
          actorId: input.userId,
          entityId: access.id,
          entityType: "ReadingAccess",
          metadata: JSON.stringify({
            chapterCount: chapters.length,
            deviceCount: devices.length,
            flags,
            networkCount: networks.length,
            riskScore: Math.min(100, riskScore),
            ruleVersion: RULE_VERSION,
            workId: input.workId,
          }),
        },
      });
    }
  });

  return {
    accessId: access.id,
    riskLevel: "watch" as const,
  };
}

export async function recordReadingAccessSafely(
  input: ReadingAccessInput,
) {
  try {
    return await recordReadingAccess(input);
  } catch (error) {
    console.error("[ReadingAccess] Erişim kaydı oluşturulamadı.", error);
    return null;
  }
}
