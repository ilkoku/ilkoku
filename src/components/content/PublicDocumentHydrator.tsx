"use client";

import { useEffect } from "react";

function renderBody(article: HTMLElement, body: string) {
  article.querySelectorAll(".legal-section").forEach((node) => node.remove());
  const contact = article.querySelector(".legal-contact");
  let section: HTMLElement | null = null;
  let list: HTMLUListElement | null = null;

  const ensureSection = () => {
    if (section) return section;
    section = document.createElement("section");
    section.className = "legal-section";
    article.insertBefore(section, contact);
    return section;
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      list = null;
      continue;
    }

    if (line.startsWith("## ")) {
      section = document.createElement("section");
      section.className = "legal-section";
      const heading = document.createElement("h2");
      heading.textContent = line.slice(3).trim();
      section.append(heading);
      article.insertBefore(section, contact);
      list = null;
      continue;
    }

    if (line.startsWith("- ")) {
      const target = ensureSection();
      if (!list) {
        list = document.createElement("ul");
        target.append(list);
      }
      const item = document.createElement("li");
      item.textContent = line.slice(2).trim();
      list.append(item);
      continue;
    }

    list = null;
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    ensureSection().append(paragraph);
  }
}

export function PublicDocumentHydrator() {
  useEffect(() => {
    const match = window.location.pathname.match(/^\/yasal\/([^/]+)$/);
    if (!match) return;
    const slug = match[1];

    void fetch(`/api/site-content/document/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const content = payload?.content as {
          title?: string;
          description?: string;
          updatedLabel?: string;
          body?: string;
        } | null;
        if (!content?.body) return;

        const article = document.querySelector<HTMLElement>(".legal-document");
        if (!article) return;

        const title = article.querySelector<HTMLElement>(".legal-document__head h1");
        const description = article.querySelector<HTMLElement>(".legal-document__head p");
        const updated = article.querySelector<HTMLElement>(".legal-document__head small");
        if (title && content.title) title.textContent = content.title;
        if (description && content.description) description.textContent = content.description;
        if (updated && content.updatedLabel) updated.textContent = `Son güncelleme: ${content.updatedLabel}`;
        renderBody(article, content.body);
      })
      .catch(() => {});
  }, []);

  return null;
}
