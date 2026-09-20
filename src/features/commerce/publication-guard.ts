import "server-only";

import { prisma } from "@/lib/prisma";
import { hasOperationalPaymentProvider } from "./payment-providers";
import { isCommerceCheckoutEnabled } from "./runtime";

export async function assertPaidWorkAccessPlanReadyForPublication(input: {
  authorId: string;
  workId: string;
}) {
  const paymentPathReady =
    isCommerceCheckoutEnabled() && hasOperationalPaymentProvider();

  const work = await prisma.work.findFirst({
    where: {
      id: input.workId,
      authorId: input.authorId,
      archivedAt: null,
    },
    select: {
      saleConfiguration: {
        select: {
          saleModel: true,
          status: true,
          activatedAt: true,
        },
      },
      chapters: {
        where: {
          archivedAt: null,
        },
        select: {
          id: true,
          title: true,
          commerceAccess: {
            select: {
              accessType: true,
            },
          },
        },
      },
    },
  });

  const configuration = work?.saleConfiguration;
  if (!work || !configuration) {
    return;
  }

  const previouslyActivatedPaid = Boolean(configuration.activatedAt);
  if (configuration.saleModel !== "paid" && !previouslyActivatedPaid) {
    return;
  }

  if (!paymentPathReady && !previouslyActivatedPaid) {
    return;
  }

  const missing = work.chapters.filter((chapter) => !chapter.commerceAccess);

  if (missing.length > 0) {
    const firstMissing = missing[0];
    throw new Error(
      firstMissing
        ? `Ücretli eserde "${firstMissing.title}" bölümü için Ön İzleme veya Kilitli erişim seçimi yapılmadan yayınlama tamamlanamaz. Satış & Erişim alanında bölüm erişimini belirle.`
        : "Ücretli eserin bölüm erişim planı tamamlanmadan yayınlama yapılamaz.",
    );
  }
}
