"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type AnalyticsEvent = {
  event: string;
  [key: string]: string | number | boolean | undefined;
};

declare global {
  interface Window {
    dataLayer?: Array<unknown>;
    gtag?: (...args: unknown[]) => void;
  }
}

function analyticsConsentGranted() {
  const value = document.documentElement.dataset.ilkokuAnalyticsConsent;
  return value === "granted" || value === "not-required";
}

function providerState(provider: "Gtm" | "Ga4") {
  return document.documentElement.dataset[`ilkokuAnalytics${provider}`] ?? "";
}

function emitBookIndexEvent(payload: AnalyticsEvent) {
  if (!analyticsConsentGranted()) return false;

  if (providerState("Gtm") === "loaded" && window.dataLayer) {
    window.dataLayer.push(payload);
    return true;
  }

  if (providerState("Ga4") === "loaded" && typeof window.gtag === "function") {
    const { event, ...params } = payload;
    window.gtag("event", event, params);
    return true;
  }

  return false;
}

function surfaceFromPath(pathname: string) {
  return pathname === "/en-cok-satanlar/turkiye" ? "turkey" : "overview";
}

export function BookIndexAnalytics() {
  const pathname = usePathname();
  const sentViewKey = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/en-cok-satanlar")) return;

    const key = pathname;
    let cancelled = false;
    const timers: Array<ReturnType<typeof window.setTimeout>> = [];

    function trySendView() {
      if (cancelled || sentViewKey.current === key) return;
      const sent = emitBookIndexEvent({
        event: "book_index_view",
        book_index_surface: surfaceFromPath(pathname),
        page_path: pathname,
      });
      if (sent) sentViewKey.current = key;
    }

    trySendView();

    for (const delay of [500, 1500, 3000, 5000]) {
      timers.push(window.setTimeout(trySendView, delay));
    }

    const onConsentChanged = () => trySendView();
    window.addEventListener(
      "ilkoku:consent-changed",
      onConsentChanged as EventListener,
    );

    return () => {
      cancelled = true;
      for (const timer of timers) window.clearTimeout(timer);
      window.removeEventListener(
        "ilkoku:consent-changed",
        onConsentChanged as EventListener,
      );
    };
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!pathname.startsWith("/en-cok-satanlar")) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }

      if (destination.origin !== window.location.origin) return;
      if (!destination.pathname.startsWith("/en-cok-satanlar")) return;

      emitBookIndexEvent({
        event: "book_index_navigation_click",
        book_index_surface: surfaceFromPath(pathname),
        page_path: pathname,
        target_path: destination.pathname,
      });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  return null;
}
