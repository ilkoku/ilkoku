import { createHash, randomBytes } from "node:crypto";

import type { Prisma, UserRole } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { allocatePublicId } from "@/lib/public-id";

const DEMO_TITLE_PREFIX = "Demo ·";
const DEMO_PUBLISHER_SLUG = "ilkoku-demo-yayinevi";

export const demoShowcaseAccounts = [
  {
    email: "demo-okuyucu@ilkoku.com",
    fullName: "İlkOku Demo Okuyucu",
    key: "reader",
    role: "reader",
    username: "demo-okuyucu",
  },
  {
    email: "demo-yazar@ilkoku.com",
    fullName: "İlkOku Demo Yazar",
    key: "writer",
    role: "writer",
    username: "demo-yazar",
  },
  {
    email: "demo-editor-a@ilkoku.com",
    fullName: "İlkOku Demo Editör A",
    key: "editorA",
    role: "editor",
    username: "demo-editor-a",
  },
  {
    email: "demo-editor-b@ilkoku.com",
    fullName: "İlkOku Demo Editör B",
    key: "editorB",
    role: "editor",
    username: "demo-editor-b",
  },
  {
    email: "demo-dis-editor@ilkoku.com",
    fullName: "İlkOku Demo Dış Editör",
    key: "externalEditor",
    role: "editor",
    username: "demo-dis-editor",
  },
  {
    email: "demo-yayinevi@ilkoku.com",
    fullName: "İlkOku Demo Yayınevi Sahibi",
    key: "publisherOwner",
    role: "publisher",
    username: "demo-yayinevi",
  },
  {
    email: "demo-yayinevi-ekip@ilkoku.com",
    fullName: "İlkOku Demo Yayınevi Editoryal",
    key: "publisherMember",
    role: "publisher",
    username: "demo-yayinevi-ekip",
  },
] as const satisfies readonly {
  email: string;
  fullName: string;
  key: string;
  role: UserRole;
  username: string;
}[];

type DemoAccountKey = (typeof demoShowcaseAccounts)[number]["key"];

type DemoWorkSpec = {
  archived?: boolean;
  contentRating: "all_ages" | "teen_13" | "young_adult_16";
  description: string;
  editorReviewStatus:
    | "not_requested"
    | "requested"
    | "in_progress"
    | "awaiting_second_editor"
    | "second_in_progress"
    | "completed";
  genre: string;
  published?: boolean;
  slug: string;
  title: string;
};

const demoWorkSpecs: readonly DemoWorkSpec[] = [
  {
    contentRating: "teen_13",
    description:
      "Bir sahaf dükkânında bulunan eksik bir mektubun peşinden ilerleyen genç bir yazarın şehir, hafıza ve aile sırlarıyla kurduğu bağ.",
    editorReviewStatus: "not_requested",
    genre: "Roman",
    published: true,
    slug: "demo-kayip-harfler",
    title: "Kayıp Harfler",
  },
  {
    contentRating: "all_ages",
    description:
      "İlk profesyonel editör incelemesini bekleyen, küçük bir kıyı kasabasındaki kütüphaneyi merkezine alan umutlu bir anlatı.",
    editorReviewStatus: "requested",
    genre: "Gençlik",
    published: true,
    slug: "demo-editore-hazir",
    title: "Kıyı Kütüphanesi",
  },
  {
    contentRating: "young_adult_16",
    description:
      "Bir gece treninde kesişen hayatların birbirine bıraktığı izleri anlatan ve ilk editör incelemesi sürmekte olan bir roman.",
    editorReviewStatus: "in_progress",
    genre: "Dram",
    published: true,
    slug: "demo-ilk-inceleme",
    title: "Gece Treni",
  },
  {
    contentRating: "teen_13",
    description:
      "Birinci editör raporu tamamlanmış, bağımsız ikinci editör aşamasını bekleyen şehir ve aidiyet temalı bir eser.",
    editorReviewStatus: "awaiting_second_editor",
    genre: "Roman",
    published: true,
    slug: "demo-ikinci-bakis",
    title: "Camdan Şehir",
  },
  {
    contentRating: "teen_13",
    description:
      "İkinci editör incelemesi devam eden; iki farklı anlatıcının aynı olayı ayrı koridorlardan izlediği çok sesli bir kurgu.",
    editorReviewStatus: "second_in_progress",
    genre: "Gizem",
    published: true,
    slug: "demo-cifte-koridor",
    title: "İki Koridor",
  },
  {
    contentRating: "all_ages",
    description:
      "İki bağımsız editör değerlendirmesi de tamamlanmış, Eser Pasaportu ve editoryal geçmişi dolu örnek çalışma.",
    editorReviewStatus: "completed",
    genre: "Öykü",
    published: true,
    slug: "demo-tamamlanan-dosya",
    title: "Mavi Defter",
  },
  {
    contentRating: "young_adult_16",
    description:
      "Birinci editör incelemesi bitmiş ve dış ikinci editör daveti senaryosunu göstermek için hazır bekleyen örnek eser.",
    editorReviewStatus: "awaiting_second_editor",
    genre: "Bilim Kurgu",
    published: true,
    slug: "demo-dis-editor-hazir",
    title: "Sessiz Yörünge",
  },
  {
    contentRating: "teen_13",
    description:
      "Yazar panelinde taslak, bölüm düzenleme ve yazmaya devam akışlarını göstermek için hazırlanmış yayınlanmamış eser.",
    editorReviewStatus: "not_requested",
    genre: "Fantastik",
    slug: "demo-taslak",
    title: "Taş Kapının Ardında",
  },
  {
    archived: true,
    contentRating: "all_ages",
    description:
      "Arşivden geri yükleme davranışını göstermek için saklanan eski bir demo çalışması.",
    editorReviewStatus: "not_requested",
    genre: "Deneme",
    slug: "demo-arsiv",
    title: "Eski Notlar",
  },
];

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function validDemoPassword(password: string) {
  return (
    password.length >= 12 &&
    /[A-Za-zÇĞİÖŞÜçğıöşü]/u.test(password) &&
    /\d/u.test(password)
  );
}

function chapterContent(workTitle: string, chapterNumber: number) {
  const paragraphs = [
    `${workTitle} için hazırlanan bu demo bölüm, İlkOku okuma deneyimini gerçekçi bir içerik yoğunluğuyla göstermek üzere yazılmıştır. Anlatı, karakterlerin kararlarını küçük ayrıntılar üzerinden takip eder ve bölüm ilerledikçe yeni sorular açar.`,
    `Bölüm ${chapterNumber} içinde sahne değişimleri kısa tutulur; okurun ritmi kaybetmeden metne devam etmesi amaçlanır. Karakterlerin birbirleriyle kurduğu ilişki, doğrudan açıklamalar yerine davranışlar ve mekân ayrıntılarıyla görünür olur.`,
    `Pencerenin dışındaki sesler, masanın üzerindeki notlar ve yarım bırakılmış bir cümle anlatının yönünü değiştirir. Okur, bir sonraki sayfada ne olacağını merak ederken metin aynı zamanda yazarın üslubunu ve bölüm yapısını değerlendirmeye imkân verir.`,
    `Bu metin yalnızca demo verisidir; herhangi bir gerçek kişi, eser veya yayıneviyle bağlantı kurmaz. Amaç; yorum, favori, okuma ilerlemesi, editör incelemesi ve yayınevi keşfi gibi mevcut İlkOku özelliklerini dolu veri üzerinde sınamaktır.`,
  ];

  return Array.from({ length: 4 }, () => paragraphs.join("\n\n")).join(
    "\n\n",
  );
}

type DemoUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

async function ensureDemoUser(
  transaction: Prisma.TransactionClient,
  account: (typeof demoShowcaseAccounts)[number],
  passwordHash: string,
): Promise<DemoUser> {
  const existing = await transaction.user.findUnique({
    where: { email: account.email },
    select: { id: true },
  });

  if (existing) {
    return transaction.user.update({
      where: { id: existing.id },
      data: {
        bio: "İlkOku özelliklerini güvenli biçimde göstermek için kullanılan demo hesabıdır.",
        deletedAt: null,
        displayName: account.fullName,
        emailVerified: new Date(),
        fullName: account.fullName,
        isBanned: false,
        passwordHash,
        role: account.role,
        status: "active",
        termsAcceptedAt: new Date(),
        username: account.username,
      },
      select: {
        email: true,
        fullName: true,
        id: true,
        role: true,
      },
    });
  }

  const publicId = await allocatePublicId(transaction, "user");

  return transaction.user.create({
    data: {
      bio: "İlkOku özelliklerini güvenli biçimde göstermek için kullanılan demo hesabıdır.",
      displayName: account.fullName,
      email: account.email,
      emailVerified: new Date(),
      fullName: account.fullName,
      passwordHash,
      publicId,
      role: account.role,
      status: "active",
      termsAcceptedAt: new Date(),
      username: account.username,
    },
    select: {
      email: true,
      fullName: true,
      id: true,
      role: true,
    },
  });
}

async function ensureDemoWork(
  transaction: Prisma.TransactionClient,
  authorId: string,
  spec: DemoWorkSpec,
  editorAId: string,
) {
  const existing = await transaction.work.findUnique({
    where: { slug: spec.slug },
    select: { id: true },
  });
  const publishedAt = spec.published ? daysAgo(18) : null;
  const archivedAt = spec.archived ? daysAgo(25) : null;
  const assignedEditorId = [
    "in_progress",
    "awaiting_second_editor",
    "second_in_progress",
    "completed",
  ].includes(spec.editorReviewStatus)
    ? editorAId
    : null;
  const assignedAt = assignedEditorId ? daysAgo(12) : null;
  const editorReviewRequestedAt =
    spec.editorReviewStatus === "not_requested" ? null : daysAgo(13);
  const editorReviewCompletedAt =
    spec.editorReviewStatus === "completed" ? daysAgo(3) : null;
  const status = spec.archived
    ? "archived"
    : spec.published
      ? "published"
      : "draft";
  const visibility = spec.published ? "public" : "private";

  const data = {
    archivedAt,
    assignedAt,
    assignedEditorId,
    authorId,
    contentRating: spec.contentRating,
    contentRatingConfirmedAt: daysAgo(20),
    contentWarnings:
      spec.contentRating === "young_adult_16"
        ? JSON.stringify(["gerilim"])
        : null,
    description: spec.description,
    editorReviewCompletedAt,
    editorReviewRequestedAt,
    editorReviewStatus: spec.editorReviewStatus,
    genre: spec.genre,
    language: "tr",
    publishedAt,
    status: status as "archived" | "draft" | "published",
    subtitle: "İlkOku demo senaryosu",
    title: spec.title,
    visibility: visibility as "private" | "public",
  };

  const work = existing
    ? await transaction.work.update({
        where: { id: existing.id },
        data,
        select: { id: true, publicId: true, slug: true, title: true },
      })
    : await transaction.work.create({
        data: {
          ...data,
          publicId: await allocatePublicId(transaction, "work"),
          slug: spec.slug,
        },
        select: { id: true, publicId: true, slug: true, title: true },
      });

  const chapterStatus = spec.archived
    ? "archived"
    : spec.published
      ? "published"
      : "draft";

  const chapters = [];
  for (const position of [1, 2]) {
    const chapter = await transaction.chapter.upsert({
      where: {
        workId_position: {
          position,
          workId: work.id,
        },
      },
      create: {
        archivedAt: spec.archived ? daysAgo(25) : null,
        authorId,
        content: chapterContent(spec.title, position),
        position,
        publishedAt: spec.published ? daysAgo(18 - position) : null,
        status: chapterStatus,
        title: position === 1 ? "Başlangıç" : "Eşik",
        workId: work.id,
      },
      update: {
        archivedAt: spec.archived ? daysAgo(25) : null,
        authorId,
        content: chapterContent(spec.title, position),
        publishedAt: spec.published ? daysAgo(18 - position) : null,
        status: chapterStatus,
        title: position === 1 ? "Başlangıç" : "Eşik",
      },
      select: { id: true, position: true },
    });
    chapters.push(chapter);
  }

  return { ...work, chapters };
}

async function ensureDemoComment(
  transaction: Prisma.TransactionClient,
  input: {
    chapterId: string;
    content: string;
    parentId?: string | null;
    userId: string;
    workId: string;
  },
) {
  const existing = await transaction.comment.findFirst({
    where: {
      chapterId: input.chapterId,
      content: input.content,
      parentId: input.parentId ?? null,
      userId: input.userId,
      workId: input.workId,
    },
    select: { id: true },
  });

  if (existing) return existing;

  return transaction.comment.create({
    data: {
      chapterId: input.chapterId,
      content: input.content,
      parentId: input.parentId ?? null,
      publicId: await allocatePublicId(transaction, "comment"),
      status: "visible",
      userId: input.userId,
      workId: input.workId,
    },
    select: { id: true },
  });
}

async function ensureDemoNotification(
  transaction: Prisma.TransactionClient,
  input: {
    message: string;
    read?: boolean;
    relatedEntityId?: string;
    relatedEntityType?: string;
    title: string;
    type:
      | "editor_recommendation"
      | "editor_review"
      | "publisher_discovery_shared"
      | "reader_comment_reply"
      | "reader_favorite_work_completed"
      | "system";
    userId: string;
  },
) {
  const title = `${DEMO_TITLE_PREFIX} ${input.title}`;
  const existing = await transaction.notification.findFirst({
    where: {
      relatedEntityId: input.relatedEntityId,
      title,
      userId: input.userId,
    },
    select: { id: true },
  });

  if (existing) {
    await transaction.notification.update({
      where: { id: existing.id },
      data: {
        message: input.message,
        readAt: input.read ? daysAgo(1) : null,
        relatedEntityId: input.relatedEntityId,
        relatedEntityType: input.relatedEntityType,
        type: input.type,
      },
    });
    return;
  }

  await transaction.notification.create({
    data: {
      message: input.message,
      readAt: input.read ? daysAgo(1) : null,
      relatedEntityId: input.relatedEntityId,
      relatedEntityType: input.relatedEntityType,
      title,
      type: input.type,
      userId: input.userId,
    },
  });
}

export type DemoShowcaseStatus = {
  accounts: { current: number; expected: number; ready: boolean };
  comments: { current: number; expected: number; ready: boolean };
  editorAssignments: { current: number; expected: number; ready: boolean };
  notifications: { current: number; expected: number; ready: boolean };
  publicWorks: { current: number; expected: number; ready: boolean };
  publisher: { current: number; expected: number; ready: boolean };
  publisherScenarios: { current: number; expected: number; ready: boolean };
  readerProgress: { current: number; expected: number; ready: boolean };
  ready: boolean;
  works: { current: number; expected: number; ready: boolean };
};

export async function getDemoShowcaseStatus(): Promise<DemoShowcaseStatus> {
  const emails = demoShowcaseAccounts.map((account) => account.email);
  const workSlugs = demoWorkSpecs.map((work) => work.slug);

  const [
    accounts,
    works,
    publicWorks,
    publisher,
    comments,
    readerProgress,
    editorAssignments,
    notifications,
    publisherShares,
    publisherPermissionRequests,
    publisherEditorRequests,
    publisherSubmissions,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null, email: { in: emails } } }),
    prisma.work.count({ where: { slug: { in: workSlugs } } }),
    prisma.work.count({
      where: {
        slug: { in: workSlugs },
        status: "published",
        visibility: "public",
      },
    }),
    prisma.publisher.count({
      where: { active: true, archivedAt: null, slug: DEMO_PUBLISHER_SLUG },
    }),
    prisma.comment.count({
      where: { work: { is: { slug: { in: workSlugs } } } },
    }),
    prisma.readingProgress.count({
      where: {
        user: { is: { email: demoShowcaseAccounts[0].email } },
        work: { is: { slug: { in: workSlugs } } },
      },
    }),
    prisma.editorReviewAssignment.count({
      where: { work: { is: { slug: { in: workSlugs } } } },
    }),
    prisma.notification.count({
      where: {
        title: { startsWith: DEMO_TITLE_PREFIX },
        user: { is: { email: { in: emails } } },
      },
    }),
    prisma.publisherDiscoveryShare.count({
      where: { publisher: { is: { slug: DEMO_PUBLISHER_SLUG } } },
    }),
    prisma.publisherPermissionRequest.count({
      where: { publisher: { is: { slug: DEMO_PUBLISHER_SLUG } } },
    }),
    prisma.publisherEditorRequest.count({
      where: { publisherId: { not: "" }, workId: { not: "" } },
    }),
    prisma.publisherSubmission.count({
      where: { publisher: { is: { slug: DEMO_PUBLISHER_SLUG } } },
    }),
  ]);

  const status = {
    accounts: { current: accounts, expected: 7, ready: accounts >= 7 },
    comments: { current: comments, expected: 5, ready: comments >= 5 },
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
    publisher: { current: publisher, expected: 1, ready: publisher >= 1 },
    publisherScenarios: {
      current:
        publisherShares +
        publisherPermissionRequests +
        publisherEditorRequests +
        publisherSubmissions,
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
    works: { current: works, expected: 9, ready: works >= 9 },
  };

  return {
    ...status,
    ready: Object.values(status).every((item) => item.ready),
  };
}

export async function provisionDemoShowcase(input: {
  actorId: string;
  password: string;
}) {
  if (!validDemoPassword(input.password)) {
    throw new Error("DEMO_PASSWORD_TOO_WEAK");
  }

  const passwordHash = await hashPassword(input.password);
  const pendingInvitationTokenHash = digest(randomBytes(32).toString("base64url"));

  await prisma.$transaction(async (transaction) => {
    const userEntries = await Promise.all(
      demoShowcaseAccounts.map(async (account) => [
        account.key,
        await ensureDemoUser(transaction, account, passwordHash),
      ] as const),
    );
    const users = Object.fromEntries(userEntries) as Record<
      DemoAccountKey,
      DemoUser
    >;

    await transaction.profile.upsert({
      where: { userId: users.writer.id },
      create: {
        city: "İstanbul",
        completionPercentage: 100,
        country: "Türkiye",
        userId: users.writer.id,
        writingGenres: JSON.stringify(["Roman", "Öykü", "Gizem"]),
      },
      update: {
        city: "İstanbul",
        completionPercentage: 100,
        country: "Türkiye",
        writingGenres: JSON.stringify(["Roman", "Öykü", "Gizem"]),
      },
    });

    const existingPublisher = await transaction.publisher.findUnique({
      where: { slug: DEMO_PUBLISHER_SLUG },
      select: { id: true },
    });
    const publisherData = {
      acceptsSubmissions: true,
      active: true,
      address: "İlkOku demo çalışma alanı",
      archivedAt: null,
      city: "İstanbul",
      companyName: "İlkOku Demo Yayınları",
      companyType: "Demo yayıncılık hesabı",
      corporateEmail: users.publisherOwner.email,
      description:
        "Yayınevi keşfi, ekip yetkileri, iç paylaşım, editör talebi ve yayın planı akışlarını göstermek için kullanılan demo yayınevidir.",
      district: "Kadıköy",
      establishmentYear: 2026,
      legalCompanyName: "İlkOku Demo Yayınları",
      publicationCategories: JSON.stringify(["Roman", "Öykü", "Gençlik"]),
      verified: true,
    };
    const publisher = existingPublisher
      ? await transaction.publisher.update({
          where: { id: existingPublisher.id },
          data: publisherData,
          select: { id: true },
        })
      : await transaction.publisher.create({
          data: {
            ...publisherData,
            publicId: await allocatePublicId(transaction, "publisher"),
            slug: DEMO_PUBLISHER_SLUG,
          },
          select: { id: true },
        });

    const ownerMembership = await transaction.publisherMembership.upsert({
      where: {
        publisherId_userId: {
          publisherId: publisher.id,
          userId: users.publisherOwner.id,
        },
      },
      create: {
        active: true,
        publisherId: publisher.id,
        role: "owner",
        userId: users.publisherOwner.id,
      },
      update: {
        active: true,
        role: "owner",
      },
      select: { id: true },
    });
    const memberMembership = await transaction.publisherMembership.upsert({
      where: {
        publisherId_userId: {
          publisherId: publisher.id,
          userId: users.publisherMember.id,
        },
      },
      create: {
        active: true,
        permissionOverrides: [
          "discover_works",
          "discover_authors",
          "view_shared_items",
          "share_internal",
        ],
        publisherId: publisher.id,
        role: "editorial",
        userId: users.publisherMember.id,
      },
      update: {
        active: true,
        permissionOverrides: [
          "discover_works",
          "discover_authors",
          "view_shared_items",
          "share_internal",
        ],
        role: "editorial",
      },
      select: { id: true },
    });

    const workEntries = [];
    for (const spec of demoWorkSpecs) {
      workEntries.push([
        spec.slug,
        await ensureDemoWork(
          transaction,
          users.writer.id,
          spec,
          users.editorA.id,
        ),
      ] as const);
    }
    const works = Object.fromEntries(workEntries) as Record<
      string,
      Awaited<ReturnType<typeof ensureDemoWork>>
    >;
    const workIds = Object.values(works).map((work) => work.id);

    await transaction.publisherDiscoveryShare.deleteMany({
      where: { publisherId: publisher.id },
    });
    await transaction.publisherPermissionRequest.deleteMany({
      where: { publisherId: publisher.id },
    });
    await transaction.publisherInvitation.deleteMany({
      where: { publisherId: publisher.id },
    });
    await transaction.publisherEditorRequest.deleteMany({
      where: { publisherId: publisher.id },
    });
    await transaction.publisherSubmission.deleteMany({
      where: { publisherId: publisher.id },
    });
    await transaction.publisherWorkLike.deleteMany({
      where: { publisherId: publisher.id },
    });
    await transaction.publisherWorkFavorite.deleteMany({
      where: { publisherId: publisher.id },
    });
    await transaction.publisherAuthorLike.deleteMany({
      where: { publisherId: publisher.id },
    });
    await transaction.publisherAuthorFavorite.deleteMany({
      where: { publisherId: publisher.id },
    });
    await transaction.publisherAuthorFollow.deleteMany({
      where: { publisherId: publisher.id },
    });

    await transaction.comment.deleteMany({ where: { workId: { in: workIds } } });
    await transaction.readingAccess.deleteMany({
      where: { workId: { in: workIds } },
    });
    await transaction.readingProgress.deleteMany({
      where: { workId: { in: workIds } },
    });
    await transaction.bookmark.deleteMany({ where: { workId: { in: workIds } } });
    await transaction.favorite.deleteMany({ where: { workId: { in: workIds } } });
    await transaction.editorFeedback.deleteMany({
      where: { workId: { in: workIds } },
    });
    await transaction.editorInvite.deleteMany({ where: { workId: { in: workIds } } });
    await transaction.editorRecommendation.deleteMany({
      where: { workId: { in: workIds } },
    });
    await transaction.editorFavorite.deleteMany({ where: { workId: { in: workIds } } });
    await transaction.editorReviewAssignment.deleteMany({
      where: { workId: { in: workIds } },
    });
    await transaction.ownershipStamp.deleteMany({
      where: { workId: { in: workIds } },
    });
    await transaction.workVersion.deleteMany({ where: { workId: { in: workIds } } });
    await transaction.notification.deleteMany({
      where: {
        title: { startsWith: DEMO_TITLE_PREFIX },
        userId: {
          in: Object.values(users).map((user) => user.id),
        },
      },
    });

    const createAssignment = (data: Prisma.EditorReviewAssignmentUncheckedCreateInput) =>
      transaction.editorReviewAssignment.create({ data });

    const requestedWork = works["demo-editore-hazir"];
    await createAssignment({
      source: "pool",
      stage: "first",
      status: "waiting",
      workId: requestedWork.id,
    });

    const inProgressWork = works["demo-ilk-inceleme"];
    const inProgressFirst = await createAssignment({
      assignedAt: daysAgo(10),
      editorId: users.editorA.id,
      source: "pool",
      stage: "first",
      startedAt: daysAgo(10),
      status: "in_progress",
      workId: inProgressWork.id,
    });
    await transaction.editorFeedback.create({
      data: {
        assignmentId: inProgressFirst.id,
        authorId: users.writer.id,
        category: "Kurgu yapısı",
        content:
          "Demo taslak raporu: açılış ritmi güçlü; karakter motivasyonunun ikinci bölümde biraz daha görünür hâle gelmesi önerilir.",
        editorId: users.editorA.id,
        isProfessionalReview: true,
        reportStatus: "draft",
        status: "unread",
        title: "İlk inceleme taslağı",
        workId: inProgressWork.id,
      },
    });

    const awaitingWork = works["demo-ikinci-bakis"];
    const awaitingFirst = await createAssignment({
      assignedAt: daysAgo(12),
      completedAt: daysAgo(7),
      editorId: users.editorA.id,
      source: "pool",
      stage: "first",
      startedAt: daysAgo(12),
      status: "completed",
      workId: awaitingWork.id,
    });
    await createAssignment({
      source: "pool",
      stage: "second",
      status: "waiting",
      workId: awaitingWork.id,
    });
    await transaction.editorFeedback.create({
      data: {
        assignmentId: awaitingFirst.id,
        authorId: users.writer.id,
        category: "Anlatı",
        content:
          "Birinci editör demo raporu tamamlandı. İkinci editör bağımsız değerlendirmesi sonuçlanana kadar yazara kapalı tutulur.",
        editorId: users.editorA.id,
        isProfessionalReview: true,
        reportStatus: "completed",
        status: "unread",
        title: "Birinci editör raporu",
        workId: awaitingWork.id,
      },
    });

    const secondInProgressWork = works["demo-cifte-koridor"];
    const secondProgressFirst = await createAssignment({
      assignedAt: daysAgo(12),
      completedAt: daysAgo(8),
      editorId: users.editorA.id,
      source: "pool",
      stage: "first",
      startedAt: daysAgo(12),
      status: "completed",
      workId: secondInProgressWork.id,
    });
    const secondProgressSecond = await createAssignment({
      assignedAt: daysAgo(5),
      editorId: users.editorB.id,
      source: "specific_editor",
      stage: "second",
      startedAt: daysAgo(5),
      status: "in_progress",
      workId: secondInProgressWork.id,
    });
    await transaction.editorFeedback.createMany({
      data: [
        {
          assignmentId: secondProgressFirst.id,
          authorId: users.writer.id,
          category: "Karakter",
          content:
            "Birinci editör demo raporu: iki anlatıcının sesleri belirgin ve olay örgüsü takip edilebilir.",
          editorId: users.editorA.id,
          isProfessionalReview: true,
          reportStatus: "completed",
          status: "unread",
          title: "Birinci editör raporu",
          workId: secondInProgressWork.id,
        },
        {
          assignmentId: secondProgressSecond.id,
          authorId: users.writer.id,
          category: "Bağımsız ikinci görüş",
          content:
            "İkinci editör demo taslağı: final bölümündeki zaman geçişleri ayrıca kontrol ediliyor.",
          editorId: users.editorB.id,
          isProfessionalReview: true,
          reportStatus: "draft",
          status: "unread",
          title: "İkinci editör taslağı",
          workId: secondInProgressWork.id,
        },
      ],
    });

    const completedWork = works["demo-tamamlanan-dosya"];
    const completedFirst = await createAssignment({
      assignedAt: daysAgo(14),
      completedAt: daysAgo(9),
      editorId: users.editorA.id,
      source: "pool",
      stage: "first",
      startedAt: daysAgo(14),
      status: "completed",
      workId: completedWork.id,
    });
    const completedSecond = await createAssignment({
      assignedAt: daysAgo(8),
      completedAt: daysAgo(3),
      editorId: users.editorB.id,
      source: "specific_editor",
      stage: "second",
      startedAt: daysAgo(8),
      status: "completed",
      workId: completedWork.id,
    });
    await transaction.editorFeedback.createMany({
      data: [
        {
          assignmentId: completedFirst.id,
          authorId: users.writer.id,
          category: "Yapı",
          content:
            "Birinci editör demo raporu: bölüm dengesi ve karakter gelişimi güçlü; iki küçük anlatım tekrarı not edildi.",
          editorId: users.editorA.id,
          isProfessionalReview: true,
          reportStatus: "completed",
          status: "read",
          title: "Birinci editör tamamlandı",
          workId: completedWork.id,
        },
        {
          assignmentId: completedSecond.id,
          authorId: users.writer.id,
          category: "İkinci görüş",
          content:
            "İkinci editör demo raporu: ilk değerlendirmeden bağımsız okuma sonucunda eser yayıncılık keşfi için güçlü bulunmuştur.",
          editorId: users.editorB.id,
          isProfessionalReview: true,
          reportStatus: "completed",
          status: "unread",
          title: "İkinci editör tamamlandı",
          workId: completedWork.id,
        },
      ],
    });

    const externalReadyWork = works["demo-dis-editor-hazir"];
    const externalFirst = await createAssignment({
      assignedAt: daysAgo(11),
      completedAt: daysAgo(6),
      editorId: users.editorA.id,
      source: "pool",
      stage: "first",
      startedAt: daysAgo(11),
      status: "completed",
      workId: externalReadyWork.id,
    });
    await createAssignment({
      source: "pool",
      stage: "second",
      status: "waiting",
      workId: externalReadyWork.id,
    });
    await transaction.editorFeedback.create({
      data: {
        assignmentId: externalFirst.id,
        authorId: users.writer.id,
        category: "Kurgu",
        content:
          "Birinci editör demo raporu tamamlandı. Bu eser dış ikinci editör davetine çevrilmek üzere hazır tutulur.",
        editorId: users.editorA.id,
        isProfessionalReview: true,
        reportStatus: "completed",
        status: "unread",
        title: "Dış editör öncesi rapor",
        workId: externalReadyWork.id,
      },
    });

    const primaryWork = works["demo-kayip-harfler"];
    const primaryChapter = primaryWork.chapters[0];
    const secondChapter = primaryWork.chapters[1];
    const contentHash = digest(
      `${primaryWork.title}:${chapterContent(primaryWork.title, 1)}:${chapterContent(primaryWork.title, 2)}`,
    );
    await transaction.workVersion.create({
      data: {
        contentHash,
        description:
          "Demo Eser Pasaportu için ilk kayıtlı sürüm.",
        title: primaryWork.title,
        versionNumber: 1,
        workId: primaryWork.id,
      },
    });
    await transaction.ownershipStamp.create({
      data: {
        authorId: users.writer.id,
        contentHash,
        stampCode: `DEMO-${primaryWork.publicId}`,
        status: "active",
        version: 1,
        workId: primaryWork.id,
      },
    });

    const commentOne = await ensureDemoComment(transaction, {
      chapterId: primaryChapter.id,
      content:
        "Açılıştaki sahaf atmosferini sevdim. Mektubun neden yarım kaldığını ikinci bölümde biraz daha hissedebilir miyiz?",
      userId: users.reader.id,
      workId: primaryWork.id,
    });
    await ensureDemoComment(transaction, {
      chapterId: primaryChapter.id,
      content:
        "Teşekkür ederim. İkinci bölümde mektubun geçmişine dair ilk somut ipucunu özellikle görünür hâle getirdim.",
      parentId: commentOne.id,
      userId: users.writer.id,
      workId: primaryWork.id,
    });
    const commentTwo = await ensureDemoComment(transaction, {
      chapterId: secondChapter.id,
      content:
        "İkinci bölümde karakterin kararı daha netleşiyor. Son cümle bir sonraki bölümü merak ettirdi.",
      userId: users.reader.id,
      workId: primaryWork.id,
    });
    await ensureDemoComment(transaction, {
      chapterId: secondChapter.id,
      content:
        "Bu geçişi özellikle açık bırakmak istedim; geri bildiriminiz sonraki bölümün ritmini kurarken yardımcı olacak.",
      parentId: commentTwo.id,
      userId: users.writer.id,
      workId: primaryWork.id,
    });
    await ensureDemoComment(transaction, {
      chapterId: primaryChapter.id,
      content:
        "Metnin dili akıcı. Özellikle mekân betimlemelerinin kısa tutulması okuma hızını koruyor.",
      userId: users.reader.id,
      workId: primaryWork.id,
    });

    for (const workId of [primaryWork.id, completedWork.id, awaitingWork.id]) {
      await transaction.favorite.create({
        data: { userId: users.reader.id, workId },
      });
    }
    await transaction.readingProgress.create({
      data: {
        chapterId: primaryChapter.id,
        completed: false,
        lastPosition: 45,
        lastReadAt: daysAgo(1),
        progressPercent: 45,
        userId: users.reader.id,
        workId: primaryWork.id,
      },
    });
    await transaction.readingProgress.create({
      data: {
        chapterId: completedWork.chapters[1].id,
        completed: true,
        completedAt: daysAgo(2),
        lastPosition: 100,
        lastReadAt: daysAgo(2),
        progressPercent: 100,
        userId: users.reader.id,
        workId: completedWork.id,
      },
    });
    await transaction.bookmark.create({
      data: {
        chapterId: primaryChapter.id,
        label: "Karakter ipucu",
        position: 120,
        userId: users.reader.id,
        workId: primaryWork.id,
      },
    });
    await transaction.readingAccess.createMany({
      data: [
        {
          chapterId: primaryChapter.id,
          dedupeKey: digest("demo-reading-normal"),
          deviceClass: "mobile",
          ipHash: digest("demo-ip-normal"),
          riskLevel: "normal",
          riskScore: 0,
          userAgentHash: digest("demo-agent-mobile"),
          userId: users.reader.id,
          viewCount: 3,
          workId: primaryWork.id,
        },
        {
          chapterId: awaitingWork.chapters[0].id,
          dedupeKey: digest("demo-reading-watch"),
          deviceClass: "desktop",
          ipHash: digest("demo-ip-watch"),
          riskFlags: "rapid_page_sequence,demo_fixture",
          riskLevel: "watch",
          riskScore: 75,
          userAgentHash: digest("demo-agent-desktop"),
          userId: users.reader.id,
          viewCount: 18,
          workId: awaitingWork.id,
        },
      ],
    });

    await transaction.editorFavorite.create({
      data: { editorId: users.editorA.id, workId: primaryWork.id },
    });
    await transaction.editorRecommendation.create({
      data: {
        recipientEditorId: users.editorB.id,
        senderEditorId: users.editorA.id,
        status: "pending",
        workId: primaryWork.id,
      },
    });

    await transaction.publisherWorkLike.create({
      data: {
        createdById: users.publisherOwner.id,
        publisherId: publisher.id,
        workId: primaryWork.id,
      },
    });
    await transaction.publisherWorkFavorite.create({
      data: {
        createdById: users.publisherOwner.id,
        publisherId: publisher.id,
        workId: completedWork.id,
      },
    });
    await transaction.publisherAuthorLike.create({
      data: {
        authorId: users.writer.id,
        createdById: users.publisherOwner.id,
        publisherId: publisher.id,
      },
    });
    await transaction.publisherAuthorFavorite.create({
      data: {
        authorId: users.writer.id,
        createdById: users.publisherOwner.id,
        publisherId: publisher.id,
      },
    });
    await transaction.publisherAuthorFollow.create({
      data: {
        authorId: users.writer.id,
        createdById: users.publisherOwner.id,
        publisherId: publisher.id,
      },
    });

    await transaction.publisherDiscoveryShare.create({
      data: {
        channel: "team",
        createdById: users.publisherOwner.id,
        note: "Demo editoryal ekip paylaşımı: eserin ilk iki bölümünü değerlendirin.",
        publisherId: publisher.id,
        recipients: {
          create: {
            membershipId: memberMembership.id,
          },
        },
        workId: primaryWork.id,
      },
    });
    await transaction.publisherDiscoveryShare.create({
      data: {
        authorId: users.writer.id,
        channel: "email",
        createdById: users.publisherOwner.id,
        note: "Demo dış paylaşım: yazar profilini yayın kuruluna iletin.",
        publisherId: publisher.id,
        recipientEmail: "demo-dis-paylasim@ilkoku.com",
      },
    });

    await transaction.publisherPermissionRequest.create({
      data: {
        membershipId: memberMembership.id,
        pendingKey: `demo:${memberMembership.id}:favorite_work`,
        permission: "favorite_work",
        publisherId: publisher.id,
        requestNote:
          "Demo senaryosu: editoryal ekip üyesi favori eser yetkisi istiyor.",
        requestedById: users.publisherMember.id,
        status: "pending",
      },
    });
    await transaction.publisherInvitation.create({
      data: {
        expiresAt: daysFromNow(7),
        invitedById: users.publisherOwner.id,
        invitedEmail: "demo-ekip-davet@ilkoku.com",
        permissionOverrides: ["view_shared_items"],
        publisherId: publisher.id,
        role: "reviewer",
        status: "pending",
        tokenHash: pendingInvitationTokenHash,
      },
    });

    await transaction.publisherEditorRequest.create({
      data: {
        activeKey: `demo:${publisher.id}:${primaryWork.id}`,
        compensationEligible: true,
        publisherId: publisher.id,
        requestNote:
          "Yayın kurulu için bağımsız İlkOku editör değerlendirmesi rica ediyoruz.",
        requestedById: users.publisherOwner.id,
        status: "waiting",
        workId: primaryWork.id,
      },
    });
    const completedPublisherRequest = await transaction.publisherEditorRequest.create({
      data: {
        assignedEditorId: users.editorA.id,
        claimedAt: daysAgo(7),
        completedAt: daysAgo(4),
        compensationEligible: true,
        publisherId: publisher.id,
        requestNote:
          "Demo tamamlanmış yayınevi editör talebi.",
        requestedById: users.publisherOwner.id,
        startedAt: daysAgo(7),
        status: "completed",
        workId: completedWork.id,
      },
    });
    await transaction.publisherEditorReview.create({
      data: {
        category: "Yayın kurulu değerlendirmesi",
        completedAt: daysAgo(4),
        content:
          "Demo yayınevi talebi tamamlandı. Eserin hedef okur kitlesi, anlatı bütünlüğü ve dosya hazırlığı yayın kurulu için uygun seviyede.",
        editorId: users.editorA.id,
        requestId: completedPublisherRequest.id,
        status: "completed",
        title: "Yayınevi için editör değerlendirmesi",
      },
    });

    const pendingSubmission = await transaction.publisherSubmission.create({
      data: {
        authorId: users.writer.id,
        coverLetter:
          "Demo başvuru: Kayıp Harfler eserimi değerlendirilmek üzere yayınevinize sunuyorum.",
        publisherId: publisher.id,
        status: "pending",
        workId: primaryWork.id,
      },
    });
    await transaction.publisherSubmissionEvent.create({
      data: {
        actorId: users.writer.id,
        detail: "Demo yazar başvurusu oluşturuldu.",
        submissionId: pendingSubmission.id,
        title: "Başvuru alındı",
        type: "submitted",
      },
    });

    const acceptedSubmission = await transaction.publisherSubmission.create({
      data: {
        authorId: users.writer.id,
        coverLetter:
          "Demo kabul edilmiş başvuru: Mavi Defter eserini yayın planı senaryosu için sunuyorum.",
        publisherId: publisher.id,
        publisherNote:
          "Demo yayın kurulu kararı: dosya kabul edildi ve üretim planına alındı.",
        status: "accepted",
        submittedAt: daysAgo(20),
        workId: completedWork.id,
      },
    });
    await transaction.publisherSubmissionEvent.createMany({
      data: [
        {
          actorId: users.writer.id,
          detail: "Demo kabul senaryosu için başvuru oluşturuldu.",
          submissionId: acceptedSubmission.id,
          title: "Başvuru alındı",
          type: "submitted",
        },
        {
          actorId: users.publisherOwner.id,
          detail: "Demo yayın kurulu başvuruyu kabul etti.",
          submissionId: acceptedSubmission.id,
          title: "Başvuru kabul edildi",
          type: "decision_changed",
        },
      ],
    });
    await transaction.publicationPlan.create({
      data: {
        coverStatus: "in_progress",
        isbn: "DEMO-978-001",
        layoutStatus: "not_started",
        notes:
          "Demo yayın planı: kapak çalışması sürüyor, mizanpaj sonraki aşamada başlayacak.",
        printRun: 750,
        status: "production",
        submissionId: acceptedSubmission.id,
        targetPublicationDate: daysFromNow(45),
      },
    });

    await ensureDemoNotification(transaction, {
      message: "Yazar, Kayıp Harfler eserindeki yorumunuza yanıt verdi.",
      relatedEntityId: commentOne.id,
      relatedEntityType: "comment",
      title: "Yazar yorumunuza yanıt verdi",
      type: "reader_comment_reply",
      userId: users.reader.id,
    });
    await ensureDemoNotification(transaction, {
      message: "Favorinizdeki Mavi Defter eserini okumayı tamamladınız.",
      read: true,
      relatedEntityId: completedWork.id,
      relatedEntityType: "work",
      title: "Favori eser tamamlandı",
      type: "reader_favorite_work_completed",
      userId: users.reader.id,
    });
    await ensureDemoNotification(transaction, {
      message: "Gece Treni için profesyonel editör incelemesi başladı.",
      relatedEntityId: inProgressWork.id,
      relatedEntityType: "work",
      title: "Editör incelemesi başladı",
      type: "editor_review",
      userId: users.writer.id,
    });
    await ensureDemoNotification(transaction, {
      message: "Mavi Defter için iki aşamalı editör incelemesi tamamlandı.",
      read: true,
      relatedEntityId: completedWork.id,
      relatedEntityType: "work",
      title: "Editör incelemesi tamamlandı",
      type: "editor_review",
      userId: users.writer.id,
    });
    await ensureDemoNotification(transaction, {
      message: "Bir yayınevi Kayıp Harfler eserini beğendi. Yayınevi kimliği bu aşamada anonim tutulur.",
      relatedEntityId: primaryWork.id,
      relatedEntityType: "work",
      title: "Bir yayınevi eserinizi beğendi",
      type: "system",
      userId: users.writer.id,
    });
    await ensureDemoNotification(transaction, {
      message: "Demo Editör A, Kayıp Harfler eserini size önerdi.",
      relatedEntityId: primaryWork.id,
      relatedEntityType: "work",
      title: "Editör önerisi aldınız",
      type: "editor_recommendation",
      userId: users.editorB.id,
    });
    await ensureDemoNotification(transaction, {
      message: "Yayıneviniz Kayıp Harfler için İlkOku editör değerlendirmesi istedi.",
      relatedEntityId: primaryWork.id,
      relatedEntityType: "work",
      title: "Yeni yayınevi editör talebi",
      type: "system",
      userId: users.editorA.id,
    });
    await ensureDemoNotification(transaction, {
      message: "Kayıp Harfler eseri ekip içinde sizinle paylaşıldı.",
      relatedEntityId: primaryWork.id,
      relatedEntityType: "work",
      title: "Ekip paylaşımı aldınız",
      type: "publisher_discovery_shared",
      userId: users.publisherMember.id,
    });
    await ensureDemoNotification(transaction, {
      message: "Editoryal ekip üyesi favori eser yetkisi talep etti.",
      read: true,
      relatedEntityId: memberMembership.id,
      relatedEntityType: "publisher_membership",
      title: "Yeni yetki talebi",
      type: "system",
      userId: users.publisherOwner.id,
    });

    await transaction.auditLog.create({
      data: {
        action: "profile_updated",
        actorId: input.actorId,
        entityId: publisher.id,
        entityType: "DemoShowcase",
        metadata: JSON.stringify({
          accounts: demoShowcaseAccounts.length,
          publicWorks: demoWorkSpecs.filter((work) => work.published).length,
          source: "system_management_demo_showcase",
          works: demoWorkSpecs.length,
        }),
      },
    });

    void ownerMembership;
  }, { timeout: 30_000 });

  return getDemoShowcaseStatus();
}
