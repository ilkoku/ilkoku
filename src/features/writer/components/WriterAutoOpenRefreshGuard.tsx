"use client";

import { useEffect } from "react";

const hydratedClass = "writer-auto-open-hydrated";
const flowOpenClass = "writer-flow-open";

export function WriterAutoOpenRefreshGuard() {
  useEffect(() => {
    const body = document.body;
    let observer: MutationObserver | null = null;

    const fallbackTimer = window.setTimeout(() => {
      body.classList.add(hydratedClass);
      observer?.disconnect();
    }, 1500);

    const markHydratedWhenEditorOpens = () => {
      if (!body.classList.contains(flowOpenClass)) {
        return;
      }

      body.classList.add(hydratedClass);
      observer?.disconnect();
      window.clearTimeout(fallbackTimer);
    };

    observer = new MutationObserver(markHydratedWhenEditorOpens);

    observer.observe(body, {
      attributeFilter: ["class"],
      attributes: true,
    });

    markHydratedWhenEditorOpens();

    return () => {
      observer?.disconnect();
      window.clearTimeout(fallbackTimer);
      body.classList.remove(hydratedClass);
    };
  }, []);

  return null;
}
