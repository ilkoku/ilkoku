import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allocatePublicId } from "@/lib/public-id";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const demoUsers = [
  {
    email: "demo.yazar@ilkoku.com",
    fullName: "Demo Yazar",
    passwordHash: "$2b$12$fFyuO2LbEwtDznLO82f/beFnCPmK/XHnm4UAll4Uo38u2thkQK9E2",
    role: "writer",
  },
  {
    email: "demo.okuyucu@ilkoku.com",
    fullName: "Demo Okuyucu",
    passwordHash: "$2b$12$CVhMADRHo93QAuPC70nx5ui0RjCpB46TABJOYkknlTc5joAQgb..y",
    role: "reader",
  },
  {
    email: "demo.editor@ilkoku.com",
    fullName: "Demo Editör",
    passwordHash: "$2b$12$AOAtzDuxM5Fa7uHFeR/rbuMoE2G12pJePXDZPARSJhMaS1J8lSKfy",
    role: "editor",
  },
  {
    email: "demo.yayinevi@ilkoku.com",
    fullName: "Demo Yayınevi",
    passwordHash: "$2b$12$vmSSREJ8B57laSJNDKmnf.GMn5hDQlOHlQdxd/aqpqntdWAa/b9W2",
    role: "publisher",
  },
] as const;

function configuredSecret() {
  return process.env.SUMMARY_JOBS_SECRET?.trim()
    || process.env.WRITER_DAILY_SUMMARY_SECRET?.trim()
    || "";
}

function authorized(request: NextRequest) {
  const configured = configuredSecret();
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!configured || configured.length < 32 || !supplied) {
    return false;
  }

  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);

  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: NextRequest) {
  if (!configuredSecret()) {
    return NextResponse.json(
      { error: "DEMO_BOOTSTRAP_SECRET_MISSING" },
      { status: 503 },
    );
  }

  if (!authorized(request)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const now = new Date();
      const createdUsers: Array<{
        email: string;
        id: string;
        role: "reader" | "writer" | "editor" | "publisher";
      }> = [];

      for (const demo of demoUsers) {
        const existing = await transaction.user.findUnique({
          where: { email: demo.email },
          select: { id: true },
        });

        const user = existing
          ? await transaction.user.update({
              where: { id: existing.id },
              data: {
                deletedAt: null,
                displayName: demo.fullName,
                emailVerified: now,
                fullName: demo.fullName,
                isBanned: false,
                passwordHash: demo.passwordHash,
                role: demo.role,
                status: "active",
                termsAcceptedAt: now,
              },
              select: { id: true },
            })
          : await transaction.user.create({
              data: {
                createdAt: now,
                displayName: demo.fullName,
                email: demo.email,
                emailVerified: now,
                fullName: demo.fullName,
                passwordHash: demo.passwordHash,
                publicId: await allocatePublicId(transaction, "user", now),
                role: demo.role,
                status: "active",
                termsAcceptedAt: now,
              },
              select: { id: true },
            });

        await transaction.session.deleteMany({
          where: { userId: user.id },
        });

        await transaction.roleRequest.deleteMany({
          where: {
            status: "pending",
            userId: user.id,
          },
        });

        createdUsers.push({
          email: demo.email,
          id: user.id,
          role: demo.role,
        });
      }

      const publisherUser = createdUsers.find((user) => user.role === "publisher");
      if (!publisherUser) {
        throw new Error("DEMO_PUBLISHER_USER_MISSING");
      }

      const slug = "ilkoku-demo-yayinevi";
      const existingPublisher = await transaction.publisher.findUnique({
        where: { slug },
        select: { id: true },
      });

      const publisher = existingPublisher
        ? await transaction.publisher.update({
            where: { id: existingPublisher.id },
            data: {
              acceptsSubmissions: true,
              active: true,
              archivedAt: null,
              companyName: "İlkOku Demo Yayınevi",
              corporateEmail: "demo.yayinevi@ilkoku.com",
              description: "İlkOku yayınevi rolü için canlı demo çalışma alanı.",
              publicationCategories: JSON.stringify(["Edebiyat", "Roman", "Öykü"]),
              verified: true,
            },
            select: { id: true, publicId: true },
          })
        : await transaction.publisher.create({
            data: {
              acceptsSubmissions: true,
              active: true,
              city: "İstanbul",
              companyName: "İlkOku Demo Yayınevi",
              companyType: "Demo",
              corporateEmail: "demo.yayinevi@ilkoku.com",
              description: "İlkOku yayınevi rolü için canlı demo çalışma alanı.",
              district: "Kadıköy",
              establishmentYear: 2026,
              legalCompanyName: "İlkOku Demo Yayıncılık",
              publicationCategories: JSON.stringify(["Edebiyat", "Roman", "Öykü"]),
              publicId: await allocatePublicId(transaction, "publisher", now),
              slug,
              verified: true,
            },
            select: { id: true, publicId: true },
          });

      await transaction.publisherMembership.updateMany({
        where: {
          active: true,
          publisherId: { not: publisher.id },
          userId: publisherUser.id,
        },
        data: { active: false },
      });

      await transaction.publisherMembership.upsert({
        where: {
          publisherId_userId: {
            publisherId: publisher.id,
            userId: publisherUser.id,
          },
        },
        create: {
          active: true,
          publisherId: publisher.id,
          role: "owner",
          userId: publisherUser.id,
        },
        update: {
          active: true,
          role: "owner",
        },
      });

      return {
        publisherPublicId: publisher.publicId,
        users: createdUsers.map(({ email, role }) => ({ email, role })),
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "UNKNOWN_DEMO_BOOTSTRAP_ERROR";

    console.error("DEMO_USER_BOOTSTRAP_FAILED", { error: message });

    return NextResponse.json(
      { error: message, ok: false },
      { status: 500 },
    );
  }
}
