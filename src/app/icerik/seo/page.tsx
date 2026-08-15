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

function editHref(page: SeoPage) {
  if (page.contentKey.startsWith("page:tr:")) return `/icerik/sayfalar/${page.id}`;
  if (page.contentKey.startsWith("legal:")) {
    const parts = page.contentKey.split(":");
    const locale = parts[1] === "en" ? "en" : "tr";
    const slug = locale === "en" ? parts[2] : parts[1];
    return slug ? `/icerik/yasal/${slug}?dil=${locale}` : null;
  }
  if (page.contentKey.startsWith("guide:")) {
    const locale = page.contentKey.startsWith("guide:en:") ? "en" : "tr";
    return `/icerik/rehber/${page.id}?dil=${locale}`;
  }
  return null;
}

export default function Page() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/cms-seo-audit")
      .then((response) => (response.ok ? response.json() : { pages: [] }))
      .then((payload) => setPages(Array.isArray(payload.pages) ? payload.pages : []))
      .finally(() => setLoaded(true));
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
        <div><span>Büyüme</span><h1>SEO Merkezi</h1><p>CMS sayfalarının meta başlığı, açıklaması, canonical ve indeks durumunu denetleyin; eksikleri doğrudan ilgili editörde tamamlayın.</p></div>
      </div>

      <div className="content-grid">
        <article className="content-card"><h2>{stats.total}</h2><p>Toplam CMS sayfası</p></article>
        <article className="content-card"><h2>{stats.title}</h2><p>SEO başlığı eksik</p></article>
        <article className="content-card"><h2>{stats.description}</h2><p>Meta açıklaması eksik</p></article>
        <article className="content-card"><h2>{stats.canonical}</h2><p>Canonical eksik</p></article>
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        {!loaded ? <div className="content-empty"><strong>SEO verileri yükleniyor…</strong></div> : pages.length === 0 ? (
          <div className="content-empty"><strong>Henüz CMS sayfası yok.</strong></div>
        ) : (
          <div className="content-list">
            <div className="content-list-row content-list-row--head"><span>Sayfa</span><span>SEO</span><span>İndeks</span><span>Canonical / işlem</span></div>
            {pages.map((page) => {
              const issues = Number(!page.seoTitle?.trim()) + Number(!page.seoDescription?.trim()) + Number(!page.canonicalUrl?.trim());
              const href = editHref(page);
              return (
                <div className="content-list-row" key={page.id}>
                  <div><strong>{page.title}</strong><br /><small>{page.slug} · {page.status}</small></div>
                  <span>{issues === 0 ? "Tam" : `${issues} eksik`}<br /><small>{page.seoTitle || "SEO title yok"}</small></span>
                  <span>{page.noIndex ? "noindex" : "index"}</span>
                  <div>
                    <small>{page.canonicalUrl || "Eksik"}</small>
                    {href ? <><br /><Link href={href}>{issues === 0 ? "İncele →" : "Eksikleri düzelt →"}</Link></> : null}
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
