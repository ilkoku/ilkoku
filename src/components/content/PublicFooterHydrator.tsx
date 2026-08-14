"use client";

import { useEffect } from "react";

type FooterContent = Record<string, string>;

const legalLinks = [
  ["Kullanım Şartları", "/yasal/kullanim-sartlari"],
  ["Gizlilik Politikası", "/yasal/gizlilik-politikasi"],
  ["KVKK", "/yasal/kvkk"],
  ["Çerez Politikası", "/yasal/cerez-politikasi"],
  ["Telif Hakkı Politikası", "/yasal/telif-hakki-politikasi"],
] as const;

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
  const grid = footer.querySelector<HTMLElement>(".landing-footer__grid");
  const copyright = footer.querySelector<HTMLElement>(".landing-footer__copyright");
  if (!grid || !copyright) return;

  for (const column of columns(footer)) {
    if (column.querySelector("h3")?.textContent?.trim() === "Yasal") {
      column.remove();
    }
  }

  let legal = footer.querySelector<HTMLElement>(".landing-footer__legal");
  if (!legal) {
    legal = document.createElement("nav");
    legal.className = "landing-footer__legal";
    copyright.before(legal);
  }

  legal.setAttribute("aria-label", content.legalTitle || "Yasal bağlantılar");
  legal.replaceChildren();

  const keys = ["terms", "privacy", "kvkk", "cookie", "copyright"] as const;
  legalLinks.forEach(([defaultLabel, defaultHref], index) => {
    const key = keys[index];
    const anchor = document.createElement("a");
    anchor.textContent = content[`${key}Label`] || defaultLabel;
    anchor.setAttribute("href", internalHref(content[`${key}Href`], defaultHref));
    legal?.append(anchor);
  });
}

function updateColumn(column: HTMLElement | undefined, title: string | undefined, content: FooterContent, prefix: string, count: number) {
  if (!column) return;
  const heading = column.querySelector<HTMLElement>("h3");
  if (heading && title) heading.textContent = title;
  const anchors = Array.from(column.querySelectorAll<HTMLAnchorElement>("a"));
  for (let index = 0; index < count; index += 1) {
    const anchor = anchors[index];
    if (!anchor) continue;
    const label = content[`${prefix}${index + 1}Label`] || (prefix === "support" ? content.supportLabel : "");
    const href = content[`${prefix}${index + 1}Href`] || (prefix === "support" ? content.supportHref : "");
    if (label) anchor.textContent = label;
    if (href) anchor.setAttribute("href", internalHref(href, anchor.getAttribute("href") || "/"));
  }
}

export function PublicFooterHydrator() {
  useEffect(() => {
    if (window.location.pathname !== "/") return;
    const footer = document.querySelector<HTMLElement>(".landing-footer");
    if (!footer) return;

    ensureLegalBar(footer, {});

    void fetch("/api/site-content/footer-navigation", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const content = (payload?.content ?? {}) as FooterContent;
        ensureLegalBar(footer, content);
        updateColumn(findColumn(footer, "Platform"), content.platformTitle, content, "platform", 3);
        updateColumn(findColumn(footer, "Destek"), content.supportTitle, content, "support", 1);
      })
      .catch(() => {});
  }, []);

  return null;
}
