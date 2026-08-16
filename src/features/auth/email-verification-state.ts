import "server-only";

import { prisma } from "@/lib/prisma";

const EMAIL_VERIFICATION_COOLDOWN_MS = 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export { EMAIL_VERIFICATION_COOLDOWN_MS, EMAIL_VERIFICATION_TTL_MS };
