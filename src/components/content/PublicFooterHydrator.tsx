"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  publicLegalLinks,
  publicPlatformLinks,
  publicSupportLinks,
  publicTrustLinks,
  type PublicSiteLink,
} from "@/lib/public-site-navigation";
import { siteContact } from "@/lib/site-contact";

type FooterContent = Record<string, string>;

const canonicalPlatformHrefs = new Set(publicPlatformLinks.map((link) => link.href));
const SVG_NS = "http://www.w3.org/2000/svg";

function internalHref(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (value.startsWith("#")) return value;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin === window.location.origin) return `${url.pathname}${url.search}${url.hash}`;
  } catch {}
  return fallback;
}

function columns(footer: HTMLElement) {
  return Array.from(footer.querySelectorAll<HTMLElement>(".landing-footer__grid > div"));
}

function findColumn(footer: HTMLElement, title: string) {
  return columns(footer).find((column) => column.querySelector("h3")?.textContent?.trim() === title);
}

function ensureLegalBar(footer: HTMLElement, content: FooterContent) {
  const copyright = footer.querySelector<HTMLElement>(".landing-footer__copyright");
  if (!copyright) return;

  for (const column of columns(footer)) {
    if (column.querySelector("h3")?.textContent?.trim() === "Yasal") column.remove();
  }

  let copyrightText = copyright.querySelector<HTMLElement>(".landing-footer__copyright-text");
  if (!copyrightText) {
    const originalText = copyright.textContent?.trim() || `© ${new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.`;
    copyright.replaceChildren();
    copyrightText = document.createElement("span");
    copyrightText.className = "landing-footer__copyright-text";
    copyrightText.textContent = originalText;
    copyright.append(copyrightText);
  }

  let legal = copyright.querySelector<HTMLElement>(".landing-footer__legal");
  if (!legal) {
    legal = document.createElement("nav");
    legal.className = "landing-footer__legal";
    copyright.append(legal);
  }

  copyright.style.setProperty("display", "flex", "important");
  copyright.style.setProperty("align-items", "center", "important");
  copyright.style.setProperty("justify-content", "space-between", "important");
  copyright.style.setProperty("gap", ".8rem 1.5rem", "important");
  copyright.style.setProperty("flex-wrap", "wrap", "important");

  legal.style.setProperty("display", "flex", "important");
  legal.style.setProperty("align-items", "center", "important");
  legal.style.setProperty("justify-content", "flex-end", "important");
  legal.style.setProperty("gap", ".35rem 1rem", "important");
  legal.style.setProperty("flex-wrap", "wrap", "important");
  legal.style.setProperty("margin-left", "auto", "important");

  legal.setAttribute("aria-label", content.legalTitle || "Yasal bağlantılar");
  legal.replaceChildren();

  const keys = ["terms", "privacy", "kvkk", "cookie", "copyright"] as const;
  publicLegalLinks.forEach((fallback, index) => {
    const key = keys[index];
    const anchor = document.createElement("a");
    anchor.textContent = content[`${key}Label`] || fallback.label;
    anchor.setAttribute("href", internalHref(content[`${key}Href`], fallback.href));
    anchor.style.setProperty("display", "inline-flex", "important");
    anchor.style.setProperty("margin", "0", "important");
    anchor.style.setProperty("padding", ".12rem 0", "important");
    anchor.style.setProperty("font-size", ".7rem", "important");
    anchor.style.setProperty("white-space", "nowrap", "important");
    legal?.append(anchor);
  });
}

function resolvedPlatformLinks(content: FooterContent) {
  return publicPlatformLinks.map((fallback, index) => {
    if (index === 0 || index > 3) return fallback;

    const slot = index;
    const rawHref = content[`platform${slot}Href`]?.trim();
    if (!rawHref) return fallback;

    const href = internalHref(rawHref, fallback.href);
    if (!canonicalPlatformHrefs.has(href) || href === "/hakkimizda") return fallback;

    return {
      href,
      label: content[`platform${slot}Label`]?.trim() || fallback.label,
    };
  });
}

function replaceColumnLinks(column: HTMLElement, links: readonly PublicSiteLink[]) {
  for (const anchor of Array.from(column.querySelectorAll("a"))) anchor.remove();
  for (const link of links) {
    const anchor = document.createElement("a");
    anchor.textContent = link.label;
    anchor.setAttribute("href", link.href);
    column.append(anchor);
  }
}

function rebuildPlatformColumn(column: HTMLElement | undefined, content: FooterContent) {
  if (!column) return;
  const heading = column.querySelector<HTMLElement>("h3");
  if (heading) heading.textContent = content.platformTitle || "Platform";
  replaceColumnLinks(column, resolvedPlatformLinks(content));
}

function ensureTrustColumn(footer: HTMLElement) {
  const existing = findColumn(footer, "Güven & Standartlar");
  if (existing) return existing;

  const platform = findColumn(footer, "Platform");
  if (!platform) return undefined;

  const column = document.createElement("div");
  column.className = "landing-footer__trust";
  const heading = document.createElement("h3");
  heading.textContent = "Güven & Standartlar";
  column.append(heading);
  platform.insertAdjacentElement("afterend", column);
  return column;
}

function rebuildTrustColumn(footer: HTMLElement) {
  const column = ensureTrustColumn(footer);
  if (!column) return;
  replaceColumnLinks(column, publicTrustLinks);
}

function rebuildSupportColumn(column: HTMLElement | undefined, content: FooterContent) {
  if (!column) return;
  const heading = column.querySelector<HTMLElement>("h3");
  if (heading) heading.textContent = content.supportTitle || "Destek";
  replaceColumnLinks(column, publicSupportLinks);
}

function externalLink(href: string, label: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.setAttribute("aria-label", `${label} hesabımızı aç`);
  anchor.title = label;
  return anchor;
}

function svgElement<K extends keyof SVGElementTagNameMap>(name: K) {
  return document.createElementNS(SVG_NS, name);
}

function socialBrandIcon(id: string) {
  const svg = svgElement("svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("site-social-icon", `site-social-icon--${id}`);

  if (id === "x") {
    const path = svgElement("path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z");
    svg.append(path);
    return svg;
  }

  if (id === "instagram") {
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.9");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    const frame = svgElement("rect");
    frame.setAttribute("x", "3");
    frame.setAttribute("y", "3");
    frame.setAttribute("width", "18");
    frame.setAttribute("height", "18");
    frame.setAttribute("rx", "5");
    const lens = svgElement("circle");
    lens.setAttribute("cx", "12");
    lens.setAttribute("cy", "12");
    lens.setAttribute("r", "4.15");
    const dot = svgElement("circle");
    dot.setAttribute("cx", "17.35");
    dot.setAttribute("cy", "6.65");
    dot.setAttribute("r", "1");
    dot.setAttribute("fill", "currentColor");
    dot.setAttribute("stroke", "none");
    svg.append(frame, lens, dot);
    return svg;
  }

  const path = svgElement("path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", "M6.94 8.5H3.56V19h3.38V8.5ZM5.25 3a1.95 1.95 0 1 0 0 3.9 1.95 1.95 0 0 0 0-3.9ZM20.44 13.08c0-3.16-1.69-4.63-3.94-4.63-1.82 0-2.63 1-3.09 1.7V8.5h-3.38V19h3.38v-5.2c0-1.37.26-2.7 1.96-2.7 1.68 0 1.7 1.57 1.7 2.79V19h3.37v-5.92Z");
  svg.append(path);
  return svg;
}

function ensureFooterContactBlock(column: HTMLElement | undefined) {
  if (!column) return;

  let block = column.querySelector<HTMLElement>(".site-contact-footer");
  if (!block) {
    block = document.createElement("div");
    block.className = "site-contact-footer";
  }
  block.replaceChildren();

  const email = document.createElement("a");
  email.className = "site-contact-footer__email";
  email.href = `mailto:${siteContact.generalEmail}`;
  email.textContent = siteContact.generalEmail;
  email.setAttribute("aria-label", `Genel iletişim: ${siteContact.generalEmail}`);
  block.append(email);

  const socials = document.createElement("div");
  socials.className = "site-social-links";
  socials.setAttribute("aria-label", "İlkOku sosyal medya hesapları");

  for (const social of siteContact.socialLinks) {
    const anchor = externalLink(social.href, social.label);
    anchor.append(socialBrandIcon(social.id));
    socials.append(anchor);
  }
  block.append(socials);

  column.append(block);
}

function findPublicTrustSupportColumn() {
  return Array.from(document.querySelectorAll<HTMLElement>(".public-trust-footer__column"))
    .find((column) => column.querySelector("h3")?.textContent?.trim() === "Destek");
}

function ensureContactPageBlock() {
  const intro = document.querySelector<HTMLElement>(".contact-page .contact-section__intro");
  if (!intro || intro.querySelector(".contact-direct-card")) return;

  const block = document.createElement("aside");
  block.className = "contact-direct-card";
  block.setAttribute("aria-label", "Doğrudan iletişim ve sosyal medya");

  const heading = document.createElement("div");
  heading.className = "contact-direct-card__heading";
  const eyebrow = document.createElement("small");
  eyebrow.textContent = "Doğrudan ulaşın";
  const title = document.createElement("strong");
  title.textContent = "İlkOku ile bağlantıda kalın.";
  heading.append(eyebrow, title);
  block.append(heading);

  const channels = document.createElement("div");
  channels.className = "contact-direct-card__channels";

  for (const [label, address] of [
    ["Genel iletişim", siteContact.generalEmail],
    ["Destek", siteContact.supportEmail],
  ] as const) {
    const row = document.createElement("div");
    row.className = "contact-direct-card__channel";
    const name = document.createElement("span");
    name.textContent = label;
    const anchor = document.createElement("a");
    anchor.href = `mailto:${address}`;
    anchor.textContent = address;
    row.append(name, anchor);
    channels.append(row);
  }
  block.append(channels);

  const socials = document.createElement("div");
  socials.className = "contact-direct-card__socials";
  socials.setAttribute("aria-label", "Bizi takip edin");
  for (const social of siteContact.socialLinks) {
    const anchor = externalLink(social.href, social.label);
    anchor.append(socialBrandIcon(social.id));

    const copy = document.createElement("span");
    copy.className = "contact-direct-card__social-copy";
    const name = document.createElement("strong");
    name.textContent = social.label;
    const handle = document.createElement("small");
    handle.textContent = social.handle;
    copy.append(name, handle);
    anchor.append(copy);
    socials.append(anchor);
  }
  block.append(socials);

  intro.append(block);
}

export function PublicFooterHydrator() {
  const pathname = usePathname();

  useEffect(() => {
    const trustSupport = findPublicTrustSupportColumn();
    ensureFooterContactBlock(trustSupport);

    if (pathname === "/iletisim") ensureContactPageBlock();
    if (pathname !== "/") return;

    const footer = document.querySelector<HTMLElement>(".landing-footer");
    if (!footer) return;

    ensureLegalBar(footer, {});
    rebuildPlatformColumn(findColumn(footer, "Platform"), {});
    rebuildTrustColumn(footer);
    rebuildSupportColumn(findColumn(footer, "Destek"), {});
    ensureFooterContactBlock(findColumn(footer, "Destek"));

    void fetch("/api/site-content/footer-navigation", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const content = (payload?.content ?? {}) as FooterContent;
        ensureLegalBar(footer, content);
        rebuildPlatformColumn(findColumn(footer, "Platform"), content);
        rebuildTrustColumn(footer);
        rebuildSupportColumn(findColumn(footer, "Destek"), content);
        ensureFooterContactBlock(findColumn(footer, "Destek"));
      })
      .catch(() => {});
  }, [pathname]);

  return null;
}
