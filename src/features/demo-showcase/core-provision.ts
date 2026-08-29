import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

import { demoShowcaseAccounts } from "./provision";
import { demoWriterLevels } from "./writer-levels";

const demoPublisherSlug = "ilkoku-demo-yayinevi";

const baseWorkSpecs = [
  {
    archived: false,
    contentRating: "teen_13" as const,
    editorReviewStatus: "not_requested" as const,
    genre: "Roman",
    published: true,
    slug: "demo-kayip-harfler",
    title: "Kayıp Harfler",
  },
  {
    archived: false,
    contentRating: "all_ages" as const,
    editorReviewStatus: "requested" as const,
    genre: "Gençlik",
    published: true,
    slug: "demo-editore-hazir",
    title: "Kıyı Kütüphanesi",
  },
  {
    archived: false,
    contentRating: "young_adult_16" as const,
    editorReviewStatus: "in_progress" as const,
    genre: "Dram",
    published: true,
    slug: "demo-ilk-inceleme",
    title: "Gece Treni",
  },
  {
    archived: false,
    contentRating: "teen_13" as const,
    editorReviewStatus: "awaiting_second_editor" as const,
    genre: "Roman",
    published: true,
    slug: "demo-ikinci-bakis",
    title: "Camdan Şehir",
  },
  {
    archived: false,
    contentRating: "teen_13" as const,
    editorReviewStatus: "second_in_progress" as const,
    genre: "Gizem",
    published: true,
    slug: "demo-cifte-koridor",
    title: "İki Koridor",
  },
  {
    archived: false,
    contentRating: "all_ages" as const,
    editorReviewStatus: "completed" as const,
    genre: "Öykü",
    published: true,
    slug: "demo-tamamlanan-dosya",
    title: "Mavi Defter",
  },
  {
    archived: false,
    contentRating: "young_adult_16" as const,
    editorReviewStatus: "awaiting_second_editor" as const,
    genre: "Bilim Kurgu",
    published: true,
    slug: "demo-dis-editor-hazir",
    title: "Sessiz Yörünge",
  },
  {
    archived: false,
    contentRating: "teen_13" as const,
    editorReviewStatus: "not_requested" as const,
    genre: "Fantastik",
    published: false,
    slug: "demo-taslak",
    title: "Taş Kapının Ardında",
  },
  {
    archived: true,
    contentRating: "all_ages" as const,
    editorReviewStatus: "not_requested" as const,
    genre: "Deneme",
    published: false,
    slug: "demo-arsiv",
    title: "Eski Notlar",
  },
] as const;

type CoreIdentityType = "publisher" | "user" | "work";

const identityPrefix: Record<CoreIdentityType, string> = {
  publisher: "P",
  user: "U",
  work: "W",
};

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function validDemoPassword(password: string) {
  return (
    password.length >= 12 &&
    /[A-Za-zÇĞİÖŞÜçğıöşü]/u.test(password) &&
    /\d/u.test(password)
  );
}

function coreError(code: string, cause: unknown) {
  console.error(`DEMO_CORE_PROVISION_FAILED:${code}`, cause);
  return Object.assign(new Error(code), { code });
}

async function runCorePhase<T>(code: string, operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    throw coreError(code, error);
  }
}

async function allocateCorePublicId(type: CoreIdentityType) {
  const year = new Date().getUTCFullYear();
  const sequence = await prisma.identitySequence.upsert({
    where: {
      type_year: {
        type,
        year,
      },
    },
    create: {
      lastNumber: 1,
      type,
      year,
    },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    select: {
      lastNumber: true,
    },
  });

  return [
    "IKO",
    identityPrefix[type],
    year,
    String(sequence.lastNumber).padStart(6, "0"),
  ].join("-");
}

async function ensureCoreUser(input: {
  bio: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: "editor" | "publisher" | "reader" | "writer";
  username: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  const data = {
    bio: input.bio,
    deletedAt: null,
    displayName: input.fullName,
    emailVerified: new Date(),
    fullName: input.fullName,
    isBanned: false,
    passwordHash: input.passwordHash,
    role: input.role,
    status: "active" as const,
    termsAcceptedAt: new Date(),
    username: input.username,
  };

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data,
      select: { id: true },
    });
  }

  return prisma.user.create({
    data: {
      ...data,
      email: input.email,
      publicId: await allocateCorePublicId("user"),
    },
    select: { id: true },
  });
}

async function ensureCoreProfile(input: {
  birthYear: number;
  city: string;
  genre: string;
  level: number;
  userId: string;
}) {
  const profile = {
    birthYear: input.birthYear,
    city: input.city,
    completionPercentage: Math.min(100, 55 + input.level * 5),
    country: "Türkiye",
    writingGenres: JSON.stringify([input.genre]),
  };

  await prisma.profile.upsert({
    where: { userId: input.userId },
    create: {
      ...profile,
      userId: input.userId,
    },
    update: profile,
  });
}

function reviewStatusForLevel(level: number) {
  if (level <= 1) return "not_requested" as const;
  if (level === 2) return "requested" as const;
  if (level === 3) return "in_progress" as const;
  if (level === 4) return "awaiting_second_editor" as const;
  if (level === 5) return "second_in_progress" as const;
  return "completed" as const;
}

async function ensureCoreWork(input: {
  archived: boolean;
  authorId: string;
  contentRating: "all_ages" | "teen_13" | "young_adult_16";
  description: string;
  editorReviewStatus:
    | "awaiting_second_editor"
    | "completed"
    | "in_progress"
    | "not_requested"
    | "requested"
    | "second_in_progress";
  genre: string;
  published: boolean;
  slug: string;
  subtitle: string;
  title: string;
}) {
  const existing = await prisma.work.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  const publishedAt = input.published ? daysAgo(18) : null;
  const archivedAt = input.archived ? daysAgo(25) : null;
  const status = input.archived
    ? "archived" as const
    : input.published
      ? "published" as const
      : "draft" as const;
  const visibility = input.published ? "public" as const : "private" as const;

  const data = {
    archivedAt,
    assignedAt: null,
    assignedEditorId: null,
    authorId: input.authorId,
    contentRating: input.contentRating,
    contentRatingConfirmedAt: daysAgo(20),
    description: input.description,
    editorReviewCompletedAt:
      input.editorReviewStatus === "completed" ? daysAgo(3) : null,
    editorReviewRequestedAt:
      input.editorReviewStatus === "not_requested" ? null : daysAgo(13),
    editorReviewStatus: input.editorReviewStatus,
    genre: input.genre,
    language: "tr",
    publishedAt,
    status,
    subtitle: input.subtitle,
    title: input.title,
    visibility,
  };

  const work = existing
    ? await prisma.work.update({
        where: { id: existing.id },
        data,
        select: { id: true },
      })
    : await prisma.work.create({
        data: {
          ...data,
          publicId: await allocateCorePublicId("work"),
          slug: input.slug,
        },
        select: { id: true },
      });

  const chapterStatus = input.archived
    ? "archived" as const
    : input.published
      ? "published" as const
      : "draft" as const;

  for (const position of [1, 2]) {
    await prisma.chapter.upsert({
      where: {
        workId_position: {
          position,
          workId: work.id,
        },
      },
      create: {
        archivedAt,
        authorId: input.authorId,
        content: `${input.title} demo eserinin ${position}. bölümü. Bu içerik İlkOku okuma, keşif ve rol akışlarını gerçek veri üzerinde doğrulamak için hazırlanmıştır.\n\nKarakterler, mekân ve anlatı ritmi bu bölümde demo kullanımına yetecek uzunlukta ilerler.`,
        position,
        publishedAt: input.published ? daysAgo(18 - position) : null,
        status: chapterStatus,
        title: position === 1 ? "İlk İz" : "Dönüm Noktası",
        workId: work.id,
      },
      update: {
        archivedAt,
        authorId: input.authorId,
        content: `${input.title} demo eserinin ${position}. bölümü. Bu içerik İlkOku okuma, keşif ve rol akışlarını gerçek veri üzerinde doğrulamak için hazırlanmıştır.\n\nKarakterler, mekân ve anlatı ritmi bu bölümde demo kullanımına yetecek uzunlukta ilerler.`,
        publishedAt: input.published ? daysAgo(18 - position) : null,
        status: chapterStatus,
        title: position === 1 ? "İlk İz" : "Dönüm Noktası",
      },
    });
  }
}

async function ensureCorePublisher(ownerId: string, memberId: string) {
  const existing = await prisma.publisher.findUnique({
    where: { slug: demoPublisherSlug },
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
    corporateEmail: "demo-yayinevi@ilkoku.com",
    description:
      "Yayınevi keşfi ve yayıncılık akışlarını göstermek için kullanılan demo yayınevidir.",
    district: "Kadıköy",
    establishmentYear: 2026,
    legalCompanyName: "İlkOku Demo Yayınları",
    publicationCategories: JSON.stringify(["Roman", "Öykü", "Gençlik"]),
    verified: true,
  };

  const publisher = existing
    ? await prisma.publisher.update({
        where: { id: existing.id },
        data: publisherData,
        select: { id: true },
      })
    : await prisma.publisher.create({
        data: {
          ...publisherData,
          publicId: await allocateCorePublicId("publisher"),
          slug: demoPublisherSlug,
        },
        select: { id: true },
      });

  await prisma.publisherMembership.upsert({
    where: {
      publisherId_userId: {
        publisherId: publisher.id,
        userId: ownerId,
      },
    },
    create: {
      active: true,
      publisherId: publisher.id,
      role: "owner",
      userId: ownerId,
    },
    update: {
      active: true,
      role: "owner",
    },
  });

  await prisma.publisherMembership.upsert({
    where: {
      publisherId_userId: {
        publisherId: publisher.id,
        userId: memberId,
      },
    },
    create: {
      active: true,
      publisherId: publisher.id,
      role: "editorial",
      userId: memberId,
    },
    update: {
      active: true,
      role: "editorial",
    },
  });
}

export async function provisionDemoCore(input: {
  actorId: string;
  password: string;
}) {
  if (!validDemoPassword(input.password)) {
    throw Object.assign(new Error("DEMO_PASSWORD_TOO_WEAK"), {
      code: "DEMO_PASSWORD_TOO_WEAK",
    });
  }

  const passwordHash = await hashPassword(input.password);
  const userIds = new Map<string, string>();

  await runCorePhase("DEMO_CORE_SUPPORT", async () => {
    for (const account of demoShowcaseAccounts) {
      const user = await ensureCoreUser({
        bio: "İlkOku özelliklerini güvenli biçimde göstermek için kullanılan demo hesabıdır.",
        email: account.email,
        fullName: account.fullName,
        passwordHash,
        role: account.role,
        username: account.username,
      });
      userIds.set(account.email, user.id);
    }
  });

  await runCorePhase("DEMO_CORE_WRITERS", async () => {
    for (const writer of demoWriterLevels) {
      const user = await ensureCoreUser({
        bio: writer.bio,
        email: writer.email,
        fullName: writer.fullName,
        passwordHash,
        role: "writer",
        username: writer.username,
      });
      userIds.set(writer.email, user.id);
      await ensureCoreProfile({
        birthYear: writer.birthYear,
        city: writer.city,
        genre: writer.genre,
        level: writer.level,
        userId: user.id,
      });
    }
  });

  await runCorePhase("DEMO_CORE_PUBLISHER", async () => {
    const ownerId = userIds.get("demo-yayinevi@ilkoku.com");
    const memberId = userIds.get("demo-yayinevi-ekip@ilkoku.com");
    if (!ownerId || !memberId) {
      throw new Error("DEMO_CORE_PUBLISHER_USERS_MISSING");
    }
    await ensureCorePublisher(ownerId, memberId);
  });

  await runCorePhase("DEMO_CORE_WORKS", async () => {
    const ardaId = userIds.get("demo-yazar@ilkoku.com");
    if (!ardaId) throw new Error("DEMO_CORE_ARDA_MISSING");

    for (const spec of baseWorkSpecs) {
      await ensureCoreWork({
        archived: spec.archived,
        authorId: ardaId,
        contentRating: spec.contentRating,
        description: `${spec.title}, İlkOku demo vitrini için hazırlanmış örnek eserdir.`,
        editorReviewStatus: spec.editorReviewStatus,
        genre: spec.genre,
        published: spec.published,
        slug: spec.slug,
        subtitle: "İlkOku demo senaryosu",
        title: spec.title,
      });
    }

    for (const writer of demoWriterLevels) {
      if (!writer.workSlug || !writer.workTitle) continue;
      const authorId = userIds.get(writer.email);
      if (!authorId) throw new Error("DEMO_CORE_LEVEL_AUTHOR_MISSING");

      await ensureCoreWork({
        archived: false,
        authorId,
        contentRating:
          writer.level % 3 === 0 ? "young_adult_16" : "teen_13",
        description: `${writer.fullName} profilinin ${writer.level}. demo kademesini gösteren ${writer.genre.toLocaleLowerCase("tr-TR")} eseri. Durum: ${writer.stage}.`,
        editorReviewStatus: reviewStatusForLevel(writer.level),
        genre: writer.genre,
        published: true,
        slug: writer.workSlug,
        subtitle: `Demo kademe ${writer.level} · ${writer.stage}`,
        title: writer.workTitle,
      });
    }
  });

  const accountEmails = Array.from(
    new Set([
      ...demoShowcaseAccounts.map((account) => account.email),
      ...demoWriterLevels.map((writer) => writer.email),
    ]),
  );
  const writerEmails = demoWriterLevels.map((writer) => writer.email);
  const workSlugs = [
    ...baseWorkSpecs.map((work) => work.slug),
    ...demoWriterLevels.flatMap((writer) =>
      writer.workSlug ? [writer.workSlug] : [],
    ),
  ];

  const verification = await runCorePhase("DEMO_CORE_VERIFY", async () => {
    const accounts = await prisma.user.count({
      where: { deletedAt: null, email: { in: accountEmails } },
    });
    const writers = await prisma.user.count({
      where: {
        deletedAt: null,
        email: { in: writerEmails },
        role: "writer",
        status: "active",
      },
    });
    const works = await prisma.work.count({
      where: { slug: { in: workSlugs } },
    });
    const publicWorks = await prisma.work.count({
      where: {
        slug: { in: workSlugs },
        status: "published",
        visibility: "public",
      },
    });

    if (accounts < 16 || writers < 10 || works < 18 || publicWorks < 16) {
      throw new Error(
        `DEMO_CORE_COUNTS:${accounts}:${writers}:${works}:${publicWorks}`,
      );
    }

    return { accounts, publicWorks, works, writers };
  });

  await runCorePhase("DEMO_CORE_AUDIT", async () => {
    await prisma.auditLog.create({
      data: {
        action: "profile_updated",
        actorId: input.actorId,
        entityType: "DemoCoreProvision",
        metadata: JSON.stringify({
          ...verification,
          source: "system_management_demo_core",
        }),
      },
    });
  });

  return verification;
}
