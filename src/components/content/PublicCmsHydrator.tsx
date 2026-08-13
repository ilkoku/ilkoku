"use client";

import { useEffect } from "react";
import { PublicDocumentHydrator } from "@/components/content/PublicDocumentHydrator";
import { PublicFooterHydrator } from "@/components/content/PublicFooterHydrator";

type Section = Record<string, string>;
type HomepageContent = Record<string, Section>;

function renderHeroTitle(element: HTMLElement, title: string) {
  const lines = title.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  element.replaceChildren();
  if (lines.length <= 1) {
    element.textContent = title;
    return;
  }
  lines.forEach((line, index) => {
    if (index > 0) element.append(document.createElement("br"));
    if (index === lines.length - 1) {
      const span = document.createElement("span");
      span.textContent = line;
      element.append(span);
    } else {
      element.append(document.createTextNode(line));
    }
  });
}

function setText(selector: string, value?: string) {
  if (!value) return;
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
}

function setLinkText(selector: string, value?: string) {
  if (!value) return;
  const anchor = document.querySelector<HTMLAnchorElement>(selector);
  if (!anchor) return;
  const icon = anchor.querySelector("span[aria-hidden='true']");
  anchor.replaceChildren(document.createTextNode(value));
  if (icon) {
    anchor.append(document.createTextNode(" "));
    anchor.append(icon);
  }
}

function applyHomepage(content: HomepageContent) {
  const hero = content.hero;
  if (hero?.title) {
    const title = document.querySelector<HTMLElement>(".landing-hero__content h1");
    if (title) renderHeroTitle(title, hero.title);
  }
  setText(".landing-hero__content > p", hero?.description);
  setLinkText(".landing-hero__actions a:nth-child(1)", hero?.primaryCtaLabel);
  setLinkText(".landing-hero__actions a:nth-child(2)", hero?.secondaryCtaLabel);

  const roles = content.roles;
  setText(".landing-section--roles .landing-section-heading__eyebrow", roles?.eyebrow);
  setText(".landing-section--roles .landing-section-heading h2", roles?.title);
  setText(".landing-section--roles .landing-section-heading p", roles?.description);

  const passport = content.passport;
  setText(".landing-passport__content .landing-section-heading__eyebrow", passport?.eyebrow);
  setText(".landing-passport__content h2", passport?.title);
  setText(".landing-passport__content > p", passport?.description);
  setLinkText(".landing-passport__content a.landing-button", passport?.ctaLabel);

  const why = content.why;
  setText(".landing-why-v2 .landing-section-heading__eyebrow", why?.eyebrow);
  setText(".landing-why-v2 .landing-section-heading h2", why?.title);

  const footer = content.footer;
  setText(".landing-footer__grid > div:first-child > p", footer?.slogan);
  setText(".landing-footer__copyright", footer?.copyright);
}

export function PublicCmsHydrator() {
  useEffect(() => {
    if (window.location.pathname !== "/") return;
    let cancelled = false;

    void fetch("/api/site-content/homepage", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled) return;
        applyHomepage((payload?.content ?? {}) as HomepageContent);
      })
      .catch(() => {
        // Kod içeriği güvenli fallback olarak kalır.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PublicDocumentHydrator />
      <PublicFooterHydrator />
    </>
  );
}
