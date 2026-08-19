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
import { publishRoleCardsAction } from "@/features/cms/role-card-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import type { CmsLocaleCode } from "@/lib/cms-locales";
import { parseCmsRoleCardsPayloadStrict } from "@/lib/cms-role-cards";
import { prisma } from "@/lib/prisma";
import styles from "../PublishingOperationsWorkbench.module.css";

export const dynamic = "force-dynamic";

type ActorRow = { actorName: string | null; actorEmail: string | null };
type StagedRow = ActorRow & { contentKey: string; valueJson: string; updatedAt: Date };
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
type FaqRow = ActorRow & { id: string; namespace: string; contentKey: string; valueJson: string; updatedAt: Date };
type SiteTargetRow = { id: string; namespace: string; contentKey: string; status: "draft" | "published" };
type Payload = Record<string, unknown>;
type PublishAction = (formData: FormData) => Promise<void>;
type QueueKind = "homepage" | "role-cards" | "faq" | "legal" | "guide" | "page" | "diagnostic";
type QueueStage = "working" | "initial" | "blocked";
type PublishSpec =
  | { type: "homepage"; action: PublishAction; locale: CmsLocaleCode }
  | { type: "role-cards"; locale: CmsLocaleCode }
  | { type: "faq"; locale: CmsLocaleCode; contentKey: string }
  | { type: "legal"; locale: CmsLocaleCode; slug: string; payload: Payload }
  | { type: "guide"; locale: CmsLocaleCode; id: string; slug: string; payload: Payload }
  | { type: "page"; locale: CmsLocaleCode; id: string; slug: string; payload: Payload };
type QueueItem = {
  key: string;
  kind: QueueKind;
  title: string;
  detail: string;
  locale: CmsLocaleCode;
  stage: QueueStage;
  updatedAt: Date;
  actor: string;
  editHref?: string;
  previewHref?: string;
  publish?: PublishSpec;
  blockedReason?: string;
  scheduleTarget?: string;
  scheduleNote?: string;
};

type QueueSources = {
  staged: StagedRow[];
  pages: PageRow[];
  draftFaqs: FaqRow[];
  siteTargets: SiteTargetRow[];
  localeEnabled: Record<CmsLocaleCode, boolean>;
};

type QueueSearchParams = Record<string, string | string[] | undefined>;

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
const kindLabels: Record<QueueKind, string> = {
  homepage: "Ana Sayfa",
  "role-cards": "Rol Kartları",
  faq: "SSS",
  legal: "Yasal",
  guide: "Rehber",
  page: "Kurumsal Sayfa",
  diagnostic: "Teşhis",
};

function parse(valueJson: string): Payload | null {
  try {
    const value = JSON.parse(valueJson) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Payload : null;
  } catch {
    return null;
  }
}
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function bool(value: unknown) { return value === true; }
function actor(row: ActorRow) { return row.actorName || row.actorEmail || "Sistem"; }
function param(params: QueueSearchParams, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
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
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}
function validFaq(payload: Payload) { return Boolean(text(payload.question) && text(payload.answer)); }
function validDocument(payload: Payload) { return Boolean(text(payload.title) && text(payload.body)); }
function stageLabel(stage: QueueStage) {
  if (stage === "working") return "Çalışma taslağı";
  if (stage === "initial") return "İlk yayın";
  return "Yayın kilitli";
}
function stageTone(stage: QueueStage) {
  if (stage === "working") return "working";
  if (stage === "initial") return "initial";
  return "blocked";
}
function queueHref(params: QueueSearchParams, patch: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const key of ["q", "durum", "dil", "tur", "sec"] as const) {
    const current = param(params, key);
    if (current) query.set(key, current);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  const suffix = query.toString();
  return suffix ? `/icerik/yayin-kuyrugu?${suffix}` : "/icerik/yayin-kuyrugu";
}
function diagnostic(row: StagedRow, detail: string, locale: CmsLocaleCode = "tr"): QueueItem {
  return {
    key: `diagnostic-${row.contentKey}`,
    kind: "diagnostic",
    title: row.contentKey,
    detail,
    locale,
    stage: "blocked",
    updatedAt: row.updatedAt,
    actor: actor(row),
    blockedReason: detail,
  };
}

async function loadQueueSources(): Promise<QueueSources | null> {
  try {
    const [trEnabled, enEnabled, staged, pages, draftFaqs, siteTargets] = await Promise.all([
      isCmsLocaleEnabled("tr"),
      isCmsLocaleEnabled("en"),
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
        ) AND p.status <> 'archived'
        ORDER BY p.updatedAt DESC
        LIMIT 500
      `,
      prisma.$queryRaw<FaqRow[]>`
        SELECT s.id, s.namespace, s.contentKey, s.valueJson, s.updatedAt,
               COALESCE(u.displayName, u.fullName) AS actorName, u.email AS actorEmail
        FROM SiteContent s
        LEFT JOIN User u ON u.id = s.updatedById
        WHERE s.namespace IN ('faq', 'faq_en') AND s.status = 'draft'
        ORDER BY s.updatedAt DESC
        LIMIT 500
      `,
      prisma.$queryRaw<SiteTargetRow[]>`
        SELECT id, namespace, contentKey, status
        FROM SiteContent
        WHERE namespace IN ('homepage', 'faq')
          AND status IN ('draft', 'published')
        LIMIT 500
      `,
    ]);
    return { staged, pages, draftFaqs, siteTargets, localeEnabled: { tr: trEnabled, en: enEnabled } };
  } catch {
    return null;
  }
}

function PublishButton({ item, enabled }: { item: QueueItem; enabled: boolean }) {
  if (!item.publish || item.stage === "blocked") {
    return <span className="content-form-help">Yayın kilitli</span>;
  }
  if (!enabled) {
    return <span className="content-form-help">{item.locale === "en" ? "EN yayın kilitli" : "Yayın yetkisi gerekli"}</span>;
  }
  if (item.publish.type === "homepage") {
    const action = item.publish.action;
    return <form action={action}><input type="hidden" name="locale" value={item.publish.locale} /><button type="submit">Şimdi Yayınla</button></form>;
  }
  if (item.publish.type === "role-cards") {
    return <form action={publishRoleCardsAction}><input type="hidden" name="locale" value={item.publish.locale} /><button type="submit">Şimdi Yayınla</button></form>;
  }
  if (item.publish.type === "faq") {
    return <form action={publishFaqAction}><input type="hidden" name="locale" value={item.publish.locale} /><input type="hidden" name="contentKey" value={item.publish.contentKey} /><button type="submit">Şimdi Yayınla</button></form>;
  }
  if (item.publish.type === "legal") {
    const payload = item.publish.payload;
    return (
      <form action={saveCmsDocumentAction}>
        <input type="hidden" name="mode" value="publish" /><input type="hidden" name="locale" value={item.publish.locale} /><input type="hidden" name="slug" value={item.publish.slug} />
        <input type="hidden" name="title" value={text(payload.title)} /><input type="hidden" name="description" value={text(payload.description)} /><input type="hidden" name="updatedLabel" value={text(payload.updatedLabel)} /><input type="hidden" name="body" value={text(payload.body)} />
        <button type="submit">Şimdi Yayınla</button>
      </form>
    );
  }
  if (item.publish.type === "page") {
    const payload = item.publish.payload;
    return (
      <form action={saveCmsPageAction}>
        <input type="hidden" name="mode" value="publish" /><input type="hidden" name="id" value={item.publish.id} /><input type="hidden" name="slug" value={item.publish.slug} />
        <input type="hidden" name="title" value={text(payload.title)} /><input type="hidden" name="summary" value={text(payload.summary)} /><input type="hidden" name="body" value={text(payload.body)} /><input type="hidden" name="seoTitle" value={text(payload.seoTitle)} /><input type="hidden" name="seoDescription" value={text(payload.seoDescription)} />
        {bool(payload.noIndex) ? <input type="hidden" name="noIndex" value="on" /> : null}<button type="submit">Şimdi Yayınla</button>
      </form>
    );
  }
  const payload = item.publish.payload;
  return (
    <form action={saveCmsGuideAction}>
      <input type="hidden" name="mode" value="publish" /><input type="hidden" name="id" value={item.publish.id} /><input type="hidden" name="locale" value={item.publish.locale} /><input type="hidden" name="slug" value={item.publish.slug} />
      <input type="hidden" name="title" value={text(payload.title)} /><input type="hidden" name="summary" value={text(payload.summary)} /><input type="hidden" name="body" value={text(payload.body)} /><input type="hidden" name="seoTitle" value={text(payload.seoTitle)} /><input type="hidden" name="seoDescription" value={text(payload.seoDescription)} />
      {bool(payload.noIndex) ? <input type="hidden" name="noIndex" value="on" /> : null}<button type="submit">Şimdi Yayınla</button>
    </form>
  );
}

export default async function PublishQueuePage({ searchParams }: { searchParams: Promise<QueueSearchParams> }) {
  const access = await requireCmsManager("/icerik/yayin-kuyrugu");
  const params = await searchParams;
  const sources = await loadQueueSources();

  if (!sources) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Yayın Akışı</span><h1>Yayın Kuyruğu</h1><p>Kuyruk verileri doğrulanamadığında sistem yanlış bir “boş kuyruk” sonucu üretmez.</p></div></div>
        <div className="content-panel" role="alert">
          <strong>Yayın kuyruğu verileri okunamadı.</strong>
          <p>Dil durumu veya kuyruk veri kaynaklarından en az biri tamamlanamadı. Güvenli yayın için liste ve yayın aksiyonları durduruldu.</p>
          <div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/hazirlik">Yayın Hazırlığı →</Link><Link href="/icerik/yayin-kuyrugu">Tekrar dene</Link></div>
        </div>
      </section>
    );
  }

  const { staged, pages, draftFaqs, siteTargets, localeEnabled } = sources;
  const pageMap = new Map(pages.map((page) => [page.id, page]));
  const siteTargetMap = new Map(siteTargets.map((row) => [`${row.namespace}:${row.contentKey}`, row]));
  const items: QueueItem[] = [];

  for (const row of staged) {
    const payload = parse(row.valueJson);
    const parts = row.contentKey.split(":");
    const hintedLocale: CmsLocaleCode = parts.includes("en") ? "en" : "tr";
    if (!payload) { items.push(diagnostic(row, "Taslak JSON verisi bozuk veya desteklenmeyen biçimde. Yayın engellendi.", hintedLocale)); continue; }

    if (parts[0] === "role-cards" && (parts[1] === "tr" || parts[1] === "en")) {
      const locale = parts[1] as CmsLocaleCode;
      if (!parseCmsRoleCardsPayloadStrict(row.valueJson)) { items.push(diagnostic(row, "Rol kartları taslağı eksik, sırası çakışıyor veya veri biçimi geçersiz. Yayın engellendi.", locale)); continue; }
      items.push({ key: `staged-${row.contentKey}`, kind: "role-cards", title: "Rol Kartları", detail: "Yazar, Okuyucu, Editör ve Yayınevi kartlarının atomik çalışma taslağı", locale, stage: "working", updatedAt: row.updatedAt, actor: actor(row), editHref: `/icerik/rol-kartlari?dil=${locale}`, previewHref: `/icerik/onizleme/rol-kartlari?dil=${locale}`, publish: { type: "role-cards", locale }, scheduleNote: "Rol Kartları güvenli atomik set olarak yayınlanır; mevcut scheduler hedef türü değildir." });
      continue;
    }

    if (parts[0] === "homepage" && (parts[1] === "tr" || parts[1] === "en")) {
      const locale = parts[1] as CmsLocaleCode;
      const section = parts.slice(2).join(":");
      const action = homepageActions[section];
      if (!action) { items.push(diagnostic(row, "Ana Sayfa taslak anahtarı desteklenmiyor. Yayın engellendi.", locale)); continue; }
      const target = locale === "tr" ? siteTargetMap.get(`homepage:${section}`) : undefined;
      const scheduleTarget = target?.status === "draft" ? `site_content:${target.id}` : undefined;
      items.push({ key: `staged-${row.contentKey}`, kind: "homepage", title: homepageLabels[section] || `Ana Sayfa · ${section}`, detail: text(payload.title) || text(payload.slogan) || "Çalışma taslağı", locale, stage: "working", updatedAt: row.updatedAt, actor: actor(row), editHref: `/icerik/ana-sayfa?dil=${locale}`, previewHref: `/icerik/onizleme/ana-sayfa?dil=${locale}`, publish: { type: "homepage", action, locale }, scheduleTarget, scheduleNote: scheduleTarget ? "Bu ilk yayın taslağı ileri tarih için planlanabilir." : "Yayındaki Ana Sayfa güncellemesini ileri tarihe planlama mevcut scheduler akışında desteklenmiyor." });
      continue;
    }

    if (parts[0] === "faq" && (parts[1] === "tr" || parts[1] === "en")) {
      const locale = parts[1] as CmsLocaleCode;
      const contentKey = parts.slice(2).join(":");
      if (!contentKey.startsWith("item_") || !validFaq(payload)) { items.push(diagnostic(row, "SSS taslağında geçerli kayıt anahtarı, soru veya cevap eksik. Yayın engellendi.", locale)); continue; }
      const target = locale === "tr" ? siteTargetMap.get(`faq:${contentKey}`) : undefined;
      const scheduleTarget = target?.status === "draft" ? `site_content:${target.id}` : undefined;
      items.push({ key: `staged-${row.contentKey}`, kind: "faq", title: text(payload.question), detail: `${text(payload.category) || "Genel"} · mevcut yayındaki kaydın çalışma taslağı`, locale, stage: "working", updatedAt: row.updatedAt, actor: actor(row), editHref: `/icerik/sss?dil=${locale}#faq-${contentKey}`, previewHref: `/icerik/onizleme/sss?dil=${locale}`, publish: { type: "faq", locale, contentKey }, scheduleTarget, scheduleNote: scheduleTarget ? "Bu ilk yayın taslağı ileri tarih için planlanabilir." : "Yayındaki SSS güncellemesini ileri tarihe planlama mevcut scheduler akışında desteklenmiyor." });
      continue;
    }

    if (parts[0] === "page") {
      const pageId = parts.slice(1).join(":");
      const page = pageMap.get(pageId);
      if (!page) { items.push(diagnostic(row, "Çalışma taslağının bağlı olduğu ContentPage kaydı bulunamadı. Orphan taslak; yayın engellendi.")); continue; }
      const locale = localeFromPageKey(page.contentKey);
      if (!validDocument(payload)) { items.push({ ...diagnostic(row, "Sayfa taslağında başlık veya içerik eksik. Yayın engellendi.", locale), editHref: page.contentKey.startsWith("guide:") ? `/icerik/rehber/${page.id}?dil=${locale}` : page.contentKey.startsWith("legal:") ? `/icerik/yasal/${legalSlug(page.contentKey)}?dil=${locale}` : `/icerik/sayfalar/${page.id}` }); continue; }
      const scheduleTarget = locale === "tr" && page.status === "draft" && (page.contentKey.startsWith("legal:") || page.contentKey.startsWith("guide:")) ? `content_page:${page.id}` : undefined;
      const scheduleNote = scheduleTarget ? "Bu ilk yayın taslağı ileri tarih için planlanabilir." : page.status === "published" ? "Yayındaki sayfa güncellemesini ileri tarihe planlama mevcut scheduler akışında desteklenmiyor." : "Bu içerik türü mevcut scheduler kapsamının dışında.";
      if (page.contentKey.startsWith("legal:")) {
        const slug = legalSlug(page.contentKey);
        items.push({ key: `staged-${row.contentKey}`, kind: "legal", title: text(payload.title) || page.title, detail: "Yayındaki yasal metnin çalışma taslağı", locale, stage: "working", updatedAt: row.updatedAt, actor: actor(row), editHref: `/icerik/yasal/${slug}?dil=${locale}`, previewHref: `/icerik/onizleme/yasal/${slug}?dil=${locale}`, publish: { type: "legal", locale, slug, payload }, scheduleTarget, scheduleNote });
      } else if (page.contentKey.startsWith("guide:")) {
        const slug = guideSlugPart(page.slug, locale);
        items.push({ key: `staged-${row.contentKey}`, kind: "guide", title: text(payload.title) || page.title, detail: "Yayındaki rehberin çalışma taslağı", locale, stage: "working", updatedAt: row.updatedAt, actor: actor(row), editHref: `/icerik/rehber/${page.id}?dil=${locale}`, previewHref: `/icerik/onizleme/rehber/${page.id}?dil=${locale}`, publish: { type: "guide", locale, id: page.id, slug, payload }, scheduleTarget, scheduleNote });
      } else if (page.contentKey.startsWith("page:")) {
        items.push({ key: `staged-${row.contentKey}`, kind: "page", title: text(payload.title) || page.title, detail: "Yayındaki kurumsal sayfanın çalışma taslağı", locale, stage: "working", updatedAt: row.updatedAt, actor: actor(row), editHref: `/icerik/sayfalar/${page.id}`, previewHref: `/icerik/onizleme/sayfa/${page.id}`, publish: { type: "page", locale, id: page.id, slug: page.slug.replace(/^\//, ""), payload }, scheduleNote });
      } else {
        items.push(diagnostic(row, "Bağlı sayfa türü yayın kuyruğu tarafından desteklenmiyor. Yayın engellendi.", locale));
      }
      continue;
    }

    items.push(diagnostic(row, "Çalışma taslağı anahtarı yayın kuyruğu tarafından tanınmıyor. Yayın engellendi.", hintedLocale));
  }

  for (const page of pages.filter((item) => item.status === "draft")) {
    const locale = localeFromPageKey(page.contentKey);
    const body = parse(page.bodyJson);
    if (!body) {
      items.push({ key: `diagnostic-initial-${page.id}`, kind: "diagnostic", title: page.title, detail: "İlk yayın kaydının içerik JSON verisi bozuk. Yayın engellendi.", locale, stage: "blocked", updatedAt: page.updatedAt, actor: actor(page), editHref: page.contentKey.startsWith("guide:") ? `/icerik/rehber/${page.id}?dil=${locale}` : page.contentKey.startsWith("legal:") ? `/icerik/yasal/${legalSlug(page.contentKey)}?dil=${locale}` : `/icerik/sayfalar/${page.id}`, blockedReason: "Bozuk içerik JSON" });
      continue;
    }
    let payload: Payload;
    let item: QueueItem | null = null;
    const scheduleTarget = locale === "tr" && (page.contentKey.startsWith("legal:") || page.contentKey.startsWith("guide:")) ? `content_page:${page.id}` : undefined;
    if (page.contentKey.startsWith("legal:")) {
      const slug = legalSlug(page.contentKey);
      payload = { title: page.title, description: text(body.description) || page.seoDescription || "", updatedLabel: text(body.updatedLabel), body: text(body.body) };
      if (validDocument(payload)) item = { key: `initial-page-${page.id}`, kind: "legal", title: page.title, detail: "Henüz ilk kez yayınlanmamış yasal sayfa", locale, stage: "initial", updatedAt: page.updatedAt, actor: actor(page), editHref: `/icerik/yasal/${slug}?dil=${locale}`, previewHref: `/icerik/onizleme/yasal/${slug}?dil=${locale}`, publish: { type: "legal", locale, slug, payload }, scheduleTarget, scheduleNote: scheduleTarget ? "İlk yayın ileri tarih için planlanabilir." : "EN zamanlama akışına dahil değildir." };
    } else if (page.contentKey.startsWith("guide:")) {
      const slug = guideSlugPart(page.slug, locale);
      payload = { title: page.title, summary: text(body.summary), body: text(body.body), seoTitle: page.seoTitle || "", seoDescription: page.seoDescription || "", noIndex: Boolean(page.noIndex) };
      if (validDocument(payload)) item = { key: `initial-page-${page.id}`, kind: "guide", title: page.title, detail: "Henüz ilk kez yayınlanmamış rehber", locale, stage: "initial", updatedAt: page.updatedAt, actor: actor(page), editHref: `/icerik/rehber/${page.id}?dil=${locale}`, previewHref: `/icerik/onizleme/rehber/${page.id}?dil=${locale}`, publish: { type: "guide", locale, id: page.id, slug, payload }, scheduleTarget, scheduleNote: scheduleTarget ? "İlk yayın ileri tarih için planlanabilir." : "EN zamanlama akışına dahil değildir." };
    } else if (page.contentKey.startsWith("page:")) {
      payload = { title: page.title, summary: text(body.summary), body: text(body.body), seoTitle: page.seoTitle || "", seoDescription: page.seoDescription || "", noIndex: Boolean(page.noIndex) };
      if (validDocument(payload)) item = { key: `initial-page-${page.id}`, kind: "page", title: page.title, detail: "Henüz ilk kez yayınlanmamış kurumsal sayfa", locale, stage: "initial", updatedAt: page.updatedAt, actor: actor(page), editHref: `/icerik/sayfalar/${page.id}`, previewHref: `/icerik/onizleme/sayfa/${page.id}`, publish: { type: "page", locale, id: page.id, slug: page.slug.replace(/^\//, ""), payload }, scheduleNote: "Kurumsal Sayfa henüz mevcut scheduler kapsamına dahil değil." };
    }
    if (item) items.push(item);
    else items.push({ key: `diagnostic-initial-${page.id}`, kind: "diagnostic", title: page.title, detail: "İlk yayın içeriğinde zorunlu başlık/içerik eksik veya tür desteklenmiyor. Yayın engellendi.", locale, stage: "blocked", updatedAt: page.updatedAt, actor: actor(page), editHref: page.contentKey.startsWith("guide:") ? `/icerik/rehber/${page.id}?dil=${locale}` : page.contentKey.startsWith("legal:") ? `/icerik/yasal/${legalSlug(page.contentKey)}?dil=${locale}` : `/icerik/sayfalar/${page.id}`, blockedReason: "Eksik zorunlu içerik" });
  }

  for (const row of draftFaqs) {
    const payload = parse(row.valueJson);
    const locale: CmsLocaleCode = row.namespace === "faq_en" ? "en" : "tr";
    if (!payload || !validFaq(payload)) {
      items.push({ key: `diagnostic-faq-${row.namespace}-${row.contentKey}`, kind: "diagnostic", title: row.contentKey, detail: "İlk yayın SSS kaydında soru/cevap eksik veya JSON bozuk. Yayın engellendi.", locale, stage: "blocked", updatedAt: row.updatedAt, actor: actor(row), editHref: `/icerik/sss?dil=${locale}#faq-${row.contentKey}`, blockedReason: "Geçersiz SSS taslağı" });
      continue;
    }
    const scheduleTarget = locale === "tr" ? `site_content:${row.id}` : undefined;
    items.push({ key: `initial-faq-${row.namespace}-${row.contentKey}`, kind: "faq", title: text(payload.question), detail: `${text(payload.category) || "Genel"} · henüz ilk kez yayınlanmamış`, locale, stage: "initial", updatedAt: row.updatedAt, actor: actor(row), editHref: `/icerik/sss?dil=${locale}#faq-${row.contentKey}`, previewHref: `/icerik/onizleme/sss?dil=${locale}`, publish: { type: "faq", locale, contentKey: row.contentKey }, scheduleTarget, scheduleNote: scheduleTarget ? "İlk yayın ileri tarih için planlanabilir." : "EN zamanlama akışına dahil değildir." });
  }

  items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const q = param(params, "q").trim().toLocaleLowerCase("tr-TR");
  const stageFilter = param(params, "durum") || "all";
  const localeFilter = param(params, "dil") || "all";
  const kindFilter = param(params, "tur") || "all";
  const selectedKey = param(params, "sec");

  const filtered = items.filter((item) => {
    if (q && !`${item.title} ${item.detail} ${item.actor} ${kindLabels[item.kind]}`.toLocaleLowerCase("tr-TR").includes(q)) return false;
    if (localeFilter !== "all" && item.locale !== localeFilter) return false;
    if (kindFilter !== "all" && item.kind !== kindFilter) return false;
    if (stageFilter === "ready" && (!item.publish || item.stage === "blocked" || !localeEnabled[item.locale])) return false;
    if (["working", "initial", "blocked"].includes(stageFilter) && item.stage !== stageFilter) return false;
    return true;
  });
  const selected = filtered.find((item) => item.key === selectedKey) ?? filtered[0] ?? null;

  const workingCount = items.filter((item) => item.stage === "working").length;
  const blockedCount = items.filter((item) => item.stage === "blocked").length;
  const readyCount = items.filter((item) => Boolean(item.publish) && item.stage !== "blocked" && localeEnabled[item.locale]).length;
  const scheduleCount = items.filter((item) => Boolean(item.scheduleTarget)).length;
  const enCount = items.filter((item) => item.locale === "en").length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Yayın Akışı</span><h1>Yayın Kuyruğu</h1><p>Bekleyen içeriği seçin, kararını tek ekranda verin; düzenleme, önizleme, anlık yayın ve desteklenen ilk yayınlarda zamanlamayı aynı akıştan yönetin.</p></div>
        <div className="content-profile"><strong>{readyCount} yayın kararı hazır</strong><small>{access.canPublish ? "Yayın yetkisi aktif" : "İnceleme modu · yayın yetkisi yok"}</small></div>
      </div>

      {blockedCount > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{blockedCount} kayıt güvenlik nedeniyle kilitli.</strong><p>Bozuk, orphan veya zorunlu alanı eksik kayıtlar karar masasından yayınlanamaz.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}
      {enCount > 0 && !localeEnabled.en ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>EN kuyruğu görünür fakat yayın kilitli.</strong><p>{enCount} İngilizce kayıt var; EN public dili açılmadan yayın kararı uygulanmaz.</p></div> : null}

      <div className={styles.workbench}>
        <div className={styles.summaryBar}>
          <article className={styles.summaryCard}><span>Toplam iş</span><strong>{items.length}</strong><small>bekleyen + teşhis</small></article>
          <article className={styles.summaryCard}><span>Çalışma taslağı</span><strong>{workingCount}</strong><small>canlı sürüm korunuyor</small></article>
          <article className={styles.summaryCard}><span>Karara hazır</span><strong>{readyCount}</strong><small>geçerli + aktif dil</small></article>
          <article className={styles.summaryCard}><span>Zamanlanabilir</span><strong>{scheduleCount}</strong><small>desteklenen ilk yayın</small></article>
        </div>

        <div className={styles.layout}>
          <aside className={styles.rail}>
            <div className={styles.railHeader}><span className={styles.railLabel}>Kuyruk</span><strong>{filtered.length} kayıt gösteriliyor</strong></div>
            <form method="get" className={styles.searchForm}>
              <input type="search" name="q" defaultValue={param(params, "q")} placeholder="Başlık, tür veya hazırlayan ara" />
              {stageFilter !== "all" ? <input type="hidden" name="durum" value={stageFilter} /> : null}
              {localeFilter !== "all" ? <input type="hidden" name="dil" value={localeFilter} /> : null}
              {kindFilter !== "all" ? <input type="hidden" name="tur" value={kindFilter} /> : null}
              <button type="submit">Ara</button>
            </form>
            <div className={styles.filters}>
              <div><span className={styles.railLabel}>Durum</span><div className={styles.filterRow}>
                {[{ key: "all", label: "Tümü" }, { key: "ready", label: "Hazır" }, { key: "working", label: "Taslak" }, { key: "initial", label: "İlk yayın" }, { key: "blocked", label: "Kilitli" }].map((filter) => <Link key={filter.key} data-active={stageFilter === filter.key} href={queueHref(params, { durum: filter.key === "all" ? undefined : filter.key, sec: undefined })}>{filter.label}</Link>)}
              </div></div>
              <div><span className={styles.railLabel}>Dil</span><div className={styles.filterRow}>
                {[{ key: "all", label: "Tümü" }, { key: "tr", label: "TR" }, { key: "en", label: "EN" }].map((filter) => <Link key={filter.key} data-active={localeFilter === filter.key} href={queueHref(params, { dil: filter.key === "all" ? undefined : filter.key, sec: undefined })}>{filter.label}</Link>)}
              </div></div>
              <div><span className={styles.railLabel}>Tür</span><div className={styles.filterRow}>
                {[{ key: "all", label: "Tümü" }, { key: "homepage", label: "Ana Sayfa" }, { key: "role-cards", label: "Roller" }, { key: "faq", label: "SSS" }, { key: "legal", label: "Yasal" }, { key: "guide", label: "Rehber" }, { key: "page", label: "Sayfa" }].map((filter) => <Link key={filter.key} data-active={kindFilter === filter.key} href={queueHref(params, { tur: filter.key === "all" ? undefined : filter.key, sec: undefined })}>{filter.label}</Link>)}
              </div></div>
            </div>
            {filtered.length === 0 ? <div className={styles.empty}>Bu filtrelerde bekleyen kayıt yok.</div> : <div className={styles.itemList}>{filtered.map((item) => (
              <Link key={item.key} href={queueHref(params, { sec: item.key })} className={styles.itemLink} data-active={selected?.key === item.key}>
                <div className={styles.itemTop}><strong>{item.title}</strong><span className={styles.badge} data-tone={stageTone(item.stage)}>{stageLabel(item.stage)}</span></div>
                <p>{item.detail}</p>
                <div className={styles.itemMeta}><span>{kindLabels[item.kind]}</span><span>{item.locale.toUpperCase()}</span><span>{formatDate(item.updatedAt)}</span></div>
              </Link>
            ))}</div>}
          </aside>

          <main className={styles.detail}>
            {!selected ? <div className={styles.empty}><strong>Karar verilecek kayıt yok.</strong><p>Filtreleri temizleyin veya yeni bir taslak oluşturun.</p></div> : <>
              <div className={styles.detailHeader}>
                <div className={styles.detailTopline}><span className={styles.badge} data-tone={stageTone(selected.stage)}>{stageLabel(selected.stage)}</span><span className={styles.badge}>{selected.locale.toUpperCase()}</span></div>
                <div><span className={styles.eyebrow}>{kindLabels[selected.kind]}</span><h2>{selected.title}</h2><p>{selected.detail}</p></div>
                <div className={styles.detailMetaGrid}>
                  <div className={styles.detailMetaCard}><span className={styles.detailLabel}>Hazırlayan</span><strong>{selected.actor}</strong><small>son düzenleyen</small></div>
                  <div className={styles.detailMetaCard}><span className={styles.detailLabel}>Güncelleme</span><strong>{formatDate(selected.updatedAt)}</strong><small>Europe/Istanbul</small></div>
                  <div className={styles.detailMetaCard}><span className={styles.detailLabel}>Yayın durumu</span><strong>{selected.stage === "blocked" ? "Karar verilemez" : localeEnabled[selected.locale] ? "Karara hazır" : "Dil kilitli"}</strong><small>{selected.publish ? "canonical aksiyon bağlı" : "yayın aksiyonu yok"}</small></div>
                </div>
              </div>
              <div className={styles.detailBody}>
                {selected.blockedReason ? <div className={`${styles.decisionBox} ${styles.blocker}`}><strong>Yayın blokajı</strong><p>{selected.blockedReason}</p></div> : <div className={styles.decisionBox}><strong>Karar noktası</strong><p>Önce önizleyin veya düzenleyin. Hazırsa şimdi yayınlayın; desteklenen ilk yayınlarda ileri tarih seçebilirsiniz.</p></div>}
                <div className={styles.actionRow}>
                  {selected.editHref ? <Link href={selected.editHref}>Düzenlemeye Git</Link> : <Link href="/icerik/saglik">Teşhis Et</Link>}
                  {selected.previewHref ? <Link href={selected.previewHref}>Önizle ↗</Link> : null}
                  <PublishButton item={selected} enabled={Boolean(selected.publish) && selected.stage !== "blocked" && access.canPublish && localeEnabled[selected.locale]} />
                </div>
                <div className={styles.scheduleBox}>
                  <strong>İleri tarih</strong>
                  {selected.scheduleTarget ? <><p>{selected.scheduleNote}</p><div className={styles.actionRow}><Link href={`/icerik/zamanlama?hedef=${encodeURIComponent(selected.scheduleTarget)}`}>Yayın Zamanla →</Link></div></> : <p>{selected.scheduleNote || "Bu içerik mevcut zamanlama hedefleri arasında değil. Şimdi yayın akışı güvenli biçimde kullanılabilir."}</p>}
                </div>
              </div>
            </>}
          </main>

          <aside className={styles.sidePane}>
            <div className={styles.sideHeader}><span className={styles.railLabel}>Yayın akışı</span><strong>Kararı doğru sırayla ver</strong></div>
            <div className={styles.sideBody}>
              <div className={styles.flow}>
                <div className={styles.flowStep}><span>1</span><div><strong>İçeriği kontrol et</strong><small>Başlık, metin ve zorunlu alanlarda eksik varsa düzenlemeye dön.</small></div></div>
                <div className={styles.flowStep}><span>2</span><div><strong>Önizlemeyi gör</strong><small>Public görünümü yayın kararı vermeden önce doğrula.</small></div></div>
                <div className={styles.flowStep}><span>3</span><div><strong>Şimdi veya sonra</strong><small>Canonical yayın aksiyonunu kullan ya da desteklenen ilk yayını zamanla.</small></div></div>
              </div>
              <div className={styles.infoBox}><strong>Güvenlik sınırı</strong><p>Kilitli kayıtlar, pasif dil ve yayın yetkisi bu çalışma masasında bypass edilmez.</p></div>
              <div className={styles.actionRow}><Link href="/icerik/zamanlama">Tüm Planlar</Link><Link href="/icerik/hazirlik">Yayın Hazırlığı</Link></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
