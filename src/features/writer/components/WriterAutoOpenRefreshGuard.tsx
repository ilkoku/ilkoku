"use client";

import { useEffect } from "react";

const hydratedClass = "writer-auto-open-hydrated";
const flowOpenClass = "writer-flow-open";

export function WriterAutoOpenRefreshGuard() {
  useEffect(() => {
    const body = document.body;

    let fallbackTimer: number | undefined;

    const markHydratedWhenEditorOpens = () => {
      if (!body.classList.contains(flowOpenClass)) {
        return;
      }

      body.classList.add(hydratedClass);
      observer.disconnect();

      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }
    };

    const observer = new MutationObserver(markHydratedWhenEditorOpens);

    observer.observe(body, {
      attributeFilter: ["class"],
      attributes: true,
    });

    markHydratedWhenEditorOpens();

    fallbackTimer = window.setTimeout(() => {
      body.classList.add(hydratedClass);
      observer.disconnect();
    }, 1500);

    return () => {
      observer.disconnect();
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }
      body.classList.remove(hydratedClass);
    };
  }, []);

  return null;
}
