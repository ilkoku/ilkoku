import { prisma } from "@/lib/prisma";
import { parseWritingGenres } from "./data";

export async function getProfilePageData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      avatarUrl: true,
      bio: true,
      createdAt: true,
      email: true,
      fullName: true,
      role: true,
      username: true,
      profile: {
        select: {
          website: true,
          writingGenres: true,
        },
      },
    },
  });

  if (!user) return null;

  const [firstName = "", ...surnameParts] = user.fullName.trim().split(/\s+/);

  return {
    avatarUrl: user.avatarUrl ?? "",
    bio: user.bio ?? "",
    createdAt: user.createdAt,
    email: user.email,
    firstName,
    lastName: surnameParts.join(" "),
    role: user.role,
    username: user.username ?? "",
    website: user.profile?.website ?? "",
    writingGenres: parseWritingGenres(user.profile?.writingGenres),
  };
}
