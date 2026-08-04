import {
  createHash,
} from "node:crypto";
import {
  NextResponse,
  type NextRequest,
} from "next/server";
import {
  prisma,
} from "@/lib/prisma";

function redirectResult(
  request: NextRequest,
  status:
    | "baglanti-gecersiz"
    | "email-dogrulandi",
) {
  const destination =
    request.nextUrl.clone();

  destination.pathname =
    "/giris";

  destination.search = "";

  destination.searchParams.set(
    "durum",
    status,
  );

  return NextResponse.redirect(
    destination,
  );
}

export async function GET(
  request: NextRequest,
) {
  const token =
    request.nextUrl.searchParams
      .get("token")
      ?.trim();

  if (!token) {
    return redirectResult(
      request,
      "baglanti-gecersiz",
    );
  }

  const tokenHash =
    createHash("sha256")
      .update(token)
      .digest("hex");

  const now = new Date();

  const verificationToken =
    await prisma
      .emailVerificationToken
      .findUnique({
        where: {
          tokenHash,
        },
        select: {
          expiresAt: true,
          id: true,
          usedAt: true,
          userId: true,
        },
      });

  if (
    !verificationToken ||
    verificationToken.usedAt ||
    verificationToken.expiresAt <=
      now
  ) {
    return redirectResult(
      request,
      "baglanti-gecersiz",
    );
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const claimed =
          await transaction
            .emailVerificationToken
            .updateMany({
              where: {
                expiresAt: {
                  gt: now,
                },
                id:
                  verificationToken.id,
                usedAt: null,
              },
              data: {
                usedAt: now,
              },
            });

        if (
          claimed.count !== 1
        ) {
          throw new Error(
            "TOKEN_ALREADY_USED",
          );
        }

        await transaction
          .user.update({
            where: {
              id:
                verificationToken
                  .userId,
            },
            data: {
              emailVerified:
                now,
            },
          });

        await transaction
          .auditLog.create({
            data: {
              action:
                "email_verified",
              actorId:
                verificationToken
                  .userId,
              entityId:
                verificationToken
                  .userId,
              entityType:
                "User",
              metadata:
                JSON.stringify({
                  source:
                    "verification_link",
                }),
            },
          });
      },
    );
  } catch {
    return redirectResult(
      request,
      "baglanti-gecersiz",
    );
  }

  return redirectResult(
    request,
    "email-dogrulandi",
  );
}
