import { availableGenreLabels } from "@/lib/genre-system";
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
      emailVerified: true,
      fullName: true,
      role: true,
      username: true,
      profile: {
        select: {
          website: true,
          writingGenres: true,
        },
      },
      works: {
        where: {
          archivedAt: null,
          genre: { not: null },
          publishedAt: { not: null },
          status: "published",
          visibility: "public",
        },
        select: {
          genre: true,
        },
      },
      roleRequests: {
        include: {
          publisherApplication: true,
          reviewedBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user) return null;

  const [firstName = "", ...surnameParts] = user.fullName.trim().split(/\s+/);
  const profileGenres = user.role === "reader"
    ? parseWritingGenres(user.profile?.writingGenres)
    : user.role === "writer"
      ? availableGenreLabels(user.works.map((work) => work.genre))
      : [];

  return {
    avatarUrl: user.avatarUrl ?? "",
    bio: user.bio ?? "",
    createdAt: user.createdAt,
    email: user.email,
    emailVerified: user.emailVerified !== null,
    firstName,
    lastName: surnameParts.join(" "),
    latestRoleRequest: user.roleRequests[0] ? {
      adminName: user.roleRequests[0].reviewedBy?.fullName ?? null,
      createdAt: user.roleRequests[0].createdAt,
      publisherApplication: user.roleRequests[0].publisherApplication,
      requestedRole: user.roleRequests[0].requestedRole,
      reviewNote: user.roleRequests[0].reviewNote,
      reviewedAt: user.roleRequests[0].reviewedAt,
      status: user.roleRequests[0].status,
    } : null,
    role: user.role,
    username: user.username ?? "",
    website: user.profile?.website ?? "",
    writingGenres: profileGenres,
  };
}
