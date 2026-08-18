"use client";

import { useEffect } from "react";
import { PublicDocumentHydrator } from "@/components/content/PublicDocumentHydrator";
import { PublicFooterHydrator } from "@/components/content/PublicFooterHydrator";
import { safeCmsInternalHref } from "@/lib/cms-links";
import type { CmsRoleCard } from "@/lib/cms-role-cards";

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

function setFooterSlogan(value?: string) {
  if (!value) return;
  const element = document.querySelector<HTMLElement>(".landing-footer__grid > div:first-child > p");
  if (!element) return;

  const currentStrongText = element.querySelector("strong")?.textContent?.trim();
  const normalized = value.trim();
  if (currentStrongText && normalized.endsWith(currentStrongText)) {
    const prefix = normalized.slice(0, normalized.length - currentStrongText.length);
    const strong = document.createElement("strong");
    strong.textContent = currentStrongText;
    element.replaceChildren(document.createTextNode(prefix), strong);
    return;
  }

  element.textContent = value;
}

function setFooterCopyright(value?: string) {
  if (!value) return;
  const text = document.querySelector<HTMLElement>(".landing-footer__copyright-text");
  if (text) {
    text.textContent = value;
    return;
  }
  const copyright = document.querySelector<HTMLElement>(".landing-footer__copyright");
  if (copyright) copyright.textContent = value;
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

function setLinkHref(selector: string, value?: string) {
  const safeHref = safeCmsInternalHref(value);
  if (!safeHref) return;
  const anchor = document.querySelector<HTMLAnchorElement>(selector);
  if (anchor) anchor.setAttribute("href", safeHref);
}

function applyManualStats(why?: Section) {
  if (!why) return;
  for (let index = 1; index <= 6; index += 1) {
    setText(`.landing-stat-v2:nth-child(${index}) strong`, why[`stat${index}Value`]);
    setText(`.landing-stat-v2:nth-child(${index}) div > span`, why[`stat${index}Label`]);
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
  setLinkHref(".landing-hero__actions a:nth-child(1)", hero?.primaryCtaHref);
  setLinkText(".landing-hero__actions a:nth-child(2)", hero?.secondaryCtaLabel);
  setLinkHref(".landing-hero__actions a:nth-child(2)", hero?.secondaryCtaHref);

  const roles = content.roles;
  setText(".landing-section--roles .landing-section-heading__eyebrow", roles?.eyebrow);
  setText(".landing-section--roles .landing-section-heading h2", roles?.title);
  setText(".landing-section--roles .landing-section-heading p", roles?.description);

  const passport = content.passport;
  setText(".landing-passport__content .landing-section-heading__eyebrow", passport?.eyebrow);
  setText(".landing-passport__content h2", passport?.title);
  setText(".landing-passport__content > p", passport?.description);
  setLinkText(".landing-passport__content a.landing-button", passport?.ctaLabel);
  setLinkHref(".landing-passport__content a.landing-button", passport?.ctaHref);

  const why = content.why;
  setText(".landing-why-v2 .landing-section-heading__eyebrow", why?.eyebrow);
  setText(".landing-why-v2 .landing-section-heading h2", why?.title);
  applyManualStats(why);

  const footer = content.footer;
  setFooterSlogan(footer?.slogan);
  setFooterCopyright(footer?.copyright);
}

function applyRoleCards(cards: CmsRoleCard[]) {
  const grid = document.querySelector<HTMLElement>(".landing-role-grid");
  if (!grid) return;

  const ordered: Array<{ card: CmsRoleCard; element: HTMLAnchorElement }> = [];
  for (const card of cards) {
    const element = grid.querySelector<HTMLAnchorElement>(`a.landing-role[href="/kayit?rol=${card.key}"]`);
    if (!element) continue;

    element.hidden = !card.visible;
    element.setAttribute("aria-label", `${card.title} olarak kayıt ol`);

    const number = element.querySelector<HTMLElement>(".landing-role__number");
    if (number) number.textContent = String(card.position).padStart(2, "0");
    const roleLabel = element.querySelector<HTMLElement>(".landing-role__label");
    if (roleLabel) roleLabel.textContent = `${card.title} rolü`;
    const heading = element.querySelector<HTMLElement>("h3");
    if (heading) heading.textContent = card.title;
    const description = element.querySelector<HTMLElement>("p");
    if (description) description.textContent = card.description;

    const highlights = element.querySelector<HTMLElement>(".landing-role__highlights");
    if (highlights) {
      const first = document.createElement("small");
      first.textContent = card.highlight1;
      const second = document.createElement("small");
      second.textContent = card.highlight2;
      highlights.replaceChildren(first, second);
    }

    const cta = element.querySelector<HTMLElement>(":scope > strong");
    if (cta) {
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      cta.replaceChildren(document.createTextNode(`${card.ctaLabel} `), arrow);
    }

    ordered.push({ card, element });
  }

  ordered
    .sort((a, b) => a.card.position - b.card.position)
    .forEach(({ element }) => grid.append(element));
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

    void fetch("/api/site-content/role-cards?dil=tr", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.published || !Array.isArray(payload.cards)) return;
        applyRoleCards(payload.cards as CmsRoleCard[]);
      })
      .catch(() => {
        // Kod içindeki rol kartları güvenli fallback olarak kalır.
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
