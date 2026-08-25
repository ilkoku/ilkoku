import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialStandardsExperience } from "@/components/content/EditorialStandardsExperience";
import { ContentAgePolicyExperience } from "@/components/content/ContentAgePolicyExperience";
import { CommunityRulesExperience } from "@/components/content/CommunityRulesExperience";
import { CopyrightNoticeExperience } from "@/components/content/CopyrightNoticeExperience";
import { ForEditorsExperience } from "@/components/content/ForEditorsExperience";
import { ForPublishersExperience } from "@/components/content/ForPublishersExperience";
import { ForWritersExperience } from "@/components/content/ForWritersExperience";
import { HowItWorksExperience } from "@/components/content/HowItWorksExperience";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDraftState, pageDraftKey } from "@/lib/cms-drafts";
import { parseCmsPageBody } from "@/lib/cms-pages";
import { prisma } from "@/lib/prisma";

import "@/app/nasil-calisir/how-it-works.css";
import "@/app/editoryal-standartlar/editorial-standards.css";
import "@/app/icerik-ve-yas-politikasi/content-age-policy.css";
import "@/app/topluluk-kurallari/community-rules.css";
import "@/app/telif-bildirimi/copyright-notice.css";
import "@/app/yazarlar-icin/for-writers.css";
import "@/app/editorler-icin/for-editors.css";
import "@/app/yayinevleri-icin/for-publishers.css";

type PageRow = { id: string; contentKey: string; slug: string; title: string; status: "draft" | "published" | "archived"; bodyJson: string; seoTitle: string | null; seoDescription: string | null; noIndex: boolean; updatedAt: Date };
type Draft = { title?: string; summary?: string; body?: string; seoTitle?: string; seoDescription?: string; noIndex?: boolean };

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function CmsPagePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCmsManager(`/icerik/onizleme/sayfa/${id}`);

  const rows = await prisma.$queryRaw<PageRow[]>`
    SELECT id, contentKey, slug, title, status, bodyJson, seoTitle, seoDescription, noIndex, updatedAt
    FROM ContentPage
    WHERE id = ${id} AND contentKey LIKE 'page:tr:%'
    LIMIT 1
  `;
  const page = rows[0];
  if (!page) notFound();

  const stored = parseCmsPageBody(page.bodyJson);
  const state = page.status === "published"
    ? await getCmsDraftState<Draft>(pageDraftKey(page.id))
    : { state: "missing" as const };

  if (state.state === "corrupt") {
    return <main style={{ minHeight: "100vh", padding: "2rem 1rem" }}><section className="content-editor-page"><div className="content-panel" role="alert"><strong>Taslak önizlenemiyor.</strong><p>Çalışma taslağının JSON bütünlüğü bozuk. Ham kayıt korunuyor ve canlı sayfa değiştirilmedi.</p><div className="content-form-actions"><Link href={`/icerik/sayfalar/${page.id}`}>← Editöre dön</Link><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div></div></section></main>;
  }

  const draft = state.state === "valid" ? state.record.payload : undefined;
  const title = draft?.title ?? page.title;
  const summary = draft?.summary ?? stored.summary;
  const body = draft?.body ?? stored.body;

  if (page.contentKey === "page:tr:nasil-calisir") {
    return (
      <>
        <div style={{ position: "relative", zIndex: 60, padding: ".7rem 1rem", color: "#fff", background: "#4b2dbf", textAlign: "center", fontSize: ".75rem", fontWeight: 800 }}>
          CMS Taslak Önizleme · {draft ? "Bekleyen taslak" : "Kayıtlı sürüm"} · <Link href={`/icerik/sayfalar/${page.id}`} style={{ textDecoration: "underline" }}>Editöre dön</Link>
        </div>
        <HowItWorksExperience body={body} summary={summary} title={title} updatedAt={page.updatedAt} />
      </>
    );
  }

  if (page.contentKey === "page:tr:editoryal-standartlar") {
    return (
      <>
        <div style={{ position: "relative", zIndex: 60, padding: ".7rem 1rem", color: "#fff", background: "#4b2dbf", textAlign: "center", fontSize: ".75rem", fontWeight: 800 }}>
          CMS Taslak Önizleme · {draft ? "Bekleyen taslak" : "Kayıtlı sürüm"} · <Link href={`/icerik/sayfalar/${page.id}`} style={{ textDecoration: "underline" }}>Editöre dön</Link>
        </div>
        <EditorialStandardsExperience body={body} summary={summary} title={title} updatedAt={page.updatedAt} />
      </>
    );
  }

  if (page.contentKey === "page:tr:icerik-ve-yas-politikasi") {
    return (
      <>
        <div style={{ position: "relative", zIndex: 60, padding: ".7rem 1rem", color: "#fff", background: "#4b2dbf", textAlign: "center", fontSize: ".75rem", fontWeight: 800 }}>
          CMS Taslak Önizleme · {draft ? "Bekleyen taslak" : "Kayıtlı sürüm"} · <Link href={`/icerik/sayfalar/${page.id}`} style={{ textDecoration: "underline" }}>Editöre dön</Link>
        </div>
        <ContentAgePolicyExperience body={body} summary={summary} title={title} updatedAt={page.updatedAt} />
      </>
    );
  }

  if (page.contentKey === "page:tr:topluluk-kurallari") {
    return (
      <>
        <div style={{ position: "relative", zIndex: 60, padding: ".7rem 1rem", color: "#fff", background: "#4b2dbf", textAlign: "center", fontSize: ".75rem", fontWeight: 800 }}>
          CMS Taslak Önizleme · {draft ? "Bekleyen taslak" : "Kayıtlı sürüm"} · <Link href={`/icerik/sayfalar/${page.id}`} style={{ textDecoration: "underline" }}>Editöre dön</Link>
        </div>
        <CommunityRulesExperience body={body} summary={summary} title={title} updatedAt={page.updatedAt} />
      </>
    );
  }

  if (page.contentKey === "page:tr:telif-bildirimi") {
    return (
      <>
        <div style={{ position: "relative", zIndex: 60, padding: ".7rem 1rem", color: "#fff", background: "#4b2dbf", textAlign: "center", fontSize: ".75rem", fontWeight: 800 }}>
          CMS Taslak Önizleme · {draft ? "Bekleyen taslak" : "Kayıtlı sürüm"} · <Link href={`/icerik/sayfalar/${page.id}`} style={{ textDecoration: "underline" }}>Editöre dön</Link>
        </div>
        <CopyrightNoticeExperience body={body} summary={summary} title={title} updatedAt={page.updatedAt} />
      </>
    );
  }

  if (page.contentKey === "page:tr:yazarlar-icin") {
    return (
      <>
        <div style={{ position: "relative", zIndex: 60, padding: ".7rem 1rem", color: "#fff", background: "#4b2dbf", textAlign: "center", fontSize: ".75rem", fontWeight: 800 }}>
          CMS Taslak Önizleme · {draft ? "Bekleyen taslak" : "Kayıtlı sürüm"} · <Link href={`/icerik/sayfalar/${page.id}`} style={{ textDecoration: "underline" }}>Editöre dön</Link>
        </div>
        <ForWritersExperience body={body} summary={summary} title={title} updatedAt={page.updatedAt} />
      </>
    );
  }

  if (page.contentKey === "page:tr:editorler-icin") {
    return (
      <>
        <div style={{ position: "relative", zIndex: 60, padding: ".7rem 1rem", color: "#fff", background: "#4b2dbf", textAlign: "center", fontSize: ".75rem", fontWeight: 800 }}>
          CMS Taslak Önizleme · {draft ? "Bekleyen taslak" : "Kayıtlı sürüm"} · <Link href={`/icerik/sayfalar/${page.id}`} style={{ textDecoration: "underline" }}>Editöre dön</Link>
        </div>
        <ForEditorsExperience body={body} summary={summary} title={title} updatedAt={page.updatedAt} />
      </>
    );
  }

  if (page.contentKey === "page:tr:yayinevleri-icin") {
    return (
      <>
        <div style={{ position: "relative", zIndex: 60, padding: ".7rem 1rem", color: "#fff", background: "#4b2dbf", textAlign: "center", fontSize: ".75rem", fontWeight: 800 }}>
          CMS Taslak Önizleme · {draft ? "Bekleyen taslak" : "Kayıtlı sürüm"} · <Link href={`/icerik/sayfalar/${page.id}`} style={{ textDecoration: "underline" }}>Editöre dön</Link>
        </div>
        <ForPublishersExperience body={body} summary={summary} title={title} updatedAt={page.updatedAt} />
      </>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f7f5ff", padding: "2rem 1rem", color: "#18162a" }}>
      <article style={{ maxWidth: 880, margin: "0 auto", background: "#fff", border: "1px solid #e8e2ff", borderRadius: 18, padding: "clamp(1.4rem,4vw,3.5rem)", boxShadow: "0 20px 60px rgba(48,35,100,.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}><div><strong>CMS Taslak Önizleme</strong><div style={{ fontSize: ".82rem", opacity: .65, marginTop: ".25rem" }}>{page.slug} · {draft ? "Bekleyen taslak" : "Kayıtlı sürüm"}</div></div><Link href={`/icerik/sayfalar/${page.id}`}>← Editöre dön</Link></div>
        <header style={{ marginBottom: "2rem" }}><h1 style={{ fontSize: "clamp(2rem,5vw,3.8rem)", lineHeight: 1.06, margin: 0 }}>{title}</h1>{summary ? <p style={{ fontSize: "1.1rem", lineHeight: 1.75, opacity: .72, marginTop: "1.2rem" }}>{summary}</p> : null}</header>
        <div style={{ fontSize: "1rem", lineHeight: 1.85 }}>{body.split(/\n{2,}/).filter(Boolean).map((block, index) => { const trimmed = block.trim(); if (trimmed.startsWith("## ")) return <h2 key={index} style={{ marginTop: "2rem" }}>{trimmed.slice(3)}</h2>; return <p key={index} style={{ whiteSpace: "pre-line" }}>{trimmed}</p>; })}</div>
      </article>
    </main>
  );
}
