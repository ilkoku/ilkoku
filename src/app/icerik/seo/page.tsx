"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SeoPage = {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
};

type LoadState = "loading" | "ready" | "error";

function editHref(page: SeoPage) {
  if (page.contentKey.startsWith("legal:")) {
    const parts = page.contentKey.split(":");
    const locale = parts[1] === "en" ? "en" : "tr";
    const slug = locale === "en" ? parts[2] || "" : parts[1] || "";
    return `/icerik/yasal/${slug}?dil=${locale}`;
  }
  if (page.contentKey.startsWith("guide:")) {
    const locale = page.contentKey.startsWith("guide:en:") ? "en" : "tr";
    return `/icerik/rehber/${page.id}?dil=${locale}`;
  }
  if (page.contentKey.startsWith("page:")) return `/icerik/sayfalar/${page.id}`;
  return "/icerik/sayfalar";
}

export default function Page() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/cms-seo-audit", { cache: "no-store" });
        if (!response.ok) throw new Error(`SEO_AUDIT_HTTP_${response.status}`);
        const payload = await response.json() as { pages?: unknown };
        if (!Array.isArray(payload.pages)) throw new Error("SEO_AUDIT_INVALID_PAYLOAD");
        if (!cancelled) {
          setPages(payload.pages as SeoPage[]);
          setLoadState("ready");
        }
      } catch {
        if (!cancelled) {
          setPages([]);
          setLoadState("error");
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => ({
    total: pages.length,
    title: pages.filter((page) => !page.seoTitle?.trim()).length,
    description: pages.filter((page) => !page.seoDescription?.trim()).length,
    canonical: pages.filter((page) => !page.canonicalUrl?.trim()).length,
  }), [pages]);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Büyüme · TR</span><h1>SEO Merkezi</h1><p>Yayındaki Türkçe CMS sayfalarının meta başlığı, açıklaması, canonical ve indeks durumunu denetleyin.</p></div>
      </div>

      {loadState === "ready" ? (
        <div className="content-grid">
          <article className="content-card"><h2>{stats.total}</h2><p>Yayındaki TR CMS sayfası</p></article>
          <article className="content-card"><h2>{stats.title}</h2><p>SEO başlığı eksik</p></article>
          <article className="content-card"><h2>{stats.description}</h2><p>Meta açıklaması eksik</p></article>
          <article className="content-card"><h2>{stats.canonical}</h2><p>Canonical eksik</p></article>
        </div>
      ) : null}

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        {loadState === "loading" ? (
          <div className="content-empty"><strong>SEO verileri yükleniyor…</strong></div>
        ) : loadState === "error" ? (
          <div className="content-empty" role="alert">
            <strong>SEO denetim verileri okunamadı.</strong>
            <p>Bu durum “yayında sayfa yok” anlamına gelmez. Güvenilir veri gelmeden SEO kararı üretilmedi.</p>
            <div className="content-form-actions" style={{ justifyContent: "center", flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/seo">Tekrar dene</Link></div>
          </div>
        ) : pages.length === 0 ? (
          <div className="content-empty"><strong>Yayında Türkçe CMS sayfası yok.</strong></div>
        ) : (
          <div className="content-list">
            <div className="content-list-row content-list-row--head"><span>Sayfa</span><span>SEO</span><span>İndeks</span><span>Canonical / İşlem</span></div>
            {pages.map((page) => {
              const issues = Number(!page.seoTitle?.trim()) + Number(!page.seoDescription?.trim()) + Number(!page.canonicalUrl?.trim());
              return (
                <div className="content-list-row" key={page.id}>
                  <div><strong>{page.title}</strong><br /><small>{page.slug} · {page.status}</small></div>
                  <span>{issues === 0 ? "Tam" : `${issues} eksik`}<br /><small>{page.seoTitle || "SEO title yok"}</small></span>
                  <span>{page.noIndex ? "noindex" : "index"}</span>
                  <div><small>{page.canonicalUrl || "Eksik"}</small><br /><Link href={editHref(page)}>Düzenle →</Link></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
