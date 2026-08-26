"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const CURRENT_PATH_KEY = "ilkoku:public:current-path";
const PREVIOUS_PATH_KEY = "ilkoku:public:last-path";

const explicitBackRoutes = new Set([
  "/nasil-calisir",
  "/editoryal-standartlar",
  "/icerik-ve-yas-politikasi",
  "/topluluk-kurallari",
  "/telif-bildirimi",
  "/yazarlar-icin",
  "/editorler-icin",
  "/yayinevleri-icin",
  "/editorler",
  "/yardim",
]);

function isSafeInternalPath(value: string | null) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//") && value.length <= 1500);
}

function currentLocationPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function fallbackFor(pathname: string) {
  if (pathname.startsWith("/editorler/")) return "/editorler";
  return "/";
}

export function PublicBackNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isVisible = explicitBackRoutes.has(pathname) || pathname.startsWith("/editorler/");

  useEffect(() => {
    const currentPath = currentLocationPath();

    try {
      const storedCurrentPath = window.sessionStorage.getItem(CURRENT_PATH_KEY);
      if (isSafeInternalPath(storedCurrentPath) && storedCurrentPath !== currentPath) {
        window.sessionStorage.setItem(PREVIOUS_PATH_KEY, storedCurrentPath as string);
      }
      window.sessionStorage.setItem(CURRENT_PATH_KEY, currentPath);
    } catch {
      // Storage failures must never block public navigation.
    }

    const rememberCurrentPathBeforeInternalNavigation = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      try {
        const destination = new URL(anchor.href, window.location.href);
        if (destination.origin !== window.location.origin) return;
        const current = currentLocationPath();
        window.sessionStorage.setItem(PREVIOUS_PATH_KEY, current);
        window.sessionStorage.setItem(CURRENT_PATH_KEY, current);
      } catch {
        // Storage or malformed-link failures must never block navigation.
      }
    };

    document.addEventListener("click", rememberCurrentPathBeforeInternalNavigation, true);
    return () => document.removeEventListener("click", rememberCurrentPathBeforeInternalNavigation, true);
  }, [pathname]);

  if (!isVisible) return null;

  const goBack = () => {
    const fallbackHref = fallbackFor(pathname);
    let destination = fallbackHref;

    try {
      const storedPath = window.sessionStorage.getItem(PREVIOUS_PATH_KEY);
      const currentPath = currentLocationPath();
      if (isSafeInternalPath(storedPath) && storedPath !== currentPath) {
        destination = storedPath as string;
      }
    } catch {
      destination = fallbackHref;
    }

    router.push(destination);
  };

  return (
    <div className="public-back-navigation" aria-label="Sayfa dönüş navigasyonu">
      <div className="public-back-navigation__inner">
        <button type="button" onClick={goBack} aria-label="Önceki sayfaya dön">
          <span aria-hidden="true">←</span>
          <span>Geri</span>
        </button>
      </div>
    </div>
  );
}
