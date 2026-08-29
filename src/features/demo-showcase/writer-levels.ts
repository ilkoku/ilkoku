import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { allocatePublicId } from "@/lib/public-id";

export const demoWriterLevels = [
  {
    bio: "İlk eserini okurla buluşturan genç bir fantastik kurgu yazarı. Bu profil, editör incelemesi başlamadan önceki yazarlık aşamasını gösterir.",
    birthYear: 2007,
    city: "İstanbul",
    email: "demo-defne-aras@ilkoku.com",
    fullName: "Defne Aras — Demo Yazar",
    genre: "Fantastik",
    level: 1,
    stage: "Editör incelemesi yok",
    username: "demo-defne-aras",
    workSlug: "demo-level-01-defne-aras",
    workTitle: "Ay Işığındaki Kapı",
  },
  {
    bio: "İlk romanını tamamlamış ve profesyonel editör havuzuna göndermiş bir yazar. Eser henüz editör tarafından alınmadı.",
    birthYear: 2003,
    city: "İzmir",
    email: "demo-emir-sancak@ilkoku.com",
    fullName: "Emir Sancak — Demo Yazar",
    genre: "Gençlik",
    level: 2,
    stage: "1. editör bekliyor",
    username: "demo-emir-sancak",
    workSlug: "demo-level-02-emir-sancak",
    workTitle: "Kırık Pusula",
  },
  {
    bio: "Polisiye dosyası birinci editör tarafından aktif olarak incelenen yazar. Taslak profesyonel geri bildirim bu profilde görünür.",
    birthYear: 1999,
    city: "Ankara",
    email: "demo-selin-yalcin@ilkoku.com",
    fullName: "Selin Yalçın — Demo Yazar",
    genre: "Polisiye",
    level: 3,
    stage: "1. editör incelemesinde",
    username: "demo-selin-yalcin",
    workSlug: "demo-level-03-selin-yalcin",
    workTitle: "Son Peron",
  },
  {
    bio: "Birinci editör değerlendirmesini tamamlamış ve bağımsız ikinci görüşü bekleyen psikolojik roman yazarı.",
    birthYear: 1995,
    city: "Bursa",
    email: "demo-kerem-aydin@ilkoku.com",
    fullName: "Kerem Aydın — Demo Yazar",
    genre: "Psikolojik Roman",
    level: 4,
    stage: "2. editör bekliyor",
    username: "demo-kerem-aydin",
    workSlug: "demo-level-04-kerem-aydin",
    workTitle: "Sessiz Oda",
  },
  {
    bio: "Birinci editör raporunu tamamlamış, ikinci bağımsız editör incelemesi devam eden bilim kurgu yazarı.",
    birthYear: 1991,
    city: "Antalya",
    email: "demo-duru-erdem@ilkoku.com",
    fullName: "Duru Erdem — Demo Yazar",
    genre: "Bilim Kurgu",
    level: 5,
    stage: "2. editör incelemesinde",
    username: "demo-duru-erdem",
    workSlug: "demo-level-05-duru-erdem",
    workTitle: "Yedinci Yörünge",
  },
  {
    bio: "İki bağımsız editör değerlendirmesini tamamlamış tarihî kurgu yazarı. Eser Pasaportu ve tamamlanmış editoryal geçmiş örneğidir.",
    birthYear: 1987,
    city: "Eskişehir",
    email: "demo-baran-koc@ilkoku.com",
    fullName: "Baran Koç — Demo Yazar",
    genre: "Tarihî Kurgu",
    level: 6,
    stage: "2 editör tamamlandı",
    username: "demo-baran-koc",
    workSlug: "demo-level-06-baran-koc",
    workTitle: "Kervan Yolu",
  },
  {
    bio: "Editoryal süreci tamamlanmış ve okur geri bildirimleri oluşmaya başlamış gerilim yazarı. Yorum ve yazar cevabı aşamasını temsil eder.",
    birthYear: 1983,
    city: "İstanbul",
    email: "demo-nehir-demir@ilkoku.com",
    fullName: "Nehir Demir — Demo Yazar",
    genre: "Gerilim",
    level: 7,
    stage: "Editörler tamam · okur etkileşimi",
    username: "demo-nehir-demir",
    workSlug: "demo-level-07-nehir-demir",
    workTitle: "Karanlık İskele",
  },
  {
    bio: "İki editör aşamasını tamamlamış ve yayınevi keşfinde ilgi görmeye başlamış edebî roman yazarı.",
    birthYear: 1979,
    city: "Çanakkale",
    email: "demo-mert-ekinci@ilkoku.com",
    fullName: "Mert Ekinci — Demo Yazar",
    genre: "Edebî Roman",
    level: 8,
    stage: "Yayınevi keşfinde",
    username: "demo-mert-ekinci",
    workSlug: "demo-level-08-mert-ekinci",
    workTitle: "Rüzgârın Defteri",
  },
  {
    bio: "Editoryal süreci tamamlanan eserleri yayınevi tarafından beğenilen, favorilenen ve takip edilen deneyimli macera yazarı.",
    birthYear: 1974,
    city: "Ankara",
    email: "demo-ipek-aksoy@ilkoku.com",
    fullName: "İpek Aksoy — Demo Yazar",
    genre: "Macera",
    level: 9,
    stage: "Yayınevi ilgisi güçlü",
    username: "demo-ipek-aksoy",
    workSlug: "demo-level-09-ipek-aksoy",
    workTitle: "Haritadaki Boşluk",
  },
  {
    bio: "Birden fazla eseri farklı editoryal aşamalarda bulunan, yayınevi keşfi, başvuru ve yayın planı dahil İlkOku yolculuğunun en ileri demo profilidir.",
    birthYear: 1969,
    city: "İzmir",
    email: "demo-yazar@ilkoku.com",
    fullName: "Arda Koral — Demo Yazar",
    genre: "Roman · Öykü · Gizem",
    level: 10,
    stage: "Uçtan uca olgun profil",
    username: "demo-yazar",
    workSlug: null,
    workTitle: null,
  },
] as const;

const supportEmails = {
  editorA: "demo-editor-a@ilkoku.com",
  editorB: "demo-editor-b@ilkoku.com",
  reader: "demo-okuyucu@ilkoku.com",
};

const demoPublisherSlug = "ilkoku-demo-yayinevi";

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function chapterContent(title: string, position: number) {
  return Array.from(
    { length: 5 },
    (_, index) =>
      `${title} demo eserinin ${position}. bölümünde sahne ${index + 1}, karakterlerin kararlarını ve anlatının ritmini görünür kılacak yeterli metin uzunluğuyla ilerler. Bu içerik yalnız İlkOku özelliklerini gerçek veri yoğunluğunda göstermek için hazırlanmıştır; gerçek kişi veya esere dayanmaz.`,
  ).join("\n\n");
}

function reviewStatusForLevel(level: number) {
  if (level <= 1) return "not_requested" as const;
  if (level === 2) return "requested" as const;
  if (level === 3) return "in_progress" as const;
  if (level === 4) return "awaiting_second_editor" as const;
  if (level === 5) return "second_in_progress" as const;
  return "completed" as const;
}

async function ensureWriter(
  transaction: Prisma.TransactionClient,
  writer: (typeof demoWriterLevels)[number],
  passwordHash: string,
) {
  const existing = await transaction.user.findUnique({
    where: { email: writer.email },
    select: { id: true },
  });

  const data = {
    bio: writer.bio,
    deletedAt: null,
    displayName: writer.fullName,
    emailVerified: new Date(),
    fullName: writer.fullName,
    isBanned: false,
    passwordHash,
    role: "writer" as const,
    status: "active" as const,
    termsAcceptedAt: new Date(),
    username: writer.username,
  };

  const user = existing
    ? await transaction.user.update({
        where: { id: existing.id },
        data,
        select: { id: true, publicId: true },
      })
    : await transaction.user.create({
        data: {
          ...data,
          email: writer.email,
          publicId: await allocatePublicId(transaction, "user"),
        },
        select: { id: true, publicId: true },
      });

  await transaction.profile.upsert({
    where: { userId: user.id },
    create: {
      birthYear: writer.birthYear,
      city: writer.city,
      completionPercentage: Math.min(100, 55 + writer.level * 5),
      country: "Türkiye",
      userId: user.id,
      writingGenres: JSON.stringify([writer.genre]),
    },
    update: {
      birthYear: writer.birthYear,
      city: writer.city,
      completionPercentage: Math.min(100, 55 + writer.level * 5),
      country: "Türkiye",
      writingGenres: JSON.stringify([writer.genre]),
    },
  });

  return user;
}

async function ensureLevelWork(
  transaction: Prisma.TransactionClient,
  input: {
    authorId: string;
    editorAId: string;
    editorBId: string;
    writer: Exclude<(typeof demoWriterLevels)[number], { workSlug: null }>;
  },
) {
  const { writer } = input;
  const editorReviewStatus = reviewStatusForLevel(writer.level);
  const existing = await transaction.work.findUnique({
    where: { slug: writer.workSlug },
    select: { id: true, publicId: true },
  });
  const assignedEditorId = writer.level >= 3 ? input.editorAId : null;

  const workData = {
    archivedAt: null,
    assignedAt: assignedEditorId ? daysAgo(12) : null,
    assignedEditorId,
    authorId: input.authorId,
    contentRating: writer.level % 3 === 0 ? "young_adult_16" as const : "teen_13" as const,
    contentRatingConfirmedAt: daysAgo(20),
    description: `${writer.fullName} profilinin ${writer.level}. demo kademesini gösteren ${writer.genre.toLocaleLowerCase("tr-TR")} eseri. Durum: ${writer.stage}.`,
    editorReviewCompletedAt: writer.level >= 6 ? daysAgo(3) : null,
    editorReviewRequestedAt: writer.level >= 2 ? daysAgo(13) : null,
    editorReviewStatus,
    genre: writer.genre,
    language: "tr",
    publishedAt: daysAgo(18),
    status: "published" as const,
    subtitle: `Demo kademe ${writer.level} · ${writer.stage}`,
    title: writer.workTitle,
    visibility: "public" as const,
  };

  const work = existing
    ? await transaction.work.update({
        where: { id: existing.id },
        data: workData,
        select: { id: true, publicId: true },
      })
    : await transaction.work.create({
        data: {
          ...workData,
          publicId: await allocatePublicId(transaction, "work"),
          slug: writer.workSlug,
        },
        select: { id: true, publicId: true },
      });

  const chapters = [];
  for (const position of [1, 2]) {
    chapters.push(
      await transaction.chapter.upsert({
        where: {
          workId_position: {
            position,
            workId: work.id,
          },
        },
        create: {
          authorId: input.authorId,
          content: chapterContent(writer.workTitle, position),
          position,
          publishedAt: daysAgo(18 - position),
          status: "published",
          title: position === 1 ? "İlk İz" : "Dönüm Noktası",
          workId: work.id,
        },
        update: {
          archivedAt: null,
          authorId: input.authorId,
          content: chapterContent(writer.workTitle, position),
          publishedAt: daysAgo(18 - position),
          status: "published",
          title: position === 1 ? "İlk İz" : "Dönüm Noktası",
        },
        select: { id: true },
      }),
    );
  }

  await transaction.editorFeedback.deleteMany({ where: { workId: work.id } });
  await transaction.editorReviewAssignment.deleteMany({ where: { workId: work.id } });
  await transaction.workVersion.deleteMany({ where: { workId: work.id } });
  await transaction.ownershipStamp.deleteMany({ where: { workId: work.id } });

  let firstAssignmentId: string | null = null;
  let secondAssignmentId: string | null = null;

  if (writer.level === 2) {
    await transaction.editorReviewAssignment.create({
      data: {
        source: "pool",
        stage: "first",
        status: "waiting",
        workId: work.id,
      },
    });
  }

  if (writer.level >= 3) {
    const firstCompleted = writer.level >= 4;
    const first = await transaction.editorReviewAssignment.create({
      data: {
        assignedAt: daysAgo(12),
        completedAt: firstCompleted ? daysAgo(8) : null,
        editorId: input.editorAId,
        source: "pool",
        stage: "first",
        startedAt: daysAgo(12),
        status: firstCompleted ? "completed" : "in_progress",
        workId: work.id,
      },
    });
    firstAssignmentId = first.id;

    await transaction.editorFeedback.create({
      data: {
        assignmentId: first.id,
        authorId: input.authorId,
        category: "Kurgu ve anlatı",
        content: firstCompleted
          ? "Demo birinci editör raporu tamamlandı. Anlatı bütünlüğü, karakter motivasyonu ve bölüm ritmi değerlendirildi."
          : "Demo birinci editör taslak raporu: açılış ve karakter motivasyonu üzerinde inceleme devam ediyor.",
        editorId: input.editorAId,
        isProfessionalReview: true,
        reportStatus: firstCompleted ? "completed" : "draft",
        status: "unread",
        title: firstCompleted ? "1. editör raporu" : "1. editör taslağı",
        workId: work.id,
      },
    });
  }

  if (writer.level === 4) {
    await transaction.editorReviewAssignment.create({
      data: {
        source: "pool",
        stage: "second",
        status: "waiting",
        workId: work.id,
      },
    });
  }

  if (writer.level >= 5) {
    const secondCompleted = writer.level >= 6;
    const second = await transaction.editorReviewAssignment.create({
      data: {
        assignedAt: daysAgo(7),
        completedAt: secondCompleted ? daysAgo(3) : null,
        editorId: input.editorBId,
        source: "specific_editor",
        stage: "second",
        startedAt: daysAgo(7),
        status: secondCompleted ? "completed" : "in_progress",
        workId: work.id,
      },
    });
    secondAssignmentId = second.id;

    await transaction.editorFeedback.create({
      data: {
        assignmentId: second.id,
        authorId: input.authorId,
        category: "Bağımsız ikinci görüş",
        content: secondCompleted
          ? "Demo ikinci editör raporu tamamlandı. Birinci rapordan bağımsız okuma sonucunda yapı, dil ve yayın hazırlığı değerlendirildi."
          : "Demo ikinci editör taslak raporu: bağımsız ikinci görüş çalışması sürüyor.",
        editorId: input.editorBId,
        isProfessionalReview: true,
        reportStatus: secondCompleted ? "completed" : "draft",
        status: "unread",
        title: secondCompleted ? "2. editör raporu" : "2. editör taslağı",
        workId: work.id,
      },
    });
  }

  if (writer.level >= 6) {
    const versionHash = digest(`${writer.workSlug}:${writer.workTitle}:v1`);
    await transaction.workVersion.create({
      data: {
        contentHash: versionHash,
        description: `${writer.fullName} demo Eser Pasaportu sürümü.`,
        title: writer.workTitle,
        versionNumber: 1,
        workId: work.id,
      },
    });
    await transaction.ownershipStamp.create({
      data: {
        authorId: input.authorId,
        contentHash: versionHash,
        stampCode: `DEMO-LEVEL-${writer.level}-${work.publicId}`,
        status: "active",
        version: 1,
        workId: work.id,
      },
    });
  }

  return {
    chapters,
    firstAssignmentId,
    id: work.id,
    secondAssignmentId,
  };
}

export async function provisionDemoWriterLevels(input: {
  actorId: string;
  password: string;
}) {
  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (transaction) => {
    const editorA = await transaction.user.findUnique({
      where: { email: supportEmails.editorA },
      select: { id: true },
    });
    const editorB = await transaction.user.findUnique({
      where: { email: supportEmails.editorB },
      select: { id: true },
    });
    const reader = await transaction.user.findUnique({
      where: { email: supportEmails.reader },
      select: { id: true },
    });
    const publisher = await transaction.publisher.findUnique({
      where: { slug: demoPublisherSlug },
      select: { id: true },
    });

    if (!editorA || !editorB || !reader || !publisher) {
      throw new Error("DEMO_SHOWCASE_SUPPORT_ACCOUNTS_MISSING");
    }

    const writerUsers = new Map<
      number,
      Awaited<ReturnType<typeof ensureWriter>>
    >();

    for (const writer of demoWriterLevels) {
      writerUsers.set(
        writer.level,
        await ensureWriter(transaction, writer, passwordHash),
      );
    }

    for (const writer of demoWriterLevels) {
      if (!writer.workSlug || !writer.workTitle) continue;

      const author = writerUsers.get(writer.level);
      if (!author) throw new Error("DEMO_WRITER_MISSING");

      const work = await ensureLevelWork(transaction, {
        authorId: author.id,
        editorAId: editorA.id,
        editorBId: editorB.id,
        writer: writer as Exclude<(typeof demoWriterLevels)[number], { workSlug: null }>,
      });

      if (writer.level === 7) {
        await transaction.comment.deleteMany({ where: { workId: work.id } });
        const readerComment = await transaction.comment.create({
          data: {
            chapterId: work.chapters[0].id,
            content:
              "Gerilim temposu güçlü. İkinci bölümde karakterin iskeleye dönme kararının nedenini biraz daha açmanızı merak ettim.",
            publicId: await allocatePublicId(transaction, "comment"),
            status: "visible",
            userId: reader.id,
            workId: work.id,
          },
        });
        await transaction.comment.create({
          data: {
            chapterId: work.chapters[0].id,
            content:
              "Teşekkür ederim. Bu motivasyonu ikinci bölümün açılışına taşıyarak daha görünür hâle getirdim.",
            parentId: readerComment.id,
            publicId: await allocatePublicId(transaction, "comment"),
            status: "visible",
            userId: author.id,
            workId: work.id,
          },
        });
      }

      if (writer.level === 8) {
        await transaction.publisherWorkLike.upsert({
          where: {
            publisherId_workId: {
              publisherId: publisher.id,
              workId: work.id,
            },
          },
          create: {
            publisherId: publisher.id,
            workId: work.id,
          },
          update: {},
        });
        await transaction.publisherAuthorLike.upsert({
          where: {
            publisherId_authorId: {
              authorId: author.id,
              publisherId: publisher.id,
            },
          },
          create: {
            authorId: author.id,
            publisherId: publisher.id,
          },
          update: {},
        });
      }

      if (writer.level === 9) {
        await transaction.publisherWorkFavorite.upsert({
          where: {
            publisherId_workId: {
              publisherId: publisher.id,
              workId: work.id,
            },
          },
          create: {
            publisherId: publisher.id,
            workId: work.id,
          },
          update: {},
        });
        await transaction.publisherAuthorFavorite.upsert({
          where: {
            publisherId_authorId: {
              authorId: author.id,
              publisherId: publisher.id,
            },
          },
          create: {
            authorId: author.id,
            publisherId: publisher.id,
          },
          update: {},
        });
        await transaction.publisherAuthorFollow.upsert({
          where: {
            publisherId_authorId: {
              authorId: author.id,
              publisherId: publisher.id,
            },
          },
          create: {
            authorId: author.id,
            publisherId: publisher.id,
          },
          update: {},
        });
      }
    }

    await transaction.auditLog.create({
      data: {
        action: "profile_updated",
        actorId: input.actorId,
        entityType: "DemoWriterLevels",
        metadata: JSON.stringify({
          levels: demoWriterLevels.length,
          source: "system_management_demo_showcase",
        }),
      },
    });
  }, { timeout: 30_000 });
}
