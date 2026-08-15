import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorkLatestComments } from "@/features/reader/comments";
import { getFavoriteStatus } from "@/features/reader/favorites";
import { getReadingProgress } from "@/features/reading/progress";
import { BookShowcase } from "@/features/showcase/components/BookShowcase";
import { getPublicWorkBySlug } from "@/features/works/queries";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isBlockedPublicWorkSlug } from "@/lib/public-content-safety";

const baseUrl = "https://ilkoku.com";

type BookShowcasePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

function getSafeReturnPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/kesfet";
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

export async function generateMetadata({ params }: Pick<BookShowcasePageProps, "params">): Promise<Metadata> {
  const { slug } = await params;

  if (isBlockedPublicWorkSlug(slug)) {
    return {
      title: "Eser bulunamadı | İlkOku",
      robots: { index: false, follow: false },
    };
  }

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

  const work = await getPublicWorkBySlug(slug);
  if (!work) notFound();

  const comments = await getWorkLatestComments(work.id);

  const user = await getCurrentUser();
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
  const bookSchema = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: work.title,
    description: getSeoDescription(work.description, work.title, work.authorName),
    url: `${baseUrl}/kitap/${work.slug}`,
    inLanguage: work.language || "tr",
    genre: work.genre || undefined,
    image: cover || undefined,
    datePublished: work.publishedAt?.toISOString(),
    dateModified: work.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: work.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "İlkOku",
      url: baseUrl,
    },
    isAccessibleForFree: true,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(bookSchema).replace(/</g, "\\u003c"),
        }}
      />
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
