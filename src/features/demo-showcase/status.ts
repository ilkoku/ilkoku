import { prisma } from "@/lib/prisma";
import { demoShowcaseAccounts } from "./provision";

const DEMO_PUBLISHER_SLUG = "ilkoku-demo-yayinevi";
const DEMO_TITLE_PREFIX = "Demo ·";

const demoWorkSlugs = [
  "demo-kayip-harfler",
  "demo-editore-hazir",
  "demo-ilk-inceleme",
  "demo-ikinci-bakis",
  "demo-cifte-koridor",
  "demo-tamamlanan-dosya",
  "demo-dis-editor-hazir",
  "demo-taslak",
  "demo-arsiv",
] as const;

type ReadyCounter = {
  current: number;
  expected: number;
  ready: boolean;
};

export type DemoShowcaseStatus = {
  accounts: ReadyCounter;
  comments: ReadyCounter;
  editorAssignments: ReadyCounter;
  notifications: ReadyCounter;
  publicWorks: ReadyCounter;
  publisher: ReadyCounter;
  publisherScenarios: ReadyCounter;
  readerProgress: ReadyCounter;
  ready: boolean;
  works: ReadyCounter;
};

export async function getScopedDemoShowcaseStatus(): Promise<DemoShowcaseStatus> {
  const emails = demoShowcaseAccounts.map((account) => account.email);
  const demoPublisher = await prisma.publisher.findUnique({
    where: { slug: DEMO_PUBLISHER_SLUG },
    select: { active: true, archivedAt: true, id: true },
  });
  const publisherId = demoPublisher?.id ?? "__demo_publisher_missing__";

  const [
    accounts,
    works,
    publicWorks,
    comments,
    readerProgress,
    editorAssignments,
    notifications,
    publisherShares,
    publisherPermissionRequests,
    publisherEditorRequests,
    publisherSubmissions,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        deletedAt: null,
        email: { in: emails },
      },
    }),
    prisma.work.count({
      where: { slug: { in: [...demoWorkSlugs] } },
    }),
    prisma.work.count({
      where: {
        slug: { in: [...demoWorkSlugs] },
        status: "published",
        visibility: "public",
      },
    }),
    prisma.comment.count({
      where: {
        work: { is: { slug: { in: [...demoWorkSlugs] } } },
      },
    }),
    prisma.readingProgress.count({
      where: {
        user: { is: { email: demoShowcaseAccounts[0].email } },
        work: { is: { slug: { in: [...demoWorkSlugs] } } },
      },
    }),
    prisma.editorReviewAssignment.count({
      where: {
        work: { is: { slug: { in: [...demoWorkSlugs] } } },
      },
    }),
    prisma.notification.count({
      where: {
        title: { startsWith: DEMO_TITLE_PREFIX },
        user: { is: { email: { in: emails } } },
      },
    }),
    prisma.publisherDiscoveryShare.count({
      where: { publisherId },
    }),
    prisma.publisherPermissionRequest.count({
      where: { publisherId },
    }),
    prisma.publisherEditorRequest.count({
      where: { publisherId },
    }),
    prisma.publisherSubmission.count({
      where: { publisherId },
    }),
  ]);

  const publisherReady = Boolean(
    demoPublisher?.active && !demoPublisher.archivedAt,
  );
  const publisherScenarioCount =
    publisherShares +
    publisherPermissionRequests +
    publisherEditorRequests +
    publisherSubmissions;

  const status = {
    accounts: {
      current: accounts,
      expected: 7,
      ready: accounts >= 7,
    },
    comments: {
      current: comments,
      expected: 5,
      ready: comments >= 5,
    },
    editorAssignments: {
      current: editorAssignments,
      expected: 10,
      ready: editorAssignments >= 10,
    },
    notifications: {
      current: notifications,
      expected: 8,
      ready: notifications >= 8,
    },
    publicWorks: {
      current: publicWorks,
      expected: 7,
      ready: publicWorks >= 7,
    },
    publisher: {
      current: publisherReady ? 1 : 0,
      expected: 1,
      ready: publisherReady,
    },
    publisherScenarios: {
      current: publisherScenarioCount,
      expected: 7,
      ready:
        publisherShares >= 2 &&
        publisherPermissionRequests >= 1 &&
        publisherEditorRequests >= 2 &&
        publisherSubmissions >= 2,
    },
    readerProgress: {
      current: readerProgress,
      expected: 2,
      ready: readerProgress >= 2,
    },
    works: {
      current: works,
      expected: 9,
      ready: works >= 9,
    },
  } satisfies Omit<DemoShowcaseStatus, "ready">;

  return {
    ...status,
    ready: Object.values(status).every((item) => item.ready),
  };
}
