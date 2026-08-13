"use client";

import { useEffect } from "react";
import { PublicDocumentHydrator } from "@/components/content/PublicDocumentHydrator";

function renderHeroTitle(element: HTMLElement, title: string) {
  const lines = title
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  element.replaceChildren();

  if (lines.length <= 1) {
    element.textContent = title;
    return;
  }

  lines.forEach((line, index) => {
    if (index > 0) {
      element.append(document.createElement("br"));
    }

    if (index === lines.length - 1) {
      const span = document.createElement("span");
      span.textContent = line;
      element.append(span);
      return;
    }

    element.append(document.createTextNode(line));
  });
}

export function PublicCmsHydrator() {
  useEffect(() => {
    if (window.location.pathname !== "/") return;

    let cancelled = false;

    void fetch("/api/site-content/homepage-hero", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.content) return;

        const title = document.querySelector<HTMLElement>(".landing-hero__content h1");
        const description = document.querySelector<HTMLElement>(".landing-hero__content > p");

        if (!title || !description) return;

        renderHeroTitle(title, payload.content.title);
        description.textContent = payload.content.description;
      })
      .catch(() => {
        // Hard-coded landing content remains the fallback.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <PublicDocumentHydrator />;
}
