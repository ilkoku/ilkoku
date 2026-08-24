export const BLOCKED_PUBLIC_WORK_SLUGS = [
  "test0408-2959175c",
] as const;

const blockedPublicWorkSlugs = new Set<string>(
  BLOCKED_PUBLIC_WORK_SLUGS,
);

export function isBlockedPublicWorkSlug(slug: string) {
  return blockedPublicWorkSlugs.has(slug.trim().toLowerCase());
}
