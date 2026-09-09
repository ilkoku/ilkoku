"use client";

import { useEffect, useState } from "react";

type PageState = {
  current: number;
  total: number;
};

const initialState: PageState = {
  current: 1,
  total: 1,
};

function readPageState(viewport: HTMLElement): PageState {
  const height = Math.max(1, viewport.clientHeight);
  const total = Math.max(1, Math.ceil(viewport.scrollHeight / height));
  const current = Math.min(
    total,
    Math.max(1, Math.floor(viewport.scrollTop / height) + 1),
  );

  return { current, total };
}

export function ReadingPageIndicator() {
  const [pageState, setPageState] = useState<PageState>(initialState);

  useEffect(() => {
    const viewport = document.querySelector<HTMLElement>(
      '#bolum-metni [aria-label="Okuma alanı"]',
    );

    if (!viewport) return;

    let frame = 0;

    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setPageState(readPageState(viewport));
      });
    };

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);

    const content = viewport.firstElementChild;
    if (content instanceof HTMLElement) observer.observe(content);

    viewport.addEventListener("scroll", measure, { passive: true });
    measure();

    if (document.fonts?.ready) {
      void document.fonts.ready.then(measure);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      viewport.removeEventListener("scroll", measure);
    };
  }, []);

  return (
    <span data-reading-page-indicator="true">
      Kitap sayfası {pageState.current} / {pageState.total}
    </span>
  );
}
