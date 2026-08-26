"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type FooterContent = Record<string, string>;

type FooterLink = {
  label: string;
  href: string;
};

const legalLinks = [
  ["Kullanım Şartları", "/yasal/kullanim-sartlari"],
  ["Gizlilik Politikası", "/yasal/gizlilik-politikasi"],
  ["KVKK", "/yasal/kvkk"],
  ["Çerez Politikası", "/yasal/cerez-politikasi"],
  ["Telif Hakkı Politikası", "/yasal/telif-hakki-politikasi"],
] as const;

const canonicalPlatformLinks: readonly FooterLink[] = [
  { label: "Nasıl Çalışır?", href: "/nasil-calisir" },
  { label: "Yazarlar İçin", href: "/yazarlar-icin" },
  { label: "Editörler İçin", href: "/editorler-icin" },
  { label: "Yayınevleri İçin", href: "/yayinevleri-icin" },
];

const canonicalTrustLinks: readonly FooterLink[] = [
  { label: "Editoryal Standartlar", href: "/editoryal-standartlar" },
  { label: "İçerik ve Yaş", href: "/icerik-ve-yas-politikasi" },
  { label: "Topluluk Kuralları", href: "/topluluk-kurallari" },
  { label: "Telif Bildirimi", href: "/telif-bildirimi" },
];

const canonicalPlatformHrefs = new Set(canonicalPlatformLinks.map((link) => link.href));

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
    if (column.querySelector("h3")?.textContent?.trim() === "Yasal") {
      column.remove();
    }
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
  legalLinks.forEach(([defaultLabel, defaultHref], index) => {
    const key = keys[index];
    const anchor = document.createElement("a");
    anchor.textContent = content[`${key}Label`] || defaultLabel;
    anchor.setAttribute("href", internalHref(content[`${key}Href`], defaultHref));
    anchor.style.setProperty("display", "inline-flex", "important");
    anchor.style.setProperty("margin", "0", "important");
    anchor.style.setProperty("padding", ".12rem 0", "important");
    anchor.style.setProperty("font-size", ".7rem", "important");
    anchor.style.setProperty("white-space", "nowrap", "important");
    legal?.append(anchor);
  });
}

function resolvedPlatformLinks(content: FooterContent) {
  return canonicalPlatformLinks.map((fallback, index) => {
    if (index > 2) return fallback;

    const slot = index + 1;
    const rawHref = content[`platform${slot}Href`]?.trim();
    if (!rawHref) return fallback;

    const href = internalHref(rawHref, fallback.href);
    if (!canonicalPlatformHrefs.has(href)) return fallback;

    return {
      href,
      label: content[`platform${slot}Label`]?.trim() || fallback.label,
    };
  });
}

function replaceColumnLinks(column: HTMLElement, links: readonly FooterLink[]) {
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
  replaceColumnLinks(column, canonicalTrustLinks);
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
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    const footer = document.querySelector<HTMLElement>(".landing-footer");
    if (!footer) return;

    ensureLegalBar(footer, {});
    rebuildPlatformColumn(findColumn(footer, "Platform"), {});
    rebuildTrustColumn(footer);

    void fetch("/api/site-content/footer-navigation", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const content = (payload?.content ?? {}) as FooterContent;
        ensureLegalBar(footer, content);
        rebuildPlatformColumn(findColumn(footer, "Platform"), content);
        rebuildTrustColumn(footer);
        updateColumn(findColumn(footer, "Destek"), content.supportTitle, content, "support", 1);
      })
      .catch(() => {});
  }, [pathname]);

  return null;
}
