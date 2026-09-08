"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const flowOpenClass = "writer-flow-open";

export function WriterAutoOpenRefreshGuard({
  returnHref = "/yazmaya-devam",
}: {
  returnHref?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const body = document.body;
    let sawEditorOpen = body.classList.contains(flowOpenClass);
    let redirecting = false;

    const returnToList = () => {
      if (redirecting) return;
      redirecting = true;
      router.replace(returnHref);
    };

    const reconcileEditorState = () => {
      if (body.classList.contains(flowOpenClass)) {
        sawEditorOpen = true;
        return;
      }

      if (sawEditorOpen) {
        returnToList();
      }
    };

    const observer = new MutationObserver(reconcileEditorState);
    observer.observe(body, {
      attributeFilter: ["class"],
      attributes: true,
    });

    const fallbackTimer = window.setTimeout(() => {
      if (!sawEditorOpen && !body.classList.contains(flowOpenClass)) {
        returnToList();
      }
    }, 1500);

    reconcileEditorState();

    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackTimer);
    };
  }, [returnHref, router]);

  return null;
}
