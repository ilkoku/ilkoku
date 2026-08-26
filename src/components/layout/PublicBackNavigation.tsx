"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "ilkoku:public:last-path";

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

function fallbackFor(pathname: string) {
  if (pathname.startsWith("/editorler/")) return "/editorler";
  return "/";
}

export function PublicBackNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  const isVisible = useMemo(
    () => explicitBackRoutes.has(pathname) || pathname.startsWith("/editorler/"),
    [pathname],
  );

  useEffect(() => {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const storedPath = window.sessionStorage.getItem(STORAGE_KEY);

    setPreviousPath(
      isSafeInternalPath(storedPath) && storedPath !== currentPath ? storedPath : null,
    );
    window.sessionStorage.setItem(STORAGE_KEY, currentPath);
  }, [pathname]);

  if (!isVisible) return null;

  const fallbackHref = fallbackFor(pathname);
  const destination = previousPath ?? fallbackHref;

  return (
    <div className="public-back-navigation" aria-label="Sayfa dönüş navigasyonu">
      <div className="public-back-navigation__inner">
        <button
          type="button"
          onClick={() => router.push(destination)}
          aria-label={destination === "/editorler" ? "Editörler sayfasına dön" : "Önceki sayfaya dön"}
        >
          <span aria-hidden="true">←</span>
          <span>Geri</span>
        </button>
      </div>
    </div>
  );
}
