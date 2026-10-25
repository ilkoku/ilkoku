import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";

import { ForEditorsExperience } from "@/components/content/ForEditorsExperience";
import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { forEditorsPageContent } from "@/content/for-editors";
import { getPublicTrustPageVisual } from "@/content/public-trust-page-visuals";
import { getPublishedCmsPublicPageState } from "@/lib/cms-public-page-store";
import { isSoftLaunchSearchExcludedPath } from "@/lib/soft-launch-search-policy";

import "@/app/nasil-calisir/how-it-works.css";
import "@/app/nasil-calisir/public-trust-footer.css";
import "@/app/yazarlar-icin/education-hub.css";
import "./for-editors.css";
import "./for-editors-closing-polish.css";
import "./role-illustrations.css";

const baseUrl = "https://ilkoku.com";
const visual = getPublicTrustPageVisual("/editorler-icin");
const socialImage = `${baseUrl}${visual.src}`;

export const revalidate = 300;

const resolvePage = cache(async () => {
  const state = await getPublishedCmsPublicPageState("editorler-icin");

  if (state.state === "valid") {
    return {
      body: state.page.body,
      canonical: state.page.canonicalUrl || forEditorsPageContent.canonical,
      noIndex: state.page.noIndex,
      seoDescription: state.page.seoDescription || state.page.summary || forEditorsPageContent.seoDescription,
      seoTitle: state.page.seoTitle || state.page.title,
      summary: state.page.summary || forEditorsPageContent.summary,
      title: state.page.title,
      updatedAt: state.page.updatedAt,
    };
  }

  return {
    body: forEditorsPageContent.body,
    canonical: forEditorsPageContent.canonical,
    noIndex: false,
    seoDescription: forEditorsPageContent.seoDescription,
    seoTitle: forEditorsPageContent.seoTitle,
    summary: forEditorsPageContent.summary,
    title: forEditorsPageContent.title,
    updatedAt: new Date(forEditorsPageContent.updatedAt),
  };
});

export async function generateMetadata(): Promise<Metadata> {
  const page = await resolvePage();
  const noIndex = page.noIndex || isSoftLaunchSearchExcludedPath(page.canonical);

  return {
    title: page.seoTitle,
    description: page.seoDescription,
    alternates: { canonical: page.canonical },
    robots: noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      type: "website",
      locale: "tr_TR",
      url: page.canonical,
      images: [{ url: socialImage, alt: visual.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.seoTitle,
      description: page.seoDescription,
      images: [socialImage],
    },
  };
}

export default async function ForEditorsPage() {
  const page = await resolvePage();
  const absoluteUrl = new URL(page.canonical, baseUrl).toString();
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      description: page.seoDescription,
      inLanguage: "tr-TR",
      url: absoluteUrl,
      dateModified: page.updatedAt.toISOString(),
      primaryImageOfPage: { "@type": "ImageObject", url: socialImage },
      isPartOf: { "@type": "WebSite", name: "İlkOku", url: baseUrl },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: `${baseUrl}/` },
        { "@type": "ListItem", position: 2, name: page.title, item: absoluteUrl },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <ForEditorsExperience body={page.body} summary={page.summary} title={page.title} updatedAt={page.updatedAt} />
      <section
        aria-labelledby="editor-priority-education"
        className="mx-auto mt-8 max-w-6xl rounded-[2.2rem] border border-[#6b52c7]/10 bg-[#efebff] px-7 py-8 shadow-[0_14px_44px_rgba(91,53,221,0.08)] sm:px-10 sm:py-10"
      >
        <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#5b35dd]">
          Editörlük Okulu · başlangıç rotası
        </span>
        <h2
          id="editor-priority-education"
          className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.03em] text-[#211746] sm:text-4xl"
        >
          Editörlüğü üç temel beceriyle kur.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f5869]">
          Önce editörün rolünü ve sınırlarını tanı, sonra metni sistematik değerlendirmeyi öğren ve dil-anlatım düzeyindeki müdahaleyi ayrı bir çalışma katmanı olarak geliştir.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            {
              href: "/editorler-icin/egitim/editorluge-baslama",
              title: "Editörlüğe Başlama",
              text: "Rol, kapsam, kanıt ve profesyonel çalışma sınırlarını kur.",
            },
            {
              href: "/editorler-icin/egitim/metin-degerlendirme",
              title: "Metin Değerlendirme",
              text: "Sorunu sınıflandır, metinden kanıt göster ve uygulanabilir geri bildirim üret.",
            },
            {
              href: "/editorler-icin/egitim/dil-ve-anlatim-editorlugu",
              title: "Dil ve Anlatım Editörlüğü",
              text: "Cümle, ton, tekrar ve akıcılık müdahalelerini yazarın sesini koruyarak yap.",
            },
          ].map((item) => (
            <Link
              className="group rounded-[1.35rem] border border-[#6b52c7]/15 bg-white px-5 py-5 shadow-[0_8px_24px_rgba(34,23,70,0.05)] transition hover:-translate-y-0.5 hover:border-[#6b52c7]/35"
              href={item.href}
              key={item.href}
            >
              <strong className="block text-base font-extrabold text-[#211746]">{item.title}</strong>
              <span className="mt-2 block text-sm leading-7 text-[#665f70]">{item.text}</span>
              <span className="mt-4 inline-flex text-sm font-extrabold text-[#5b35dd]">
                Eğitime geç <span aria-hidden="true" className="ml-1 transition group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <PublicTrustFooter />
    </>
  );
}
