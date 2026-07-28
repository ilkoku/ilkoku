import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Yazar Keşfet | İlkOku",
  description: "İlkOku'da yayımlanmış eseri bulunan yazarları keşfedin.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type SearchParams = Promise<{
  q?: string;
  tur?: string;
  sehir?: string;
  page?: string;
}>;

function pageHref(q: string, genre: string, city: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (genre) params.set("tur", genre);
  if (city) params.set("sehir", city);
  params.set("page", String(page));
  return `/editor/yazarlar?${params.toString()}`;
}

function publicWriterName(writer: {
  displayName: string | null;
  username: string | null;
}) {
  return writer.displayName?.trim() || writer.username?.trim() || "İlkOku Yazarı";
}

function publicWriterAlias(writer: {
  displayName: string | null;
  username: string | null;
}) {
  if (writer.username?.trim()) {
    return writer.username.startsWith("@") ? writer.username : `@${writer.username}`;
  }

  const source = writer.displayName?.trim() || "ilkoku-yazari";
  const slug = source
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/gu, "-")
    .replace(/[^a-z0-9çğıöşü_-]/giu, "");

  return `@${slug || "ilkoku-yazari"}`;
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("") || "İY";
}

function parseGenres(value: string | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string").slice(0, 4);
    }
  } catch {
    // Eski kayıtlardaki virgülle ayrılmış türleri destekle.
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export default async function EditorWriterDiscoveryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireEditorProfile("/editor/yazarlar");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const genre = params.tur?.trim() ?? "";
  const city = params.sehir?.trim() ?? "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const publicWorkWhere: Prisma.WorkWhereInput = {
    archivedAt: null,
    status: "published",
    visibility: "public",
  };

  const filters: Prisma.UserWhereInput[] = [];

  if (q) {
    filters.push({
      OR: [
        { displayName: { contains: q } },
        { username: { contains: q } },
        { bio: { contains: q } },
        { works: { some: { ...publicWorkWhere, title: { contains: q } } } },
      ],
    });
  }

  if (genre) {
    filters.push({
      OR: [
        { profile: { is: { writingGenres: { contains: genre } } } },
        { works: { some: { ...publicWorkWhere, genre: { contains: genre } } } },
      ],
    });
  }

  if (city) {
    filters.push({
      profile: {
        is: {
          city: { contains: city },
        },
      },
    });
  }

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    role: "writer",
    status: "active",
    works: {
      some: publicWorkWhere,
    },
    ...(filters.length > 0 ? { AND: filters } : {}),
  };

  const filteredCount = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const writers = await prisma.user.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      bio: true,
      profile: {
        select: {
          city: true,
          writingGenres: true,
        },
      },
      works: {
        where: publicWorkWhere,
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        take: 4,
        select: {
          id: true,
          title: true,
          slug: true,
          genre: true,
          publishedAt: true,
          _count: {
            select: {
              chapters: true,
              comments: true,
              favorites: true,
              readingProgress: true,
            },
          },
        },
      },
      _count: {
        select: {
          works: {
            where: publicWorkWhere,
          },
          feedbackReceived: true,
        },
      },
    },
  });

  const first = filteredCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const last = Math.min(safePage * PAGE_SIZE, filteredCount);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace editor-writers-page">
        <EditorPageHeader
          description="Yalnızca yayımlanmış eseri bulunan yazarların herkese açık profil bilgilerini ve eserlerini inceleyin."
          title="Yazar Keşfet"
        />

        <form className="editor-writer-filters" method="get">
          <label>
            <span>Yazar veya eser ara</span>
            <input defaultValue={q} name="q" placeholder="Rumuz, biyografi veya eser adı" type="search" />
          </label>
          <label>
            <span>Tür</span>
            <input defaultValue={genre} name="tur" placeholder="Örn. Roman" />
          </label>
          <label>
            <span>Şehir</span>
            <input defaultValue={city} name="sehir" placeholder="Örn. İstanbul" />
          </label>
          <button className="button button--primary" type="submit">Filtrele</button>
          {(q || genre || city) && (
            <Link className="button button--ghost" href="/editor/yazarlar">Temizle</Link>
          )}
        </form>

        {writers.length === 0 ? (
          <div className="editor-empty">
            <h2>Eşleşen yazar bulunamadı</h2>
            <p>Arama veya filtreleri değiştirerek yeniden deneyin.</p>
          </div>
        ) : (
          <section className="editor-writer-grid" aria-label="Yazarlar">
            {writers.map((writer) => {
              const name = publicWriterName(writer);
              const genres = parseGenres(writer.profile?.writingGenres ?? null);

              return (
                <article className="editor-writer-card" key={writer.id}>
                  <header className="editor-writer-card__header">
                    <div className="editor-writer-avatar" aria-hidden="true">
                      {initials(name)}
                    </div>
                    <div>
                      <span>{publicWriterAlias(writer)}</span>
                      <h2>{name}</h2>
                      <p>{writer.profile?.city || "Şehir belirtilmedi"}</p>
                    </div>
                  </header>

                  <p className="editor-writer-card__bio">
                    {writer.bio?.trim() || "Bu yazar henüz kısa bir biyografi eklemedi."}
                  </p>

                  {genres.length > 0 && (
                    <div className="editor-writer-card__genres" aria-label="Yazı türleri">
                      {genres.map((item) => <span key={item}>{item}</span>)}
                    </div>
                  )}

                  <dl className="editor-writer-card__stats">
                    <div><dt>Yayımlanmış eser</dt><dd>{writer._count.works}</dd></div>
                    <div><dt>Editör görüşü</dt><dd>{writer._count.feedbackReceived}</dd></div>
                  </dl>

                  <div className="editor-writer-card__works">
                    <div className="editor-writer-card__works-heading">
                      <span>Yayımlanmış eserler</span>
                      <small>Son {writer.works.length} eser</small>
                    </div>
                    <ul>
                      {writer.works.map((work) => (
                        <li key={work.id}>
                          <Link href={`/kitap/${work.slug}`}>
                            <strong>{work.title}</strong>
                            <span>{work.genre || "Tür belirtilmedi"}</span>
                            <small>
                              {work._count.chapters} bölüm · {work._count.readingProgress} okur · {work._count.favorites} beğeni · {work._count.comments} yorum
                            </small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <footer className="editor-writer-pagination" aria-label="Sayfalama">
          <span>{filteredCount} yazardan {first}–{last} arası gösteriliyor.</span>
          <div>
            {safePage > 1 && (
              <Link className="button button--ghost" href={pageHref(q, genre, city, safePage - 1)}>Önceki</Link>
            )}
            <strong>{safePage} / {totalPages}</strong>
            {safePage < totalPages && (
              <Link className="button button--ghost" href={pageHref(q, genre, city, safePage + 1)}>Sonraki</Link>
            )}
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
