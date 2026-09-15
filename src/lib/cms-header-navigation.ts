import { EDITOR_EDUCATION_CATEGORIES, editorEducationPublicPath } from "@/lib/editor-education";
import { GENRES } from "@/lib/genres";
import { READER_EDUCATION_CATEGORIES, readerEducationPublicPath } from "@/lib/reader-education";
import { WRITING_CATEGORY_HUBS } from "@/lib/writing-category-hubs";

export const HEADER_NAV_LIVE_KEY = "header_navigation";
export const HEADER_NAV_DRAFT_KEY = "header_navigation_draft";

export type SiteMapPage = {
  id: string;
  label: string;
  href: string;
  area: string;
  group: string;
  kind: "page" | "education" | "action";
};

export type HeaderNavigationLink = {
  pageId: string;
  label?: string;
  primary?: boolean;
};

export type HeaderNavigationGroup = {
  id: string;
  title: string;
  links: HeaderNavigationLink[];
};

export type HeaderNavigationMenu = {
  id: string;
  label: string;
  groups: HeaderNavigationGroup[];
};

export type HeaderNavigationPayload = {
  menus: HeaderNavigationMenu[];
};

const basePages: SiteMapPage[] = [
  { id: "home", label: "Ana Sayfa", href: "/", area: "İlkOku", group: "Platform", kind: "page" },
  { id: "writers-home", label: "Yazarlar İçin", href: "/yazarlar-icin", area: "Yazar", group: "Başlangıç", kind: "page" },
  { id: "writer-register", label: "Yazar Ol", href: "/kayit?rol=writer", area: "Yazar", group: "Başlangıç", kind: "action" },
  { id: "reader-register", label: "Okuyucu Ol", href: "/kayit?rol=reader", area: "Okur", group: "Başlangıç", kind: "action" },
  { id: "editors-home", label: "Editörler İçin", href: "/editorler-icin", area: "Editör", group: "Başlangıç", kind: "page" },
  { id: "editors", label: "Editörler", href: "/editorler", area: "Editör", group: "Başlangıç", kind: "page" },
  { id: "editor-register", label: "Editör Başvurusu", href: "/kayit?rol=editor", area: "Editör", group: "Başlangıç", kind: "action" },
  { id: "publishers-home", label: "Yayınevleri İçin", href: "/yayinevleri-icin", area: "Yayınevi", group: "Başlangıç", kind: "page" },
  { id: "publisher-register", label: "Yayınevi Ol", href: "/kayit?rol=publisher", area: "Yayınevi", group: "Başlangıç", kind: "action" },
  { id: "about", label: "Hakkımızda", href: "/hakkimizda", area: "İlkOku", group: "Platform", kind: "page" },
  { id: "how-it-works", label: "Nasıl Çalışır?", href: "/nasil-calisir", area: "İlkOku", group: "Platform", kind: "page" },
  { id: "editorial-standards", label: "Editoryal Standartlar", href: "/editoryal-standartlar", area: "İlkOku", group: "Güven", kind: "page" },
  { id: "content-age", label: "İçerik ve Yaş Politikası", href: "/icerik-ve-yas-politikasi", area: "İlkOku", group: "Güven", kind: "page" },
  { id: "community-rules", label: "Topluluk Kuralları", href: "/topluluk-kurallari", area: "İlkOku", group: "Güven", kind: "page" },
  { id: "copyright", label: "Telif Bildirimi", href: "/telif-bildirimi", area: "İlkOku", group: "Güven", kind: "page" },
  { id: "help", label: "Yardım Merkezi", href: "/yardim", area: "Destek", group: "Destek", kind: "page" },
  { id: "contact", label: "İletişim", href: "/iletisim", area: "Destek", group: "Destek", kind: "page" },
];

const writerHubPages: SiteMapPage[] = WRITING_CATEGORY_HUBS.map((hub) => ({
  id: `writer-hub:${hub.slug}`,
  label: hub.title,
  href: hub.href,
  area: "Yazar",
  group: "Yazarlık Okulu",
  kind: "education" as const,
}));

const hubByCategory = new Map(WRITING_CATEGORY_HUBS.map((hub) => [hub.category, hub]));
const writerGenrePages: SiteMapPage[] = GENRES.flatMap((genre) => {
  const hub = hubByCategory.get(genre.category);
  if (!hub) return [];
  return [{
    id: `writer-genre:${genre.slug}`,
    label: genre.label,
    href: `${hub.href}/${genre.slug}`,
    area: "Yazar",
    group: hub.title,
    kind: "education" as const,
  }];
});

const readerPages: SiteMapPage[] = READER_EDUCATION_CATEGORIES.map((category) => ({
  id: `reader-education:${category.slug}`,
  label: category.title,
  href: readerEducationPublicPath(category),
  area: "Okur",
  group: "Okurluk Okulu",
  kind: "education" as const,
}));

const editorPages: SiteMapPage[] = EDITOR_EDUCATION_CATEGORIES.filter((category) => category.live).map((category) => ({
  id: `editor-education:${category.slug}`,
  label: category.title,
  href: editorEducationPublicPath(category),
  area: "Editör",
  group: "Editörlük Okulu",
  kind: "education" as const,
}));

export const SITE_MAP_PAGES: readonly SiteMapPage[] = [
  ...basePages,
  ...writerHubPages,
  ...writerGenrePages,
  ...readerPages,
  ...editorPages,
];

const siteMapById = new Map(SITE_MAP_PAGES.map((page) => [page.id, page]));

export function getSiteMapPage(pageId: string) {
  return siteMapById.get(pageId) ?? null;
}

function link(pageId: string, primary = false): HeaderNavigationLink {
  return { pageId, ...(primary ? { primary: true } : {}) };
}

const readerMidpoint = Math.ceil(READER_EDUCATION_CATEGORIES.length / 2);
const liveEditorEducation = EDITOR_EDUCATION_CATEGORIES.filter((category) => category.live);
const editorMidpoint = Math.ceil(liveEditorEducation.length / 2);

export const defaultHeaderNavigation: HeaderNavigationPayload = {
  menus: [
    {
      id: "writer",
      label: "Yazar",
      groups: [
        { id: "writer-discover", title: "Yazarlığı keşfet", links: [link("writers-home", true), link("writer-register"), link("how-it-works")] },
        { id: "writer-school", title: "Yazarlık Okulu", links: WRITING_CATEGORY_HUBS.map((hub) => link(`writer-hub:${hub.slug}`)) },
        { id: "writer-featured", title: "Öne Çıkan Türler", links: ["roman", "oyku", "fantastik", "bilim-kurgu", "distopya"].map((slug) => link(`writer-genre:${slug}`)) },
      ],
    },
    {
      id: "reader",
      label: "Okur",
      groups: [
        { id: "reader-start", title: "Okurluğa başla", links: [link("reader-register", true), link(`reader-education:${READER_EDUCATION_CATEGORIES[0].slug}`)] },
        { id: "reader-school", title: "Okurluk Okulu", links: READER_EDUCATION_CATEGORIES.slice(0, readerMidpoint).map((category) => link(`reader-education:${category.slug}`)) },
        { id: "reader-advanced", title: "İleri okuma", links: READER_EDUCATION_CATEGORIES.slice(readerMidpoint).map((category) => link(`reader-education:${category.slug}`)) },
      ],
    },
    {
      id: "editor",
      label: "Editör",
      groups: [
        { id: "editor-discover", title: "Editörlüğü keşfet", links: [link("editors-home", true), link("editors"), link("editor-register"), link("editorial-standards")] },
        { id: "editor-school", title: "Editörlük Okulu", links: liveEditorEducation.slice(0, editorMidpoint).map((category) => link(`editor-education:${category.slug}`)) },
        { id: "editor-professional", title: "Profesyonel editörlük", links: liveEditorEducation.slice(editorMidpoint).map((category) => link(`editor-education:${category.slug}`)) },
      ],
    },
    {
      id: "publisher",
      label: "Yayınevi",
      groups: [
        { id: "publisher-start", title: "Yayınevleri için", links: [link("publishers-home", true), link("publisher-register")] },
        { id: "publisher-platform", title: "Platform", links: [link("how-it-works"), link("editorial-standards")] },
      ],
    },
    {
      id: "ilkoku",
      label: "İlkOku",
      groups: [
        { id: "ilkoku-about", title: "İlkOku'yu tanı", links: [link("about", true), link("how-it-works")] },
        { id: "ilkoku-trust", title: "Güven", links: [link("editorial-standards"), link("content-age"), link("community-rules"), link("copyright")] },
      ],
    },
    {
      id: "support",
      label: "Destek",
      groups: [{ id: "support-main", title: "Destek", links: [link("help", true), link("contact")] }],
    },
  ],
};

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseHeaderNavigation(valueJson: string): HeaderNavigationPayload | null {
  try {
    const parsed = JSON.parse(valueJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const rawMenus = (parsed as { menus?: unknown }).menus;
    if (!Array.isArray(rawMenus) || rawMenus.length < 1 || rawMenus.length > 8) return null;

    const menuIds = new Set<string>();
    const menus: HeaderNavigationMenu[] = [];
    for (const rawMenu of rawMenus) {
      if (!rawMenu || typeof rawMenu !== "object" || Array.isArray(rawMenu)) return null;
      const menuRecord = rawMenu as Record<string, unknown>;
      const id = text(menuRecord.id, 60);
      const label = text(menuRecord.label, 60);
      const rawGroups = menuRecord.groups;
      if (!id || !label || menuIds.has(id) || !Array.isArray(rawGroups) || rawGroups.length < 1 || rawGroups.length > 4) return null;
      menuIds.add(id);

      const groupIds = new Set<string>();
      const groups: HeaderNavigationGroup[] = [];
      for (const rawGroup of rawGroups) {
        if (!rawGroup || typeof rawGroup !== "object" || Array.isArray(rawGroup)) return null;
        const groupRecord = rawGroup as Record<string, unknown>;
        const groupId = text(groupRecord.id, 80);
        const title = text(groupRecord.title, 80);
        const rawLinks = groupRecord.links;
        if (!groupId || !title || groupIds.has(groupId) || !Array.isArray(rawLinks) || rawLinks.length > 24) return null;
        groupIds.add(groupId);

        const links: HeaderNavigationLink[] = [];
        const pageIds = new Set<string>();
        for (const rawLink of rawLinks) {
          if (!rawLink || typeof rawLink !== "object" || Array.isArray(rawLink)) return null;
          const linkRecord = rawLink as Record<string, unknown>;
          const pageId = text(linkRecord.pageId, 120);
          if (!pageId || !getSiteMapPage(pageId) || pageIds.has(pageId)) return null;
          pageIds.add(pageId);
          const customLabel = text(linkRecord.label, 80);
          links.push({ pageId, ...(customLabel ? { label: customLabel } : {}), ...(linkRecord.primary === true ? { primary: true } : {}) });
        }
        groups.push({ id: groupId, title, links });
      }
      menus.push({ id, label, groups });
    }
    return { menus };
  } catch {
    return null;
  }
}

export function resolveHeaderNavigation(payload: HeaderNavigationPayload) {
  return payload.menus.map((menu) => ({
    id: menu.id,
    label: menu.label,
    groups: menu.groups.map((group) => ({
      id: group.id,
      title: group.title,
      links: group.links.flatMap((item) => {
        const page = getSiteMapPage(item.pageId);
        if (!page) return [];
        return [{ href: page.href, label: item.label || page.label, primary: Boolean(item.primary), pageId: item.pageId }];
      }),
    })),
  }));
}

export function validateHeaderNavigation(payload: HeaderNavigationPayload) {
  const issues: string[] = [];
  if (payload.menus.length > 7) issues.push("Ana menü 7 başlıktan fazla olamaz.");
  for (const menu of payload.menus) {
    if (!menu.groups.some((group) => group.links.length > 0)) issues.push(`${menu.label}: en az bir bağlantı gerekli.`);
    for (const group of menu.groups) {
      if (group.links.length > 16) issues.push(`${menu.label} / ${group.title}: bir sütunda en fazla 16 bağlantı olabilir.`);
    }
  }
  return issues;
}
