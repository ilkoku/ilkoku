import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { enforceAdultWorkGate } from "@/features/adult-content/work-gate";
import { getWorkLatestComments } from "@/features/reader/comments";
import { getFavoriteStatus } from "@/features/reader/favorites";
import { getEstimatedBookPageRanges } from "@/features/reading/metrics";
import { getReadingProgress } from "@/features/reading/progress";
import { BookShowcase } from "@/features/showcase/components/BookShowcase";
import { getMemberPublicWorkBySlug } from "@/features/works/member-public-queries";
import { getPublicWorkBySlug } from "@/features/works/queries";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isBlockedPublicWorkSlug } from "@/lib/public-content-safety";

const baseUrl = "https://ilkoku.com";
const MAX_RETURN_PATH_LENGTH = 1500;

type BookShowcasePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

function getSafeReturnPath(value: string | undefined) {
  if (
    !value ||
    value.length > MAX_RETURN_PATH_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/eserler";
  }

  return value;
}

function getSeoDescription(description: string | null, title: string, authorName: string) {
  const fallback = `${title}, ${authorName} tarafından İlkOku'da yayımlanan bir eser.`;
  const value = description?.trim() || fallback;

  return value.length > 160 ? `${value.slice(0, 157).trimEnd()}...` : value;
}

function absoluteUrl(value: string | null) {
  if (!value) return null;

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: BookShowcasePageProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  if (isBlockedPublicWorkSlug(slug)) {
    return {
      title: "Eser bulunamadı | İlkOku",
      robots: { index: false, follow: false },
    };
  }

  // Metadata deliberately stays on the anonymous-safe query so 18+ works are not indexed.
  const work = await getPublicWorkBySlug(slug);

  if (!work) {
    return {
      title: "Eser bulunamadı | İlkOku",
      robots: { index: false, follow: false },
    };
  }

  const title = `${work.title} — ${work.authorName} | İlkOku`;
  const description = getSeoDescription(work.description, work.title, work.authorName);
  const canonical = `/kitap/${work.slug}`;
  const cover = absoluteUrl(work.coverUrl);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: !query.from,
      follow: true,
    },
    openGraph: {
      type: "article",
      locale: "tr_TR",
      url: canonical,
      title,
      description,
      publishedTime: work.publishedAt?.toISOString(),
      modifiedTime: work.updatedAt.toISOString(),
      images: cover ? [{ url: cover, alt: `${work.title} kapak görseli` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function DynamicBookShowcasePage({
  params,
  searchParams,
}: BookShowcasePageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const returnTo = getSafeReturnPath(query.from);

  if (isBlockedPublicWorkSlug(slug)) notFound();

  const user = await getCurrentUser();
  const directReturnTo = `/kitap/${slug}${query.from ? `?from=${encodeURIComponent(returnTo)}` : ""}`;
  await enforceAdultWorkGate({
    returnTo: directReturnTo,
    slug,
    user,
  });

  const work = await getMemberPublicWorkBySlug(slug, user?.id ?? null);
  if (!work) notFound();

  const comments = await getWorkLatestComments(work.id);

  const readerUser =
    user && (user.role === "reader" || user.role === "editor")
      ? user
      : null;

  const readingProgress = readerUser
    ? await getReadingProgress(readerUser.id, work.id)
    : null;

  const isFavorite = readerUser
    ? await getFavoriteStatus(readerUser.id, work.id)
    : false;

  const cover = absoluteUrl(work.coverUrl);
  const estimatedBookPages = getEstimatedBookPageRanges(
    work.chapters,
  ).totalPages;
  const bookSchema = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: work.title,
    description: getSeoDescription(work.description, work.title, work.authorName),
    url: `${baseUrl}/kitap/${work.slug}`,
    inLanguage: work.language || "tr",
    genre: work.genre || undefined,
    image: cover || undefined,
    numberOfPages: estimatedBookPages,
    datePublished: work.publishedAt?.toISOString(),
    dateModified: work.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: work.authorName,
      url: `${baseUrl}/yazarlar/${work.authorPublicId}`,
    },
    publisher: {
      "@type": "Organization",
      name: "İlkOku",
      url: baseUrl,
    },
    isAccessibleForFree: true,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Eserler",
        item: `${baseUrl}/eserler`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: work.authorName,
        item: `${baseUrl}/yazarlar/${work.authorPublicId}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: work.title,
        item: `${baseUrl}/kitap/${work.slug}`,
      },
    ],
  };

  return (
    <>
      {work.contentRating !== "adult_18" ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([bookSchema, breadcrumbSchema]).replace(
              /</g,
              "\\u003c",
            ),
          }}
        />
      ) : null}
      <BookShowcase
        canFavorite={Boolean(readerUser)}
        comments={comments}
        isFavorite={isFavorite}
        readingProgress={readingProgress}
        returnTo={returnTo}
        work={work}
      />
    </>
  );
}
