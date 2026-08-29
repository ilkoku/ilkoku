import { prisma } from "@/lib/prisma";
import { demoShowcaseAccounts } from "./provision";
import { demoWriterLevels } from "./writer-levels";

const DEMO_PUBLISHER_SLUG = "ilkoku-demo-yayinevi";
const DEMO_TITLE_PREFIX = "Demo ·";

const baseDemoWorkSlugs = [
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

const levelWorkSlugs = demoWriterLevels.flatMap((writer) =>
  writer.workSlug ? [writer.workSlug] : [],
);

const allDemoWorkSlugs = [...baseDemoWorkSlugs, ...levelWorkSlugs];
const writerEmails = demoWriterLevels.map((writer) => writer.email);
const accountEmails = Array.from(
  new Set([
    ...demoShowcaseAccounts.map((account) => account.email),
    ...writerEmails,
  ]),
);

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
  writers: ReadyCounter;
};

export async function getScopedDemoShowcaseStatus(): Promise<DemoShowcaseStatus> {
  const demoPublisher = await prisma.publisher.findUnique({
    where: { slug: DEMO_PUBLISHER_SLUG },
    select: { active: true, archivedAt: true, id: true },
  });
  const publisherId = demoPublisher?.id ?? "__demo_publisher_missing__";

  const [
    accounts,
    writers,
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
        email: { in: accountEmails },
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        email: { in: writerEmails },
        role: "writer",
        status: "active",
        works: {
          some: {
            archivedAt: null,
            publishedAt: { not: null },
            status: "published",
            visibility: "public",
          },
        },
      },
    }),
    prisma.work.count({
      where: { slug: { in: allDemoWorkSlugs } },
    }),
    prisma.work.count({
      where: {
        slug: { in: allDemoWorkSlugs },
        status: "published",
        visibility: "public",
      },
    }),
    prisma.comment.count({
      where: {
        work: { is: { slug: { in: allDemoWorkSlugs } } },
      },
    }),
    prisma.readingProgress.count({
      where: {
        user: { is: { email: "demo-okuyucu@ilkoku.com" } },
        work: { is: { slug: { in: allDemoWorkSlugs } } },
      },
    }),
    prisma.editorReviewAssignment.count({
      where: {
        work: { is: { slug: { in: allDemoWorkSlugs } } },
      },
    }),
    prisma.notification.count({
      where: {
        title: { startsWith: DEMO_TITLE_PREFIX },
        user: { is: { email: { in: accountEmails } } },
      },
    }),
    prisma.publisherDiscoveryShare.count({ where: { publisherId } }),
    prisma.publisherPermissionRequest.count({ where: { publisherId } }),
    prisma.publisherEditorRequest.count({ where: { publisherId } }),
    prisma.publisherSubmission.count({ where: { publisherId } }),
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
      expected: 16,
      ready: accounts >= 16,
    },
    comments: {
      current: comments,
      expected: 7,
      ready: comments >= 7,
    },
    editorAssignments: {
      current: editorAssignments,
      expected: 24,
      ready: editorAssignments >= 24,
    },
    notifications: {
      current: notifications,
      expected: 8,
      ready: notifications >= 8,
    },
    publicWorks: {
      current: publicWorks,
      expected: 16,
      ready: publicWorks >= 16,
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
      expected: 18,
      ready: works >= 18,
    },
    writers: {
      current: writers,
      expected: 10,
      ready: writers >= 10,
    },
  } satisfies Omit<DemoShowcaseStatus, "ready">;

  return {
    ...status,
    ready: Object.values(status).every((item) => item.ready),
  };
}
