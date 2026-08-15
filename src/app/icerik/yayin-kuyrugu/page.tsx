import Link from "next/link";
import {
  publishHomepageFooterAction,
  publishHomepageHeroAction,
  publishHomepagePassportAction,
  publishHomepageRolesAction,
  publishHomepageWhyAction,
} from "@/features/cms/actions";
import { saveCmsDocumentAction } from "@/features/cms/document-actions";
import { publishFaqAction } from "@/features/cms/faq-actions";
import { saveCmsGuideAction } from "@/features/cms/guide-actions";
import { saveCmsPageAction } from "@/features/cms/page-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import type { CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ActorRow = {
  actorName: string | null;
  actorEmail: string | null;
};

type StagedRow = ActorRow & {
  contentKey: string;
  valueJson: string;
  updatedAt: Date;
};

type PageRow = ActorRow & {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  noIndex: boolean;
  updatedAt: Date;
};

type FaqRow = ActorRow & {
  namespace: string;
  contentKey: string;
  valueJson: string;
  updatedAt: Date;
};

type Payload = Record<string, unknown>;
type PublishAction = (formData: FormData) => Promise<void>;

type QueueItem = {
  key: string;
  kind: "homepage" | "faq" | "legal" | "guide" | "page";
  title: string;
  detail: string;
  locale: CmsLocaleCode;
  stage: "working" | "initial";
  updatedAt: Date;
  actor: string;
  editHref: string;
  previewHref: string;
  publish:
    | { type: "homepage"; action: PublishAction; locale: CmsLocaleCode }
    | { type: "faq"; locale: CmsLocaleCode; contentKey: string }
    | { type: "legal"; locale: CmsLocaleCode; slug: string; payload: Payload }
    | { type: "guide"; locale: CmsLocaleCode; id: string; slug: string; payload: Payload }
    | { type: "page"; locale: CmsLocaleCode; id: string; slug: string; payload: Payload };
};

const homepageActions: Record<string, PublishAction> = {
  hero: publishHomepageHeroAction,
  roles: publishHomepageRolesAction,
  passport: publishHomepagePassportAction,
  why: publishHomepageWhyAction,
  footer: publishHomepageFooterAction,
};

const homepageLabels: Record<string, string> = {
  hero: "Ana Sayfa · Hero",
  roles: "Ana Sayfa · Rol seçimi",
  passport: "Ana Sayfa · Eser Pasaportu",
  why: "Ana Sayfa · Neden İlkOku",
  footer: "Ana Sayfa · Footer",
};

function parse(valueJson: string): Payload {
  try {
    const value = JSON.parse(valueJson) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Payload : {};
  } catch {
    return {};
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function bool(value: unknown) {
  return value === true;
}

function actor(row: ActorRow) {
  return row.actorName || row.actorEmail || "Sistem";
}

function localeFromPageKey(contentKey: string): CmsLocaleCode {
  return contentKey.startsWith("legal:en:") || contentKey.startsWith("guide:en:") || contentKey.startsWith("page:en:") ? "en" : "tr";
}

function legalSlug(contentKey: string) {
  const parts = contentKey.split(":");
  return parts[1] === "en" ? parts[2] || "" : parts[1] || "";
}

function guideSlugPart(slug: string, locale: CmsLocaleCode) {
  return locale === "en" ? slug.replace(/^\/en\/rehber\//, "") : slug.replace(/^\/rehber\//, "");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function PublishButton({ item, enabled }: { item: QueueItem; enabled: boolean }) {
  if (!enabled) return <span className="content-form-help">{item.locale === "en" ? "EN yayın kilitli" : "Yayın yetkisi gerekli"}</span>;

  if (item.publish.type === "homepage") {
    const action = item.publish.action;
    return <form action={action}><input type="hidden" name="locale" value={item.publish.locale} /><button type="submit">Yayınla</button></form>;
  }

  if (item.publish.type === "faq") {
    return (
      <form action={publishFaqAction}>
        <input type="hidden" name="locale" value={item.publish.locale} />
        <input type="hidden" name="contentKey" value={item.publish.contentKey} />
        <button type="submit">Yayınla</button>
      </form>
    );
  }

  if (item.publish.type === "legal") {
    const payload = item.publish.payload;
    return (
      <form action={saveCmsDocumentAction}>
        <input type="hidden" name="mode" value="publish" />
        <input type="hidden" name="locale" value={item.publish.locale} />
        <input type="hidden" name="slug" value={item.publish.slug} />
        <input type="hidden" name="title" value={text(payload.title)} />
        <input type="hidden" name="description" value={text(payload.description)} />
        <input type="hidden" name="updatedLabel" value={text(payload.updatedLabel)} />
        <input type="hidden" name="body" value={text(payload.body)} />
        <button type="submit">Yayınla</button>
      </form>
    );
  }

  if (item.publish.type === "page") {
    const payload = item.publish.payload;
    return (
      <form action={saveCmsPageAction}>
        <input type="hidden" name="mode" value="publish" />
        <input type="hidden" name="id" value={item.publish.id} />
        <input type="hidden" name="slug" value={item.publish.slug} />
        <input type="hidden" name="title" value={text(payload.title)} />
        <input type="hidden" name="summary" value={text(payload.summary)} />
        <input type="hidden" name="body" value={text(payload.body)} />
        <input type="hidden" name="seoTitle" value={text(payload.seoTitle)} />
        <input type="hidden" name="seoDescription" value={text(payload.seoDescription)} />
        {bool(payload.noIndex) ? <input type="hidden" name="noIndex" value="on" /> : null}
        <button type="submit">Yayınla</button>
      </form>
    );
  }

  const payload = item.publish.payload;
  return (
    <form action={saveCmsGuideAction}>
      <input type="hidden" name="mode" value="publish" />
      <input type="hidden" name="id" value={item.publish.id} />
      <input type="hidden" name="locale" value={item.publish.locale} />
      <input type="hidden" name="slug" value={item.publish.slug} />
      <input type="hidden" name="title" value={text(payload.title)} />
      <input type="hidden" name="summary" value={text(payload.summary)} />
      <input type="hidden" name="body" value={text(payload.body)} />
      <input type="hidden" name="seoTitle" value={text(payload.seoTitle)} />
      <input type="hidden" name="seoDescription" value={text(payload.seoDescription)} />
      {bool(payload.noIndex) ? <input type="hidden" name="noIndex" value="on" /> : null}
      <button type="submit">Yayınla</button>
    </form>
  );
}

export default async function PublishQueuePage() {
  const access = await requireCmsManager("/icerik/yayin-kuyrugu");
  const [trEnabled, enEnabled] = await Promise.all([isCmsLocaleEnabled("tr"), isCmsLocaleEnabled("en")]);
  const localeEnabled: Record<CmsLocaleCode, boolean> = { tr: trEnabled, en: enEnabled };

  let staged: StagedRow[] = [];
  let pages: PageRow[] = [];
  let draftFaqs: FaqRow[] = [];

  try {
    [staged, pages, draftFaqs] = await Promise.all([
      prisma.$queryRaw<StagedRow[]>`
        SELECT s.contentKey, s.valueJson, s.updatedAt,
               COALESCE(u.displayName, u.fullName) AS actorName, u.email AS actorEmail
        FROM SiteContent s
        LEFT JOIN User u ON u.id = s.updatedById
        WHERE s.namespace = 'cms_draft' AND s.status = 'draft'
        ORDER BY s.updatedAt DESC
        LIMIT 500
      `,
      prisma.$queryRaw<PageRow[]>`
        SELECT p.id, p.contentKey, p.slug, p.title, p.status, p.bodyJson,
               p.seoTitle, p.seoDescription, p.noIndex, p.updatedAt,
               COALESCE(u.displayName, u.fullName) AS actorName, u.email AS actorEmail
        FROM ContentPage p
        LEFT JOIN User u ON u.id = p.updatedById
        WHERE (
          p.contentKey LIKE 'legal:%'
          OR p.contentKey LIKE 'guide:%'
          OR p.contentKey LIKE 'page:tr:%'
          OR p.contentKey LIKE 'page:en:%'
        )
          AND p.status <> 'archived'
        ORDER BY p.updatedAt DESC
        LIMIT 500
      `,
      prisma.$queryRaw<FaqRow[]>`
        SELECT s.namespace, s.contentKey, s.valueJson, s.updatedAt,
               COALESCE(u.displayName, u.fullName) AS actorName, u.email AS actorEmail
        FROM SiteContent s
        LEFT JOIN User u ON u.id = s.updatedById
        WHERE s.namespace IN ('faq', 'faq_en') AND s.status = 'draft'
        ORDER BY s.updatedAt DESC
        LIMIT 500
      `,
    ]);
  } catch {
    staged = [];
    pages = [];
    draftFaqs = [];
  }

  const pageMap = new Map(pages.map((page) => [page.id, page]));
  const items: QueueItem[] = [];

  for (const row of staged) {
    const payload = parse(row.valueJson);
    const parts = row.contentKey.split(":");

    if (parts[0] === "homepage" && (parts[1] === "tr" || parts[1] === "en")) {
      const locale = parts[1] as CmsLocaleCode;
      const section = parts.slice(2).join(":");
      const action = homepageActions[section];
      if (!action) continue;
      items.push({
        key: `staged-${row.contentKey}`,
        kind: "homepage",
        title: homepageLabels[section] || `Ana Sayfa · ${section}`,
        detail: text(payload.title) || text(payload.slogan) || "Çalışma taslağı",
        locale,
        stage: "working",
        updatedAt: row.updatedAt,
        actor: actor(row),
        editHref: `/icerik/ana-sayfa?dil=${locale}`,
        previewHref: `/icerik/onizleme/ana-sayfa?dil=${locale}`,
        publish: { type: "homepage", action, locale },
      });
      continue;
    }

    if (parts[0] === "faq" && (parts[1] === "tr" || parts[1] === "en")) {
      const locale = parts[1] as CmsLocaleCode;
      const contentKey = parts.slice(2).join(":");
      if (!contentKey.startsWith("item_")) continue;
      items.push({
        key: `staged-${row.contentKey}`,
        kind: "faq",
        title: text(payload.question) || "SSS taslağı",
        detail: `${text(payload.category) || "Genel"} · mevcut yayındaki kaydın çalışma taslağı`,
        locale,
        stage: "working",
        updatedAt: row.updatedAt,
        actor: actor(row),
        editHref: `/icerik/sss?dil=${locale}`,
        previewHref: `/icerik/onizleme/sss?dil=${locale}`,
        publish: { type: "faq", locale, contentKey },
      });
      continue;
    }

    if (parts[0] === "page") {
      const pageId = parts.slice(1).join(":");
      const page = pageMap.get(pageId);
      if (!page) continue;
      const locale = localeFromPageKey(page.contentKey);

      if (page.contentKey.startsWith("legal:")) {
        const slug = legalSlug(page.contentKey);
        items.push({
          key: `staged-${row.contentKey}`,
          kind: "legal",
          title: text(payload.title) || page.title,
          detail: "Yayındaki yasal metnin çalışma taslağı",
          locale,
          stage: "working",
          updatedAt: row.updatedAt,
          actor: actor(row),
          editHref: `/icerik/yasal/${slug}?dil=${locale}`,
          previewHref: `/icerik/onizleme/yasal/${slug}?dil=${locale}`,
          publish: { type: "legal", locale, slug, payload },
        });
      } else if (page.contentKey.startsWith("guide:")) {
        const slug = guideSlugPart(page.slug, locale);
        items.push({
          key: `staged-${row.contentKey}`,
          kind: "guide",
          title: text(payload.title) || page.title,
          detail: "Yayındaki rehberin çalışma taslağı",
          locale,
          stage: "working",
          updatedAt: row.updatedAt,
          actor: actor(row),
          editHref: `/icerik/rehber/${page.id}?dil=${locale}`,
          previewHref: `/icerik/onizleme/rehber/${page.id}?dil=${locale}`,
          publish: { type: "guide", locale, id: page.id, slug, payload },
        });
      } else if (page.contentKey.startsWith("page:")) {
        items.push({
          key: `staged-${row.contentKey}`,
          kind: "page",
          title: text(payload.title) || page.title,
          detail: "Yayındaki kurumsal sayfanın çalışma taslağı",
          locale,
          stage: "working",
          updatedAt: row.updatedAt,
          actor: actor(row),
          editHref: `/icerik/sayfalar/${page.id}`,
          previewHref: `/icerik/onizleme/sayfa/${page.id}`,
          publish: { type: "page", locale, id: page.id, slug: page.slug.replace(/^\//, ""), payload },
        });
      }
    }
  }

  for (const page of pages.filter((item) => item.status === "draft")) {
    const locale = localeFromPageKey(page.contentKey);
    const body = parse(page.bodyJson);
    if (page.contentKey.startsWith("legal:")) {
      const slug = legalSlug(page.contentKey);
      const payload: Payload = {
        title: page.title,
        description: text(body.description) || page.seoDescription || "",
        updatedLabel: text(body.updatedLabel),
        body: text(body.body),
      };
      items.push({
        key: `initial-page-${page.id}`,
        kind: "legal",
        title: page.title,
        detail: "Henüz ilk kez yayınlanmamış yasal sayfa",
        locale,
        stage: "initial",
        updatedAt: page.updatedAt,
        actor: actor(page),
        editHref: `/icerik/yasal/${slug}?dil=${locale}`,
        previewHref: `/icerik/onizleme/yasal/${slug}?dil=${locale}`,
        publish: { type: "legal", locale, slug, payload },
      });
    } else if (page.contentKey.startsWith("guide:")) {
      const slug = guideSlugPart(page.slug, locale);
      const payload: Payload = {
        title: page.title,
        summary: text(body.summary),
        body: text(body.body),
        seoTitle: page.seoTitle || "",
        seoDescription: page.seoDescription || "",
        noIndex: Boolean(page.noIndex),
      };
      items.push({
        key: `initial-page-${page.id}`,
        kind: "guide",
        title: page.title,
        detail: "Henüz ilk kez yayınlanmamış rehber",
        locale,
        stage: "initial",
        updatedAt: page.updatedAt,
        actor: actor(page),
        editHref: `/icerik/rehber/${page.id}?dil=${locale}`,
        previewHref: `/icerik/onizleme/rehber/${page.id}?dil=${locale}`,
        publish: { type: "guide", locale, id: page.id, slug, payload },
      });
    } else if (page.contentKey.startsWith("page:")) {
      const payload: Payload = {
        title: page.title,
        summary: text(body.summary),
        body: text(body.body),
        seoTitle: page.seoTitle || "",
        seoDescription: page.seoDescription || "",
        noIndex: Boolean(page.noIndex),
      };
      items.push({
        key: `initial-page-${page.id}`,
        kind: "page",
        title: page.title,
        detail: "Henüz ilk kez yayınlanmamış kurumsal sayfa",
        locale,
        stage: "initial",
        updatedAt: page.updatedAt,
        actor: actor(page),
        editHref: `/icerik/sayfalar/${page.id}`,
        previewHref: `/icerik/onizleme/sayfa/${page.id}`,
        publish: { type: "page", locale, id: page.id, slug: page.slug.replace(/^\//, ""), payload },
      });
    }
  }

  for (const row of draftFaqs) {
    const payload = parse(row.valueJson);
    const locale: CmsLocaleCode = row.namespace === "faq_en" ? "en" : "tr";
    items.push({
      key: `initial-faq-${row.namespace}-${row.contentKey}`,
      kind: "faq",
      title: text(payload.question) || "SSS taslağı",
      detail: `${text(payload.category) || "Genel"} · henüz ilk kez yayınlanmamış`,
      locale,
      stage: "initial",
      updatedAt: row.updatedAt,
      actor: actor(row),
      editHref: `/icerik/sss?dil=${locale}`,
      previewHref: `/icerik/onizleme/sss?dil=${locale}`,
      publish: { type: "faq", locale, contentKey: row.contentKey },
    });
  }

  items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const trCount = items.filter((item) => item.locale === "tr").length;
  const enCount = items.filter((item) => item.locale === "en").length;
  const workingCount = items.filter((item) => item.stage === "working").length;
  const publishableCount = items.filter((item) => access.canPublish && localeEnabled[item.locale]).length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Yayın Akışı</span>
          <h1>Yayın Kuyruğu</h1>
          <p>Bekleyen çalışma taslaklarını ve ilk yayınını bekleyen içerikleri tek merkezden inceleyin, önizleyin ve yetkiniz varsa yayınlayın.</p>
        </div>
      </div>

      <div className="content-metric-grid">
        <article className="content-metric-card"><span>Toplam</span><strong>{items.length}</strong><small>bekleyen içerik</small></article>
        <article className="content-metric-card"><span>TR</span><strong>{trCount}</strong><small>canlı dil kuyruğu</small></article>
        <article className="content-metric-card"><span>Çalışma taslağı</span><strong>{workingCount}</strong><small>canlı sürümü korunan</small></article>
        <article className="content-metric-card"><span>Yayınlanabilir</span><strong>{publishableCount}</strong><small>{access.canPublish ? "yetki + aktif dil" : "yayın yetkisi yok"}</small></article>
      </div>

      {enCount > 0 && !enEnabled ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>EN kuyruğu pasif tutuluyor.</strong>
          <p>{enCount} İngilizce taslak hazırlanmış durumda; EN public dili kapalı olduğu için bu kayıtlar kuyrukta kalır ve yayınlanamaz.</p>
        </div>
      ) : null}

      <div className="content-panel">
        <div className="content-dashboard-section-title">
          <div><span>Bekleyenler</span><h2>İnceleme ve yayın</h2></div>
          <small>En yeni önce</small>
        </div>

        {items.length === 0 ? (
          <div className="content-empty"><strong>Yayın kuyruğu boş.</strong><p>Yeni veya bekleyen bir taslak oluştuğunda burada görünecek.</p></div>
        ) : (
          <div className="content-list">
            {items.map((item) => {
              const enabled = access.canPublish && localeEnabled[item.locale];
              return (
                <div className="content-list-row" key={item.key} style={{ alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <small>{item.kind.toUpperCase()} · {item.locale.toUpperCase()} · {item.stage === "working" ? "Çalışma taslağı" : "İlk yayın"}</small>
                    <strong style={{ display: "block", marginTop: ".25rem" }}>{item.title}</strong>
                    <p style={{ margin: ".35rem 0 0" }}>{item.detail}</p>
                    <small>{formatDate(item.updatedAt)} · {item.actor}</small>
                  </div>
                  <div className="content-form-actions" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <Link href={item.previewHref}>Önizle</Link>
                    <Link href={item.editHref}>Düzenle</Link>
                    <PublishButton item={item} enabled={enabled} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
