import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./password";
import {
  generateSessionToken,
  hashSessionToken,
} from "./session";

export async function loginUser(input: {
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const valid = await verifyPassword(
    input.password,
    user.passwordHash,
  );

  if (!valid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (user.status !== "active") {
    throw new Error("ACCOUNT_DISABLED");
  }

  const token = generateSessionToken();

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  return {
    user,
    token,
  };
}