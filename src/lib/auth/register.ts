import { prisma } from "@/lib/prisma";
import { hashPassword } from "./password";
import {
  generateSessionToken,
  hashSessionToken,
} from "./session";

type RegistrationRole = "reader" | "writer" | "editor" | "publisher";

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: RegistrationRole;
  termsAcceptedAt: Date;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);
  const requiresApproval =
    input.role === "editor" || input.role === "publisher";

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const user = await prisma.$transaction(async (transaction) => {
    const createdUser = await transaction.user.create({
      data: {
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: requiresApproval ? "reader" : input.role,
        termsAcceptedAt: input.termsAcceptedAt,
      },
    });

    if (requiresApproval) {
      await transaction.roleRequest.create({
        data: {
          userId: createdUser.id,
          requestedRole: input.role,
        },
      });
    }

    await transaction.session.create({
      data: {
        tokenHash,
        userId: createdUser.id,
        expiresAt,
      },
    });

    return createdUser;
  });

  return {
    user,
    token,
    requestedRole: requiresApproval ? input.role : null,
  };
}